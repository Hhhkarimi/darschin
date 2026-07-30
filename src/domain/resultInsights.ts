import { PENALTY_LABELS } from "./constants";
import type { SoftWeights, SolveResult, TimetableInput } from "./types";

export type InsightBar = { id: string; label: string; value: number; percent: number; detail: string };
export type ResultInsights = {
  totalSessions: number;
  scheduledSessions: number;
  coveragePercent: number;
  mandatoryTotal: number;
  mandatoryScheduled: number;
  mandatoryCoveragePercent: number;
  usedRooms: number;
  unusedRooms: number;
  averageRoomUtilizationPercent: number;
  busiestDayLabel: string;
  busiestDayPeriods: number;
  heaviestInstructorLabel: string;
  heaviestInstructorPeriods: number;
  dayBars: InsightBar[];
  roomBars: InsightBar[];
  penaltyBars: InsightBar[];
  recommendations: string[];
};

const percent = (part: number, total: number) => total > 0 ? Math.round((part / total) * 100) : 0;

export function buildResultInsights(input: TimetableInput, result: SolveResult): ResultInsights {
  const allSessions = input.courses.flatMap((course) => course.sessions);
  const mandatory = allSessions.filter((session) => session.required);
  const scheduledIds = new Set(result.schedule.map((item) => item.sessionId));
  const mandatoryScheduled = mandatory.filter((session) => scheduledIds.has(session.id)).length;
  const dayValues = input.days.filter((day) => day.enabled).map((day) => {
    const items = result.schedule.filter((item) => item.dayId === day.id);
    const occupied = items.reduce((sum, item) => sum + item.occupiedPeriods.length, 0);
    return { id: day.id, label: day.label, sessions: items.length, occupied };
  });
  const maxDay = Math.max(1, ...dayValues.map((item) => item.occupied));
  const dayBars: InsightBar[] = dayValues.map((item) => ({
    id: item.id,
    label: item.label,
    value: item.occupied,
    percent: Math.round((item.occupied / maxDay) * 100),
    detail: `${item.sessions.toLocaleString("fa-IR")} جلسه · ${item.occupied.toLocaleString("fa-IR")} بازهٔ اشغال‌شده`,
  }));

  const roomValues = input.rooms.map((room) => {
    const items = result.schedule.filter((item) => item.roomId === room.id);
    const utilizations = items.map((item) => {
      const session = allSessions.find((entry) => entry.id === item.sessionId);
      return room.capacity > 0 ? Math.min(100, Math.round(((session?.enrollment ?? 0) / room.capacity) * 100)) : 0;
    });
    const average = utilizations.length ? Math.round(utilizations.reduce((sum, value) => sum + value, 0) / utilizations.length) : 0;
    return { id: room.id, label: room.name, sessions: items.length, occupied: items.reduce((sum, item) => sum + item.occupiedPeriods.length, 0), average };
  });
  const usedRoomValues = roomValues.filter((item) => item.sessions > 0).sort((a, b) => b.average - a.average || b.occupied - a.occupied);
  const roomBars: InsightBar[] = usedRoomValues.slice(0, 12).map((item) => ({
    id: item.id,
    label: item.label,
    value: item.average,
    percent: item.average,
    detail: `${item.average.toLocaleString("fa-IR")}٪ میانگین استفاده از ظرفیت · ${item.sessions.toLocaleString("fa-IR")} جلسه`,
  }));
  const averageRoomUtilizationPercent = usedRoomValues.length ? Math.round(usedRoomValues.reduce((sum, room) => sum + room.average, 0) / usedRoomValues.length) : 0;

  const weightedPenalties = Object.entries(result.breakdown).map(([key, count]) => {
    const weight = input.weights[key as keyof SoftWeights];
    return { key, count, weighted: count * weight };
  }).filter((item) => item.weighted > 0).sort((a, b) => b.weighted - a.weighted);
  const maxPenalty = Math.max(1, ...weightedPenalties.map((item) => item.weighted));
  const penaltyBars: InsightBar[] = weightedPenalties.slice(0, 8).map((item) => ({
    id: item.key,
    label: PENALTY_LABELS[item.key as keyof SoftWeights],
    value: item.weighted,
    percent: Math.max(4, Math.round((item.weighted / maxPenalty) * 100)),
    detail: `${item.count.toLocaleString("fa-IR")} مورد × وزن ${input.weights[item.key as keyof SoftWeights].toLocaleString("fa-IR")} = ${item.weighted.toLocaleString("fa-IR")}`,
  }));

  const instructorLoads = input.instructors.map((instructor) => ({
    id: instructor.id,
    label: instructor.name,
    periods: result.schedule.filter((item) => item.instructorId === instructor.id).reduce((sum, item) => sum + item.occupiedPeriods.length, 0),
  })).sort((a, b) => b.periods - a.periods);
  const busiestDay = [...dayValues].sort((a, b) => b.occupied - a.occupied)[0];
  const heaviestInstructor = instructorLoads[0];

  const recommendations: string[] = [];
  if (result.hardViolations.length) recommendations.push("برنامه دارای نقض قید سخت است؛ پیش از انتشار، جابه‌جایی‌های دستی نامعتبر را اصلاح کنید.");
  if (result.unscheduled.some((item) => item.required)) recommendations.push("حداقل یک جلسهٔ اجباری تخصیص نیافته است؛ ظرفیت فضا، زمان‌های ممنوع و تثبیت‌های زمانی را ابتدا بررسی کنید.");
  else if (result.unscheduled.length) recommendations.push("جلسات تخصیص‌نیافته را از گزارش تشخیصی باز کنید و محدودیت‌های مشترک آن‌ها را بررسی کنید.");
  if (weightedPenalties[0]) recommendations.push(`بیشترین سهم جریمه مربوط به «${PENALTY_LABELS[weightedPenalties[0].key as keyof SoftWeights]}» است؛ اصلاح این مورد بیشترین اثر را بر کیفیت نتیجه دارد.`);
  if (averageRoomUtilizationPercent < 45 && usedRoomValues.length) recommendations.push("میانگین استفاده از ظرفیت اتاق‌ها پایین است؛ اتاق‌های کوچک‌تر سازگار را در اولویت قرار دهید یا فهرست اتاق‌های ترجیحی را بازبینی کنید.");
  if (!recommendations.length) recommendations.push("نتیجه از نظر جلسات اجباری و قیود سخت آمادهٔ بازبینی نهایی مدیر گروه است.");

  return {
    totalSessions: allSessions.length,
    scheduledSessions: result.schedule.length,
    coveragePercent: percent(result.schedule.length, allSessions.length),
    mandatoryTotal: mandatory.length,
    mandatoryScheduled,
    mandatoryCoveragePercent: mandatory.length ? percent(mandatoryScheduled, mandatory.length) : 100,
    usedRooms: usedRoomValues.length,
    unusedRooms: Math.max(0, input.rooms.length - usedRoomValues.length),
    averageRoomUtilizationPercent,
    busiestDayLabel: busiestDay?.label ?? "—",
    busiestDayPeriods: busiestDay?.occupied ?? 0,
    heaviestInstructorLabel: heaviestInstructor?.label ?? "—",
    heaviestInstructorPeriods: heaviestInstructor?.periods ?? 0,
    dayBars,
    roomBars,
    penaltyBars,
    recommendations,
  };
}
