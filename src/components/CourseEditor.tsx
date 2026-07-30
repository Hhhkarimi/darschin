import { useMemo, useState } from "react";
import { EMPTY_TIME_RULES, ROOM_TYPE_LABELS, WEEK_PATTERN_LABELS } from "../domain/constants";
import { makeSession } from "../domain/defaults";
import type { CourseSection, RoomType, TimetableInput, WeekPattern, WeeklySession } from "../domain/types";

const split = (value: string) => [...new Set(value.split(/[،,|]/).map((item) => item.trim()).filter(Boolean))];
const join = (value: string[]) => value.join("، ");

export function CourseEditor({ input, onChange }: { input: TimetableInput; onChange: (next: TimetableInput) => void }) {
  const [draft, setDraft] = useState({ groupNumber: "", code: "", name: "" });
  const used = useMemo(() => new Set([...input.courses.map((item) => item.groupNumber), ...input.retiredGroupNumbers]), [input]);

  const addCourse = () => {
    const groupNumber = Number(draft.groupNumber);
    if (!Number.isInteger(groupNumber) || groupNumber <= 0 || used.has(groupNumber) || !draft.code.trim() || !draft.name.trim()) return;
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
    const course: CourseSection = { id, groupNumber, code: draft.code.trim(), name: draft.name.trim(), defaults, sessions: [makeSession(`session-${crypto.randomUUID()}`, "جلسه ۱", defaults)] };
    onChange({ ...input, courses: [...input.courses, course] });
    setDraft({ groupNumber: "", code: "", name: "" });
  };

  const updateCourse = (id: string, patch: Partial<CourseSection>) => onChange({ ...input, courses: input.courses.map((course) => course.id === id ? { ...course, ...patch } : course) });
  const updateSession = (courseId: string, sessionId: string, patch: Partial<WeeklySession>) => onChange({ ...input, courses: input.courses.map((course) => course.id === courseId ? { ...course, sessions: course.sessions.map((session) => session.id === sessionId ? { ...session, ...patch } : session) } : course) });

  return <section className="editor-panel" aria-labelledby="courses-title">
    <header className="section-title"><div><span>مرحله ۱</span><h2 id="courses-title">گروه‌های درسی و جلسات</h2></div><p>شمارهٔ گروه پس از ایجاد ثابت است. هر جلسه می‌تواند تنظیمات مستقل داشته باشد.</p></header>
    <div className="create-row">
      <label>شماره گروه<input inputMode="numeric" value={draft.groupNumber} onChange={(event) => setDraft({ ...draft, groupNumber: event.target.value.replace(/\D/g, "") })} /></label>
      <label>کد درس<input value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} /></label>
      <label>نام درس<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <button type="button" className="primary-small" onClick={addCourse}>افزودن گروه درسی</button>
    </div>
    {used.has(Number(draft.groupNumber)) && draft.groupNumber && <p className="field-error">این شماره گروه قبلاً استفاده شده است.</p>}

    <div className="course-stack">
      {input.courses.map((course) => <article className="course-card" key={course.id}>
        <div className="course-heading">
          <div><span>گروه {course.groupNumber.toLocaleString("fa-IR")}</span><h3>{course.code} — {course.name}</h3></div>
          <button type="button" className="danger-button" onClick={() => {
            if (!window.confirm(`گروه ${course.groupNumber} حذف شود؟ شماره آن در این داده دوباره قابل استفاده نیست.`)) return;
            onChange({ ...input, retiredGroupNumbers: [...new Set([...input.retiredGroupNumbers, course.groupNumber])], courses: input.courses.filter((item) => item.id !== course.id), conflicts: input.conflicts.filter((item) => item.firstCourseId !== course.id && item.secondCourseId !== course.id) });
          }}>حذف گروه</button>
        </div>
        <div className="two-columns compact-fields">
          <label>کد درس<input value={course.code} onChange={(event) => updateCourse(course.id, { code: event.target.value })} /></label>
          <label>نام درس<input value={course.name} onChange={(event) => updateCourse(course.id, { name: event.target.value })} /></label>
        </div>
        <details className="defaults-box">
          <summary>پیش‌فرض جلسه‌های جدید</summary>
          <div className="responsive-fields">
            <label>استاد<select value={course.defaults.instructorId} onChange={(event) => updateCourse(course.id, { defaults: { ...course.defaults, instructorId: event.target.value } })}>{input.instructors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>گروه دانشجویی<select value={course.defaults.studentGroupId} onChange={(event) => updateCourse(course.id, { defaults: { ...course.defaults, studentGroupId: event.target.value } })}>{input.studentGroups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>تعداد دانشجو<input type="number" min="1" value={course.defaults.enrollment} onChange={(event) => updateCourse(course.id, { defaults: { ...course.defaults, enrollment: Math.max(1, Number(event.target.value)) } })} /></label>
            <label>مدت (بازه)<input type="number" min="1" max={input.periods.length} value={course.defaults.durationPeriods} onChange={(event) => updateCourse(course.id, { defaults: { ...course.defaults, durationPeriods: Math.max(1, Number(event.target.value)) } })} /></label>
            <label>نوع فضا<select value={course.defaults.roomType} onChange={(event) => updateCourse(course.id, { defaults: { ...course.defaults, roomType: event.target.value as RoomType } })}>{Object.entries(ROOM_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>الگوی هفته<select value={course.defaults.weekPattern} onChange={(event) => updateCourse(course.id, { defaults: { ...course.defaults, weekPattern: event.target.value as WeekPattern } })}>{Object.entries(WEEK_PATTERN_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
        </details>

        <div className="session-stack">
          {course.sessions.map((session, sessionIndex) => <details className="session-card" key={session.id} open={sessionIndex === 0}>
            <summary><span>{session.label}</span><small>{session.fixedSlot ? "زمان ثابت" : "زمان متغیر"} · {session.durationPeriods.toLocaleString("fa-IR")} بازه</small></summary>
            <div className="responsive-fields session-fields">
              <label>عنوان جلسه<input value={session.label} onChange={(event) => updateSession(course.id, session.id, { label: event.target.value })} /></label>
              <label>استاد<select value={session.instructorId} onChange={(event) => updateSession(course.id, session.id, { instructorId: event.target.value })}>{input.instructors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label>گروه دانشجویی<select value={session.studentGroupId} onChange={(event) => updateSession(course.id, session.id, { studentGroupId: event.target.value })}>{input.studentGroups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label>تعداد دانشجو<input type="number" min="1" value={session.enrollment} onChange={(event) => updateSession(course.id, session.id, { enrollment: Math.max(1, Number(event.target.value)) })} /></label>
              <label>مدت جلسه<input type="number" min="1" max={input.periods.length} value={session.durationPeriods} onChange={(event) => updateSession(course.id, session.id, { durationPeriods: Math.max(1, Number(event.target.value)) })} /></label>
              <label>نوع فضا<select value={session.roomType} onChange={(event) => updateSession(course.id, session.id, { roomType: event.target.value as RoomType })}>{Object.entries(ROOM_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>الگوی هفته<select value={session.weekPattern} onChange={(event) => updateSession(course.id, session.id, { weekPattern: event.target.value as WeekPattern })}>{Object.entries(WEEK_PATTERN_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>زمان ثابت<input dir="ltr" placeholder="sat:1" value={session.fixedSlot ?? ""} onChange={(event) => updateSession(course.id, session.id, { fixedSlot: (event.target.value || null) as WeeklySession["fixedSlot"] })} /></label>
              <label>اتاق ثابت<select value={session.fixedRoomId ?? ""} onChange={(event) => updateSession(course.id, session.id, { fixedRoomId: event.target.value || null })}><option value="">بدون الزام</option>{input.rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
              <label>اتاق‌های ترجیحی به ترتیب<input placeholder="r-a101، r-a202" value={join(session.preferredRoomIds)} onChange={(event) => updateSession(course.id, session.id, { preferredRoomIds: split(event.target.value) })} /></label>
              <label>تجهیزات الزامی<input value={join(session.requiredEquipmentIds)} onChange={(event) => updateSession(course.id, session.id, { requiredEquipmentIds: split(event.target.value) })} /></label>
              <label>تجهیزات ترجیحی<input value={join(session.preferredEquipmentIds)} onChange={(event) => updateSession(course.id, session.id, { preferredEquipmentIds: split(event.target.value) })} /></label>
              <label>روزهای ممنوع<input dir="ltr" placeholder="sun,tue" value={join(session.timeRules.unavailableDays)} onChange={(event) => updateSession(course.id, session.id, { timeRules: { ...session.timeRules, unavailableDays: split(event.target.value) } })} /></label>
              <label>بازه‌های ممنوع<input dir="ltr" placeholder="sat:0,sun:2" value={join(session.timeRules.unavailableSlots)} onChange={(event) => updateSession(course.id, session.id, { timeRules: { ...session.timeRules, unavailableSlots: split(event.target.value) as any } })} /></label>
              <label>روزهای نامطلوب<input dir="ltr" value={join(session.timeRules.undesiredDays)} onChange={(event) => updateSession(course.id, session.id, { timeRules: { ...session.timeRules, undesiredDays: split(event.target.value) } })} /></label>
              <label>بازه‌های نامطلوب<input dir="ltr" value={join(session.timeRules.undesiredSlots)} onChange={(event) => updateSession(course.id, session.id, { timeRules: { ...session.timeRules, undesiredSlots: split(event.target.value) as any } })} /></label>
            </div>
            <div className="check-row">
              <label><input type="checkbox" checked={session.required} onChange={(event) => updateSession(course.id, session.id, { required: event.target.checked })} /> جلسه اجباری</label>
              <label><input type="checkbox" checked={session.allowBreakCrossing} onChange={(event) => updateSession(course.id, session.id, { allowBreakCrossing: event.target.checked })} /> عبور از وقفه مجاز است</label>
              <button type="button" className="danger-button" disabled={course.sessions.length === 1} onClick={() => updateCourse(course.id, { sessions: course.sessions.filter((item) => item.id !== session.id) })}>حذف جلسه</button>
            </div>
          </details>)}
        </div>
        <button type="button" className="secondary-button" onClick={() => updateCourse(course.id, { sessions: [...course.sessions, makeSession(`session-${crypto.randomUUID()}`, `جلسه ${course.sessions.length + 1}`, course.defaults, { timeRules: structuredClone(EMPTY_TIME_RULES) })] })}>افزودن جلسه از پیش‌فرض‌ها</button>
      </article>)}
    </div>
  </section>;
}
