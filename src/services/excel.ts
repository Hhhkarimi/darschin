import { PENALTY_LABELS } from "../domain/constants";
import type { CourseConflict, CourseSection, Equipment, Instructor, Room, SoftWeights, SolveResult, StudentGroup, TimetableInput, WeeklySession } from "../domain/types";
import { downloadBlob, safeFilenamePart } from "./downloads";

const TEMPLATE_URL = "/templates/darschin-input-template.xlsx";

export function downloadExcelTemplate(): void {
  const anchor = document.createElement("a");
  anchor.href = TEMPLATE_URL;
  anchor.download = "darschin-input-template.xlsx";
  anchor.rel = "noopener";
  anchor.click();
}

const asText = (value: unknown): string => {
  if (value && typeof value === "object") {
    const item = value as { text?: unknown; result?: unknown; richText?: Array<{ text?: unknown }> };
    if (item.text !== undefined) return String(item.text).trim();
    if (item.result !== undefined) return String(item.result).trim();
    if (Array.isArray(item.richText)) return item.richText.map((part) => String(part.text ?? "")).join("").trim();
  }
  return String(value ?? "").trim();
};

async function loadExcelJs(): Promise<any> {
  const module = await import("exceljs");
  return (module as any).default ?? module;
}
const asList = (value: unknown) => asText(value).split(/[،,|]/).map((item) => item.trim()).filter(Boolean);
const asBool = (value: unknown) => ["1", "true", "yes", "بله"].includes(asText(value).toLowerCase());
const asNumber = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function sheetRows(workbook: any, name: string): Record<string, unknown>[] {
  const sheet = workbook.getWorksheet(name);
  if (!sheet) return [];
  const headers: string[] = [];
  sheet.getRow(1).eachCell((cell: any, column: number) => { headers[column - 1] = asText(cell.value); });
  const rows: Record<string, unknown>[] = [];
  sheet.eachRow((row: any, rowNumber: number) => {
    if (rowNumber === 1) return;
    const item: Record<string, unknown> = {};
    headers.forEach((header, index) => { if (header) item[header] = row.getCell(index + 1).value; });
    if (Object.values(item).some((value) => asText(value))) rows.push(item);
  });
  return rows;
}

