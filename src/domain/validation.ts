import { MAX_CONFLICT_WEIGHT, MAX_COURSES, MAX_FAST_ATTEMPTS, MAX_IMPORT_BYTES, MAX_ROOMS, MAX_SESSIONS, MAX_SOFT_WEIGHT, MAX_TEXT_LENGTH } from "./constants";
import type { SlotKey, TimetableInput, ValidationIssue, WeekPattern } from "./types";

const DANGEROUS_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function inspectValue(value: unknown, depth = 0): string | null {
  if (depth > 30) return "عمق داده بیش از حد مجاز است.";
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    if (value.length > 10_000) return "یکی از آرایه‌ها بیش از حد بزرگ است.";
    for (const item of value) {
      const issue = inspectValue(item, depth + 1);
      if (issue) return issue;
    }
    return null;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (DANGEROUS_KEYS.has(key)) return `کلید ناامن «${key}» پذیرفته نمی‌شود.`;
    const issue = inspectValue(child, depth + 1);
    if (issue) return issue;
  }
  return null;
}

export function parseJsonInput(text: string): unknown {
  const bytes = new TextEncoder().encode(text).byteLength;
  if (bytes > MAX_IMPORT_BYTES) throw new Error("حجم JSON از ۲ مگابایت بیشتر است.");
  const parsed: unknown = JSON.parse(text);
  const issue = inspectValue(parsed);
  if (issue) throw new Error(issue);
  return parsed;
}

export function isSlotKey(value: string, input: TimetableInput): value is SlotKey {
  const match = /^([^:]+):(\d+)$/.exec(value);
  if (!match) return false;
  return input.days.some((day) => day.id === match[1])
    && Number(match[2]) >= 0
    && Number(match[2]) < input.periods.length;
}

function textIssue(path: string, value: string, label: string): ValidationIssue | null {
  const trimmed = value.trim();
  if (!trimmed) return { path, message: `${label} نباید خالی باشد.`, severity: "error" };
  if (trimmed.length > MAX_TEXT_LENGTH) return { path, message: `${label} بیش از ${MAX_TEXT_LENGTH} نویسه است.`, severity: "error" };
  return null;
}

function duplicateIssues(values: string[], path: string, label: string): ValidationIssue[] {
  const seen = new Set<string>();
  const issues: ValidationIssue[] = [];
  values.forEach((value, index) => {
    if (seen.has(value)) issues.push({ path: `${path}.${index}`, message: `${label} «${value}» تکراری است.`, severity: "error" });
    seen.add(value);
  });
  return issues;
}

