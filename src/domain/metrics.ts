import type { CandidatePlacement, PenaltyBreakdown, ScheduleItem, TimetableInput } from "./types";
import { allSessions, backToBackTravelConflict, placementPairHardConflict, placementsOverlap, ruleContains } from "./solverCommon";
import { patternsOverlap } from "./validation";

export const emptyPenaltyBreakdown = (): PenaltyBreakdown => ({
  unscheduledSession: 0,
  instructorUndesiredTime: 0,
  groupUndesiredTime: 0,
  sessionUndesiredTime: 0,
  preferredRoomRank: 0,
  missingPreferredEquipment: 0,
  dailyLoad: 0,
  consecutivePeriods: 0,
  resourceGaps: 0,
  buildingTravel: 0,
  sameCourseSameDay: 0,
  minimumDayGap: 0,
  softConflict: 0,
});

function consecutiveExcess(periods: Set<number>, input: TimetableInput, limit: number): number {
  if (limit <= 0) return 0;
  let run = 0;
  let excess = 0;
  const finishRun = () => { excess += Math.max(0, run - limit); run = 0; };
  for (let i = 0; i < input.periods.length; i++) {
    if (i > 0 && input.periods[i - 1]?.breakAfter) finishRun();
    if (periods.has(i)) run += 1; else finishRun();
  }
  finishRun();
  return excess;
}

export function evaluatePlacements(placements: CandidatePlacement[], input: TimetableInput) {
  const refs = new Map(allSessions(input).map((ref) => [ref.session.id, ref]));
  const breakdown = emptyPenaltyBreakdown();
  const scheduledIds = new Set(placements.map((item) => item.sessionId));
  breakdown.unscheduledSession = allSessions(input).filter((ref) => !scheduledIds.has(ref.session.id)).length;

  placements.forEach((placement) => {
    const ref = refs.get(placement.sessionId)!;
    const instructor = input.instructors.find((item) => item.id === ref.session.instructorId)!;
    const group = input.studentGroups.find((item) => item.id === ref.session.studentGroupId)!;
    const room = input.rooms.find((item) => item.id === placement.roomId)!;
    if (ruleContains(placement.dayId, placement.occupiedPeriods, instructor.timeRules.undesiredDays, instructor.timeRules.undesiredSlots)) breakdown.instructorUndesiredTime++;
    if (ruleContains(placement.dayId, placement.occupiedPeriods, group.timeRules.undesiredDays, group.timeRules.undesiredSlots)) breakdown.groupUndesiredTime++;
    if (ruleContains(placement.dayId, placement.occupiedPeriods, ref.session.timeRules.undesiredDays, ref.session.timeRules.undesiredSlots)) breakdown.sessionUndesiredTime++;
    if (ref.session.preferredRoomIds.length) {
      const rank = ref.session.preferredRoomIds.indexOf(room.id);
      breakdown.preferredRoomRank += rank >= 0 ? rank : ref.session.preferredRoomIds.length + 1;
    }
    breakdown.missingPreferredEquipment += ref.session.preferredEquipmentIds.filter((id) => !room.equipmentIds.includes(id)).length;
  });

  const weeks = ["odd", "even"] as const;
  const resourceSets: Array<{ type: "instructor" | "group"; ids: string[] }> = [
    { type: "instructor", ids: input.instructors.map((item) => item.id) },
    { type: "group", ids: input.studentGroups.map((item) => item.id) },
  ];
  resourceSets.forEach(({ type, ids }) => ids.forEach((id) => input.days.filter((day) => day.enabled).forEach((day) => weeks.forEach((week) => {
    const periods = new Set<number>();
    placements.forEach((placement) => {
      const ref = refs.get(placement.sessionId)!;
      const resourceId = type === "instructor" ? ref.session.instructorId : ref.session.studentGroupId;
      if (resourceId !== id || placement.dayId !== day.id || !(ref.session.weekPattern === "all" || ref.session.weekPattern === week)) return;
      placement.occupiedPeriods.forEach((period) => periods.add(period));
    });
    if (!periods.size) return;
    const entity = type === "instructor" ? input.instructors.find((item) => item.id === id)! : input.studentGroups.find((item) => item.id === id)!;
    const defaultDaily = type === "instructor" ? input.settings.defaultInstructorMaxDailyPeriods : input.settings.defaultGroupMaxDailyPeriods;
    const defaultConsecutive = type === "instructor" ? input.settings.defaultInstructorMaxConsecutivePeriods : input.settings.defaultGroupMaxConsecutivePeriods;
    const daily = entity.softMaxDailyPeriods || defaultDaily;
    const consecutive = entity.softMaxConsecutivePeriods || defaultConsecutive;
    breakdown.dailyLoad += Math.max(0, periods.size - daily);
    breakdown.consecutivePeriods += consecutiveExcess(periods, input, consecutive);
    const sorted = [...periods].sort((a, b) => a - b);
    if (sorted.length > 1) breakdown.resourceGaps += sorted[sorted.length - 1] - sorted[0] + 1 - periods.size;
  }))));

  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const first = placements[i];
      const second = placements[j];
      const aRef = refs.get(first.sessionId)!;
      const bRef = refs.get(second.sessionId)!;
      if (first.courseId === second.courseId && patternsOverlap(aRef.session.weekPattern, bRef.session.weekPattern)) {
        const dayA = input.days.findIndex((day) => day.id === first.dayId);
        const dayB = input.days.findIndex((day) => day.id === second.dayId);
        if (first.dayId === second.dayId) breakdown.sameCourseSameDay++;
        breakdown.minimumDayGap += Math.max(0, input.settings.minimumDayGap - Math.abs(dayA - dayB));
      }
      const sharesResource = aRef.session.instructorId === bRef.session.instructorId || aRef.session.studentGroupId === bRef.session.studentGroupId;
      if (sharesResource && first.dayId === second.dayId && patternsOverlap(aRef.session.weekPattern, bRef.session.weekPattern)) {
        const roomA = input.rooms.find((room) => room.id === first.roomId)!;
        const roomB = input.rooms.find((room) => room.id === second.roomId)!;
        if (roomA.building !== roomB.building && !placementsOverlap(first, second, aRef.session.weekPattern, bRef.session.weekPattern)) breakdown.buildingTravel++;
      }
      if (placementsOverlap(first, second, aRef.session.weekPattern, bRef.session.weekPattern)) {
        const conflict = input.conflicts.find((item) => item.kind === "soft" && ((item.firstCourseId === first.courseId && item.secondCourseId === second.courseId) || (item.firstCourseId === second.courseId && item.secondCourseId === first.courseId)));
        if (conflict) breakdown.softConflict += conflict.weight;
      }
    }
  }

  const objective = Object.entries(breakdown).reduce((sum, [key, count]) => sum + count * input.weights[key as keyof PenaltyBreakdown], 0);
  const hardViolations: string[] = [];
  for (let i = 0; i < placements.length; i++) for (let j = i + 1; j < placements.length; j++) {
    const firstRef = refs.get(placements[i].sessionId)!;
    const secondRef = refs.get(placements[j].sessionId)!;
    const reason = placementPairHardConflict(placements[i], placements[j], firstRef, secondRef, input);
    if (reason) hardViolations.push(`${firstRef.course.code} / ${secondRef.course.code}: ${reason}`);
    if (backToBackTravelConflict(placements[i], placements[j], firstRef, secondRef, input)) hardViolations.push(`${firstRef.course.code} / ${secondRef.course.code}: جابه‌جایی پشت‌سرهم بین ساختمان‌های متفاوت ممنوع است.`);
  }
  return { breakdown, objective, hardViolations: [...new Set(hardViolations)] };
}

