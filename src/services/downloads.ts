import type { SolveResult, TimetableInput } from "../domain/types";

export function safeFilenamePart(value: string): string {
  return value.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").replace(/\s+/g, "-").slice(0, 80) || "darschin";
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadJson(input: TimetableInput): void {
  downloadBlob(`${safeFilenamePart(input.title)}-input.json`, new Blob([JSON.stringify(input, null, 2)], { type: "application/json;charset=utf-8" }));
}

function spreadsheetSafe(value: unknown): string {
  const text = String(value ?? "");
  return /^[=+\-@\t\r\n＝＋－＠]/.test(text) ? `'${text}` : text;
}

function csvCell(value: unknown): string {
  return `"${spreadsheetSafe(value).replaceAll('"', '""')}"`;
}

export function resultToCsv(input: TimetableInput, result: SolveResult): string {
  const invalid = Boolean(result.hardViolations.length || result.publishable === false);
  const rows: unknown[][] = [
    ["وضعیت", invalid ? "نامعتبر" : result.status],
    ["موتور", result.engine],
    ["وضعیت حل‌کننده", result.solverStatus ?? "—"],
    [],
    ["روز", "بازه شروع", "کد درس", "نام درس", "شماره گروه", "جلسه", "استاد", "گروه دانشجویی", "اتاق", "ساختمان", "الگوی هفته", "اعتبار"],
    ...result.schedule.map((item) => [
      input.days.find((day) => day.id === item.dayId)?.label ?? item.dayId,
      input.periods[item.startPeriod]?.label ?? item.startPeriod + 1,
      item.courseCode,
      item.courseName,
      item.groupNumber,
      item.sessionLabel,
      item.instructorName,
      item.studentGroupName,
      item.roomName,
      item.building,
      item.weekPattern,
      invalid ? "نامعتبر" : "معتبر",
    ]),
    [],
    ["جلسات تخصیص‌نیافته"],
    ["جلسه", "اجباری", "دلایل"],
    ...result.unscheduled.map((item) => [item.label, item.required ? "بله" : "خیر", item.reasons.join(" | ")]),
    [],
    ["نقض‌ها"],
    ...result.hardViolations.map((item) => [item]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export function downloadCsv(input: TimetableInput, result: SolveResult): void {
  const invalid = result.hardViolations.length || result.publishable === false;
  const suffix = invalid ? "-نامعتبر" : "";
  downloadBlob(`${safeFilenamePart(input.title)}-schedule${suffix}.csv`, new Blob([resultToCsv(input, result)], { type: "text/csv;charset=utf-8" }));
}
