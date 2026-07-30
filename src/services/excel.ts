import { PENALTY_LABELS, WEEK_PATTERN_LABELS } from "../domain/constants";
import { buildResultInsights } from "../domain/resultInsights";
import type { CourseConflict, CourseSection, Equipment, Instructor, Room, ScheduleItem, SoftWeights, SolveResult, StudentGroup, TimetableInput, WeeklySession } from "../domain/types";
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

function safeExcelValue(value: unknown): unknown {
  return /^[=+\-@\t\r\n＝＋－＠]/.test(String(value ?? "")) ? `'${value}` : value;
}

function styleAllCells(sheet: any): void {
  sheet.eachRow((row: any) => row.eachCell((cell: any) => {
    cell.font = { ...(cell.font ?? {}), name: "Vazirmatn" };
    cell.alignment = { vertical: "middle", wrapText: true, readingOrder: "rtl" };
  }));
}

function addRows(sheet: any, headers: string[], rows: unknown[][]): void {
  sheet.addRow(headers.map(safeExcelValue));
  rows.forEach((row) => sheet.addRow(row.map(safeExcelValue)));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Vazirmatn" };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF243B80" } };
  sheet.views = [{ rightToLeft: true, state: "frozen", ySplit: 1 }];
  sheet.columns.forEach((column: any) => { column.width = Math.min(34, Math.max(12, ...column.values.slice(1).map((value: unknown) => String(value ?? "").length + 2))); });
  styleAllCells(sheet);
}

function periodHeader(period: TimetableInput["periods"][number]): string {
  const breakText = period.breakAfter ? `\n${period.breakLabel || "وقفه پس از بازه"}` : "";
  return `${period.label}\n${period.start}–${period.end}${breakText}`;
}

function matrixItemText(item: ScheduleItem, continuing: boolean, invalid: boolean): string {
  return [
    invalid ? "[نامعتبر]" : "",
    `${continuing ? "ادامهٔ درس" : "درس"}: ${item.courseCode} — ${item.courseName}`,
    `گروه ${item.groupNumber.toLocaleString("fa-IR")} · ${item.sessionLabel}`,
    `استاد: ${item.instructorName}`,
    `گروه دانشجویی: ${item.studentGroupName}`,
    `فضا: ${item.roomName} · ${item.building}`,
    `هفته: ${WEEK_PATTERN_LABELS[item.weekPattern]}`,
  ].filter(Boolean).join("\n");
}

export function buildTimetableMatrix(input: TimetableInput, items: ScheduleItem[], invalid: boolean): { headers: string[]; rows: unknown[][] } {
  const headers = ["روز / زمان", ...input.periods.map(periodHeader)];
  const rows = input.days.filter((day) => day.enabled).map((day) => [
    day.label,
    ...input.periods.map((period) => items
      .filter((item) => item.dayId === day.id && item.occupiedPeriods.includes(period.index))
      .sort((first, second) => first.startPeriod - second.startPeriod || first.courseCode.localeCompare(second.courseCode, "fa"))
      .map((item) => matrixItemText(item, item.startPeriod < period.index, invalid))
      .join("\n\n")),
  ]);
  return { headers, rows };
}

function addTimetableMatrix(sheet: any, input: TimetableInput, items: ScheduleItem[], invalid: boolean): void {
  const { headers, rows } = buildTimetableMatrix(input, items, invalid);
  const columnCount = headers.length;
  const status = invalid ? "هشدار: این برنامه نامعتبر و برای انتشار نامناسب است." : "وضعیت خروجی: معتبر";
  sheet.addRow([status]);
  if (columnCount > 1) sheet.mergeCells(1, 1, 1, columnCount);
  sheet.addRow(headers.map(safeExcelValue));
  rows.forEach((row) => sheet.addRow(row.map(safeExcelValue)));

  const banner = sheet.getRow(1);
  banner.height = 26;
  banner.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Vazirmatn" };
  banner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: invalid ? "FF9F2430" : "FF1F6F5C" } };
  banner.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };

  const header = sheet.getRow(2);
  header.height = 46;
  header.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Vazirmatn" };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF243B80" } };
  header.alignment = { horizontal: "center", vertical: "middle", wrapText: true, readingOrder: "rtl" };

  sheet.getColumn(1).width = 16;
  for (let column = 2; column <= columnCount; column += 1) sheet.getColumn(column).width = 31;
  for (let row = 3; row <= rows.length + 2; row += 1) {
    sheet.getRow(row).height = 104;
    const dayCell = sheet.getRow(row).getCell(1);
    dayCell.font = { bold: true, name: "Vazirmatn" };
    dayCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F6FA" } };
    dayCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true, readingOrder: "rtl" };
  }

  sheet.eachRow((row: any, rowNumber: number) => row.eachCell({ includeEmpty: true }, (cell: any, columnNumber: number) => {
    cell.font = { ...(cell.font ?? {}), name: "Vazirmatn" };
    cell.alignment = { ...(cell.alignment ?? {}), vertical: "top", wrapText: true, readingOrder: "rtl" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFD7DDEA" } },
      left: { style: "thin", color: { argb: "FFD7DDEA" } },
      bottom: { style: "thin", color: { argb: "FFD7DDEA" } },
      right: { style: "thin", color: { argb: "FFD7DDEA" } },
    };
    if (rowNumber >= 3 && columnNumber === 1) cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true, readingOrder: "rtl" };
  }));

  sheet.views = [{ rightToLeft: true, state: "frozen", xSplit: 1, ySplit: 2 }];
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true };
  sheet.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: columnCount } };
}