export function toScheduleItems(placements: CandidatePlacement[], input: TimetableInput): ScheduleItem[] {
  const refs = new Map(allSessions(input).map((ref) => [ref.session.id, ref]));
  return placements.map((placement) => {
    const ref = refs.get(placement.sessionId)!;
    const instructor = input.instructors.find((item) => item.id === ref.session.instructorId)!;
    const group = input.studentGroups.find((item) => item.id === ref.session.studentGroupId)!;
    const room = input.rooms.find((item) => item.id === placement.roomId)!;
    return {
      ...placement,
      courseCode: ref.course.code,
      courseName: ref.course.name,
      groupNumber: ref.course.groupNumber,
      sessionLabel: ref.session.label,
      instructorId: instructor.id,
      instructorName: instructor.name,
      studentGroupId: group.id,
      studentGroupName: group.name,
      roomName: room.name,
      building: room.building,
      weekPattern: ref.session.weekPattern,
      required: ref.session.required,
    };
  }).sort((a, b) => input.days.findIndex((day) => day.id === a.dayId) - input.days.findIndex((day) => day.id === b.dayId) || a.startPeriod - b.startPeriod || a.courseCode.localeCompare(b.courseCode, "fa"));
}

export function candidatePenalty(placement: CandidatePlacement, current: CandidatePlacement[], input: TimetableInput): number {
  return evaluatePlacements([...current, placement], input).objective - evaluatePlacements(current, input).objective;
}
