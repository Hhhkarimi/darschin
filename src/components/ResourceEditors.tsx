import type { Instructor, Room, StudentGroup, TimetableInput, TimeRules } from "../domain/types";
import { ROOM_TYPE_LABELS } from "../domain/constants";

const split = (value: string) => [...new Set(value.split(/[،,|]/).map((item) => item.trim()).filter(Boolean))];
const join = (value: string[]) => value.join("، ");

function TimeRuleFields({ rules, onChange }: { rules: TimeRules; onChange: (next: TimeRules) => void }) {
  return <div className="time-rule-fields">
    <label>روزهای ممنوع<input dir="ltr" value={join(rules.unavailableDays)} onChange={(event) => onChange({ ...rules, unavailableDays: split(event.target.value) })} /></label>
    <label>بازه‌های ممنوع<input dir="ltr" value={join(rules.unavailableSlots)} onChange={(event) => onChange({ ...rules, unavailableSlots: split(event.target.value) as any })} /></label>
    <label>روزهای نامطلوب<input dir="ltr" value={join(rules.undesiredDays)} onChange={(event) => onChange({ ...rules, undesiredDays: split(event.target.value) })} /></label>
    <label>بازه‌های نامطلوب<input dir="ltr" value={join(rules.undesiredSlots)} onChange={(event) => onChange({ ...rules, undesiredSlots: split(event.target.value) as any })} /></label>
  </div>;
}

export function ResourceEditors({ input, onChange }: { input: TimetableInput; onChange: (next: TimetableInput) => void }) {
  const updateInstructor = (id: string, patch: Partial<Instructor>) => onChange({ ...input, instructors: input.instructors.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const updateGroup = (id: string, patch: Partial<StudentGroup>) => onChange({ ...input, studentGroups: input.studentGroups.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const updateRoom = (id: string, patch: Partial<Room>) => onChange({ ...input, rooms: input.rooms.map((item) => item.id === id ? { ...item, ...patch } : item) });
  return <section className="editor-panel" aria-labelledby="resources-title">
    <header className="section-title"><div><span>مرحله ۲</span><h2 id="resources-title">استادان، گروه‌های دانشجویی و فضاها</h2></div><p>زمان ممنوع قید سخت است؛ زمان نامطلوب فقط جریمه ایجاد می‌کند.</p></header>
    <div className="resource-columns">
      <div className="resource-box"><div className="box-heading"><h3>استادان</h3><button type="button" onClick={() => onChange({ ...input, instructors: [...input.instructors, { id: `instructor-${crypto.randomUUID()}`, name: "استاد جدید", timeRules: { unavailableDays: [], unavailableSlots: [], undesiredDays: [], undesiredSlots: [] }, softMaxDailyPeriods: 4, softMaxConsecutivePeriods: 3 }] })}>افزودن</button></div>
        {input.instructors.map((item) => <details key={item.id}><summary>{item.name}</summary><div className="responsive-fields"><label>نام<input value={item.name} onChange={(event) => updateInstructor(item.id, { name: event.target.value })} /></label><label>سقف نرم روزانه<input type="number" min="0" value={item.softMaxDailyPeriods} onChange={(event) => updateInstructor(item.id, { softMaxDailyPeriods: Number(event.target.value) })} /></label><label>سقف نرم متوالی<input type="number" min="0" value={item.softMaxConsecutivePeriods} onChange={(event) => updateInstructor(item.id, { softMaxConsecutivePeriods: Number(event.target.value) })} /></label></div><TimeRuleFields rules={item.timeRules} onChange={(timeRules) => updateInstructor(item.id, { timeRules })} /></details>)}
      </div>
      <div className="resource-box"><div className="box-heading"><h3>گروه‌های دانشجویی</h3><button type="button" onClick={() => onChange({ ...input, studentGroups: [...input.studentGroups, { id: `student-group-${crypto.randomUUID()}`, name: "گروه جدید", size: 30, timeRules: { unavailableDays: [], unavailableSlots: [], undesiredDays: [], undesiredSlots: [] }, softMaxDailyPeriods: 5, softMaxConsecutivePeriods: 4 }] })}>افزودن</button></div>
        {input.studentGroups.map((item) => <details key={item.id}><summary>{item.name}</summary><div className="responsive-fields"><label>نام<input value={item.name} onChange={(event) => updateGroup(item.id, { name: event.target.value })} /></label><label>تعداد دانشجو<input type="number" min="1" value={item.size} onChange={(event) => updateGroup(item.id, { size: Number(event.target.value) })} /></label><label>سقف نرم روزانه<input type="number" min="0" value={item.softMaxDailyPeriods} onChange={(event) => updateGroup(item.id, { softMaxDailyPeriods: Number(event.target.value) })} /></label><label>سقف نرم متوالی<input type="number" min="0" value={item.softMaxConsecutivePeriods} onChange={(event) => updateGroup(item.id, { softMaxConsecutivePeriods: Number(event.target.value) })} /></label></div><TimeRuleFields rules={item.timeRules} onChange={(timeRules) => updateGroup(item.id, { timeRules })} /></details>)}
      </div>
      <div className="resource-box"><div className="box-heading"><h3>فضاهای آموزشی</h3><button type="button" onClick={() => onChange({ ...input, rooms: [...input.rooms, { id: `room-${crypto.randomUUID()}`, name: "فضای جدید", building: "ساختمان اصلی", capacity: 40, roomType: "lecture", equipmentIds: [], unavailableSlots: [] }] })}>افزودن</button></div>
        {input.rooms.map((room) => <details key={room.id}><summary>{room.name}</summary><div className="responsive-fields"><label>نام<input value={room.name} onChange={(event) => updateRoom(room.id, { name: event.target.value })} /></label><label>ساختمان<input value={room.building} onChange={(event) => updateRoom(room.id, { building: event.target.value })} /></label><label>ظرفیت<input type="number" min="1" value={room.capacity} onChange={(event) => updateRoom(room.id, { capacity: Number(event.target.value) })} /></label><label>نوع فضا<select value={room.roomType} onChange={(event) => updateRoom(room.id, { roomType: event.target.value as Room["roomType"] })}>{Object.entries(ROOM_TYPE_LABELS).filter(([value]) => value !== "any").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>شناسه تجهیزات<input value={join(room.equipmentIds)} onChange={(event) => updateRoom(room.id, { equipmentIds: split(event.target.value) })} /></label><label>بازه‌های غیرقابل استفاده<input dir="ltr" value={join(room.unavailableSlots)} onChange={(event) => updateRoom(room.id, { unavailableSlots: split(event.target.value) as any })} /></label></div></details>)}
      </div>
    </div>
    <div className="equipment-editor"><h3>واژه‌نامه تجهیزات</h3><div className="tag-editor">{input.equipment.map((item) => <label key={item.id}><span>{item.id}</span><input value={item.name} onChange={(event) => onChange({ ...input, equipment: input.equipment.map((entry) => entry.id === item.id ? { ...entry, name: event.target.value } : entry) })} /></label>)}<button type="button" onClick={() => onChange({ ...input, equipment: [...input.equipment, { id: `equipment-${crypto.randomUUID()}`, name: "تجهیز جدید" }] })}>افزودن تجهیز</button></div></div>
  </section>;
}
