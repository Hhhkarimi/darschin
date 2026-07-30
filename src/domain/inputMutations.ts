import type { SlotKey, TimeRules, TimetableInput } from "./types";

function remapSlot(slot: SlotKey, removedIndex: number): SlotKey | null {
  const [dayId, periodText] = slot.split(":");
  const period = Number(periodText);
  if (period === removedIndex) return null;
  return `${dayId}:${period > removedIndex ? period - 1 : period}` as SlotKey;
}

function remapSlots(slots: SlotKey[], removedIndex: number): SlotKey[] {
  return slots.map((slot) => remapSlot(slot, removedIndex)).filter((slot): slot is SlotKey => Boolean(slot));
}

function remapRules(rules: TimeRules, removedIndex: number): TimeRules {
  return {
    ...rules,
    unavailableSlots: remapSlots(rules.unavailableSlots, removedIndex),
    undesiredSlots: remapSlots(rules.undesiredSlots, removedIndex),
  };
}

export function removeInstructor(input: TimetableInput, id: string, replacementId: string): TimetableInput {
  if (id === replacementId || !input.instructors.some((item) => item.id === replacementId)) return input;
  return {
    ...input,
    instructors: input.instructors.filter((item) => item.id !== id),
    courses: input.courses.map((course) => ({
      ...course,
      defaults: { ...course.defaults, instructorId: course.defaults.instructorId === id ? replacementId : course.defaults.instructorId },
      sessions: course.sessions.map((session) => ({ ...session, instructorId: session.instructorId === id ? replacementId : session.instructorId })),
    })),
  };
}

export function removeStudentGroup(input: TimetableInput, id: string, replacementId: string): TimetableInput {
  if (id === replacementId || !input.studentGroups.some((item) => item.id === replacementId)) return input;
  return {
    ...input,
    studentGroups: input.studentGroups.filter((item) => item.id !== id),
    courses: input.courses.map((course) => ({
      ...course,
      defaults: { ...course.defaults, studentGroupId: course.defaults.studentGroupId === id ? replacementId : course.defaults.studentGroupId },
      sessions: course.sessions.map((session) => ({ ...session, studentGroupId: session.studentGroupId === id ? replacementId : session.studentGroupId })),
    })),
  };
}

export function removeRoom(input: TimetableInput, id: string): TimetableInput {
  if (input.rooms.length <= 1) return input;
  return {
    ...input,
    rooms: input.rooms.filter((room) => room.id !== id),
    courses: input.courses.map((course) => ({
      ...course,
      sessions: course.sessions.map((session) => ({
        ...session,
        fixedRoomId: session.fixedRoomId === id ? null : session.fixedRoomId,
        preferredRoomIds: session.preferredRoomIds.filter((roomId) => roomId !== id),
      })),
    })),
  };
}

export function removeEquipment(input: TimetableInput, id: string): TimetableInput {
  return {
    ...input,
    equipment: input.equipment.filter((item) => item.id !== id),
    rooms: input.rooms.map((room) => ({ ...room, equipmentIds: room.equipmentIds.filter((equipmentId) => equipmentId !== id) })),
    courses: input.courses.map((course) => ({
      ...course,
      defaults: {
        ...course.defaults,
        requiredEquipmentIds: course.defaults.requiredEquipmentIds.filter((equipmentId) => equipmentId !== id),
        preferredEquipmentIds: course.defaults.preferredEquipmentIds.filter((equipmentId) => equipmentId !== id),
      },
      sessions: course.sessions.map((session) => ({
        ...session,
        requiredEquipmentIds: session.requiredEquipmentIds.filter((equipmentId) => equipmentId !== id),
        preferredEquipmentIds: session.preferredEquipmentIds.filter((equipmentId) => equipmentId !== id),
      })),
    })),
  };
}

export function removePeriod(input: TimetableInput, removedIndex: number): TimetableInput {
  if (input.periods.length <= 1 || removedIndex < 0 || removedIndex >= input.periods.length) return input;
  const removed = input.periods[removedIndex];
  const periods = input.periods.filter((period) => period.index !== removedIndex).map((period, index) => ({ ...period, index }));
  if (removed.breakAfter && removedIndex > 0 && periods[removedIndex - 1]) {
    periods[removedIndex - 1] = { ...periods[removedIndex - 1], breakAfter: true, breakLabel: removed.breakLabel || "وقفه" };
  }
  const maxDuration = Math.max(1, periods.length);
  return {
    ...input,
    periods,
    closedSlots: remapSlots(input.closedSlots, removedIndex),
    instructors: input.instructors.map((item) => ({ ...item, timeRules: remapRules(item.timeRules, removedIndex), softMaxDailyPeriods: Math.min(item.softMaxDailyPeriods, maxDuration), softMaxConsecutivePeriods: Math.min(item.softMaxConsecutivePeriods, maxDuration) })),
    studentGroups: input.studentGroups.map((item) => ({ ...item, timeRules: remapRules(item.timeRules, removedIndex), softMaxDailyPeriods: Math.min(item.softMaxDailyPeriods, maxDuration), softMaxConsecutivePeriods: Math.min(item.softMaxConsecutivePeriods, maxDuration) })),
    rooms: input.rooms.map((room) => ({ ...room, unavailableSlots: remapSlots(room.unavailableSlots, removedIndex) })),
    settings: {
      ...input.settings,
      defaultInstructorMaxDailyPeriods: Math.min(input.settings.defaultInstructorMaxDailyPeriods, maxDuration),
      defaultGroupMaxDailyPeriods: Math.min(input.settings.defaultGroupMaxDailyPeriods, maxDuration),
      defaultInstructorMaxConsecutivePeriods: Math.min(input.settings.defaultInstructorMaxConsecutivePeriods, maxDuration),
      defaultGroupMaxConsecutivePeriods: Math.min(input.settings.defaultGroupMaxConsecutivePeriods, maxDuration),
    },
    courses: input.courses.map((course) => ({
      ...course,
      defaults: { ...course.defaults, durationPeriods: Math.min(course.defaults.durationPeriods, maxDuration) },
      sessions: course.sessions.map((session) => ({
        ...session,
        durationPeriods: Math.min(session.durationPeriods, maxDuration),
        fixedSlot: session.fixedSlot ? remapSlot(session.fixedSlot, removedIndex) : null,
        timeRules: remapRules(session.timeRules, removedIndex),
      })),
    })),
  };
}

export function instructorUsageCount(input: TimetableInput, id: string): number {
  return input.courses.reduce((sum, course) => sum + Number(course.defaults.instructorId === id) + course.sessions.filter((session) => session.instructorId === id).length, 0);
}

export function studentGroupUsageCount(input: TimetableInput, id: string): number {
  return input.courses.reduce((sum, course) => sum + Number(course.defaults.studentGroupId === id) + course.sessions.filter((session) => session.studentGroupId === id).length, 0);
}

export function roomUsageCount(input: TimetableInput, id: string): number {
  return input.courses.reduce((sum, course) => sum + course.sessions.filter((session) => session.fixedRoomId === id || session.preferredRoomIds.includes(id)).length, 0);
}

export function equipmentUsageCount(input: TimetableInput, id: string): number {
  const roomUses = input.rooms.filter((room) => room.equipmentIds.includes(id)).length;
  const courseUses = input.courses.reduce((sum, course) => sum
    + Number(course.defaults.requiredEquipmentIds.includes(id))
    + Number(course.defaults.preferredEquipmentIds.includes(id))
    + course.sessions.filter((session) => session.requiredEquipmentIds.includes(id) || session.preferredEquipmentIds.includes(id)).length, 0);
  return roomUses + courseUses;
}
