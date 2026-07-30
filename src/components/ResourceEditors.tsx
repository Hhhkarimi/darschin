import { ROOM_TYPE_LABELS } from "../domain/constants";
import {
  equipmentUsageCount,
  instructorUsageCount,
  removeEquipment,
  removeInstructor,
  removeRoom,
  removeStudentGroup,
  roomUsageCount,
  studentGroupUsageCount,
} from "../domain/inputMutations";
import type { Instructor, Room, StudentGroup, TimetableInput } from "../domain/types";
import { EquipmentPicker, HelpText, SlotPicker, TimeRulesEditor } from "./FormControls";

export function ResourceEditors({ input, onChange }: { input: TimetableInput; onChange: (next: TimetableInput) => void }) {
  const updateInstructor = (id: string, patch: Partial<Instructor>) => onChange({ ...input, instructors: input.instructors.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const updateGroup = (id: string, patch: Partial<StudentGroup>) => onChange({ ...input, studentGroups: input.studentGroups.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const updateRoom = (id: string, patch: Partial<Room>) => onChange({ ...input, rooms: input.rooms.map((item) => item.id === id ? { ...item, ...patch } : item) });

  const deleteInstructor = (item: Instructor) => {
    const replacement = input.instructors.find((candidate) => candidate.id !== item.id);
    if (!replacement) return;
    const uses = instructorUsageCount(input, item.id);
    if (!window.confirm(`استاد «${item.name}» حذف شود؟\n\n${uses.toLocaleString("fa-IR")} پیش‌فرض یا جلسه به‌صورت خودکار به «${replacement.name}» منتقل می‌شود. پس از حذف، این موارد را بازبینی کنید.`)) return;
    onChange(removeInstructor(input, item.id, replacement.id));
  };

  const deleteGroup = (item: StudentGroup) => {
    const replacement = input.studentGroups.find((candidate) => candidate.id !== item.id);
    if (!replacement) return;
    const uses = studentGroupUsageCount(input, item.id);
    if (!window.confirm(`گروه دانشجویی «${item.name}» حذف شود؟\n\n${uses.toLocaleString("fa-IR")} پیش‌فرض یا جلسه به‌صورت خودکار به «${replacement.name}» منتقل می‌شود. تعداد دانشجو تغییر نمی‌کند و باید بازبینی شود.`)) return;
    onChange(removeStudentGroup(input, item.id, replacement.id));
  };

  const deleteRoom = (room: Room) => {
    const uses = roomUsageCount(input, room.id);
    if (!window.confirm(`فضای «${room.name}» حذف شود؟\n\n${uses.toLocaleString("fa-IR")} ارجاع ثابت یا ترجیحی به این فضا پاک می‌شود. جلسه‌ها حذف نمی‌شوند و حل‌کننده باید فضای دیگری پیدا کند.`)) return;
    onChange(removeRoom(input, room.id));
  };

  return <section className="editor-panel" aria-labelledby="resources-title">
    <header className="section-title"><div><span>مرحله ۲</span><h2 id="resources-title">استادان، گروه‌های دانشجویی و فضاها</h2></div><p>هر موردی که دستی اضافه می‌شود، دکمهٔ حذف دارد. حذف موارد درحال‌استفاده با توضیح پیامد و تأیید انجام می‌شود.</p></header>
    <aside className="step-guide"><strong>در این مرحله چه چیزی لازم است؟</strong><ol><li>حداقل یک استاد، یک گروه دانشجویی و یک فضای آموزشی نگه دارید.</li><li>عدم حضور قطعی را «ممنوع» ثبت کنید؛ ترجیح شخصی را «نامطلوب».</li><li>تجهیزات اتاق را با نام انتخاب کنید؛ نیازی به واردکردن شناسه نیست.</li></ol></aside>

    <div className="resource-columns">
      <section className="resource-box" aria-labelledby="instructors-heading"><div className="box-heading"><div><h3 id="instructors-heading">استادان</h3><small>{input.instructors.length.toLocaleString("fa-IR")} استاد تعریف‌شده</small></div><button type="button" onClick={() => onChange({ ...input, instructors: [...input.instructors, { id: `instructor-${crypto.randomUUID()}`, name: "استاد جدید", timeRules: { unavailableDays: [], unavailableSlots: [], undesiredDays: [], undesiredSlots: [] }, softMaxDailyPeriods: Math.min(4, input.periods.length), softMaxConsecutivePeriods: Math.min(3, input.periods.length) }] })}>افزودن استاد</button></div>
        {input.instructors.map((item) => <details key={item.id}><summary><span>{item.name}</span><small>{instructorUsageCount(input, item.id).toLocaleString("fa-IR")} استفاده</small></summary><div className="responsive-fields"><label>نام استاد<input value={item.name} onChange={(event) => updateInstructor(item.id, { name: event.target.value })} /><HelpText>نامی که در جدول و خروجی مدیر گروه نمایش داده می‌شود.</HelpText></label><label>سقف نرم روزانه<input type="number" min="0" max={input.periods.length} value={item.softMaxDailyPeriods} onChange={(event) => updateInstructor(item.id, { softMaxDailyPeriods: Math.max(0, Math.min(input.periods.length, Number(event.target.value))) })} /><HelpText>عبور از این تعداد بازه در یک روز مجاز ولی جریمه‌دار است. صفر یعنی استفاده از مقدار پیش‌فرض.</HelpText></label><label>سقف نرم متوالی<input type="number" min="0" max={input.periods.length} value={item.softMaxConsecutivePeriods} onChange={(event) => updateInstructor(item.id, { softMaxConsecutivePeriods: Math.max(0, Math.min(input.periods.length, Number(event.target.value))) })} /><HelpText>مثال: مقدار ۳ یعنی چهارمین بازهٔ متوالی جریمه ایجاد می‌کند.</HelpText></label></div><TimeRulesEditor input={input} rules={item.timeRules} onChange={(timeRules) => updateInstructor(item.id, { timeRules })} subjectLabel={`استاد «${item.name}»`} /><div className="entity-actions"><button type="button" className="danger-button" disabled={input.instructors.length <= 1} title={input.instructors.length <= 1 ? "حداقل یک استاد باید باقی بماند." : undefined} onClick={() => deleteInstructor(item)}>حذف استاد</button>{input.instructors.length <= 1 && <small>برای اعتبار ورودی حداقل یک استاد لازم است.</small>}</div></details>)}
      </section>

      <section className="resource-box" aria-labelledby="groups-heading"><div className="box-heading"><div><h3 id="groups-heading">گروه‌های دانشجویی</h3><small>{input.studentGroups.length.toLocaleString("fa-IR")} گروه تعریف‌شده</small></div><button type="button" onClick={() => onChange({ ...input, studentGroups: [...input.studentGroups, { id: `student-group-${crypto.randomUUID()}`, name: "گروه جدید", size: 30, timeRules: { unavailableDays: [], unavailableSlots: [], undesiredDays: [], undesiredSlots: [] }, softMaxDailyPeriods: Math.min(5, input.periods.length), softMaxConsecutivePeriods: Math.min(4, input.periods.length) }] })}>افزودن گروه</button></div>
        {input.studentGroups.map((item) => <details key={item.id}><summary><span>{item.name}</span><small>{studentGroupUsageCount(input, item.id).toLocaleString("fa-IR")} استفاده</small></summary><div className="responsive-fields"><label>عنوان گروه<input value={item.name} onChange={(event) => updateGroup(item.id, { name: event.target.value })} /><HelpText>مثال: «مهندسی کامپیوتر ۱۴۰۳ ـ الف».</HelpText></label><label>تعداد دانشجو<input type="number" min="1" value={item.size} onChange={(event) => updateGroup(item.id, { size: Math.max(1, Number(event.target.value)) })} /><HelpText>برای تخمین اولیهٔ ظرفیت؛ هر جلسه می‌تواند تعداد مستقل داشته باشد.</HelpText></label><label>سقف نرم روزانه<input type="number" min="0" max={input.periods.length} value={item.softMaxDailyPeriods} onChange={(event) => updateGroup(item.id, { softMaxDailyPeriods: Math.max(0, Math.min(input.periods.length, Number(event.target.value))) })} /><HelpText>حد مطلوب تعداد بازهٔ کلاس در یک روز.</HelpText></label><label>سقف نرم متوالی<input type="number" min="0" max={input.periods.length} value={item.softMaxConsecutivePeriods} onChange={(event) => updateGroup(item.id, { softMaxConsecutivePeriods: Math.max(0, Math.min(input.periods.length, Number(event.target.value))) })} /><HelpText>برای جلوگیری از کلاس‌های طولانی بدون فاصله.</HelpText></label></div><TimeRulesEditor input={input} rules={item.timeRules} onChange={(timeRules) => updateGroup(item.id, { timeRules })} subjectLabel={`گروه «${item.name}»`} /><div className="entity-actions"><button type="button" className="danger-button" disabled={input.studentGroups.length <= 1} title={input.studentGroups.length <= 1 ? "حداقل یک گروه دانشجویی باید باقی بماند." : undefined} onClick={() => deleteGroup(item)}>حذف گروه دانشجویی</button>{input.studentGroups.length <= 1 && <small>برای اعتبار ورودی حداقل یک گروه لازم است.</small>}</div></details>)}
      </section>

      <section className="resource-box" aria-labelledby="rooms-heading"><div className="box-heading"><div><h3 id="rooms-heading">فضاهای آموزشی</h3><small>{input.rooms.length.toLocaleString("fa-IR")} فضا تعریف‌شده</small></div><button type="button" onClick={() => onChange({ ...input, rooms: [...input.rooms, { id: `room-${crypto.randomUUID()}`, name: "فضای جدید", building: "ساختمان اصلی", capacity: 40, roomType: "lecture", equipmentIds: [], unavailableSlots: [] }] })}>افزودن فضا</button></div>
        {input.rooms.map((room) => <details key={room.id}><summary><span>{room.name}</span><small>{roomUsageCount(input, room.id).toLocaleString("fa-IR")} ارجاع</small></summary><div className="responsive-fields"><label>نام فضا<input value={room.name} onChange={(event) => updateRoom(room.id, { name: event.target.value })} /><HelpText>مثال: «کلاس A101» یا «آزمایشگاه شبکه».</HelpText></label><label>ساختمان<input value={room.building} onChange={(event) => updateRoom(room.id, { building: event.target.value })} /><HelpText>برای کنترل جابه‌جایی پشت‌سرهم استاد و دانشجو استفاده می‌شود.</HelpText></label><label>ظرفیت<input type="number" min="1" value={room.capacity} onChange={(event) => updateRoom(room.id, { capacity: Math.max(1, Number(event.target.value)) })} /><HelpText>اگر ظرفیت از تعداد دانشجوی جلسه کمتر باشد، اتاق به‌طور سخت رد می‌شود.</HelpText></label><label>نوع فضا<select value={room.roomType} onChange={(event) => updateRoom(room.id, { roomType: event.target.value as Room["roomType"] })}>{Object.entries(ROOM_TYPE_LABELS).filter(([value]) => value !== "any").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><HelpText>نوع فضا باید با نیاز سخت جلسه سازگار باشد.</HelpText></label></div><EquipmentPicker equipment={input.equipment} value={room.equipmentIds} onChange={(equipmentIds) => updateRoom(room.id, { equipmentIds })} label="تجهیزات موجود در فضا" help="هر تجهیزی را که واقعاً در اتاق موجود است انتخاب کنید." /><SlotPicker input={input} value={room.unavailableSlots} onChange={(unavailableSlots) => updateRoom(room.id, { unavailableSlots })} ariaLabel={`بازه‌های غیرقابل استفادهٔ ${room.name}`} emptyText="فضا در همهٔ بازه‌های فعال قابل استفاده است." /><div className="entity-actions"><button type="button" className="danger-button" disabled={input.rooms.length <= 1} title={input.rooms.length <= 1 ? "حداقل یک فضا باید باقی بماند." : undefined} onClick={() => deleteRoom(room)}>حذف فضا</button>{input.rooms.length <= 1 && <small>برای اعتبار ورودی حداقل یک فضا لازم است.</small>}</div></details>)}
      </section>
    </div>

    <section className="equipment-editor" aria-labelledby="equipment-heading"><div className="box-heading"><div><h3 id="equipment-heading">واژه‌نامهٔ تجهیزات</h3><small>تجهیزات یک‌بار تعریف و سپس با نام انتخاب می‌شوند.</small></div><button type="button" onClick={() => onChange({ ...input, equipment: [...input.equipment, { id: `equipment-${crypto.randomUUID()}`, name: "تجهیز جدید" }] })}>افزودن تجهیز</button></div><div className="equipment-list">{input.equipment.map((item) => <div className="equipment-row" key={item.id}><label>نام تجهیز<input value={item.name} onChange={(event) => onChange({ ...input, equipment: input.equipment.map((entry) => entry.id === item.id ? { ...entry, name: event.target.value } : entry) })} /></label><span>{equipmentUsageCount(input, item.id).toLocaleString("fa-IR")} استفاده در اتاق یا جلسه</span><button type="button" className="danger-button" onClick={() => { const uses = equipmentUsageCount(input, item.id); if (!window.confirm(`تجهیز «${item.name}» حذف شود؟\n\nاین تجهیز از ${uses.toLocaleString("fa-IR")} اتاق، پیش‌فرض یا جلسه نیز پاک می‌شود.`)) return; onChange(removeEquipment(input, item.id)); }}>حذف تجهیز</button></div>)}</div>{!input.equipment.length && <p className="empty-note">تجهیزی تعریف نشده است. در این حالت نمی‌توان نیاز تجهیزاتی برای اتاق و جلسه ثبت کرد.</p>}</section>
  </section>;
}
