import { useMemo, useRef, useState } from "react";
import {
  cloneDefaults,
  ConflictKind,
  CourseSection,
  DAYS,
  EntityRule,
  normalizeTimetableInput,
  ROOM_TYPE_LABELS,
  Room,
  RoomType,
  RuleMap,
  ScheduleItem,
  solveTimetable,
  TIME_LABELS,
  TimetableInput,
  validateInput,
  WEEK_PATTERN_LABELS,
  WeekPattern,
} from "./domain";

type EditorStep = "courses" | "rooms" | "availability" | "conflicts" | "settings";
type AvailabilityOwner = "university" | "instructor" | "group" | "course" | "room";
type ResultView = "all" | "instructor" | "group" | "course" | "room";

const EMPTY_RULE: EntityRule = { preferredSlots: [], unavailableSlots: [], maxDailyPeriods: 0, maxConsecutivePeriods: 0 };

const splitList = (value: string) => [...new Set(value.split(/[،,]/).map((item) => item.trim()).filter(Boolean))];
const listText = (items: string[]) => items.join("، ");
const toFa = (value: number) => value.toLocaleString("fa-IR");

function fixedSlotsText(value: Record<string, string>) {
  return Object.entries(value)
    .sort(([first], [second]) => Number(first) - Number(second))
    .map(([session, slot]) => `${session}=${slot}`)
    .join("، ");
}

