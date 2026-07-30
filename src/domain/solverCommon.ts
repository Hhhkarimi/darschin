import type { CandidatePlacement, CourseSection, Room, SlotKey, TimetableInput, WeeklySession } from "./types";
import { patternsOverlap } from "./validation";

export type SessionRef = { course: CourseSection; session: WeeklySession };

export const slotKey = (dayId: string, period: number): SlotKey => `${dayId}:${period}`;

export function allSessions(input: TimetableInput): SessionRef[] {
  return input.courses.flatMap((course) => course.sessions.map((session) => ({ course, session })));
}

export function occupiedPeriods(input: TimetableInput, startPeriod: number, duration: number, allowBreakCrossing: boolean): number[] | null {
  const occupied: number[] = [];
  let cursor = startPeriod;
  while (occupied.length < duration && cursor < input.periods.length) {
    occupied.push(cursor);
    if (!allowBreakCrossing && input.periods[cursor]?.breakAfter && occupied.length < duration) return null;
    cursor += 1;
  }
  return occupied.length === duration ? occupied : null;
}

export function ruleContains(dayId: string, periods: number[], unavailableDays: string[], unavailableSlots: SlotKey[]): boolean {
  if (unavailableDays.includes(dayId)) return true;
  return periods.some((period) => unavailableSlots.includes(slotKey(dayId, period)));
}

function roomMatches(session: WeeklySession, room: Room): boolean {
  if (session.fixedRoomId && session.fixedRoomId !== room.id) return false;
  if (room.capacity < session.enrollment) return false;
  if (session.roomType !== "any" && room.roomType !== session.roomType) return false;
  const features = new Set(room.equipmentIds);
  return session.requiredEquipmentIds.every((id) => features.has(id));
}

export function buildCandidates(ref: SessionRef, input: TimetableInput): CandidatePlacement[] {
  const { course, session } = ref;
  const instructor = input.instructors.find((item) => item.id === session.instructorId);
  const group = input.studentGroups.find((item) => item.id === session.studentGroupId);
  if (!instructor || !group) return [];
  const rooms = input.rooms.filter((room) => roomMatches(session, room));
  const fixed = session.fixedSlot ? /^([^:]+):(\d+)$/.exec(session.fixedSlot) : null;
  const candidates: CandidatePlacement[] = [];

  for (const day of input.days.filter((item) => item.enabled)) {
    if (fixed && day.id !== fixed[1]) continue;
    for (let start = 0; start < input.periods.length; start++) {
      if (fixed && start !== Number(fixed[2])) continue;
      const occupied = occupiedPeriods(input, start, session.durationPeriods, session.allowBreakCrossing);
      if (!occupied) continue;
      if (occupied.some((period) => input.closedSlots.includes(slotKey(day.id, period)))) continue;
      if (ruleContains(day.id, occupied, session.timeRules.unavailableDays, session.timeRules.unavailableSlots)) continue;
      if (ruleContains(day.id, occupied, instructor.timeRules.unavailableDays, instructor.timeRules.unavailableSlots)) continue;
      if (ruleContains(day.id, occupied, group.timeRules.unavailableDays, group.timeRules.unavailableSlots)) continue;
      rooms.forEach((room) => {
        if (occupied.some((period) => room.unavailableSlots.includes(slotKey(day.id, period)))) return;
        candidates.push({ sessionId: session.id, courseId: course.id, dayId: day.id, startPeriod: start, occupiedPeriods: occupied, roomId: room.id });
      });
    }
  }
  return candidates;
}

export function placementsOverlap(a: CandidatePlacement, b: CandidatePlacement, aPattern: WeeklySession["weekPattern"], bPattern: WeeklySession["weekPattern"]): boolean {
  return a.dayId === b.dayId
    && patternsOverlap(aPattern, bPattern)
    && a.occupiedPeriods.some((period) => b.occupiedPeriods.includes(period));
}

export function staticDiagnosis(ref: SessionRef, input: TimetableInput): string[] {
  const { session } = ref;
  const reasons: string[] = [];
  const capacityRooms = input.rooms.filter((room) => room.capacity >= session.enrollment);
  if (!capacityRooms.length) reasons.push("هیچ فضای آموزشی ظرفیت کافی ندارد.");
  const typedRooms = capacityRooms.filter((room) => session.roomType === "any" || room.roomType === session.roomType);
  if (capacityRooms.length && !typedRooms.length) reasons.push("نوع فضای موردنیاز موجود نیست.");
  const equippedRooms = typedRooms.filter((room) => session.requiredEquipmentIds.every((id) => room.equipmentIds.includes(id)));
  if (typedRooms.length && !equippedRooms.length) reasons.push("هیچ فضا تمام تجهیزات الزامی را ندارد.");
  if (session.fixedRoomId && !equippedRooms.some((room) => room.id === session.fixedRoomId)) reasons.push("اتاق ثابت با ظرفیت، نوع یا تجهیزات جلسه سازگار نیست.");
  if (!reasons.length) reasons.push("تعطیلی، عدم دسترسی یا ترکیب تعارض‌ها همهٔ گزینه‌های معتبر را مسدود کرده است.");
  return reasons;
}

