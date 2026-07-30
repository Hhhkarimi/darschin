import { cloneDefaults, makeSession } from "./defaults";
import type { CourseSection, Instructor, Room, StudentGroup, TimetableInput, TimeRules, WeeklySession } from "./types";

export type MigrationResult = { input: TimetableInput; warnings: string[]; migrated: boolean };

type UnknownRecord = Record<string, unknown>;

const record = (value: unknown): UnknownRecord => value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown, fallback = ""): string => String(value ?? fallback).trim();
const number = (value: unknown, fallback: number): number => Number.isFinite(Number(value)) ? Number(value) : fallback;
const bool = (value: unknown, fallback = false): boolean => value === undefined ? fallback : value === true || value === 1 || String(value).toLowerCase() === "true";
const texts = (value: unknown): string[] => Array.isArray(value)
  ? [...new Set(value.map((item) => text(item)).filter(Boolean))]
  : typeof value === "string" ? [...new Set(value.split(/[،,|]/).map((item) => item.trim()).filter(Boolean))] : [];

function legacySlot(value: unknown, days: TimetableInput["days"], periods: TimetableInput["periods"]): `${string}:${number}` | null {
  const match = /^(\d+)[-:](\d+)$/.exec(text(value));
  if (!match) return null;
  const day = days[Number(match[1])];
  const period = Number(match[2]);
  return day && period >= 0 && period < periods.length ? `${day.id}:${period}` : null;
}

function legacySlots(value: unknown, base: TimetableInput): `${string}:${number}`[] {
  return texts(value).map((item) => legacySlot(item, base.days, base.periods)).filter((item): item is `${string}:${number}` => Boolean(item));
}

function preferredAsUndesired(preferred: unknown, base: TimetableInput): `${string}:${number}`[] {
  const preferredSet = new Set(legacySlots(preferred, base));
  if (!preferredSet.size) return [];
  return base.days.filter((day) => day.enabled).flatMap((day) => base.periods.map((_, period) => `${day.id}:${period}` as const)).filter((slot) => !preferredSet.has(slot));
}

function legacyRule(value: unknown, base: TimetableInput): TimeRules {
  const item = record(value);
  return {
    unavailableDays: [],
    unavailableSlots: legacySlots(item.unavailableSlots, base),
    undesiredDays: [],
    undesiredSlots: preferredAsUndesired(item.preferredSlots, base),
  };
}

function normalizeId(prefix: string, value: string, index: number): string {
  const safe = value.normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 48);
  return `${prefix}-${safe || index + 1}`;
}

