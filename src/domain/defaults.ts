import { DEFAULT_SETTINGS, DEFAULT_WEIGHTS, EMPTY_TIME_RULES } from "./constants";
import type { SessionDefaults, TimetableInput, WeeklySession } from "./types";

const rules = () => structuredClone(EMPTY_TIME_RULES);

export function makeSession(id: string, label: string, defaults: SessionDefaults, patch: Partial<WeeklySession> = {}): WeeklySession {
  return {
    id,
    label,
    ...structuredClone(defaults),
    required: false,
    fixedSlot: null,
    fixedRoomId: null,
    preferredRoomIds: [],
    timeRules: rules(),
    ...patch,
  };
}

export const DEFAULT_INPUT: TimetableInput = {
  schemaVersion: 3,
  title: "نیمسال جاری دانشکده فنی",
  days: [
    { id: "sat", label: "شنبه", enabled: true },
    { id: "sun", label: "یکشنبه", enabled: true },
    { id: "mon", label: "دوشنبه", enabled: true },
    { id: "tue", label: "سه‌شنبه", enabled: true },
    { id: "wed", label: "چهارشنبه", enabled: true },
    { id: "thu", label: "پنج‌شنبه", enabled: true },
  ],
  periods: [
    { index: 0, label: "بازه ۱", start: "08:00", end: "09:30", breakAfter: false },
    { index: 1, label: "بازه ۲", start: "09:45", end: "11:15", breakAfter: false },
    { index: 2, label: "بازه ۳", start: "11:30", end: "13:00", breakAfter: true, breakLabel: "وقفه ناهار" },
    { index: 3, label: "بازه ۴", start: "14:00", end: "15:30", breakAfter: false },
    { index: 4, label: "بازه ۵", start: "15:45", end: "17:15", breakAfter: false },
    { index: 5, label: "بازه ۶", start: "17:30", end: "19:00", breakAfter: false },
  ],
  closedSlots: [],
  equipment: [
    { id: "projector", name: "پروژکتور" },
    { id: "computers", name: "رایانه" },
    { id: "lab-bench", name: "میز آزمایش" },
  ],
  instructors: [
    { id: "i-ahmadi", name: "دکتر احمدی", timeRules: { ...rules(), unavailableSlots: ["sun:0", "sun:1"] }, softMaxDailyPeriods: 4, softMaxConsecutivePeriods: 3 },
    { id: "i-rahimi", name: "دکتر رحیمی", timeRules: { ...rules(), undesiredDays: ["tue"] }, softMaxDailyPeriods: 4, softMaxConsecutivePeriods: 3 },
    { id: "i-karimi", name: "دکتر کریمی", timeRules: rules(), softMaxDailyPeriods: 4, softMaxConsecutivePeriods: 3 },
  ],
  studentGroups: [
    { id: "g-cs-a", name: "کامپیوتر ۱۴۰۳-الف", size: 32, timeRules: rules(), softMaxDailyPeriods: 5, softMaxConsecutivePeriods: 4 },
    { id: "g-cs-b", name: "کامپیوتر ۱۴۰۳-ب", size: 31, timeRules: rules(), softMaxDailyPeriods: 5, softMaxConsecutivePeriods: 4 },
  ],
  rooms: [
    { id: "r-a101", name: "کلاس A101", building: "دانشکده فنی", capacity: 80, roomType: "lecture", equipmentIds: ["projector"], unavailableSlots: [] },
    { id: "r-a202", name: "کلاس A202", building: "دانشکده فنی", capacity: 45, roomType: "lecture", equipmentIds: ["projector"], unavailableSlots: [] },
    { id: "r-comp1", name: "سایت رایانه ۱", building: "مرکز رایانش", capacity: 35, roomType: "computer", equipmentIds: ["projector", "computers"], unavailableSlots: ["sat:0"] },
  ],
  courses: [],
  conflicts: [],
  weights: { ...DEFAULT_WEIGHTS },
  settings: { ...DEFAULT_SETTINGS },
  retiredGroupNumbers: [],
};

const mathDefaults: SessionDefaults = {
  instructorId: "i-ahmadi",
  studentGroupId: "g-cs-a",
  enrollment: 32,
  durationPeriods: 1,
  allowBreakCrossing: false,
  roomType: "lecture",
  requiredEquipmentIds: ["projector"],
  preferredEquipmentIds: [],
  weekPattern: "all",
};

DEFAULT_INPUT.courses = [
  {
    id: "c-math1-101",
    groupNumber: 101,
    code: "MATH-101",
    name: "ریاضی ۱",
    defaults: structuredClone(mathDefaults),
    sessions: [
      makeSession("s-math1-fixed", "جلسه ثابت", mathDefaults, { fixedSlot: "sat:1", required: true }),
      makeSession("s-math1-flex", "جلسه متغیر", mathDefaults),
    ],
  },
  {
    id: "c-db-lab-202",
    groupNumber: 202,
    code: "CS-203L",
    name: "آزمایشگاه پایگاه داده",
    defaults: {
      ...mathDefaults,
      instructorId: "i-rahimi",
      studentGroupId: "g-cs-b",
      enrollment: 31,
      durationPeriods: 2,
      allowBreakCrossing: true,
      roomType: "computer",
      requiredEquipmentIds: ["computers"],
      preferredEquipmentIds: ["projector"],
    },
    sessions: [
      makeSession("s-db-lab", "جلسه آزمایشگاه", {
        ...mathDefaults,
        instructorId: "i-rahimi",
        studentGroupId: "g-cs-b",
        enrollment: 31,
        durationPeriods: 2,
        allowBreakCrossing: true,
        roomType: "computer",
        requiredEquipmentIds: ["computers"],
        preferredEquipmentIds: ["projector"],
      }, { required: true, preferredRoomIds: ["r-comp1"] }),
    ],
  },
];

export function cloneDefaults(): TimetableInput {
  return structuredClone(DEFAULT_INPUT);
}
