import { useMemo, useState } from "react";
import { EMPTY_TIME_RULES, ROOM_TYPE_LABELS, WEEK_PATTERN_LABELS } from "../domain/constants";
import { makeSession } from "../domain/defaults";
import type { CourseSection, RoomType, TimetableInput, WeekPattern, WeeklySession } from "../domain/types";
import { EquipmentPicker, FixedSlotSelect, HelpText, RankedRoomPicker, TimeRulesEditor } from "./FormControls";

export function CourseEditor({ input, onChange }: { input: TimetableInput; onChange: (next: TimetableInput) => void }) {
  const [draft, setDraft] = useState({ groupNumber: "", code: "", name: "" });
  const used = useMemo(() => new Set([...input.courses.map((item) => item.groupNumber), ...input.retiredGroupNumbers]), [input]);
  const draftNumber = Number(draft.groupNumber);
  const draftReady = Number.isInteger(draftNumber) && draftNumber > 0 && !used.has(draftNumber) && Boolean(draft.code.trim()) && Boolean(draft.name.trim());

  const addCourse = () => {
    if (!draftReady) return;
    const defaults = {
      instructorId: input.instructors[0]?.id ?? "",
      studentGroupId: input.studentGroups[0]?.id ?? "",
      enrollment: input.studentGroups[0]?.size ?? 1,
      durationPeriods: 1,
      allowBreakCrossing: false,
      roomType: "lecture" as RoomType,
      requiredEquipmentIds: [],
      preferredEquipmentIds: [],
      weekPattern: "all" as WeekPattern,
    };
    const id = `course-${crypto.randomUUID()}`;
    const course: CourseSection = { id, groupNumber: draftNumber, code: draft.code.trim(), name: draft.name.trim(), defaults, sessions: [makeSession(`session-${crypto.randomUUID()}`, "جلسه ۱", defaults)] };
    onChange({ ...input, courses: [...input.courses, course] });
    setDraft({ groupNumber: "", code: "", name: "" });
  };

  const updateCourse = (id: string, patch: Partial<CourseSection>) => onChange({ ...input, courses: input.courses.map((course) => course.id === id ? { ...course, ...patch } : course) });
  const updateSession = (courseId: string, sessionId: string, patch: Partial<WeeklySession>) => onChange({ ...input, courses: input.courses.map((course) => course.id === courseId ? { ...course, sessions: course.sessions.map((session) => session.id === sessionId ? { ...session, ...patch } : session) } : course) });

  return <section className="editor-panel" aria-labelledby="courses-title">
    <header className="section-title"><div><span>مرحله ۱</span><h2 id="courses-title">گروه‌های درسی و جلسات</h2></div><p>هر ارائهٔ مستقل یک گروه درسی است و هر نوبت هفتگی آن یک جلسه. تنظیمات هر جلسه می‌تواند با پیش‌فرض گروه متفاوت باشد.</p></header>
    <aside className="step-guide"><strong>ترتیب پیشنهادی تکمیل</strong><ol><li>شماره گروه، کد و نام درس را وارد کنید.</li><li>پیش‌فرض جلسات جدید را یک‌بار تنظیم کنید.</li><li>جلسه‌های هفتگی را اضافه و فقط تفاوت‌های هر جلسه را اصلاح کنید.</li></ol><p><b>مثال:</b> یک درس سه‌واحدی می‌تواند دو جلسه داشته باشد: یکی شنبه ثابت و دیگری متغیر.</p></aside>

    <div className="create-row">
      <label>شماره گروه<input inputMode="numeric" placeholder="مثلاً ۱۰۱" value={draft.groupNumber} onChange={(event) => setDraft({ ...draft, groupNumber: event.target.value.replace(/\D/g, "") })} /><HelpText>در همین نیمسال یکتا است و پس از ایجاد تغییر نمی‌کند.</HelpText></label>
      <label>کد درس<input placeholder="مثلاً CS-203" value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} /><HelpText>کدی که در چارت درسی و خروجی رسمی استفاده می‌کنید.</HelpText></label>
      <label>نام درس<input placeholder="مثلاً پایگاه داده" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /><HelpText>عنوان خوانای درس برای مدیر گروه و استادان.</HelpText></label>
      <button type="button" className="primary-small" disabled={!draftReady} onClick={addCourse}>افزودن گروه درسی</button>
    </div>
    {used.has(draftNumber) && draft.groupNumber && <p className="field-error">این شماره گروه قبلاً استفاده شده است؛ شمارهٔ دیگری انتخاب کنید.</p>}
    {!input.courses.length && <div className="empty-state"><strong>هنوز گروه درسی ثبت نشده است.</strong><p>فرم بالا را تکمیل کنید. پس از افزودن، اولین جلسه به‌صورت خودکار ساخته می‌شود.</p></div>}

    <div className="course-stack">
      {input.courses.map((course) => <article className="course-card" key={course.id}>
        <div className="course-heading"><div><span>گروه {course.groupNumber.toLocaleString("fa-IR")}</span><h3>{course.code} — {course.name}</h3><small>{course.sessions.length.toLocaleString("fa-IR")} جلسهٔ هفتگی</small></div><button type="button" className="danger-button" onClick={() => { if (!window.confirm(`گروه ${course.groupNumber} و همهٔ جلسه‌های آن حذف شود؟\n\nشمارهٔ گروه در همین داده دوباره قابل استفاده نخواهد بود و تعارض‌های وابسته نیز پاک می‌شوند.`)) return; onChange({ ...input, retiredGroupNumbers: [...new Set([...input.retiredGroupNumbers, course.groupNumber])], courses: input.courses.filter((item) => item.id !== course.id), conflicts: input.conflicts.filter((item) => item.firstCourseId !== course.id && item.secondCourseId !== course.id) }); }}>حذف گروه درسی</button></div>
        <div className="two-columns compact-fields"><label>کد درس<input value={course.code} onChange={(event) => updateCourse(course.id, { code: event.target.value })} /></label><label>نام درس<input value={course.name} onChange={(event) => updateCourse(course.id, { name: event.target.value })} /></label></div>

        <details className="defaults-box"><summary>پیش‌فرض جلسه‌های جدید <small>فقط برای جلسه‌هایی که بعداً اضافه می‌شوند</small></summary><div className="responsive-fields">
          <label>استاد پیش‌فرض<select value={course.defaults.instructorId} onChange={(event) => updateCourse(course.id, { defaults: { ...course.defaults, instructorId: event.target.value } })}>{input.instructors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><HelpText>در هر جلسه قابل تغییر است.</HelpText></label>
          <label>گروه دانشجویی پیش‌فرض<select value={course.defaults.studentGroupId} onChange={(event) => updateCourse(course.id, { defaults: { ...course.defaults, studentGroupId: event.target.value } })}>{input.studentGroups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><HelpText>هر جلسه فقط یک گروه دانشجویی دارد.</HelpText></label>
          <label>تعداد دانشجو<input type="number" min="1" value={course.defaults.enrollment} onChange={(event) => updateCourse(course.id, { defaults: { ...course.defaults, enrollment: Math.max(1, Number(event.target.value)) } })} /><HelpText>برای کنترل سخت ظرفیت اتاق.</HelpText></label>
          <label>مدت جلسه<input type="number" min="1" max={input.periods.length} value={course.defaults.durationPeriods} onChange={(event) => updateCourse(course.id, { defaults: { ...course.defaults, durationPeriods: Math.max(1, Math.min(input.periods.length, Number(event.target.value))) } })} /><HelpText>تعداد بازه‌های آموزشی متوالی.</HelpText></label>
          <label>نوع فضا<select value={course.defaults.roomType} onChange={(event) => updateCourse(course.id, { defaults: { ...course.defaults, roomType: event.target.value as RoomType } })}>{Object.entries(ROOM_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>الگوی هفته<select value={course.defaults.weekPattern} onChange={(event) => updateCourse(course.id, { defaults: { ...course.defaults, weekPattern: event.target.value as WeekPattern } })}>{Object.entries(WEEK_PATTERN_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><HelpText>زوج و فرد می‌توانند یک زمان و اتاق مشترک داشته باشند.</HelpText></label>
        </div><div className="picker-pair"><EquipmentPicker equipment={input.equipment} value={course.defaults.requiredEquipmentIds} onChange={(requiredEquipmentIds) => updateCourse(course.id, { defaults: { ...course.defaults, requiredEquipmentIds } })} label="تجهیزات الزامی پیش‌فرض" help="نبود هرکدام، اتاق را به‌طور سخت رد می‌کند." /><EquipmentPicker equipment={input.equipment} value={course.defaults.preferredEquipmentIds} onChange={(preferredEquipmentIds) => updateCourse(course.id, { defaults: { ...course.defaults, preferredEquipmentIds } })} label="تجهیزات ترجیحی پیش‌فرض" help="نبود آن‌ها فقط جریمه ایجاد می‌کند." /></div><label className="inline-check defaults-break"><input type="checkbox" checked={course.defaults.allowBreakCrossing} onChange={(event) => updateCourse(course.id, { defaults: { ...course.defaults, allowBreakCrossing: event.target.checked } })} />جلسهٔ چندبازه‌ای می‌تواند از وقفه عبور کند</label></details>

        <div className="session-stack">{course.sessions.map((session, sessionIndex) => <details className="session-card" key={session.id} open={sessionIndex === 0}><summary><span>{session.label}</span><small>{session.fixedSlot ? "زمان ثابت" : "زمان متغیر"} · {session.durationPeriods.toLocaleString("fa-IR")} بازه · {WEEK_PATTERN_LABELS[session.weekPattern]}</small></summary>
          <div className="session-explainer"><strong>این جلسه یک نوبت مستقل است.</strong><span>استاد، گروه دانشجویی، مدت، زمان، اتاق و تجهیزات زیر فقط برای همین جلسه اعمال می‌شوند.</span></div>
          <div className="responsive-fields session-fields">
            <label>عنوان جلسه<input value={session.label} onChange={(event) => updateSession(course.id, session.id, { label: event.target.value })} /><HelpText>مثال: «جلسه نظری»، «آزمایشگاه» یا «گروه عملی الف».</HelpText></label>
            <label>استاد<select value={session.instructorId} onChange={(event) => updateSession(course.id, session.id, { instructorId: event.target.value })}>{input.instructors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>گروه دانشجویی<select value={session.studentGroupId} onChange={(event) => updateSession(course.id, session.id, { studentGroupId: event.target.value })}>{input.studentGroups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>تعداد دانشجو<input type="number" min="1" value={session.enrollment} onChange={(event) => updateSession(course.id, session.id, { enrollment: Math.max(1, Number(event.target.value)) })} /><HelpText>ظرفیت اتاق باید حداقل این مقدار باشد.</HelpText></label>
            <label>مدت جلسه<input type="number" min="1" max={input.periods.length} value={session.durationPeriods} onChange={(event) => updateSession(course.id, session.id, { durationPeriods: Math.max(1, Math.min(input.periods.length, Number(event.target.value))) })} /><HelpText>مثال: آزمایشگاه معمولاً ۲ بازه است.</HelpText></label>
            <label>نوع فضا<select value={session.roomType} onChange={(event) => updateSession(course.id, session.id, { roomType: event.target.value as RoomType })}>{Object.entries(ROOM_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>الگوی هفته<select value={session.weekPattern} onChange={(event) => updateSession(course.id, session.id, { weekPattern: event.target.value as WeekPattern })}>{Object.entries(WEEK_PATTERN_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <FixedSlotSelect input={input} value={session.fixedSlot} onChange={(fixedSlot) => updateSession(course.id, session.id, { fixedSlot })} />
            <label>اتاق ثابت<select value={session.fixedRoomId ?? ""} onChange={(event) => updateSession(course.id, session.id, { fixedRoomId: event.target.value || null })}><option value="">حل‌کننده اتاق را انتخاب کند</option>{input.rooms.map((room) => <option key={room.id} value={room.id}>{room.name} · {room.building}</option>)}</select><HelpText>اتاق ثابت قید سخت است. برای ترجیح، از فهرست رتبه‌بندی زیر استفاده کنید.</HelpText></label>
          </div>
          <div className="picker-pair"><RankedRoomPicker rooms={input.rooms} value={session.preferredRoomIds} onChange={(preferredRoomIds) => updateSession(course.id, session.id, { preferredRoomIds })} /><div className="equipment-stack"><EquipmentPicker equipment={input.equipment} value={session.requiredEquipmentIds} onChange={(requiredEquipmentIds) => updateSession(course.id, session.id, { requiredEquipmentIds })} label="تجهیزات الزامی جلسه" help="نبود تجهیز، اتاق را غیرقابل استفاده می‌کند." /><EquipmentPicker equipment={input.equipment} value={session.preferredEquipmentIds} onChange={(preferredEquipmentIds) => updateSession(course.id, session.id, { preferredEquipmentIds })} label="تجهیزات ترجیحی جلسه" help="نبود تجهیز فقط جریمه ایجاد می‌کند." /></div></div>
          <TimeRulesEditor input={input} rules={session.timeRules} onChange={(timeRules) => updateSession(course.id, session.id, { timeRules })} subjectLabel={`جلسهٔ «${session.label}»`} />
          <div className="check-row"><label><input type="checkbox" checked={session.required} onChange={(event) => updateSession(course.id, session.id, { required: event.target.checked })} />جلسه اجباری است</label><label><input type="checkbox" checked={session.allowBreakCrossing} onChange={(event) => updateSession(course.id, session.id, { allowBreakCrossing: event.target.checked })} />عبور از وقفه مجاز است</label><button type="button" className="danger-button" disabled={course.sessions.length === 1} title={course.sessions.length === 1 ? "هر گروه درسی باید حداقل یک جلسه داشته باشد؛ برای حذف آخرین جلسه، گروه درسی را حذف کنید." : undefined} onClick={() => { if (!window.confirm(`جلسهٔ «${session.label}» حذف شود؟`)) return; updateCourse(course.id, { sessions: course.sessions.filter((item) => item.id !== session.id) }); }}>حذف جلسه</button>{course.sessions.length === 1 && <small>حداقل یک جلسه برای هر گروه لازم است.</small>}</div>
        </details>)}</div>
        <button type="button" className="secondary-button" onClick={() => updateCourse(course.id, { sessions: [...course.sessions, makeSession(`session-${crypto.randomUUID()}`, `جلسه ${course.sessions.length + 1}`, course.defaults, { timeRules: structuredClone(EMPTY_TIME_RULES) })] })}>افزودن جلسه از پیش‌فرض‌ها</button>
      </article>)}
    </div>
  </section>;
}