export async function importExcel(file: File, base: TimetableInput): Promise<TimetableInput> {
  if (file.size > 4 * 1024 * 1024) throw new Error("حجم فایل Excel از ۴ مگابایت بیشتر است.");
  const ExcelJS = await loadExcelJs();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  if (workbook.worksheets.length > 20) throw new Error("تعداد برگه‌های Excel از حد مجاز بیشتر است.");
  const totalRows = workbook.worksheets.reduce((sum: number, sheet: any) => sum + Number(sheet.rowCount || 0), 0);
  if (totalRows > 10_000) throw new Error("تعداد سطرهای Excel از حد مجاز بیشتر است.");

  const equipment: Equipment[] = sheetRows(workbook, "تجهیزات").map((row) => ({ id: asText(row.id), name: asText(row.name) }));
  const instructors: Instructor[] = sheetRows(workbook, "استادان").map((row) => ({
    id: asText(row.id), name: asText(row.name),
    timeRules: { unavailableDays: asList(row.unavailableDays), unavailableSlots: asList(row.unavailableSlots) as any, undesiredDays: asList(row.undesiredDays), undesiredSlots: asList(row.undesiredSlots) as any },
    softMaxDailyPeriods: asNumber(row.softMaxDailyPeriods), softMaxConsecutivePeriods: asNumber(row.softMaxConsecutivePeriods),
  }));
  const studentGroups: StudentGroup[] = sheetRows(workbook, "گروه‌های دانشجویی").map((row) => ({
    id: asText(row.id), name: asText(row.name), size: asNumber(row.size),
    timeRules: { unavailableDays: asList(row.unavailableDays), unavailableSlots: asList(row.unavailableSlots) as any, undesiredDays: asList(row.undesiredDays), undesiredSlots: asList(row.undesiredSlots) as any },
    softMaxDailyPeriods: asNumber(row.softMaxDailyPeriods), softMaxConsecutivePeriods: asNumber(row.softMaxConsecutivePeriods),
  }));
  const rooms: Room[] = sheetRows(workbook, "فضاها").map((row) => ({
    id: asText(row.id), name: asText(row.name), building: asText(row.building), capacity: asNumber(row.capacity), roomType: asText(row.roomType) as Room["roomType"],
    equipmentIds: asList(row.equipmentIds), unavailableSlots: asList(row.unavailableSlots) as any,
  }));
  const courseRows = sheetRows(workbook, "دروس");
  const sessionRows = sheetRows(workbook, "جلسات");
  const courses: CourseSection[] = courseRows.map((row) => {
    const defaults = {
      instructorId: asText(row.instructorId), studentGroupId: asText(row.studentGroupId), enrollment: asNumber(row.enrollment), durationPeriods: asNumber(row.durationPeriods, 1),
      allowBreakCrossing: asBool(row.allowBreakCrossing), roomType: asText(row.roomType || "any") as CourseSection["defaults"]["roomType"],
      requiredEquipmentIds: asList(row.requiredEquipmentIds), preferredEquipmentIds: asList(row.preferredEquipmentIds), weekPattern: asText(row.weekPattern || "all") as CourseSection["defaults"]["weekPattern"],
    };
    const courseId = asText(row.id);
    const sessions: WeeklySession[] = sessionRows.filter((session) => asText(session.courseId) === courseId).map((session) => ({
      id: asText(session.id), label: asText(session.label),
      instructorId: asText(session.instructorId) || defaults.instructorId,
      studentGroupId: asText(session.studentGroupId) || defaults.studentGroupId,
      enrollment: asNumber(session.enrollment, defaults.enrollment), durationPeriods: asNumber(session.durationPeriods, defaults.durationPeriods),
      allowBreakCrossing: asText(session.allowBreakCrossing) ? asBool(session.allowBreakCrossing) : defaults.allowBreakCrossing,
      roomType: (asText(session.roomType) || defaults.roomType) as WeeklySession["roomType"],
      requiredEquipmentIds: asText(session.requiredEquipmentIds) ? asList(session.requiredEquipmentIds) : defaults.requiredEquipmentIds,
      preferredEquipmentIds: asText(session.preferredEquipmentIds) ? asList(session.preferredEquipmentIds) : defaults.preferredEquipmentIds,
      weekPattern: (asText(session.weekPattern) || defaults.weekPattern) as WeeklySession["weekPattern"], required: asBool(session.required),
      fixedSlot: asText(session.fixedSlot) as WeeklySession["fixedSlot"] || null, fixedRoomId: asText(session.fixedRoomId) || null,
      preferredRoomIds: asList(session.preferredRoomIds),
      timeRules: { unavailableDays: asList(session.unavailableDays), unavailableSlots: asList(session.unavailableSlots) as any, undesiredDays: asList(session.undesiredDays), undesiredSlots: asList(session.undesiredSlots) as any },
    }));
    return { id: courseId, groupNumber: asNumber(row.groupNumber), code: asText(row.code), name: asText(row.name), defaults, sessions };
  });
  const conflicts: CourseConflict[] = sheetRows(workbook, "تعارض‌ها").map((row) => ({
    id: asText(row.id), firstCourseId: asText(row.firstCourseId), secondCourseId: asText(row.secondCourseId), kind: asText(row.kind) as CourseConflict["kind"], weight: asNumber(row.weight, 1),
  }));
  const settingRows = sheetRows(workbook, "تنظیمات");
  const settingMap = new Map(settingRows.map((row) => [asText(row.key), row.value]));
  const dayIds = asList(settingMap.get("dayIds"));
  const days = structuredClone(base.days).map((day) => ({ ...day, enabled: dayIds.length ? dayIds.includes(day.id) : day.enabled }));
  const periodParts = asText(settingMap.get("periods")).split("|").map((item) => item.trim()).filter(Boolean);
  const breakIndexes = new Set(asList(settingMap.get("breakAfterPeriodIndexes")).map((item) => Number(item)).filter(Number.isInteger));
  const periods = periodParts.length ? periodParts.map((item, index) => {
    const [start, end] = item.split("-").map((part) => part.trim());
    if (!/^\d{2}:\d{2}$/.test(start ?? "") || !/^\d{2}:\d{2}$/.test(end ?? "")) throw new Error(`قالب بازهٔ ${index + 1} در برگه تنظیمات معتبر نیست.`);
    return { index, label: `بازه ${index + 1}`, start, end, breakAfter: breakIndexes.has(index), breakLabel: breakIndexes.has(index) ? "وقفه" : undefined };
  }) : structuredClone(base.periods);
  const settings = {
    ...structuredClone(base.settings),
    exactCourseLimit: Math.min(40, Math.max(1, Math.round(asNumber(settingMap.get("exactCourseLimit"), base.settings.exactCourseLimit)))),
    exactTimeLimitSeconds: Math.min(285, Math.max(1, Math.round(asNumber(settingMap.get("exactTimeLimitSeconds"), base.settings.exactTimeLimitSeconds)))),
    fastAttempts: Math.max(20, Math.round(asNumber(settingMap.get("fastAttempts"), base.settings.fastAttempts))),
    minimumDayGap: Math.max(0, Math.round(asNumber(settingMap.get("minimumDayGap"), base.settings.minimumDayGap))),
  };
  return { ...structuredClone(base), days, periods, settings, equipment, instructors, studentGroups, rooms, courses, conflicts };
}