export function placementPairHardConflict(a: CandidatePlacement, b: CandidatePlacement, aRef: SessionRef, bRef: SessionRef, input: TimetableInput): string | null {
  if (!placementsOverlap(a, b, aRef.session.weekPattern, bRef.session.weekPattern)) return null;
  if (a.courseId === b.courseId) return "تداخل جلسه‌های یک گروه درسی";
  if (a.roomId === b.roomId) return "تداخل فضای آموزشی";
  if (aRef.session.instructorId === bRef.session.instructorId) return "تداخل استاد";
  if (aRef.session.studentGroupId === bRef.session.studentGroupId) return "تداخل گروه دانشجویی";
  const conflict = input.conflicts.find((item) => item.kind === "hard" && ((item.firstCourseId === a.courseId && item.secondCourseId === b.courseId) || (item.firstCourseId === b.courseId && item.secondCourseId === a.courseId)));
  return conflict ? "تعارض سخت گروه‌های درسی" : null;
}

export function backToBackTravelConflict(a: CandidatePlacement, b: CandidatePlacement, aRef: SessionRef, bRef: SessionRef, input: TimetableInput): boolean {
  if (a.dayId !== b.dayId || !patternsOverlap(aRef.session.weekPattern, bRef.session.weekPattern)) return false;
  const sharesResource = aRef.session.instructorId === bRef.session.instructorId || aRef.session.studentGroupId === bRef.session.studentGroupId;
  if (!sharesResource) return false;
  const roomA = input.rooms.find((room) => room.id === a.roomId);
  const roomB = input.rooms.find((room) => room.id === b.roomId);
  if (!roomA || !roomB || roomA.building === roomB.building) return false;
  const endA = Math.max(...a.occupiedPeriods);
  const endB = Math.max(...b.occupiedPeriods);
  if (endA + 1 === b.startPeriod) return !input.periods[endA]?.breakAfter;
  if (endB + 1 === a.startPeriod) return !input.periods[endB]?.breakAfter;
  return false;
}

export function diagnoseUnscheduled(ref: SessionRef, scheduled: CandidatePlacement[], input: TimetableInput): string[] {
  const candidates = buildCandidates(ref, input);
  if (!candidates.length) return staticDiagnosis(ref, input);
  const refs = new Map(allSessions(input).map((item) => [item.session.id, item]));
  const counts = new Map<string, number>();
  for (const candidate of candidates) {
    const reasons = new Set<string>();
    for (const other of scheduled) {
      const otherRef = refs.get(other.sessionId);
      if (!otherRef) continue;
      const hard = placementPairHardConflict(candidate, other, ref, otherRef, input);
      if (hard) reasons.add(hard);
      if (backToBackTravelConflict(candidate, other, ref, otherRef, input)) reasons.add("جابه‌جایی پشت‌سرهم بین ساختمان‌های متفاوت");
    }
    if (!reasons.size) reasons.add("ترکیب انتخاب‌های فعلی مانع تخصیص این جلسه شده است");
    for (const reason of reasons) counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0], "fa"))
    .slice(0, 3)
    .map(([reason]) => `${reason}.`);
}

export function validatePlacementSet(placements: CandidatePlacement[], input: TimetableInput): string[] {
  const refs = new Map(allSessions(input).map((ref) => [ref.session.id, ref]));
  const violations: string[] = [];
  placements.forEach((placement) => {
    const ref = refs.get(placement.sessionId);
    if (!ref) {
      violations.push(`جلسه «${placement.sessionId}» در مدل ورودی وجود ندارد.`);
      return;
    }
    const validStatic = buildCandidates(ref, input).some((candidate) => candidate.dayId === placement.dayId && candidate.startPeriod === placement.startPeriod && candidate.roomId === placement.roomId && candidate.occupiedPeriods.join(",") === placement.occupiedPeriods.join(","));
    if (!validStatic) violations.push(`${ref.course.code} — ${ref.session.label}: زمان یا فضای انتخابی با یک قید سخت ایستا سازگار نیست.`);
  });
  for (let i = 0; i < placements.length; i++) for (let j = i + 1; j < placements.length; j++) {
    const firstRef = refs.get(placements[i].sessionId);
    const secondRef = refs.get(placements[j].sessionId);
    if (!firstRef || !secondRef) continue;
    const reason = placementPairHardConflict(placements[i], placements[j], firstRef, secondRef, input);
    if (reason) violations.push(`${firstRef.course.code} / ${secondRef.course.code}: ${reason}`);
    if (backToBackTravelConflict(placements[i], placements[j], firstRef, secondRef, input)) violations.push(`${firstRef.course.code} / ${secondRef.course.code}: جابه‌جایی پشت‌سرهم بین ساختمان‌های متفاوت ممنوع است.`);
  }
  return [...new Set(violations)];
}