export function validateInput(input: TimetableInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!input || typeof input !== "object") return [{ path: "root", message: "ریشهٔ داده باید یک شیء باشد.", severity: "error" }];
  const arrayKeys = ["days", "periods", "closedSlots", "equipment", "instructors", "studentGroups", "rooms", "courses", "conflicts", "retiredGroupNumbers"] as const;
  arrayKeys.forEach((key) => { if (!Array.isArray((input as unknown as Record<string, unknown>)[key])) issues.push({ path: key, message: `فیلد ${key} باید آرایه باشد.`, severity: "error" }); });
  if (!input.settings || typeof input.settings !== "object") issues.push({ path: "settings", message: "تنظیمات حل معتبر نیست.", severity: "error" });
  if (!input.weights || typeof input.weights !== "object") issues.push({ path: "weights", message: "وزن‌های تابع هدف معتبر نیستند.", severity: "error" });
  if (issues.length) return issues;
  if (input.schemaVersion !== 3) issues.push({ path: "schemaVersion", message: "نسخهٔ مدل داده باید ۳ باشد.", severity: "error" });
  if (!input.days.some((day) => day.enabled)) issues.push({ path: "days", message: "حداقل یک روز آموزشی فعال لازم است.", severity: "error" });
  if (!input.periods.length) issues.push({ path: "periods", message: "حداقل یک بازهٔ آموزشی لازم است.", severity: "error" });
  if (!input.courses.length) issues.push({ path: "courses", message: "حداقل یک گروه درسی لازم است.", severity: "error" });
  if (!input.instructors.length) issues.push({ path: "instructors", message: "حداقل یک استاد لازم است.", severity: "error" });
  if (!input.studentGroups.length) issues.push({ path: "studentGroups", message: "حداقل یک گروه دانشجویی لازم است.", severity: "error" });
  if (!input.rooms.length) issues.push({ path: "rooms", message: "حداقل یک فضای آموزشی لازم است.", severity: "error" });
  if (input.courses.length > MAX_COURSES) issues.push({ path: "courses", message: `حداکثر ${MAX_COURSES} گروه درسی پذیرفته می‌شود.`, severity: "error" });
  if (input.rooms.length > MAX_ROOMS) issues.push({ path: "rooms", message: `حداکثر ${MAX_ROOMS} فضا پذیرفته می‌شود.`, severity: "error" });

  issues.push(...duplicateIssues(input.days.map((item) => item.id), "days", "شناسه روز"));
  issues.push(...duplicateIssues(input.equipment.map((item) => item.id), "equipment", "شناسه تجهیز"));
  issues.push(...duplicateIssues(input.instructors.map((item) => item.id), "instructors", "شناسه استاد"));
  issues.push(...duplicateIssues(input.studentGroups.map((item) => item.id), "studentGroups", "شناسه گروه دانشجویی"));
  issues.push(...duplicateIssues(input.rooms.map((item) => item.id), "rooms", "شناسه فضا"));
  issues.push(...duplicateIssues(input.courses.map((item) => item.id), "courses", "شناسه گروه درسی"));
  issues.push(...duplicateIssues(input.conflicts.map((item) => item.id), "conflicts", "شناسه تعارض"));

  const groupNumbers = input.courses.map((course) => course.groupNumber);
  const seenNumbers = new Set<number>();
  groupNumbers.forEach((number, index) => {
    if (!Number.isInteger(number) || number <= 0) issues.push({ path: `courses.${index}.groupNumber`, message: "شماره گروه باید عدد صحیح مثبت باشد.", severity: "error" });
    if (seenNumbers.has(number)) issues.push({ path: `courses.${index}.groupNumber`, message: `شماره گروه ${number} در این نیمسال تکراری است.`, severity: "error" });
    if (input.retiredGroupNumbers.includes(number)) issues.push({ path: `courses.${index}.groupNumber`, message: `شماره گروه ${number} قبلاً در این داده استفاده و حذف شده است.`, severity: "error" });
    seenNumbers.add(number);
  });

  const instructorIds = new Set(input.instructors.map((item) => item.id));
  const groupIds = new Set(input.studentGroups.map((item) => item.id));
  const roomIds = new Set(input.rooms.map((item) => item.id));
  const equipmentIds = new Set(input.equipment.map((item) => item.id));
  const courseIds = new Set(input.courses.map((item) => item.id));
  const enabledDayIds = new Set(input.days.map((item) => item.id));
  const allSessionIds: string[] = [];

  input.periods.forEach((period, index) => {
    if (period.index !== index) issues.push({ path: `periods.${index}.index`, message: "اندیس بازه‌ها باید از صفر و متوالی باشد.", severity: "error" });
    if (!/^\d{2}:\d{2}$/.test(period.start) || !/^\d{2}:\d{2}$/.test(period.end)) issues.push({ path: `periods.${index}`, message: "ساعت شروع و پایان بازه باید قالب HH:MM داشته باشد.", severity: "error" });
  });
  input.instructors.forEach((item, index) => {
    const issue = textIssue(`instructors.${index}.name`, item.name, "نام استاد");
    if (issue) issues.push(issue);
    if (!Number.isSafeInteger(item.softMaxDailyPeriods) || item.softMaxDailyPeriods < 0 || item.softMaxDailyPeriods > input.periods.length) issues.push({ path: `instructors.${index}.softMaxDailyPeriods`, message: "سقف نرم روزانهٔ استاد نامعتبر است.", severity: "error" });
    if (!Number.isSafeInteger(item.softMaxConsecutivePeriods) || item.softMaxConsecutivePeriods < 0 || item.softMaxConsecutivePeriods > input.periods.length) issues.push({ path: `instructors.${index}.softMaxConsecutivePeriods`, message: "سقف نرم متوالی استاد نامعتبر است.", severity: "error" });
  });
  input.studentGroups.forEach((item, index) => {
    const issue = textIssue(`studentGroups.${index}.name`, item.name, "نام گروه دانشجویی");
    if (issue) issues.push(issue);
    if (!Number.isInteger(item.size) || item.size <= 0) issues.push({ path: `studentGroups.${index}.size`, message: "تعداد دانشجویان باید عدد صحیح مثبت باشد.", severity: "error" });
    if (!Number.isSafeInteger(item.softMaxDailyPeriods) || item.softMaxDailyPeriods < 0 || item.softMaxDailyPeriods > input.periods.length) issues.push({ path: `studentGroups.${index}.softMaxDailyPeriods`, message: "سقف نرم روزانهٔ گروه دانشجویی نامعتبر است.", severity: "error" });
    if (!Number.isSafeInteger(item.softMaxConsecutivePeriods) || item.softMaxConsecutivePeriods < 0 || item.softMaxConsecutivePeriods > input.periods.length) issues.push({ path: `studentGroups.${index}.softMaxConsecutivePeriods`, message: "سقف نرم متوالی گروه دانشجویی نامعتبر است.", severity: "error" });
  });
  input.rooms.forEach((room, index) => {
    const issue = textIssue(`rooms.${index}.name`, room.name, "نام فضا");
    if (issue) issues.push(issue);
    if (!Number.isInteger(room.capacity) || room.capacity <= 0) issues.push({ path: `rooms.${index}.capacity`, message: "ظرفیت فضا باید عدد صحیح مثبت باشد.", severity: "error" });
    room.equipmentIds.forEach((id) => {
      if (!equipmentIds.has(id)) issues.push({ path: `rooms.${index}.equipmentIds`, message: `تجهیز «${id}» تعریف نشده است.`, severity: "error" });
    });
  });

  let sessionCount = 0;
  input.courses.forEach((course, courseIndex) => {
    const nameIssue = textIssue(`courses.${courseIndex}.name`, course.name, "نام درس");
    const codeIssue = textIssue(`courses.${courseIndex}.code`, course.code, "کد درس");
    if (nameIssue) issues.push(nameIssue);
    if (codeIssue) issues.push(codeIssue);
    if (!course.sessions.length) issues.push({ path: `courses.${courseIndex}.sessions`, message: `برای «${course.name}» حداقل یک جلسه لازم است.`, severity: "error" });
    course.sessions.forEach((session, sessionIndex) => {
      sessionCount++;
      allSessionIds.push(session.id);
      const path = `courses.${courseIndex}.sessions.${sessionIndex}`;
      if (!instructorIds.has(session.instructorId)) issues.push({ path: `${path}.instructorId`, message: `استاد جلسه «${session.label}» تعریف نشده است.`, severity: "error" });
      if (!groupIds.has(session.studentGroupId)) issues.push({ path: `${path}.studentGroupId`, message: `گروه دانشجویی جلسه «${session.label}» تعریف نشده است.`, severity: "error" });
      if (!Number.isInteger(session.durationPeriods) || session.durationPeriods < 1 || session.durationPeriods > input.periods.length) issues.push({ path: `${path}.durationPeriods`, message: `مدت جلسه «${session.label}» نامعتبر است.`, severity: "error" });
      if (!Number.isInteger(session.enrollment) || session.enrollment <= 0) issues.push({ path: `${path}.enrollment`, message: `تعداد دانشجویان جلسه «${session.label}» نامعتبر است.`, severity: "error" });
      if (session.fixedSlot && !isSlotKey(session.fixedSlot, input)) issues.push({ path: `${path}.fixedSlot`, message: `زمان ثابت جلسه «${session.label}» نامعتبر است.`, severity: "error" });
      if (session.fixedRoomId && !roomIds.has(session.fixedRoomId)) issues.push({ path: `${path}.fixedRoomId`, message: `اتاق ثابت جلسه «${session.label}» وجود ندارد.`, severity: "error" });
      session.preferredRoomIds.forEach((id) => {
        if (!roomIds.has(id)) issues.push({ path: `${path}.preferredRoomIds`, message: `اتاق ترجیحی «${id}» وجود ندارد.`, severity: "error" });
      });
      [...session.requiredEquipmentIds, ...session.preferredEquipmentIds].forEach((id) => {
        if (!equipmentIds.has(id)) issues.push({ path: `${path}.equipmentIds`, message: `تجهیز «${id}» تعریف نشده است.`, severity: "error" });
      });
      [...session.timeRules.unavailableDays, ...session.timeRules.undesiredDays].forEach((dayId) => {
        if (!enabledDayIds.has(dayId)) issues.push({ path: `${path}.timeRules`, message: `روز «${dayId}» برای جلسه «${session.label}» معتبر نیست.`, severity: "error" });
      });
      [...session.timeRules.unavailableSlots, ...session.timeRules.undesiredSlots].forEach((slot) => {
        if (!isSlotKey(slot, input)) issues.push({ path: `${path}.timeRules`, message: `بازه «${slot}» برای جلسه «${session.label}» معتبر نیست.`, severity: "error" });
      });
    });
  });
  if (sessionCount > MAX_SESSIONS) issues.push({ path: "courses", message: `حداکثر ${MAX_SESSIONS} جلسه پذیرفته می‌شود.`, severity: "error" });
  issues.push(...duplicateIssues(allSessionIds, "courses.sessions", "شناسه جلسه"));

  const conflictPairs = new Set<string>();
  input.conflicts.forEach((conflict, index) => {
    const pair = [conflict.firstCourseId, conflict.secondCourseId].sort().join("||");
    if (conflictPairs.has(pair)) issues.push({ path: `conflicts.${index}`, message: "برای این دو گروه درسی بیش از یک تعارض تعریف شده است.", severity: "error" });
    conflictPairs.add(pair);
    if (!courseIds.has(conflict.firstCourseId) || !courseIds.has(conflict.secondCourseId)) issues.push({ path: `conflicts.${index}`, message: "یکی از گروه‌های درسی تعارض وجود ندارد.", severity: "error" });
    if (conflict.firstCourseId === conflict.secondCourseId) issues.push({ path: `conflicts.${index}`, message: "یک گروه درسی نمی‌تواند با خودش تعارض داشته باشد.", severity: "error" });
    if (!Number.isSafeInteger(conflict.weight) || conflict.weight < 0 || conflict.weight > MAX_CONFLICT_WEIGHT) issues.push({ path: `conflicts.${index}.weight`, message: `شدت تعارض نرم باید عدد صحیح بین ۰ و ${MAX_CONFLICT_WEIGHT.toLocaleString("fa-IR")} باشد.`, severity: "error" });
  });

  const slotCollections = [
    ["closedSlots", input.closedSlots],
    ...input.instructors.map((item, index) => [`instructors.${index}.timeRules`, [...item.timeRules.unavailableSlots, ...item.timeRules.undesiredSlots]] as const),
    ...input.studentGroups.map((item, index) => [`studentGroups.${index}.timeRules`, [...item.timeRules.unavailableSlots, ...item.timeRules.undesiredSlots]] as const),
    ...input.rooms.map((item, index) => [`rooms.${index}.unavailableSlots`, item.unavailableSlots] as const),
  ] as const;
  slotCollections.forEach(([path, values]) => values.forEach((value) => {
    if (!isSlotKey(value, input)) issues.push({ path, message: `بازه «${value}» معتبر نیست.`, severity: "error" });
  }));
  const dayCollections = [
    ...input.instructors.map((item, index) => [`instructors.${index}.timeRules`, [...item.timeRules.unavailableDays, ...item.timeRules.undesiredDays]] as const),
    ...input.studentGroups.map((item, index) => [`studentGroups.${index}.timeRules`, [...item.timeRules.unavailableDays, ...item.timeRules.undesiredDays]] as const),
  ] as const;
  dayCollections.forEach(([path, values]) => values.forEach((value) => {
    if (!enabledDayIds.has(value)) issues.push({ path, message: `روز «${value}» معتبر نیست.`, severity: "error" });
  }));
  Object.entries(input.weights).forEach(([key, value]) => { if (!Number.isSafeInteger(value) || value < 0 || value > MAX_SOFT_WEIGHT) issues.push({ path: `weights.${key}`, message: `وزن جریمه باید عدد صحیح بین ۰ و ${MAX_SOFT_WEIGHT.toLocaleString("fa-IR")} باشد.`, severity: "error" }); });
  if (input.weights.unscheduledSession !== 1_000_000) issues.push({ path: "weights.unscheduledSession", message: "جریمهٔ جلسهٔ تخصیص‌نیافته باید روی مقدار محافظتی ۱٬۰۰۰٬۰۰۰ ثابت بماند.", severity: "error" });
  if (!Number.isInteger(input.settings.exactCourseLimit) || input.settings.exactCourseLimit !== 40) issues.push({ path: "settings.exactCourseLimit", message: "سقف روش دقیق باید ۴۰ گروه درسی باشد.", severity: "error" });
  if (!Number.isSafeInteger(input.settings.exactTimeLimitSeconds) || input.settings.exactTimeLimitSeconds < 1 || input.settings.exactTimeLimitSeconds > 285) issues.push({ path: "settings.exactTimeLimitSeconds", message: "بودجهٔ داخلی حل دقیق باید بین ۱ و ۲۸۵ ثانیه باشد.", severity: "error" });
  if (!Number.isSafeInteger(input.settings.fastAttempts) || input.settings.fastAttempts < 20 || input.settings.fastAttempts > MAX_FAST_ATTEMPTS) issues.push({ path: "settings.fastAttempts", message: `تعداد تلاش‌های روش سریع باید بین ۲۰ و ${MAX_FAST_ATTEMPTS.toLocaleString("fa-IR")} باشد.`, severity: "error" });
  if (!Number.isSafeInteger(input.settings.minimumDayGap) || input.settings.minimumDayGap < 0 || input.settings.minimumDayGap > input.days.length) issues.push({ path: "settings.minimumDayGap", message: "حداقل فاصلهٔ روزانه باید در محدودهٔ تعداد روزهای تعریف‌شده باشد.", severity: "error" });
  for (const [key, value] of Object.entries({
    defaultInstructorMaxDailyPeriods: input.settings.defaultInstructorMaxDailyPeriods,
    defaultGroupMaxDailyPeriods: input.settings.defaultGroupMaxDailyPeriods,
    defaultInstructorMaxConsecutivePeriods: input.settings.defaultInstructorMaxConsecutivePeriods,
    defaultGroupMaxConsecutivePeriods: input.settings.defaultGroupMaxConsecutivePeriods,
  })) {
    if (!Number.isSafeInteger(value) || value < 0 || value > input.periods.length) issues.push({ path: `settings.${key}`, message: "سقف پیش‌فرض بار یا توالی باید در محدودهٔ تعداد بازه‌های روز باشد.", severity: "error" });
  }

  if (input.courses.length > input.settings.exactCourseLimit) {
    issues.push({ path: "settings.exactCourseLimit", message: `روش دقیق برای بیش از ${input.settings.exactCourseLimit} گروه درسی غیرفعال است؛ روش سریع قابل استفاده است.`, severity: "warning" });
  }
  return issues;
}

export function validationErrors(input: TimetableInput): string[] {
  return validateInput(input).filter((issue) => issue.severity === "error").map((issue) => issue.message);
}

export function patternsOverlap(first: WeekPattern, second: WeekPattern): boolean {
  return first === "all" || second === "all" || first === second;
}