function parseFixedSlots(value: string) {
  const result: Record<string, string> = {};
  splitList(value).forEach((item) => {
    const [session, slot] = item.split("=").map((part) => part.trim());
    if (session && slot) result[session] = slot;
  });
  return result;
}

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function SlotRuleGrid({
  preferred,
  unavailable,
  dayCount,
  timeCount,
  allowPreferred,
  onChange,
}: {
  preferred: string[];
  unavailable: string[];
  dayCount: number;
  timeCount: number;
  allowPreferred: boolean;
  onChange: (preferred: string[], unavailable: string[]) => void;
}) {
  const preferredSet = new Set(preferred);
  const unavailableSet = new Set(unavailable);
  const cycle = (slot: string) => {
    const nextPreferred = new Set(preferred);
    const nextUnavailable = new Set(unavailable);
    if (unavailableSet.has(slot)) {
      nextUnavailable.delete(slot);
    } else if (preferredSet.has(slot)) {
      nextPreferred.delete(slot);
      nextUnavailable.add(slot);
    } else if (allowPreferred) {
      nextPreferred.add(slot);
    } else {
      nextUnavailable.add(slot);
    }
    onChange([...nextPreferred].sort(), [...nextUnavailable].sort());
  };

  return (
    <div className="rule-grid-wrap">
      <div className="rule-grid" style={{ gridTemplateColumns: `112px repeat(${dayCount}, minmax(98px, 1fr))` }}>
        <div className="rule-corner">بازه / روز</div>
        {DAYS.slice(0, dayCount).map((day) => <div className="rule-day" key={day}>{day}</div>)}
        {Array.from({ length: timeCount }, (_, period) => (
          <div className="rule-row" key={period}>
            <div className="rule-time"><b>بازه {toFa(period + 1)}</b><span>{TIME_LABELS[period]}</span></div>
            {Array.from({ length: dayCount }, (_, day) => {
              const slot = `${day}-${period}`;
              const state = unavailableSet.has(slot) ? "unavailable" : preferredSet.has(slot) ? "preferred" : "free";
              return (
                <button type="button" className={state} key={slot} onClick={() => cycle(slot)}>
                  {state === "unavailable" ? "× ممنوع" : state === "preferred" ? "★ مطلوب" : "آزاد"}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScheduleGrid({
  items,
  dayCount,
  timeCount,
}: {
  items: ScheduleItem[];
  dayCount: number;
  timeCount: number;
}) {
  const colorClass = (item: ScheduleItem) => {
    const value = [...item.courseId].reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
    return ["mint", "blue", "amber", "violet", "rose"][value % 5];
  };
  return (
    <div className="week-grid" style={{ gridTemplateColumns: `76px repeat(${dayCount}, minmax(132px, 1fr))` }}>
      <div className="week-corner">زمان</div>
      {DAYS.slice(0, dayCount).map((day) => <div className="week-day" key={day}>{day}</div>)}
      {Array.from({ length: timeCount }, (_, period) => (
        <div className="week-row" key={period}>
          <div className="week-time"><b>بازه {toFa(period + 1)}</b><span>{TIME_LABELS[period]}</span></div>
          {Array.from({ length: dayCount }, (_, day) => {
            const starts = items.filter((item) => item.day === day && item.startPeriod === period);
            const continuing = items.filter((item) => item.day === day && item.startPeriod < period && item.startPeriod + item.duration > period);
            return (
              <div className="week-slot" key={`${day}-${period}`}>
                {starts.slice(0, 4).map((item) => (
                  <article className={colorClass(item)} key={item.eventId}>
                    <div className="course-code"><span>{item.code}</span>{item.duration > 1 && <em>{toFa(item.duration)} بازه</em>}</div>
                    <strong>{item.name}</strong>
                    <small>{item.instructors.join("، ")}</small>
                    <small>{item.roomName} · {item.building}</small>
                    <div className="item-meta"><span>جلسه {toFa(item.session)}</span>{item.weekPattern !== "all" && <span>{WEEK_PATTERN_LABELS[item.weekPattern]}</span>}{item.preferenceMet !== null && <span className={item.preferenceMet ? "hit" : "miss"}>{item.preferenceMet ? "✓ مطلوب" : "△ ترجیح"}</span>}</div>
                  </article>
                ))}
                {starts.length > 4 && <span className="more-items">+{toFa(starts.length - 4)} جلسه دیگر</span>}
                {!starts.length && continuing.length > 0 && <div className="continuation">ادامه {continuing.slice(0, 2).map((item) => item.code).join("، ")}</div>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const initial = useMemo(() => cloneDefaults(), []);
  const [model, setModel] = useState<TimetableInput>(initial);
  const [result, setResult] = useState(() => solveTimetable(initial));
  const [mode, setMode] = useState<"manual" | "json">("manual");
  const [jsonText, setJsonText] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [step, setStep] = useState<EditorStep>("courses");
  const [availabilityOwner, setAvailabilityOwner] = useState<AvailabilityOwner>("instructor");
  const [availabilityKey, setAvailabilityKey] = useState("دکتر احمدی");
  const [view, setView] = useState<ResultView>("instructor");
  const [entity, setEntity] = useState("دکتر احمدی");
  const [notice, setNotice] = useState("نمونه دانشگاهی با قیود سخت و ترجیحات وزنی حل شد.");
  const [solving, setSolving] = useState(false);
  const resultRef = useRef<HTMLElement>(null);

  const instructors = useMemo(() => [...new Set(model.courses.flatMap((item) => item.instructors))].sort((a, b) => a.localeCompare(b, "fa")), [model.courses]);
  const groups = useMemo(() => [...new Set(model.courses.flatMap((item) => item.studentGroups))].sort((a, b) => a.localeCompare(b, "fa")), [model.courses]);
  const eventCount = model.courses.reduce((sum, item) => sum + item.meetingsPerWeek, 0);

  const availabilityOptions = useMemo(() => {
    if (availabilityOwner === "university") return [{ value: "university", label: "کل دانشگاه" }];
    if (availabilityOwner === "instructor") return instructors.map((item) => ({ value: item, label: item }));
    if (availabilityOwner === "group") return groups.map((item) => ({ value: item, label: item }));
    if (availabilityOwner === "course") return model.courses.map((item) => ({ value: item.id, label: `${item.code} — ${item.name}` }));
    return model.rooms.map((item) => ({ value: item.id, label: `${item.name} — ${item.building}` }));
  }, [availabilityOwner, instructors, groups, model.courses, model.rooms]);
  const activeAvailabilityKey = availabilityOptions.some((item) => item.value === availabilityKey) ? availabilityKey : (availabilityOptions[0]?.value || "");

  const viewOptions = useMemo(() => {
    if (view === "all") return [{ value: "all", label: "همه جلسات" }];
    if (view === "instructor") return instructors.map((item) => ({ value: item, label: item }));
    if (view === "group") return groups.map((item) => ({ value: item, label: item }));
    if (view === "course") return model.courses.map((item) => ({ value: item.id, label: `${item.code} — ${item.name}` }));
    return model.rooms.map((item) => ({ value: item.id, label: `${item.name} — ${item.building}` }));
  }, [view, instructors, groups, model.courses, model.rooms]);
  const activeEntity = viewOptions.some((item) => item.value === entity) ? entity : (viewOptions[0]?.value || "");
  const visibleSchedule = useMemo(() => result.schedule.filter((item) => {
    if (view === "all") return true;
    if (view === "instructor") return item.instructors.includes(activeEntity);
    if (view === "group") return item.studentGroups.includes(activeEntity);
    if (view === "course") return item.courseId === activeEntity;
    return item.roomId === activeEntity;
  }), [result.schedule, view, activeEntity]);

  const resetSample = () => {
    const fresh = cloneDefaults();
    setModel(fresh);
    setResult(solveTimetable(fresh));
    setJsonText("");
    setNotice("نمونه استاندارد دانشکده فنی بازیابی و دوباره حل شد.");
  };

  const runSolver = () => {
    const errors = validateInput(model);
    if (errors.length) {
      setNotice(errors[0]);
      return;
    }
    setSolving(true);
    window.setTimeout(() => {
      const solved = solveTimetable(model);
      setResult(solved);
      if (solved.unscheduled.length) {
        setNotice(`${toFa(solved.schedule.length)} جلسه تخصیص یافت و ${toFa(solved.unscheduled.length)} جلسه نیازمند بازبینی است.`);
      } else {
        setNotice(`هر ${toFa(solved.schedule.length)} جلسه بدون نقض قید سخت زمان‌بندی شد؛ امتیاز جریمه ${toFa(solved.objective)} است.`);
      }
      setSolving(false);
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const importJson = () => {
    try {
      const next = normalizeTimetableInput(JSON.parse(jsonText));
      const errors = validateInput(next);
      if (errors.length) throw new Error(errors[0]);
      setModel(next);
      setMode("manual");
      setResult(solveTimetable(next));
      setNotice("داده دانشگاهی از JSON خوانده شد و آماده زمان‌بندی است.");
    } catch (error) {
      setNotice(error instanceof Error && error.message ? error.message : "ساختار JSON معتبر نیست.");
    }
  };

  const updateCourse = (id: string, patch: Partial<CourseSection>) => {
    setModel((current) => ({ ...current, courses: current.courses.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  };

  const updateRoom = (id: string, patch: Partial<Room>) => {
    setModel((current) => ({ ...current, rooms: current.rooms.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  };

  const updateRule = (mapName: "instructorRules" | "groupRules", key: string, patch: Partial<EntityRule>) => {
    setModel((current) => {
      const map = current[mapName];
      return { ...current, [mapName]: { ...map, [key]: { ...(map[key] || EMPTY_RULE), ...patch } } };
    });
  };

  const addCourse = () => {
    const id = `C${Date.now()}`;
    const item: CourseSection = {
      id,
      code: `UNI-${model.courses.length + 1}`,
      name: "درس جدید",
      instructors: ["استاد جدید"],
      studentGroups: ["ورودی جدید"],
      enrollment: 30,
      meetingsPerWeek: 2,
      duration: 1,
      roomType: "lecture",
      requiredFeatures: ["پروژکتور"],
      preferredRoomIds: [],
      fixedRoomId: "",
      fixedSlots: {},
      forbiddenSlots: [],
      preferredSlots: [],
      minDayGap: 2,
      roomConsistency: true,
      weekPattern: "all",
    };
    setModel((current) => ({ ...current, courses: [...current.courses, item] }));
  };

  const addRoom = () => {
    const id = `R${Date.now()}`;
    setModel((current) => ({
      ...current,
      rooms: [...current.rooms, { id, name: `کلاس ${current.rooms.length + 1}`, building: "ساختمان اصلی", capacity: 40, roomType: "lecture", features: ["پروژکتور"], unavailableSlots: [] }],
    }));
  };

  const currentAvailability = () => {
    if (availabilityOwner === "university") return { preferred: [], unavailable: model.settings.closedSlots };
    if (availabilityOwner === "instructor") {
      const rule = model.instructorRules[activeAvailabilityKey] || EMPTY_RULE;
      return { preferred: rule.preferredSlots, unavailable: rule.unavailableSlots };
    }
    if (availabilityOwner === "group") {
      const rule = model.groupRules[activeAvailabilityKey] || EMPTY_RULE;
      return { preferred: rule.preferredSlots, unavailable: rule.unavailableSlots };
    }
    if (availabilityOwner === "course") {
      const item = model.courses.find((course) => course.id === activeAvailabilityKey);
      return { preferred: item?.preferredSlots || [], unavailable: item?.forbiddenSlots || [] };
    }
    const room = model.rooms.find((item) => item.id === activeAvailabilityKey);
    return { preferred: [], unavailable: room?.unavailableSlots || [] };
  };

  const changeAvailability = (preferred: string[], unavailable: string[]) => {
    if (availabilityOwner === "university") {
      setModel((current) => ({ ...current, settings: { ...current.settings, closedSlots: unavailable } }));
    } else if (availabilityOwner === "instructor") {
      updateRule("instructorRules", activeAvailabilityKey, { preferredSlots: preferred, unavailableSlots: unavailable });
    } else if (availabilityOwner === "group") {
      updateRule("groupRules", activeAvailabilityKey, { preferredSlots: preferred, unavailableSlots: unavailable });
    } else if (availabilityOwner === "course") {
      updateCourse(activeAvailabilityKey, { preferredSlots: preferred, forbiddenSlots: unavailable });
    } else {
      updateRoom(activeAvailabilityKey, { unavailableSlots: unavailable });
    }
  };

  const exportCsv = () => {
    const header = ["کد درس", "نام درس", "جلسه", "استادان", "گروه‌های دانشجویی", "روز", "زمان شروع", "مدت", "کلاس", "ساختمان", "الگوی هفته", "رعایت ترجیح"];
    const rows = result.schedule.map((item) => [
      item.code,
      item.name,
      item.session,
      item.instructors.join(" | "),
      item.studentGroups.join(" | "),
      DAYS[item.day],
      TIME_LABELS[item.startPeriod],
      `${item.duration} بازه`,
      item.roomName,
      item.building,
      WEEK_PATTERN_LABELS[item.weekPattern],
      item.preferenceMet === null ? "تعریف‌نشده" : item.preferenceMet ? "رعایت‌شده" : "نقض‌شده",
    ]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    downloadText("darschin-university-timetable.csv", `\uFEFF${csv}`, "text/csv;charset=utf-8");
  };

  const openEditor = (target: EditorStep) => {
    setStep(target);
    setEditorOpen(true);
    window.setTimeout(() => document.querySelector(".editor-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 20);
  };

  const availability = currentAvailability();
  const selectedRule: EntityRule | null = availabilityOwner === "instructor"
    ? model.instructorRules[activeAvailabilityKey] || EMPTY_RULE
    : availabilityOwner === "group" ? model.groupRules[activeAvailabilityKey] || EMPTY_RULE : null;

  const weightLabels: Array<[keyof TimetableInput["weights"], string]> = [
    ["instructorPreference", "ترجیح استاد"],
    ["groupPreference", "ترجیح گروه دانشجویی"],
    ["coursePreference", "ترجیح خود درس"],
    ["spacing", "فاصله جلسات یک درس"],
    ["roomStability", "ثبات و ترجیح کلاس"],
    ["capacityWaste", "اتلاف ظرفیت"],
    ["latePeriod", "کلاس دیرهنگام"],
    ["gaps", "فاصله خالی برنامه"],
    ["softConflict", "تعارض نرم دروس"],
  ];

  return (
    <main dir="rtl" className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="صفحه اصلی درس‌چین">
          <span className="brand-mark" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <i key={index} />)}</span>
          <span><b>درس‌چین</b><small>زمان‌بندی دانشگاهی</small></span>
        </a>
        <nav><a href="#constraints">قیود فعال</a><a href="#guide">راهنما</a></nav>
        <span className="status"><i /> موتور قیود فعال</span>
      </header>

      <div id="top" className="workspace">
        <section className="input-panel">
          <div className="hero-copy">
            <span className="eyebrow">University Course Timetabling</span>
            <h1>برنامه هفتگی دانشگاه، بدون تداخل</h1>
            <p>گروه‌های درسی را به زمان و فضای مناسب تخصیص دهید؛ ظرفیت، تجهیزات، دسترسی استاد، تداخل دانشجویان و ترجیحات به‌صورت هم‌زمان کنترل می‌شوند.</p>
          </div>
          <div className="metrics">
            <div><span className="metric-icon">▰</span><strong>{toFa(model.courses.length)}</strong><small>گروه درسی</small></div>
            <div><span className="metric-icon">◫</span><strong>{toFa(eventCount)}</strong><small>جلسه هفتگی</small></div>
            <div><span className="metric-icon">●</span><strong>{toFa(instructors.length)}</strong><small>استاد</small></div>
            <div><span className="metric-icon">▦</span><strong>{toFa(model.rooms.length)}</strong><small>فضای آموزشی</small></div>
          </div>

          <div className="form-card">
            <div className="section-heading">
              <div><span>تعریف مسئله</span><h2>داده‌ها و سیاست‌های نیمسال</h2></div>
              <button className="sample-button" onClick={resetSample}>بازیابی نمونه دانشگاهی</button>
            </div>
            <div className="mode-switch" role="tablist">
              <button className={mode === "manual" ? "active" : ""} onClick={() => setMode("manual")}>ورود دستی</button>
              <button className={mode === "json" ? "active" : ""} onClick={() => setMode("json")}>ورود JSON</button>
            </div>

            {mode === "manual" ? <div className="summary-list">
              <button className="summary-row" onClick={() => openEditor("courses")}><span><b>گروه‌های درسی و جلسات</b><small>{toFa(model.courses.length)} درس · {toFa(eventCount)} جلسه</small></span><em>استاد، گروه دانشجویی، مدت، ظرفیت و نیاز فضایی</em><i>ویرایش</i></button>
              <button className="summary-row" onClick={() => openEditor("rooms")}><span><b>فضاهای آموزشی</b><small>{toFa(model.rooms.length)} فضا در {toFa(new Set(model.rooms.map((item) => item.building)).size)} ساختمان</small></span><em>ظرفیت، نوع، تجهیزات و زمان‌های رزروشده</em><i>ویرایش</i></button>
              <button className="summary-row" onClick={() => openEditor("availability")}><span><b>دسترسی و ترجیحات زمانی</b><small>دانشگاه، استاد، دانشجو، درس و اتاق</small></span><em>بازه ممنوع قید سخت است؛ بازه مطلوب جریمه نرم دارد</em><i>تنظیم</i></button>
              <button className="summary-row" onClick={() => openEditor("conflicts")}><span><b>تعارض صریح دروس</b><small>{toFa(model.conflicts.filter((item) => item.kind === "hard").length)} سخت · {toFa(model.conflicts.filter((item) => item.kind === "soft").length)} نرم</small></span><em>مناسب دروس اختیاری یا اشتراک دانشجویان نامعلوم</em><i>تنظیم</i></button>
              <button className="summary-row" onClick={() => openEditor("settings")}><span><b>سیاست‌ها و وزن تابع هدف</b><small>{toFa(model.settings.dayCount)} روز × {toFa(model.settings.timeCount)} بازه</small></span><em>فاصله جلسات، جابه‌جایی ساختمان و سقف بار روزانه</em><i>تنظیم</i></button>
            </div> : <div className="json-box">
              <label htmlFor="json-input">مدل کامل دانشگاه را وارد کنید؛ دکمه الگو، ساختار معتبر فعلی را نمایش می‌دهد.</label>
              <textarea id="json-input" value={jsonText} onChange={(event) => setJsonText(event.target.value)} placeholder='{"courses": [...], "rooms": [...], "instructorRules": {...}, "settings": {...}}' />
              <div className="json-actions">
                <button className="outline-action" onClick={() => setJsonText(JSON.stringify(model, null, 2))}>نمایش الگوی فعلی</button>
                <button className="outline-action" onClick={importJson}>خواندن JSON</button>
                <button className="outline-action" onClick={() => downloadText("darschin-input.json", JSON.stringify(model, null, 2), "application/json;charset=utf-8")}>دریافت JSON</button>
              </div>
            </div>}

            <button className="primary-action" onClick={runSolver} disabled={solving}>
              {solving ? "در حال جست‌وجوی برنامه بهتر…" : "حل مسئله و ساخت برنامه"}<span>{solving ? "◌" : "←"}</span>
            </button>
            <p className="action-note" role="status">{notice}</p>
          </div>
        </section>

        <section className="preview-column" ref={resultRef}>
          <div className="schedule-card">
            <div className="card-title">
              <div><span>{result.unscheduled.length || result.validationErrors.length ? "نیازمند بازبینی" : "خروجی معتبر"}</span><h2>برنامه هفتگی نیمسال</h2></div>
              <span className={result.unscheduled.length || result.hardViolations.length ? "warning-badge" : "success-badge"}>
                {result.unscheduled.length ? `${toFa(result.unscheduled.length)} جلسه تخصیص نیافت` : result.hardViolations.length ? `${toFa(result.hardViolations.length)} نقض سخت` : "✓ بدون نقض قید سخت"}
              </span>
            </div>
            <div className="result-toolbar">
              <div className="view-tabs">{[
                ["all", "همه"], ["instructor", "استاد"], ["group", "ورودی"], ["course", "درس"], ["room", "فضا"],
              ].map(([key, label]) => <button key={key} className={view === key ? "active" : ""} onClick={() => { setView(key as ResultView); setEntity(""); }}>{label}</button>)}</div>
              {view !== "all" && <select value={activeEntity} onChange={(event) => setEntity(event.target.value)}>{viewOptions.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select>}
              <button className="download-button" onClick={exportCsv} disabled={!result.schedule.length}>دریافت CSV</button>
            </div>
            <div className="schedule-scroll"><ScheduleGrid items={visibleSchedule} dayCount={model.settings.dayCount} timeCount={model.settings.timeCount} /></div>
          </div>

          <div className="quality-card">
            <div className="quality-title"><span>کنترل کیفیت</span><h2>شاخص‌های جواب</h2></div>
            <div className="quality-metrics">
              <div><small>جلسات تخصیص‌یافته</small><strong>{toFa(result.schedule.length)}</strong></div>
              <div><small>نقض سخت</small><strong>{toFa(result.hardViolations.length)}</strong></div>
              <div><small>رعایت ترجیحات</small><strong>{toFa(result.preferenceRate)}٪</strong></div>
              <div><small>بهره‌وری ظرفیت</small><strong>{toFa(result.roomUtilization)}٪</strong></div>
              <div><small>تابع جریمه</small><strong>{toFa(result.objective)}</strong></div>
            </div>
            <div className="penalty-tags">
              <span>ترجیح استاد: {toFa(result.breakdown.instructorPreference)}</span>
              <span>ترجیح دانشجو: {toFa(result.breakdown.groupPreference)}</span>
              <span>فاصله جلسات: {toFa(result.breakdown.spacing)}</span>
              <span>فاصله خالی: {toFa(result.breakdown.gaps)}</span>
              <span>ثبات کلاس: {toFa(result.breakdown.roomStability)}</span>
              <span>تعارض نرم: {toFa(result.breakdown.softConflict)}</span>
              <span>زمان حل: {result.durationMs.toLocaleString("fa-IR")} ms</span>
            </div>
          </div>

          {(result.unscheduled.length > 0 || result.validationErrors.length > 0 || result.hardViolations.length > 0) && <div className="diagnostic-card">
            <div><span>گزارش امکان‌پذیری</span><h2>موارد نیازمند اصلاح</h2></div>
            {result.validationErrors.map((error) => <p key={error}>• {error}</p>)}
            {result.hardViolations.map((error) => <p key={error}>• {error}</p>)}
            {result.unscheduled.map((item) => <details key={item.eventId}><summary>{item.label}</summary><ul>{item.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></details>)}
          </div>}
        </section>
      </div>

      {editorOpen && <section className="editor-section" aria-label="ویرایش داده‌های دانشگاه">
        <div className="editor-header"><div><span>مدل برنامه‌ریزی</span><h2>تعریف داده‌ها و قیود</h2></div><button aria-label="بستن" onClick={() => setEditorOpen(false)}>×</button></div>
        <div className="step-tabs">
          <button className={step === "courses" ? "active" : ""} onClick={() => setStep("courses")}>۱. دروس</button>
          <button className={step === "rooms" ? "active" : ""} onClick={() => setStep("rooms")}>۲. فضاها</button>
          <button className={step === "availability" ? "active" : ""} onClick={() => setStep("availability")}>۳. دسترسی زمانی</button>
          <button className={step === "conflicts" ? "active" : ""} onClick={() => setStep("conflicts")}>۴. تعارض دروس</button>
          <button className={step === "settings" ? "active" : ""} onClick={() => setStep("settings")}>۵. سیاست‌ها</button>
        </div>

        {step === "courses" && <div>
          <div className="table-help">نام‌های چند استاد، چند گروه دانشجویی و چند تجهیز را با ویرگول جدا کنید. زمان ثابت با قالب <code>1=0-1</code> یعنی جلسه اول، شنبه، بازه دوم است.</div>
          <div className="data-table-wrap"><table className="data-table course-table"><thead><tr>
            <th>کد</th><th>نام درس</th><th>استادان</th><th>گروه‌های دانشجویی</th><th>تعداد</th><th>جلسه/هفته</th><th>مدت</th><th>نوع فضا</th><th>تجهیزات</th><th>کلاس ثابت</th><th>زمان ثابت</th><th>فاصله روز</th><th>هفته</th><th>کلاس یکسان</th><th></th>
          </tr></thead><tbody>{model.courses.map((item) => <tr key={item.id}>
            <td><input value={item.code} onChange={(event) => updateCourse(item.id, { code: event.target.value })} /></td>
            <td><input value={item.name} onChange={(event) => updateCourse(item.id, { name: event.target.value })} /></td>
            <td><input value={listText(item.instructors)} onChange={(event) => updateCourse(item.id, { instructors: splitList(event.target.value) })} /></td>
            <td><input value={listText(item.studentGroups)} onChange={(event) => updateCourse(item.id, { studentGroups: splitList(event.target.value) })} /></td>
            <td><input className="number-input" type="number" min="1" value={item.enrollment} onChange={(event) => updateCourse(item.id, { enrollment: Math.max(1, Number(event.target.value)) })} /></td>
            <td><input className="number-input" type="number" min="1" max="10" value={item.meetingsPerWeek} onChange={(event) => updateCourse(item.id, { meetingsPerWeek: Math.max(1, Number(event.target.value)) })} /></td>
            <td><input className="number-input" type="number" min="1" max={model.settings.timeCount} value={item.duration} onChange={(event) => updateCourse(item.id, { duration: Math.max(1, Number(event.target.value)) })} /></td>
            <td><select value={item.roomType} onChange={(event) => updateCourse(item.id, { roomType: event.target.value as RoomType })}>{Object.entries(ROOM_TYPE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></td>
            <td><input value={listText(item.requiredFeatures)} onChange={(event) => updateCourse(item.id, { requiredFeatures: splitList(event.target.value) })} /></td>
            <td><select value={item.fixedRoomId} onChange={(event) => updateCourse(item.id, { fixedRoomId: event.target.value })}><option value="">بدون الزام</option>{model.rooms.map((room) => <option value={room.id} key={room.id}>{room.name}</option>)}</select></td>
            <td><input className="fixed-input" value={fixedSlotsText(item.fixedSlots)} placeholder="1=0-1" onChange={(event) => updateCourse(item.id, { fixedSlots: parseFixedSlots(event.target.value) })} /></td>
            <td><input className="number-input" type="number" min="0" max="6" value={item.minDayGap} onChange={(event) => updateCourse(item.id, { minDayGap: Math.max(0, Number(event.target.value)) })} /></td>
            <td><select value={item.weekPattern} onChange={(event) => updateCourse(item.id, { weekPattern: event.target.value as WeekPattern })}>{Object.entries(WEEK_PATTERN_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></td>
            <td className="check-cell"><input type="checkbox" checked={item.roomConsistency} onChange={(event) => updateCourse(item.id, { roomConsistency: event.target.checked })} /></td>
            <td><button className="remove" onClick={() => setModel((current) => ({ ...current, courses: current.courses.filter((course) => course.id !== item.id), conflicts: current.conflicts.filter((conflict) => conflict.firstCourseId !== item.id && conflict.secondCourseId !== item.id) }))}>حذف</button></td>
          </tr>)}</tbody></table></div>
          <button className="add-row" onClick={addCourse}>+ افزودن گروه درسی</button>
        </div>}

        {step === "rooms" && <div>
          <div className="table-help">نوع فضا، ظرفیت و تمام تجهیزات موردنیاز درس باید با کلاس سازگار باشند. رزروهای زمانی را در مرحله دسترسی تعریف کنید.</div>
          <div className="data-table-wrap"><table className="data-table room-table"><thead><tr><th>نام فضا</th><th>ساختمان</th><th>ظرفیت</th><th>نوع فضا</th><th>تجهیزات</th><th></th></tr></thead><tbody>{model.rooms.map((item) => <tr key={item.id}>
            <td><input value={item.name} onChange={(event) => updateRoom(item.id, { name: event.target.value })} /></td>
            <td><input value={item.building} onChange={(event) => updateRoom(item.id, { building: event.target.value })} /></td>
            <td><input className="number-input" type="number" min="1" value={item.capacity} onChange={(event) => updateRoom(item.id, { capacity: Math.max(1, Number(event.target.value)) })} /></td>
            <td><select value={item.roomType} onChange={(event) => updateRoom(item.id, { roomType: event.target.value as Room["roomType"] })}>{Object.entries(ROOM_TYPE_LABELS).filter(([value]) => value !== "any").map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></td>
            <td><input value={listText(item.features)} onChange={(event) => updateRoom(item.id, { features: splitList(event.target.value) })} /></td>
            <td><button className="remove" onClick={() => setModel((current) => ({ ...current, rooms: current.rooms.filter((room) => room.id !== item.id), courses: current.courses.map((course) => course.fixedRoomId === item.id ? { ...course, fixedRoomId: "" } : course) }))}>حذف</button></td>
          </tr>)}</tbody></table></div>
          <button className="add-row" onClick={addRoom}>+ افزودن فضای آموزشی</button>
        </div>}

        {step === "availability" && <div className="availability-editor">
          <div className="availability-toolbar">
            <label>نوع منبع<select value={availabilityOwner} onChange={(event) => { setAvailabilityOwner(event.target.value as AvailabilityOwner); setAvailabilityKey(""); }}>
              <option value="university">کل دانشگاه</option><option value="instructor">استاد</option><option value="group">گروه دانشجویی</option><option value="course">درس</option><option value="room">فضای آموزشی</option>
            </select></label>
            <label>مورد<select value={activeAvailabilityKey} onChange={(event) => setAvailabilityKey(event.target.value)}>{availabilityOptions.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
            {selectedRule && <><label>حداکثر بازه روزانه<input type="number" min="0" value={selectedRule.maxDailyPeriods} placeholder="۰ = عمومی" onChange={(event) => updateRule(availabilityOwner === "instructor" ? "instructorRules" : "groupRules", activeAvailabilityKey, { maxDailyPeriods: Math.max(0, Number(event.target.value)) })} /></label><label>حداکثر متوالی<input type="number" min="0" value={selectedRule.maxConsecutivePeriods} onChange={(event) => updateRule(availabilityOwner === "instructor" ? "instructorRules" : "groupRules", activeAvailabilityKey, { maxConsecutivePeriods: Math.max(0, Number(event.target.value)) })} /></label></>}
          </div>
          <div className="rule-legend"><span><i className="free" /> آزاد</span>{availabilityOwner !== "university" && availabilityOwner !== "room" && <span><i className="preferred" /> مطلوب؛ قید نرم</span>}<span><i className="unavailable" /> ممنوع؛ قید سخت</span><small>برای تغییر وضعیت هر خانه روی آن کلیک کنید.</small></div>
          <SlotRuleGrid preferred={availability.preferred} unavailable={availability.unavailable} dayCount={model.settings.dayCount} timeCount={model.settings.timeCount} allowPreferred={availabilityOwner !== "university" && availabilityOwner !== "room"} onChange={changeAvailability} />
        </div>}

        {step === "conflicts" && <div className="conflict-editor">
          <div className="table-help">تعارض سخت، هم‌زمانی دو درس را ممنوع می‌کند. تعارض نرم با وزن بالاتر، هم‌زمانی را نامطلوب‌تر می‌کند ولی اگر لازم باشد اجازه می‌دهد.</div>
          {model.conflicts.map((item) => <div className="conflict-row" key={item.id}>
            <select value={item.firstCourseId} onChange={(event) => setModel((current) => ({ ...current, conflicts: current.conflicts.map((conflict) => conflict.id === item.id ? { ...conflict, firstCourseId: event.target.value } : conflict) }))}>{model.courses.map((course) => <option value={course.id} key={course.id}>{course.code} — {course.name}</option>)}</select>
            <span>با</span>
            <select value={item.secondCourseId} onChange={(event) => setModel((current) => ({ ...current, conflicts: current.conflicts.map((conflict) => conflict.id === item.id ? { ...conflict, secondCourseId: event.target.value } : conflict) }))}>{model.courses.map((course) => <option value={course.id} key={course.id}>{course.code} — {course.name}</option>)}</select>
            <select value={item.kind} onChange={(event) => setModel((current) => ({ ...current, conflicts: current.conflicts.map((conflict) => conflict.id === item.id ? { ...conflict, kind: event.target.value as ConflictKind } : conflict) }))}><option value="hard">سخت؛ ممنوع</option><option value="soft">نرم؛ جریمه</option></select>
            <label>وزن داخلی<input type="number" min="0" value={item.weight} onChange={(event) => setModel((current) => ({ ...current, conflicts: current.conflicts.map((conflict) => conflict.id === item.id ? { ...conflict, weight: Math.max(0, Number(event.target.value)) } : conflict) }))} /></label>
            <button className="remove" onClick={() => setModel((current) => ({ ...current, conflicts: current.conflicts.filter((conflict) => conflict.id !== item.id) }))}>حذف</button>
          </div>)}
          <button className="add-row" disabled={model.courses.length < 2} onClick={() => setModel((current) => ({ ...current, conflicts: [...current.conflicts, { id: `CF${Date.now()}`, firstCourseId: current.courses[0]?.id || "", secondCourseId: current.courses[1]?.id || "", kind: "soft", weight: 1 }] }))}>+ افزودن تعارض</button>
        </div>}

        {step === "settings" && <div className="settings-editor">
          <div className="settings-grid">
            <label>تعداد روز آموزشی<select value={model.settings.dayCount} onChange={(event) => setModel((current) => ({ ...current, settings: { ...current.settings, dayCount: Number(event.target.value) } }))}>{[1, 2, 3, 4, 5, 6].map((value) => <option value={value} key={value}>{toFa(value)} روز</option>)}</select></label>
            <label>تعداد بازه در روز<select value={model.settings.timeCount} onChange={(event) => setModel((current) => ({ ...current, settings: { ...current.settings, timeCount: Number(event.target.value) } }))}>{[1, 2, 3, 4, 5, 6, 7].map((value) => <option value={value} key={value}>{toFa(value)} بازه</option>)}</select></label>
            <label>حداکثر بار روزانه استاد<input type="number" min="0" value={model.settings.maxInstructorDailyPeriods} onChange={(event) => setModel((current) => ({ ...current, settings: { ...current.settings, maxInstructorDailyPeriods: Math.max(0, Number(event.target.value)) } }))} /></label>
            <label>حداکثر بار روزانه دانشجو<input type="number" min="0" value={model.settings.maxGroupDailyPeriods} onChange={(event) => setModel((current) => ({ ...current, settings: { ...current.settings, maxGroupDailyPeriods: Math.max(0, Number(event.target.value)) } }))} /></label>
            <label>حداکثر تدریس متوالی استاد<input type="number" min="0" value={model.settings.maxInstructorConsecutivePeriods} onChange={(event) => setModel((current) => ({ ...current, settings: { ...current.settings, maxInstructorConsecutivePeriods: Math.max(0, Number(event.target.value)) } }))} /></label>
            <label>حداکثر کلاس متوالی دانشجو<input type="number" min="0" value={model.settings.maxGroupConsecutivePeriods} onChange={(event) => setModel((current) => ({ ...current, settings: { ...current.settings, maxGroupConsecutivePeriods: Math.max(0, Number(event.target.value)) } }))} /></label>
            <label>بازه لازم برای تغییر ساختمان<input type="number" min="0" max="4" value={model.settings.travelBufferPeriods} onChange={(event) => setModel((current) => ({ ...current, settings: { ...current.settings, travelBufferPeriods: Math.max(0, Number(event.target.value)) } }))} /></label>
            <label>تعداد تلاش موتور<input type="number" min="20" max="1000" value={model.settings.attempts} onChange={(event) => setModel((current) => ({ ...current, settings: { ...current.settings, attempts: Math.max(20, Number(event.target.value)) } }))} /></label>
          </div>
          <div className="policy-switches">
            <label><input type="checkbox" checked={model.settings.separateCourseMeetings} onChange={(event) => setModel((current) => ({ ...current, settings: { ...current.settings, separateCourseMeetings: event.target.checked } }))} /><span><b>جلسات یک درس در روزهای متفاوت</b><small>قید سخت</small></span></label>
            <label><input type="checkbox" checked={model.settings.minimumDayGapIsHard} onChange={(event) => setModel((current) => ({ ...current, settings: { ...current.settings, minimumDayGapIsHard: event.target.checked } }))} /><span><b>حداقل فاصله روزانه الزام‌آور باشد</b><small>در حالت خاموش، جریمه نرم است</small></span></label>
          </div>
          <div className="weight-section"><div><span>تابع هدف</span><h3>وزن جریمه‌های نرم</h3></div><div className="weight-grid">{weightLabels.map(([key, label]) => <label key={key}>{label}<input type="number" min="0" value={model.weights[key]} onChange={(event) => setModel((current) => ({ ...current, weights: { ...current.weights, [key]: Math.max(0, Number(event.target.value)) } }))} /></label>)}</div></div>
          <div className="constraint-note"><strong>قیود سخت همیشه فعال</strong><p>تخصیص یکتای جلسه، پیوستگی مدت، عدم تداخل استاد/دانشجو/اتاق، ظرفیت، نوع و تجهیزات فضا، زمان ممنوع، کلاس و زمان ثابت، هفته زوج/فرد، سقف بار و جابه‌جایی ساختمان. وزن‌ها فقط کیفیت جواب‌های امکان‌پذیر را رتبه‌بندی می‌کنند.</p></div>
        </div>}

        <div className="editor-footer"><button className="outline-action" onClick={() => setEditorOpen(false)}>ثبت تغییرات</button><button className="primary-compact" onClick={() => { setEditorOpen(false); runSolver(); }}>ثبت و حل مسئله</button></div>
      </section>}

      <section id="constraints" className="constraint-strip">
        <div><span>قید سخت</span><strong>منابع بدون تداخل</strong><p>استاد، گروه دانشجویی، فضا و تجهیزات مشترک</p></div>
        <div><span>قید سخت</span><strong>امکان‌پذیری فضا</strong><p>ظرفیت، نوع کلاس، تجهیزات، مدت و زمان دسترسی</p></div>
        <div><span>قید نرم</span><strong>کیفیت برنامه</strong><p>ترجیحات، فاصله جلسات، ثبات اتاق و کاهش زمان‌های خالی</p></div>
      </section>
      <section id="guide" className="guide-strip">
        <div><b>۱</b><span><strong>داده‌ها را تعریف کنید</strong><small>گروه درسی، استاد، دانشجو و فضا</small></span></div>
        <div><b>۲</b><span><strong>قواعد نیمسال را تنظیم کنید</strong><small>دسترسی، تعارض‌ها و وزن‌ها</small></span></div>
        <div><b>۳</b><span><strong>برنامه را حل و کنترل کنید</strong><small>نمای هفتگی، تشخیص بن‌بست و CSV</small></span></div>
      </section>
      <footer><strong>درس‌چین</strong><span>موتور مستقل زمان‌بندی دروس دانشگاهی مبتنی بر قیود سخت و ترجیحات وزنی</span></footer>
    </main>
  );
}
