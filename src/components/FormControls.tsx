import type { Equipment, Room, SlotKey, TimetableInput, TimeRules } from "../domain/types";

export function HelpText({ children }: { children: React.ReactNode }) {
  return <small className="field-help">{children}</small>;
}

export function slotLabel(input: TimetableInput, slot: SlotKey): string {
  const [dayId, periodText] = slot.split(":");
  const day = input.days.find((item) => item.id === dayId);
  const period = input.periods[Number(periodText)];
  if (!day || !period) return slot;
  return `${day.label}، ${period.label} (${period.start} تا ${period.end})`;
}

export function FixedSlotSelect({ input, value, onChange }: { input: TimetableInput; value: SlotKey | null; onChange: (value: SlotKey | null) => void }) {
  return <label>زمان ثابت
    <select value={value ?? ""} onChange={(event) => onChange((event.target.value || null) as SlotKey | null)}>
      <option value="">حل‌کننده زمان را انتخاب کند</option>
      {input.days.filter((day) => day.enabled).map((day) => <optgroup key={day.id} label={day.label}>
        {input.periods.map((period) => {
          const slot = `${day.id}:${period.index}` as SlotKey;
          return <option key={slot} value={slot}>{period.label} · {period.start} تا {period.end}</option>;
        })}
      </optgroup>)}
    </select>
    <HelpText>برای جلسهٔ متغیر، گزینهٔ نخست را نگه دارید. مثال: «شنبه، بازهٔ ۲» یعنی شروع جلسه دقیقاً در همان بازه.</HelpText>
  </label>;
}

export function DayPicker({ input, value, onChange, ariaLabel }: { input: TimetableInput; value: string[]; onChange: (next: string[]) => void; ariaLabel: string }) {
  const selected = new Set(value);
  return <fieldset className="choice-fieldset"><legend>{ariaLabel}</legend><div className="choice-chips">
    {input.days.filter((day) => day.enabled).map((day) => <label key={day.id} className={selected.has(day.id) ? "choice-chip selected" : "choice-chip"}>
      <input type="checkbox" checked={selected.has(day.id)} onChange={(event) => onChange(event.target.checked ? [...value, day.id] : value.filter((id) => id !== day.id))} />
      <span>{day.label}</span>
    </label>)}
  </div></fieldset>;
}

export function SlotPicker({ input, value, onChange, ariaLabel, emptyText = "هیچ بازه‌ای انتخاب نشده است." }: { input: TimetableInput; value: SlotKey[]; onChange: (next: SlotKey[]) => void; ariaLabel: string; emptyText?: string }) {
  const selected = new Set(value);
  const days = input.days.filter((day) => day.enabled);
  const toggle = (slot: SlotKey, checked: boolean) => onChange(checked ? [...value, slot] : value.filter((item) => item !== slot));
  const toggleDay = (dayId: string) => {
    const daySlots = input.periods.map((period) => `${dayId}:${period.index}` as SlotKey);
    const allSelected = daySlots.every((slot) => selected.has(slot));
    onChange(allSelected ? value.filter((slot) => !slot.startsWith(`${dayId}:`)) : [...new Set([...value, ...daySlots])]);
  };
  return <fieldset className="slot-picker"><legend>{ariaLabel}</legend>
    <div className="slot-picker-scroll" tabIndex={0}><table><thead><tr><th>روز</th>{input.periods.map((period) => <th key={period.index}><span>{period.label}</span><small dir="ltr">{period.start}–{period.end}</small></th>)}</tr></thead><tbody>
      {days.map((day) => <tr key={day.id}><th><button type="button" className="row-select" onClick={() => toggleDay(day.id)}>{day.label}</button></th>{input.periods.map((period) => {
        const slot = `${day.id}:${period.index}` as SlotKey;
        return <td key={slot}><label className={selected.has(slot) ? "slot-check selected" : "slot-check"}><input type="checkbox" checked={selected.has(slot)} aria-label={`${day.label}، ${period.label}، ${period.start} تا ${period.end}`} onChange={(event) => toggle(slot, event.target.checked)} /><span aria-hidden="true">{selected.has(slot) ? "انتخاب‌شده" : "آزاد"}</span></label></td>;
      })}</tr>)}
    </tbody></table></div>
    <HelpText>{value.length ? `${value.length.toLocaleString("fa-IR")} بازه انتخاب شده است.` : emptyText} روی نام روز بزنید تا همهٔ بازه‌های آن روز انتخاب یا پاک شوند.</HelpText>
  </fieldset>;
}

