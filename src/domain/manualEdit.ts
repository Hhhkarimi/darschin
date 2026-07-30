import { evaluatePlacements, toScheduleItems } from "./metrics";
import { occupiedPeriods, validatePlacementSet } from "./solverCommon";
import type { CandidatePlacement, SolveResult, TimetableInput } from "./types";

export function moveSessionManually(
  input: TimetableInput,
  result: SolveResult,
  sessionId: string,
  dayId: string,
  startPeriod: number,
  roomId: string,
): { next: SolveResult; newViolations: string[] } {
  const session = input.courses.flatMap((course) => course.sessions).find((item) => item.id === sessionId);
  if (!session) throw new Error("جلسه پیدا نشد.");
  const occupied = occupiedPeriods(input, startPeriod, session.durationPeriods, session.allowBreakCrossing)
    ?? Array.from({ length: session.durationPeriods }, (_, offset) => startPeriod + offset).filter((period) => period < input.periods.length);
  const placements: CandidatePlacement[] = result.schedule
    .filter((item) => item.sessionId !== sessionId)
    .map(({ sessionId: sid, courseId, dayId: day, startPeriod: start, occupiedPeriods: periods, roomId: room }) => ({ sessionId: sid, courseId, dayId: day, startPeriod: start, occupiedPeriods: periods, roomId: room }));
  const course = input.courses.find((item) => item.sessions.some((entry) => entry.id === sessionId))!;
  placements.push({ sessionId, courseId: course.id, dayId, startPeriod, occupiedPeriods: occupied, roomId });
  const hardViolations = validatePlacementSet(placements, input);
  const evaluation = evaluatePlacements(placements, input);
  const previouslyUnscheduled = result.unscheduled.filter((item) => item.sessionId !== sessionId);
  const next: SolveResult = {
    ...result,
    status: hardViolations.length ? "invalid" : previouslyUnscheduled.some((item) => item.required) ? "failed-required" : previouslyUnscheduled.length ? "partial" : "feasible",
    schedule: toScheduleItems(placements, input),
    unscheduled: previouslyUnscheduled,
    hardViolations,
    objective: evaluation.objective,
    breakdown: evaluation.breakdown,
    manuallyEdited: true,
    publishable: hardViolations.length === 0 && !previouslyUnscheduled.some((item) => item.required),
    diagnostics: [...result.diagnostics.filter((item) => !item.includes("ویرایش دستی")), "این برنامه پس از حل به‌صورت دستی ویرایش شده است."],
  };
  return { next, newViolations: hardViolations.filter((item) => !result.hardViolations.includes(item)) };
}
