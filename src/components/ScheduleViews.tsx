import { useMemo, useState } from "react";
import { WEEK_PATTERN_LABELS } from "../domain/constants";
import { moveSessionManually } from "../domain/manualEdit";
import type { ScheduleItem, SolveResult, TimetableInput } from "../domain/types";

export function ScheduleViews({ input, result, onResultChange }: { input: TimetableInput; result: SolveResult; onResultChange: (next: SolveResult) => void }) {
  const [view, setView] = useState<"visual" | "table">("visual");
  const [filter, setFilter] = useState<"all" | "instructor" | "group" | "course" | "room">("all");
  const [entity, setEntity] = useState("");
  const options = useMemo(() => {
    if (filter === "instructor") return input.instructors.map((item) => ({ value: item.id, label: item.name }));
    if (filter === "group") return input.studentGroups.map((item) => ({ value: item.id, label: item.name }));
    if (filter === "course") return input.courses.map((item) => ({ value: item.id, label: `${item.code} / گروه ${item.groupNumber}` }));
    if (filter === "room") return input.rooms.map((item) => ({ value: item.id, label: item.name }));
    return [];
  }, [filter, input]);
  const activeEntity = options.some((item) => item.value === entity) ? entity : options[0]?.value ?? "";
  const items = result.schedule.filter((item) => filter === "all"
    || (filter === "instructor" && item.instructorId === activeEntity)
    || (filter === "group" && item.studentGroupId === activeEntity)
    || (filter === "course" && item.courseId === activeEntity)
    || (filter === "room" && item.roomId === activeEntity));

  return <section className="result-card" aria-labelledby="schedule-title">
    <header className="card-header"><div><span>برنامهٔ هفتگی</span><h2 id="schedule-title">نتیجهٔ قابل بررسی</h2></div><div className={`status-badge status-${result.status}`}>{statusLabel(result)}</div></header>
    <div className="toolbar" aria-label="ابزار نمایش برنامه">
      <div className="segmented" role="group" aria-label="نوع نمایش"><button type="button" aria-pressed={view === "visual"} onClick={() => setView("visual")}>نمای بصری</button><button type="button" aria-pressed={view === "table"} onClick={() => setView("table")}>جدول دسترس‌پذیر</button></div>
      <label>فیلتر<select value={filter} onChange={(event) => { setFilter(event.target.value as typeof filter); setEntity(""); }}><option value="all">همه جلسات</option><option value="instructor">استاد</option><option value="group">گروه دانشجویی</option><option value="course">درس</option><option value="room">اتاق</option></select></label>
      {filter !== "all" && <label>مورد<select value={activeEntity} onChange={(event) => setEntity(event.target.value)}>{options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>}
    </div>
    {view === "visual" ? <VisualGrid input={input} items={items} /> : <AccessibleScheduleTable input={input} items={items} />}
    <div className="print-only" aria-hidden="true"><AccessibleScheduleTable input={input} items={items} /></div>
    <ManualMove input={input} result={result} onResultChange={onResultChange} />
  </section>;
}

function statusLabel(result: SolveResult): string {
  if (result.hardViolations.length) return "دارای نقض سخت؛ نامعتبر برای انتشار";
  if (result.status === "optimal") return "بهینهٔ اثبات‌شده";
  if (result.status === "feasible") return "امکان‌پذیر؛ بهینگی اثبات نشده";
  if (result.status === "fallback") return "روش سریع جایگزین؛ بهینگی اثبات نشده";
  if (result.status === "failed-required") return "ناموفق؛ جلسهٔ اجباری تخصیص نیافته";
  if (result.status === "partial") return "برنامهٔ ناقص";
  if (result.status === "invalid") return "ورودی یا برنامه نامعتبر";
  return "وضعیت نامشخص";
}

function slotItems(items: ScheduleItem[], dayId: string, periodIndex: number): { starts: ScheduleItem[]; continuing: ScheduleItem[] } {
  return {
    starts: items.filter((item) => item.dayId === dayId && item.startPeriod === periodIndex),
    continuing: items.filter((item) => item.dayId === dayId && item.startPeriod < periodIndex && item.occupiedPeriods.includes(periodIndex)),
  };
}

function ScheduleEntries({ starts, continuing, detailed = false }: { starts: ScheduleItem[]; continuing: ScheduleItem[]; detailed?: boolean }) {
  return <>
    {starts.map((item) => <article key={item.sessionId} className={detailed ? "schedule-item table-schedule-item" : "schedule-item"}>
      <strong>{item.courseCode} · گروه {item.groupNumber.toLocaleString("fa-IR")}</strong>
      {detailed && <span>{item.courseName}</span>}
      <span>{item.sessionLabel}</span>
      <small>استاد: {item.instructorName}</small>
      {detailed && <small>گروه دانشجویی: {item.studentGroupName}</small>}
      <small>{item.roomName} · {item.building}</small>
      <small>{WEEK_PATTERN_LABELS[item.weekPattern]}</small>
    </article>)}
    {continuing.length > 0 && <span className="continuation">ادامهٔ {continuing.map((item) => `${item.courseCode} (گروه ${item.groupNumber.toLocaleString("fa-IR")})`).join("، ")}</span>}
  </>;
}

function PeriodHeader({ input, periodIndex }: { input: TimetableInput; periodIndex: number }) {
  const period = input.periods[periodIndex];
  return <><strong>{period.label}</strong><span dir="ltr">{period.start}–{period.end}</span>{period.breakAfter && <em>{period.breakLabel || "وقفه"}</em>}</>;
}

function VisualGrid({ input, items }: { input: TimetableInput; items: ScheduleItem[] }) {
  const days = input.days.filter((item) => item.enabled);
  return <div className="schedule-scroll" tabIndex={0} aria-label="نمای بصری برنامه؛ روزها در ردیف و بازه‌های زمانی در ستون">
    <div className="week-grid" style={{ gridTemplateColumns: `120px repeat(${input.periods.length}, minmax(185px, 1fr))` }}>
      <div className="grid-header grid-corner">روز / زمان</div>
      {input.periods.map((period) => <div className="grid-header grid-period-header" key={period.index}><PeriodHeader input={input} periodIndex={period.index} /></div>)}
      {days.map((day) => <div className="grid-row" key={day.id}>
        <div className="grid-time grid-day"><strong>{day.label}</strong></div>
        {input.periods.map((period) => {
          const { starts, continuing } = slotItems(items, day.id, period.index);
          return <div className="grid-cell" key={`${day.id}-${period.index}`}><ScheduleEntries starts={starts} continuing={continuing} /></div>;
        })}
      </div>)}
    </div>
  </div>;
}

function AccessibleScheduleTable({ input, items }: { input: TimetableInput; items: ScheduleItem[] }) {
  const days = input.days.filter((item) => item.enabled);
  return <div className="table-scroll"><table className="schedule-table schedule-matrix">
    <caption>برنامهٔ هفتگی؛ روزهای هفته در ردیف و بازه‌های زمانی در ستون</caption>
    <thead><tr><th scope="col">روز / زمان</th>{input.periods.map((period) => <th scope="col" key={period.index}><PeriodHeader input={input} periodIndex={period.index} /></th>)}</tr></thead>
    <tbody>{days.map((day) => <tr key={day.id}>
      <th scope="row">{day.label}</th>
      {input.periods.map((period) => {
        const { starts, continuing } = slotItems(items, day.id, period.index);
        return <td key={`${day.id}-${period.index}`}><ScheduleEntries starts={starts} continuing={continuing} detailed /></td>;
      })}
    </tr>)}</tbody>
  </table></div>;
}

function ManualMove({ input, result, onResultChange }: { input: TimetableInput; result: SolveResult; onResultChange: (next: SolveResult) => void }) {
  const [sessionId, setSessionId] = useState(result.schedule[0]?.sessionId ?? "");
  const current = result.schedule.find((item) => item.sessionId === sessionId) ?? result.schedule[0];
  const [dayId, setDayId] = useState(current?.dayId ?? input.days.find((day) => day.enabled)?.id ?? "");
  const [period, setPeriod] = useState(current?.startPeriod ?? 0);
  const [roomId, setRoomId] = useState(current?.roomId ?? input.rooms[0]?.id ?? "");
  if (!result.schedule.length) return null;
  const apply = () => {
    const { next, newViolations } = moveSessionManually(input, result, sessionId || current.sessionId, dayId, period, roomId);
    if (newViolations.length) {
      const confirmed = window.confirm(`این جابه‌جایی ${newViolations.length.toLocaleString("fa-IR")} نقض قید سخت ایجاد می‌کند و برنامه برای انتشار نامعتبر می‌شود. ثبت شود؟\n\n${newViolations.join("\n")}`);
      if (!confirmed) return;
    }
    onResultChange(next);
  };
  return <details className="manual-edit"><summary>اصلاح دستی برنامه</summary><p>نقض قید سخت مسدود نمی‌شود، اما نیازمند تأیید دوباره است و خروجی را «نامعتبر» می‌کند.</p><div className="responsive-fields"><label>جلسه<select value={sessionId || current.sessionId} onChange={(event) => { const item = result.schedule.find((entry) => entry.sessionId === event.target.value)!; setSessionId(item.sessionId); setDayId(item.dayId); setPeriod(item.startPeriod); setRoomId(item.roomId); }}>{result.schedule.map((item) => <option key={item.sessionId} value={item.sessionId}>{item.courseCode} / گروه {item.groupNumber} — {item.sessionLabel}</option>)}</select></label><label>روز<select value={dayId} onChange={(event) => setDayId(event.target.value)}>{input.days.filter((day) => day.enabled).map((day) => <option key={day.id} value={day.id}>{day.label}</option>)}</select></label><label>شروع<select value={period} onChange={(event) => setPeriod(Number(event.target.value))}>{input.periods.map((item) => <option key={item.index} value={item.index}>{item.label} · {item.start}</option>)}</select></label><label>اتاق<select value={roomId} onChange={(event) => setRoomId(event.target.value)}>{input.rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label><button type="button" className="warning-button" onClick={apply}>بررسی و ثبت جابه‌جایی</button></div></details>;
}