export function migrateImportedInput(value: unknown): MigrationResult {
  const raw = record(value);
  if (raw.schemaVersion === 3) return { input: value as TimetableInput, warnings: [], migrated: false };

  const base = cloneDefaults();
  const warnings: string[] = ["فایل قدیمی به مدل دادهٔ نسخهٔ ۳ و جلسه‌های مستقل تبدیل شد."];
  const rawCourses = array(raw.courses).map(record);
  const rawRooms = array(raw.rooms).map(record);

  const equipmentNames = [...new Set([
    ...rawRooms.flatMap((room) => texts(room.features)),
    ...rawCourses.flatMap((course) => [...texts(course.requiredFeatures), ...texts(course.preferredEquipmentIds)]),
  ])];
  const equipment = equipmentNames.map((name, index) => ({ id: normalizeId("eq", name, index), name }));
  const equipmentId = new Map(equipment.map((item) => [item.name, item.id]));

  const instructorNames = [...new Set(rawCourses.flatMap((course) => {
    const names = texts(course.instructors);
    return names.length ? names : text(course.teacher) ? [text(course.teacher)] : [];
  }))];
  const groupNames = [...new Set(rawCourses.flatMap((course) => {
    const names = texts(course.studentGroups);
    return names.length ? names : text(course.group) ? [text(course.group)] : [];
  }))];
  const instructorRules = record(raw.instructorRules);
  const groupRules = record(raw.groupRules);
  const instructors: Instructor[] = instructorNames.map((name, index) => {
    const rule = record(instructorRules[name]);
    return {
      id: normalizeId("instructor", name, index), name, timeRules: legacyRule(rule, base),
      softMaxDailyPeriods: number(rule.maxDailyPeriods, base.settings.defaultInstructorMaxDailyPeriods),
      softMaxConsecutivePeriods: number(rule.maxConsecutivePeriods, base.settings.defaultInstructorMaxConsecutivePeriods),
    };
  });
  const studentGroups: StudentGroup[] = groupNames.map((name, index) => {
    const rule = record(groupRules[name]);
    const size = Math.max(1, ...rawCourses.filter((course) => texts(course.studentGroups).includes(name) || text(course.group) === name).map((course) => number(course.enrollment, 1)));
    return {
      id: normalizeId("group", name, index), name, size, timeRules: legacyRule(rule, base),
      softMaxDailyPeriods: number(rule.maxDailyPeriods, base.settings.defaultGroupMaxDailyPeriods),
      softMaxConsecutivePeriods: number(rule.maxConsecutivePeriods, base.settings.defaultGroupMaxConsecutivePeriods),
    };
  });
  const instructorId = new Map(instructors.map((item) => [item.name, item.id]));
  const groupId = new Map(studentGroups.map((item) => [item.name, item.id]));

  const rooms: Room[] = rawRooms.map((room, index) => ({
    id: text(room.id, `room-${index + 1}`),
    name: text(room.name, `فضای ${index + 1}`),
    building: text(room.building ?? room.floor, "ساختمان اصلی"),
    capacity: Math.max(1, Math.round(number(room.capacity, 40))),
    roomType: (["lecture", "computer", "laboratory", "workshop", "studio"].includes(text(room.roomType)) ? text(room.roomType) : "lecture") as Room["roomType"],
    equipmentIds: texts(room.features).map((name) => equipmentId.get(name)).filter((id): id is string => Boolean(id)),
    unavailableSlots: legacySlots(room.unavailableSlots, base),
  }));

  let nextGroupNumber = 1;
  const usedNumbers = new Set<number>();
  const courses: CourseSection[] = rawCourses.map((course, courseIndex) => {
    const names = texts(course.instructors).length ? texts(course.instructors) : [text(course.teacher)].filter(Boolean);
    const groups = texts(course.studentGroups).length ? texts(course.studentGroups) : [text(course.group)].filter(Boolean);
    if (names.length > 1) warnings.push(`برای «${text(course.name, text(course.code))}» فقط استاد نخست به جلسه‌های مهاجرت‌یافته اختصاص یافت.`);
    if (groups.length > 1) warnings.push(`برای «${text(course.name, text(course.code))}» فقط گروه دانشجویی نخست به جلسه‌های مهاجرت‌یافته اختصاص یافت.`);
    let groupNumber = Math.round(number(course.groupNumber, nextGroupNumber));
    while (groupNumber <= 0 || usedNumbers.has(groupNumber)) groupNumber = ++nextGroupNumber;
    usedNumbers.add(groupNumber);
    nextGroupNumber = Math.max(nextGroupNumber, groupNumber + 1);
    const duration = Math.max(1, Math.round(number(course.duration, 1)));
    const defaults = {
      instructorId: instructorId.get(names[0]) ?? instructors[0]?.id ?? "",
      studentGroupId: groupId.get(groups[0]) ?? studentGroups[0]?.id ?? "",
      enrollment: Math.max(1, Math.round(number(course.enrollment, 30))),
      durationPeriods: duration,
      allowBreakCrossing: bool(course.allowBreakCrossing, false),
      roomType: (["lecture", "computer", "laboratory", "workshop", "studio", "any"].includes(text(course.roomType)) ? text(course.roomType) : "any") as CourseSection["defaults"]["roomType"],
      requiredEquipmentIds: texts(course.requiredFeatures).map((name) => equipmentId.get(name)).filter((id): id is string => Boolean(id)),
      preferredEquipmentIds: [],
      weekPattern: (["all", "odd", "even"].includes(text(course.weekPattern)) ? text(course.weekPattern) : "all") as CourseSection["defaults"]["weekPattern"],
    };
    const fixedSlots = record(course.fixedSlots);
    const count = Math.max(1, Math.round(number(course.meetingsPerWeek ?? course.sessions, 1)));
    const sessions: WeeklySession[] = Array.from({ length: count }, (_, index) => {
      const sessionNumber = index + 1;
      return makeSession(`${text(course.id, `course-${courseIndex + 1}`)}::${sessionNumber}`, `جلسه ${sessionNumber}`, defaults, {
        fixedSlot: legacySlot(fixedSlots[String(sessionNumber)], base.days, base.periods),
        fixedRoomId: text(course.fixedRoomId) || null,
        preferredRoomIds: texts(course.preferredRoomIds),
        timeRules: {
          unavailableDays: [],
          unavailableSlots: legacySlots(course.forbiddenSlots, base),
          undesiredDays: [],
          undesiredSlots: preferredAsUndesired(course.preferredSlots, base),
        },
      });
    });
    return { id: text(course.id, `course-${courseIndex + 1}`), groupNumber, code: text(course.code, `C-${groupNumber}`), name: text(course.name, `درس ${groupNumber}`), defaults, sessions };
  });

  const rawSettings = record(raw.settings);
  const rawWeights = record(raw.weights);
  const conflicts = array(raw.conflicts).map(record).map((conflict, index) => ({
    id: text(conflict.id, `conflict-${index + 1}`),
    firstCourseId: text(conflict.firstCourseId), secondCourseId: text(conflict.secondCourseId),
    kind: conflict.kind === "hard" ? "hard" as const : "soft" as const,
    weight: Math.max(0, number(conflict.weight, 1)),
  }));

  const input: TimetableInput = {
    ...base,
    title: text(raw.title, "دادهٔ مهاجرت‌یافته درس‌چین"),
    closedSlots: legacySlots(rawSettings.closedSlots, base),
    equipment, instructors, studentGroups, rooms, courses, conflicts,
    settings: {
      ...base.settings,
      fastAttempts: Math.max(20, Math.round(number(rawSettings.attempts, base.settings.fastAttempts))),
      minimumDayGap: Math.max(0, Math.round(number(rawSettings.minimumDayGap, base.settings.minimumDayGap))),
    },
    weights: {
      ...base.weights,
      instructorUndesiredTime: Math.max(0, number(rawWeights.instructorPreference, base.weights.instructorUndesiredTime)),
      groupUndesiredTime: Math.max(0, number(rawWeights.groupPreference, base.weights.groupUndesiredTime)),
      sessionUndesiredTime: Math.max(0, number(rawWeights.coursePreference, base.weights.sessionUndesiredTime)),
      minimumDayGap: Math.max(0, number(rawWeights.spacing, base.weights.minimumDayGap)),
      resourceGaps: Math.max(0, number(rawWeights.gaps, base.weights.resourceGaps)),
      softConflict: Math.max(0, number(rawWeights.softConflict, base.weights.softConflict)),
    },
    retiredGroupNumbers: [],
  };
  if (rawWeights.capacityWaste !== undefined || rawWeights.latePeriod !== undefined || rawWeights.roomStability !== undefined) warnings.push("جریمه‌های قدیمی اتلاف ظرفیت، انتهای روز و ثبات اتاق طبق تصمیم دامنهٔ جدید حذف شدند.");
  return { input, warnings: [...new Set(warnings)], migrated: true };
}