export async function exportResultExcel(input: TimetableInput, result: SolveResult): Promise<void> {
  const ExcelJS = await loadExcelJs();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hossein Karimi";
  workbook.subject = "Darschin university timetable";
  const invalid = Boolean(result.hardViolations.length || result.publishable === false);

  const insights = buildResultInsights(input, result);
  addTimetableMatrix(workbook.addWorksheet("برنامه"), input, result.schedule, invalid);
  addRows(workbook.addWorksheet("جلسات تخصیص‌نیافته"), ["جلسه", "اجباری", "دلایل"], result.unscheduled.map((item) => [item.label, item.required ? "بله" : "خیر", item.reasons.join(" | ")]));
  addRows(workbook.addWorksheet("نقض‌ها"), ["نوع", "شرح"], result.hardViolations.map((item) => ["قید سخت", item]));
  addRows(workbook.addWorksheet("شاخص‌های مدیریتی"), ["شاخص", "مقدار", "توضیح"], [
    ["پوشش کل جلسات", `${insights.coveragePercent}%`, `${insights.scheduledSessions} از ${insights.totalSessions} جلسه`],
    ["پوشش جلسات اجباری", `${insights.mandatoryCoveragePercent}%`, `${insights.mandatoryScheduled} از ${insights.mandatoryTotal} جلسه`],
    ["میانگین استفاده از ظرفیت اتاق‌ها", `${insights.averageRoomUtilizationPercent}%`, `${insights.usedRooms} اتاق استفاده‌شده و ${insights.unusedRooms} اتاق استفاده‌نشده`],
    ["پرتراکم‌ترین روز", insights.busiestDayLabel, `${insights.busiestDayPeriods} بازهٔ اشغال‌شده`],
    ["بیشترین بار استاد", insights.heaviestInstructorLabel, `${insights.heaviestInstructorPeriods} بازه در هفته`],
    ["قابل انتشار", invalid ? "خیر" : "بله", invalid ? "دارای نقض سخت یا جلسهٔ اجباری تخصیص‌نیافته" : "پس از بازبینی نهایی مدیر گروه"],
    ...insights.recommendations.map((item, index) => [`نکتهٔ قابل اقدام ${index + 1}`, item, ""]),
  ]);
  addRows(workbook.addWorksheet("بار روزها"), ["روز", "بازهٔ اشغال‌شده", "جزئیات"], insights.dayBars.map((item) => [item.label, item.value, item.detail]));
  addRows(workbook.addWorksheet("استفاده از اتاق‌ها"), ["اتاق", "درصد میانگین استفاده از ظرفیت", "جزئیات"], insights.roomBars.map((item) => [item.label, item.value, item.detail]));
  addRows(workbook.addWorksheet("سهم جریمه‌ها"), ["عامل", "سهم وزن‌دار", "محاسبه"], insights.penaltyBars.map((item) => [item.label, item.value, item.detail]));
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
    ["استاد", [...new Set(result.schedule.map((item) => item.instructorName))], (item: ScheduleItem, name: string) => item.instructorName === name],
    ["گروه", [...new Set(result.schedule.map((item) => item.studentGroupName))], (item: ScheduleItem, name: string) => item.studentGroupName === name],
    ["اتاق", [...new Set(result.schedule.map((item) => item.roomName))], (item: ScheduleItem, name: string) => item.roomName === name],
  ] as const;
  const usedNames = new Set(workbook.worksheets.map((sheet: any) => sheet.name));
  for (const [prefix, names, predicate] of dimensions) for (const name of names) {
    let sheetName = `${prefix}-${name}`.replace(/[\\/?*\[\]:]/g, "-").slice(0, 31);
    let counter = 2;
    const baseName = sheetName;
    while (usedNames.has(sheetName)) sheetName = `${baseName.slice(0, 27)}-${counter++}`;
    usedNames.add(sheetName);
    addTimetableMatrix(workbook.addWorksheet(sheetName), input, result.schedule.filter((item) => predicate(item, name)), invalid);
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