export function TimeRulesEditor({ input, rules, onChange, subjectLabel }: { input: TimetableInput; rules: TimeRules; onChange: (next: TimeRules) => void; subjectLabel: string }) {
  return <details className="time-rules-editor"><summary>زمان‌های ممنوع و نامطلوب {subjectLabel}</summary>
    <div className="time-rule-sections">
      <section className="rule-kind hard-rule"><header><h4>ممنوع؛ قید سخت</h4><p>حل‌کننده اجازه ندارد {subjectLabel} را در این زمان‌ها قرار دهد.</p></header>
        <DayPicker input={input} value={rules.unavailableDays} onChange={(unavailableDays) => onChange({ ...rules, unavailableDays })} ariaLabel="روزهای کاملاً ممنوع" />
        <SlotPicker input={input} value={rules.unavailableSlots} onChange={(unavailableSlots) => onChange({ ...rules, unavailableSlots })} ariaLabel="بازه‌های مشخص ممنوع" emptyText="برای ممنوع‌کردن بخشی از یک روز، بازه‌ها را از جدول انتخاب کنید." />
      </section>
      <section className="rule-kind soft-rule"><header><h4>نامطلوب؛ ترجیح نرم</h4><p>حل‌کننده می‌تواند از این زمان‌ها استفاده کند، اما به نتیجه جریمه اضافه می‌شود.</p></header>
        <DayPicker input={input} value={rules.undesiredDays} onChange={(undesiredDays) => onChange({ ...rules, undesiredDays })} ariaLabel="روزهای کاملاً نامطلوب" />
        <SlotPicker input={input} value={rules.undesiredSlots} onChange={(undesiredSlots) => onChange({ ...rules, undesiredSlots })} ariaLabel="بازه‌های مشخص نامطلوب" emptyText="مثال: اگر کلاس عصر مناسب نیست، فقط بازه‌های عصر را انتخاب کنید." />
      </section>
    </div>
  </details>;
}

export function EquipmentPicker({ equipment, value, onChange, label, help }: { equipment: Equipment[]; value: string[]; onChange: (next: string[]) => void; label: string; help: string }) {
  const selected = new Set(value);
  return <fieldset className="choice-fieldset equipment-picker"><legend>{label}</legend>
    {equipment.length ? <div className="choice-chips">{equipment.map((item) => <label key={item.id} className={selected.has(item.id) ? "choice-chip selected" : "choice-chip"}><input type="checkbox" checked={selected.has(item.id)} onChange={(event) => onChange(event.target.checked ? [...value, item.id] : value.filter((id) => id !== item.id))} /><span>{item.name}</span></label>)}</div> : <p className="empty-note">ابتدا در بخش منابع یک تجهیز تعریف کنید.</p>}
    <HelpText>{help}</HelpText>
  </fieldset>;
}

export function RankedRoomPicker({ rooms, value, onChange }: { rooms: Room[]; value: string[]; onChange: (next: string[]) => void }) {
  const remaining = rooms.filter((room) => !value.includes(room.id));
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return <fieldset className="ranked-picker"><legend>اتاق‌های ترجیحی به ترتیب</legend>
    {value.length ? <ol>{value.map((id, index) => {
      const room = rooms.find((item) => item.id === id);
      if (!room) return null;
      return <li key={id}><span><b>اولویت {(index + 1).toLocaleString("fa-IR")}</b>{room.name} · {room.building}</span><div><button type="button" disabled={index === 0} aria-label={`بالابردن اولویت ${room.name}`} onClick={() => move(index, -1)}>↑</button><button type="button" disabled={index === value.length - 1} aria-label={`پایین‌آوردن اولویت ${room.name}`} onClick={() => move(index, 1)}>↓</button><button type="button" className="danger-link" onClick={() => onChange(value.filter((item) => item !== id))}>حذف</button></div></li>;
    })}</ol> : <p className="empty-note">ترجیحی ثبت نشده؛ هر اتاق سازگار امتیاز یکسان دارد.</p>}
    <label>افزودن اتاق به فهرست<select value="" disabled={!remaining.length} onChange={(event) => { if (event.target.value) onChange([...value, event.target.value]); }}><option value="">انتخاب اتاق…</option>{remaining.map((room) => <option key={room.id} value={room.id}>{room.name} · {room.building}</option>)}</select></label>
    <HelpText>اولویت ۱ بهترین انتخاب است. این فهرست قید سخت نیست؛ اگر اتاق‌ها قابل استفاده نباشند، حل‌کننده اتاق سازگار دیگری را انتخاب می‌کند.</HelpText>
  </fieldset>;
}