function addRows(sheet: any, headers: string[], rows: unknown[][]): void {
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row.map((value) => /^[=+\-@\t\r\n＝＋－＠]/.test(String(value ?? "")) ? `'${value}` : value)));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Vazirmatn" };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF243B80" } };
  sheet.views = [{ rightToLeft: true, state: "frozen", ySplit: 1 }];
  sheet.columns.forEach((column: any) => { column.width = Math.min(34, Math.max(12, ...column.values.slice(1).map((value: unknown) => String(value ?? "").length + 2))); });
  sheet.eachRow((row: any) => row.eachCell((cell: any) => { cell.font = { ...(cell.font ?? {}), name: "Vazirmatn" }; cell.alignment = { vertical: "middle", wrapText: true, readingOrder: "rtl" }; }));
}

export async function exportResultExcel(input: TimetableInput, result: SolveResult): Promise<void> {
  const ExcelJS = await loadExcelJs();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hossein Karimi";
  workbook.subject = "Darschin university timetable";
  const invalid = Boolean(result.hardViolations.length || result.publishable === false);
  const scheduleHeaders = ["روز", "بازه", "کد درس", "نام درس", "شماره گروه", "جلسه", "استاد", "گروه دانشجویی", "اتاق", "ساختمان", "هفته", "اعتبار"];
  const scheduleRows = result.schedule.map((item) => [input.days.find((day) => day.id === item.dayId)?.label, input.periods[item.startPeriod]?.label, item.courseCode, item.courseName, item.groupNumber, item.sessionLabel, item.instructorName, item.studentGroupName, item.roomName, item.building, item.weekPattern, invalid ? "نامعتبر" : "معتبر"]);
  addRows(workbook.addWorksheet("برنامه"), scheduleHeaders, scheduleRows);
  addRows(workbook.addWorksheet("جلسات تخصیص‌نیافته"), ["جلسه", "اجباری", "دلایل"], result.unscheduled.map((item) => [item.label, item.required ? "بله" : "خیر", item.reasons.join(" | ")]));
  addRows(workbook.addWorksheet("نقض‌ها"), ["نوع", "شرح"], result.hardViolations.map((item) => ["قید سخت", item]));
  addRows(workbook.addWorksheet("خلاصه کیفیت"), ["شاخص", "مقدار"], [
    ["وضعیت", invalid ? "نامعتبر" : resultStatusLabel(result)],
    ["موتور", result.engine === "ortools-cp-sat" ? "روش دقیق OR-Tools CP-SAT" : "روش سریع مرورگری"],
    ["وضعیت CP-SAT", result.solverStatus ?? "—"],
    ["تابع هدف", result.objective],
    ["بهترین کران", result.bestBound ?? "—"],
    ["زمان حل (ms)", result.durationMs],
    ...Object.entries(result.breakdown).map(([key, value]) => [PENALTY_LABELS[key as keyof SoftWeights], value]),
  ]);
  const dimensions = [
    ["استاد", [...new Set(result.schedule.map((item) => item.instructorName))], (item: any, name: string) => item.instructorName === name],
    ["گروه", [...new Set(result.schedule.map((item) => item.studentGroupName))], (item: any, name: string) => item.studentGroupName === name],
    ["اتاق", [...new Set(result.schedule.map((item) => item.roomName))], (item: any, name: string) => item.roomName === name],
  ] as const;
  const usedNames = new Set(workbook.worksheets.map((sheet: any) => sheet.name));
  for (const [prefix, names, predicate] of dimensions) for (const name of names) {
    let sheetName = `${prefix}-${name}`.replace(/[\\/?*\[\]:]/g, "-").slice(0, 31);
    let counter = 2;
    const baseName = sheetName;
    while (usedNames.has(sheetName)) sheetName = `${baseName.slice(0, 27)}-${counter++}`;
    usedNames.add(sheetName);
    addRows(workbook.addWorksheet(sheetName), scheduleHeaders, result.schedule.filter((item) => predicate(item, name)).map((item) => [input.days.find((day) => day.id === item.dayId)?.label, input.periods[item.startPeriod]?.label, item.courseCode, item.courseName, item.groupNumber, item.sessionLabel, item.instructorName, item.studentGroupName, item.roomName, item.building, item.weekPattern, invalid ? "نامعتبر" : "معتبر"]));
  }
  const buffer = await workbook.xlsx.writeBuffer();
  const suffix = invalid ? "-نامعتبر" : "";
  downloadBlob(`${safeFilenamePart(input.title)}-schedule${suffix}.xlsx`, new Blob([buffer as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
}

function resultStatusLabel(result: SolveResult): string {
  if (result.hardViolations.length || result.publishable === false) return "نامعتبر برای انتشار";
  if (result.status === "optimal") return "بهینهٔ اثبات‌شده";
  if (result.status === "feasible") return "امکان‌پذیر؛ بهینگی اثبات نشده";
  if (result.status === "fallback") return "روش سریع جایگزین";
  if (result.status === "failed-required") return "ناموفق؛ جلسهٔ اجباری تخصیص نیافته";
  if (result.status === "partial") return "برنامهٔ ناقص";
  return "وضعیت نامشخص";
}
