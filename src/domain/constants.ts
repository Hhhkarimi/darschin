import type { RoomType, SoftWeights, SolverSettings, TimeRules, WeekPattern } from "./types";

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  lecture: "کلاس نظری",
  computer: "سایت رایانه",
  laboratory: "آزمایشگاه",
  workshop: "کارگاه",
  studio: "آتلیه / استودیو",
  any: "هر فضای سازگار",
};

export const WEEK_PATTERN_LABELS: Record<WeekPattern, string> = {
  all: "هر هفته",
  odd: "هفته‌های فرد",
  even: "هفته‌های زوج",
};

export const EMPTY_TIME_RULES: TimeRules = {
  unavailableDays: [],
  unavailableSlots: [],
  undesiredDays: [],
  undesiredSlots: [],
};


export const PENALTY_LABELS: Record<keyof SoftWeights, string> = {
  unscheduledSession: "جلسهٔ تخصیص‌نیافته",
  instructorUndesiredTime: "زمان نامطلوب استاد",
  groupUndesiredTime: "زمان نامطلوب گروه دانشجویی",
  sessionUndesiredTime: "زمان نامطلوب جلسه",
  preferredRoomRank: "رتبهٔ اتاق ترجیحی",
  missingPreferredEquipment: "نبود تجهیز ترجیحی",
  dailyLoad: "عبور از بار روزانه",
  consecutivePeriods: "عبور از حد بازه‌های متوالی",
  resourceGaps: "فاصلهٔ خالی برنامه",
  buildingTravel: "جابه‌جایی میان ساختمان‌ها",
  sameCourseSameDay: "جلسه‌های یک درس در یک روز",
  minimumDayGap: "کمبود فاصلهٔ روزانه",
  softConflict: "تعارض نرم",
};

export const DEFAULT_WEIGHTS: SoftWeights = {
  unscheduledSession: 1_000_000,
  instructorUndesiredTime: 12,
  groupUndesiredTime: 10,
  sessionUndesiredTime: 8,
  preferredRoomRank: 6,
  missingPreferredEquipment: 9,
  dailyLoad: 7,
  consecutivePeriods: 7,
  resourceGaps: 5,
  buildingTravel: 8,
  sameCourseSameDay: 14,
  minimumDayGap: 8,
  softConflict: 20,
};

export const DEFAULT_SETTINGS: SolverSettings = {
  exactCourseLimit: 40,
  exactTimeLimitSeconds: 285,
  fastAttempts: 180,
  minimumDayGap: 2,
  defaultInstructorMaxDailyPeriods: 4,
  defaultGroupMaxDailyPeriods: 5,
  defaultInstructorMaxConsecutivePeriods: 3,
  defaultGroupMaxConsecutivePeriods: 4,
};

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_COURSES = 250;
export const MAX_SESSIONS = 1_000;
export const MAX_ROOMS = 500;
export const MAX_TEXT_LENGTH = 160;
export const MAX_SOFT_WEIGHT = 1_000_000;
export const MAX_CONFLICT_WEIGHT = 10_000;
export const MAX_FAST_ATTEMPTS = 1_000;
