export type RoomType = "lecture" | "computer" | "laboratory" | "workshop" | "studio" | "any";
export type WeekPattern = "all" | "odd" | "even";
export type ConflictKind = "hard" | "soft";

export type CourseSection = {
  id: string;
  code: string;
  name: string;
  instructors: string[];
  studentGroups: string[];
  enrollment: number;
  meetingsPerWeek: number;
  duration: number;
  roomType: RoomType;
  requiredFeatures: string[];
  preferredRoomIds: string[];
  fixedRoomId: string;
  fixedSlots: Record<string, string>;
  forbiddenSlots: string[];
  preferredSlots: string[];
  minDayGap: number;
  roomConsistency: boolean;
  weekPattern: WeekPattern;
};

export type Room = {
  id: string;
  name: string;
  building: string;
  capacity: number;
  roomType: Exclude<RoomType, "any">;
  features: string[];
  unavailableSlots: string[];
};

export type EntityRule = {
  preferredSlots: string[];
  unavailableSlots: string[];
  maxDailyPeriods: number;
  maxConsecutivePeriods: number;
};

export type RuleMap = Record<string, EntityRule>;

export type CourseConflict = {
  id: string;
  firstCourseId: string;
  secondCourseId: string;
  kind: ConflictKind;
  weight: number;
};

export type SolverSettings = {
  dayCount: number;
  timeCount: number;
  separateCourseMeetings: boolean;
  minimumDayGapIsHard: boolean;
  travelBufferPeriods: number;
  maxInstructorDailyPeriods: number;
  maxGroupDailyPeriods: number;
  maxInstructorConsecutivePeriods: number;
  maxGroupConsecutivePeriods: number;
  closedSlots: string[];
  attempts: number;
};

export type SolveWeights = {
  instructorPreference: number;
  groupPreference: number;
  coursePreference: number;
  spacing: number;
  roomStability: number;
  capacityWaste: number;
  latePeriod: number;
  gaps: number;
  softConflict: number;
};

export type TimetableInput = {
  courses: CourseSection[];
  rooms: Room[];
  instructorRules: RuleMap;
  groupRules: RuleMap;
  conflicts: CourseConflict[];
  settings: SolverSettings;
  weights: SolveWeights;
};

export type ScheduleItem = {
  eventId: string;
  courseId: string;
  code: string;
  name: string;
  instructors: string[];
  studentGroups: string[];
  session: number;
  day: number;
  startPeriod: number;
  duration: number;
  roomId: string;
  roomName: string;
  building: string;
  weekPattern: WeekPattern;
  preferenceMet: boolean | null;
};

export type UnscheduledItem = {
  eventId: string;
  label: string;
  reasons: string[];
};

export type PenaltyBreakdown = {
  instructorPreference: number;
  groupPreference: number;
  coursePreference: number;
  spacing: number;
  roomStability: number;
  capacityWaste: number;
  latePeriod: number;
  gaps: number;
  softConflict: number;
};

export type SolveResult = {
  schedule: ScheduleItem[];
  unscheduled: UnscheduledItem[];
  hardViolations: string[];
  objective: number;
  breakdown: PenaltyBreakdown;
  preferenceRate: number;
  roomUtilization: number;
  durationMs: number;
  validationErrors: string[];
};

type Event = { id: string; course: CourseSection; session: number };
type Candidate = { day: number; startPeriod: number; roomId: string };
type Placement = { event: Event; candidate: Candidate };

export const DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه"];
export const TIME_LABELS = [
  "۸:۰۰–۹:۳۰",
  "۹:۴۵–۱۱:۱۵",
  "۱۱:۳۰–۱۳:۰۰",
  "۱۴:۰۰–۱۵:۳۰",
  "۱۵:۴۵–۱۷:۱۵",
  "۱۷:۳۰–۱۹:۰۰",
  "۱۹:۱۵–۲۰:۴۵",
];

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  lecture: "کلاس نظری",
  computer: "سایت رایانه",
  laboratory: "آزمایشگاه",
  workshop: "کارگاه",
  studio: "آتلیه / استودیو",
  any: "هر فضای مناسب",
};

export const WEEK_PATTERN_LABELS: Record<WeekPattern, string> = {
  all: "هر هفته",
  odd: "هفته‌های فرد",
  even: "هفته‌های زوج",
};

export const DEFAULT_SETTINGS: SolverSettings = {
  dayCount: 6,
  timeCount: 6,
  separateCourseMeetings: true,
  minimumDayGapIsHard: false,
  travelBufferPeriods: 1,
  maxInstructorDailyPeriods: 4,
  maxGroupDailyPeriods: 5,
  maxInstructorConsecutivePeriods: 3,
  maxGroupConsecutivePeriods: 4,
  closedSlots: [],
  attempts: 180,
};

export const DEFAULT_WEIGHTS: SolveWeights = {
  instructorPreference: 12,
  groupPreference: 10,
  coursePreference: 8,
  spacing: 14,
  roomStability: 6,
  capacityWaste: 2,
  latePeriod: 4,
  gaps: 5,
  softConflict: 20,
};

const course = (
  id: string,
  code: string,
  name: string,
  instructors: string[],
  studentGroups: string[],
  enrollment: number,
  meetingsPerWeek: number,
  duration: number,
  roomType: RoomType,
  requiredFeatures: string[],
  extra: Partial<CourseSection> = {},
): CourseSection => ({
  id,
  code,
  name,
  instructors,
  studentGroups,
  enrollment,
  meetingsPerWeek,
  duration,
  roomType,
  requiredFeatures,
  preferredRoomIds: [],
  fixedRoomId: "",
  fixedSlots: {},
  forbiddenSlots: [],
  preferredSlots: [],
  minDayGap: 2,
  roomConsistency: true,
  weekPattern: "all",
  ...extra,
});

export const DEFAULT_INPUT: TimetableInput = {
  courses: [
    course("CS201", "CS-201", "طراحی الگوریتم‌ها", ["دکتر احمدی"], ["کامپیوتر ۱۴۰۳-الف", "کامپیوتر ۱۴۰۳-ب"], 64, 2, 1, "lecture", ["پروژکتور"], { fixedSlots: { "1": "0-1" } }),
    course("CS203", "CS-203", "پایگاه داده", ["دکتر رحیمی"], ["کامپیوتر ۱۴۰۳-الف", "کامپیوتر ۱۴۰۳-ب"], 64, 2, 1, "lecture", ["پروژکتور"]),
    course("CS205", "CS-205", "سیستم‌های عامل", ["دکتر کریمی"], ["کامپیوتر ۱۴۰۳-الف", "کامپیوتر ۱۴۰۳-ب"], 64, 2, 1, "lecture", ["پروژکتور"]),
    course("CS203LA", "CS-203L-A", "آزمایشگاه پایگاه داده — گروه الف", ["دکتر رحیمی"], ["کامپیوتر ۱۴۰۳-الف"], 31, 1, 2, "computer", ["رایانه", "پروژکتور"], { minDayGap: 1 }),
    course("CS203LB", "CS-203L-B", "آزمایشگاه پایگاه داده — گروه ب", ["دکتر رحیمی"], ["کامپیوتر ۱۴۰۳-ب"], 31, 1, 2, "computer", ["رایانه", "پروژکتور"], { minDayGap: 1 }),
    course("CS301", "CS-301", "هوش مصنوعی", ["دکتر احمدی"], ["کامپیوتر ۱۴۰۲"], 42, 2, 1, "lecture", ["پروژکتور"]),
    course("CS301L", "CS-301L", "کارگاه هوش مصنوعی", ["دکتر احمدی", "مهندس صادقی"], ["کامپیوتر ۱۴۰۲"], 28, 1, 2, "computer", ["رایانه", "پروژکتور"], { minDayGap: 1 }),
    course("MATH201", "MATH-201", "ریاضیات مهندسی", ["دکتر مرادی"], ["کامپیوتر ۱۴۰۳-الف", "کامپیوتر ۱۴۰۳-ب", "برق ۱۴۰۳-الف", "برق ۱۴۰۳-ب"], 76, 2, 1, "lecture", ["پروژکتور"], { fixedRoomId: "A101" }),
    course("EE201", "EE-201", "مدارهای الکتریکی", ["دکتر حسینی"], ["برق ۱۴۰۳-الف", "برق ۱۴۰۳-ب"], 55, 2, 1, "lecture", ["پروژکتور"]),
    course("EE201LA", "EE-201L-A", "آزمایشگاه مدار — گروه الف", ["دکتر حسینی"], ["برق ۱۴۰۳-الف"], 27, 1, 2, "laboratory", ["میز آزمایش", "پروژکتور"], { minDayGap: 1 }),
    course("EE201LB", "EE-201L-B", "آزمایشگاه مدار — گروه ب", ["مهندس نادری"], ["برق ۱۴۰۳-ب"], 27, 1, 2, "laboratory", ["میز آزمایش", "پروژکتور"], { minDayGap: 1 }),
  ],
  rooms: [
    { id: "A101", name: "کلاس A101", building: "دانشکده فنی", capacity: 80, roomType: "lecture", features: ["پروژکتور", "سیستم صوتی"], unavailableSlots: ["5-5"] },
    { id: "A202", name: "کلاس A202", building: "دانشکده فنی", capacity: 45, roomType: "lecture", features: ["پروژکتور"], unavailableSlots: [] },
    { id: "COMP1", name: "سایت رایانه ۱", building: "مرکز رایانش", capacity: 35, roomType: "computer", features: ["رایانه", "پروژکتور"], unavailableSlots: ["0-0"] },
    { id: "LAB1", name: "آزمایشگاه برق ۱", building: "آزمایشگاه مرکزی", capacity: 30, roomType: "laboratory", features: ["میز آزمایش", "پروژکتور"], unavailableSlots: [] },
  ],
  instructorRules: {
    "دکتر احمدی": { preferredSlots: ["0-0", "0-1", "3-0", "3-1"], unavailableSlots: ["1-0", "1-1"], maxDailyPeriods: 4, maxConsecutivePeriods: 3 },
    "دکتر رحیمی": { preferredSlots: ["1-1", "1-2", "4-1", "4-2"], unavailableSlots: ["2-0"], maxDailyPeriods: 4, maxConsecutivePeriods: 3 },
    "دکتر کریمی": { preferredSlots: ["0-2", "2-1", "4-1"], unavailableSlots: ["3-4", "3-5"], maxDailyPeriods: 4, maxConsecutivePeriods: 3 },
    "دکتر مرادی": { preferredSlots: ["0-0", "2-0", "4-0"], unavailableSlots: ["5-4", "5-5"], maxDailyPeriods: 4, maxConsecutivePeriods: 3 },
    "دکتر حسینی": { preferredSlots: ["1-0", "1-1", "3-0", "3-1"], unavailableSlots: ["0-4", "0-5"], maxDailyPeriods: 4, maxConsecutivePeriods: 3 },
  },
  groupRules: {
    "کامپیوتر ۱۴۰۳-الف": { preferredSlots: ["0-0", "0-1", "1-0", "1-1", "2-0", "2-1"], unavailableSlots: [], maxDailyPeriods: 5, maxConsecutivePeriods: 4 },
    "کامپیوتر ۱۴۰۳-ب": { preferredSlots: ["0-0", "0-1", "1-0", "1-1", "2-0", "2-1"], unavailableSlots: [], maxDailyPeriods: 5, maxConsecutivePeriods: 4 },
  },
  conflicts: [
    { id: "CF1", firstCourseId: "CS301", secondCourseId: "EE201", kind: "soft", weight: 12 },
  ],
  settings: { ...DEFAULT_SETTINGS },
  weights: { ...DEFAULT_WEIGHTS },
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function cloneDefaults(): TimetableInput {
  return deepClone(DEFAULT_INPUT);
}

const numberInRange = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
};

const nonNegative = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
};

const textArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return [...new Set(value.map(String).map((item) => item.trim()).filter(Boolean))];
  if (typeof value === "string") return [...new Set(value.split(/[،,]/).map((item) => item.trim()).filter(Boolean))];
  return [];
};

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

const validRoomType = (value: unknown, allowAny: boolean): RoomType => {
  const allowed: RoomType[] = allowAny
    ? ["lecture", "computer", "laboratory", "workshop", "studio", "any"]
    : ["lecture", "computer", "laboratory", "workshop", "studio"];
  return allowed.includes(value as RoomType) ? value as RoomType : "lecture";
};

const validWeekPattern = (value: unknown): WeekPattern => ["all", "odd", "even"].includes(String(value)) ? value as WeekPattern : "all";

function normalizeRule(value: unknown): EntityRule {
  const item = record(value);
  return {
    preferredSlots: textArray(item.preferredSlots),
    unavailableSlots: textArray(item.unavailableSlots),
    maxDailyPeriods: numberInRange(item.maxDailyPeriods, 0, 0, 24),
    maxConsecutivePeriods: numberInRange(item.maxConsecutivePeriods, 0, 0, 24),
  };
}

function normalizeRuleMap(value: unknown): RuleMap {
  return Object.fromEntries(Object.entries(record(value)).map(([key, rule]) => [key, normalizeRule(rule)]));
}

export function normalizeTimetableInput(value: unknown): TimetableInput {
  const raw = record(value);
  const legacyTeacherPreferences = record(raw.teacherPreferences);
  const rawCourses = Array.isArray(raw.courses) ? raw.courses : [];
  const rawRooms = Array.isArray(raw.rooms) ? raw.rooms : [];

  const courses: CourseSection[] = rawCourses.map((entry, index) => {
    const item = record(entry);
    const id = String(item.id || `C${index + 1}`);
    const legacyTeacher = String(item.teacher || "").trim();
    const legacyGroup = String(item.group || "").trim();
    const fixedSlots = Object.fromEntries(Object.entries(record(item.fixedSlots)).map(([session, slot]) => [session, String(slot)]));
    return {
      id,
      code: String(item.code || id),
      name: String(item.name || `درس ${index + 1}`),
      instructors: textArray(item.instructors).length ? textArray(item.instructors) : legacyTeacher ? [legacyTeacher] : [`استاد ${index + 1}`],
      studentGroups: textArray(item.studentGroups).length ? textArray(item.studentGroups) : legacyGroup ? [legacyGroup] : [`ورودی ${index + 1}`],
      enrollment: numberInRange(item.enrollment, 30, 1, 10000),
      meetingsPerWeek: numberInRange(item.meetingsPerWeek ?? item.sessions, 2, 1, 10),
      duration: numberInRange(item.duration, 1, 1, 8),
      roomType: validRoomType(item.roomType, true),
      requiredFeatures: textArray(item.requiredFeatures).length ? textArray(item.requiredFeatures) : item.projector ? ["پروژکتور"] : [],
      preferredRoomIds: textArray(item.preferredRoomIds),
      fixedRoomId: String(item.fixedRoomId || ""),
      fixedSlots,
      forbiddenSlots: textArray(item.forbiddenSlots),
      preferredSlots: textArray(item.preferredSlots).length ? textArray(item.preferredSlots) : textArray(item.learnerPreferences),
      minDayGap: numberInRange(item.minDayGap, 2, 0, 6),
      roomConsistency: item.roomConsistency === undefined ? true : Boolean(item.roomConsistency),
      weekPattern: validWeekPattern(item.weekPattern),
    };
  });

  const rooms: Room[] = rawRooms.map((entry, index) => {
    const item = record(entry);
    return {
      id: String(item.id || `R${index + 1}`),
      name: String(item.name || `کلاس ${index + 1}`),
      building: String(item.building || item.floor || "ساختمان اصلی"),
      capacity: numberInRange(item.capacity, 40, 1, 10000),
      roomType: validRoomType(item.roomType, false) as Room["roomType"],
      features: textArray(item.features).length ? textArray(item.features) : item.projector ? ["پروژکتور"] : [],
      unavailableSlots: textArray(item.unavailableSlots),
    };
  });

  const instructorRules = normalizeRuleMap(raw.instructorRules);
  Object.entries(legacyTeacherPreferences).forEach(([instructor, slots]) => {
    if (!instructorRules[instructor]) instructorRules[instructor] = { ...normalizeRule({}), preferredSlots: textArray(slots) };
  });

  const conflicts: CourseConflict[] = (Array.isArray(raw.conflicts) ? raw.conflicts : []).map((entry, index) => {
    const item = record(entry);
    return {
      id: String(item.id || `CF${index + 1}`),
      firstCourseId: String(item.firstCourseId || ""),
      secondCourseId: String(item.secondCourseId || ""),
      kind: item.kind === "hard" ? "hard" : "soft",
      weight: nonNegative(item.weight, 1),
    };
  });

  const settingsRaw = record(raw.settings);
  const weightsRaw = record(raw.weights);
  return {
    courses,
    rooms,
    instructorRules,
    groupRules: normalizeRuleMap(raw.groupRules),
    conflicts,
    settings: {
      dayCount: numberInRange(settingsRaw.dayCount ?? raw.dayCount, DEFAULT_SETTINGS.dayCount, 1, DAYS.length),
      timeCount: numberInRange(settingsRaw.timeCount ?? raw.timeCount, DEFAULT_SETTINGS.timeCount, 1, TIME_LABELS.length),
      separateCourseMeetings: settingsRaw.separateCourseMeetings === undefined ? DEFAULT_SETTINGS.separateCourseMeetings : Boolean(settingsRaw.separateCourseMeetings),
      minimumDayGapIsHard: Boolean(settingsRaw.minimumDayGapIsHard),
      travelBufferPeriods: numberInRange(settingsRaw.travelBufferPeriods, DEFAULT_SETTINGS.travelBufferPeriods, 0, 4),
      maxInstructorDailyPeriods: numberInRange(settingsRaw.maxInstructorDailyPeriods, DEFAULT_SETTINGS.maxInstructorDailyPeriods, 0, 24),
      maxGroupDailyPeriods: numberInRange(settingsRaw.maxGroupDailyPeriods, DEFAULT_SETTINGS.maxGroupDailyPeriods, 0, 24),
      maxInstructorConsecutivePeriods: numberInRange(settingsRaw.maxInstructorConsecutivePeriods, DEFAULT_SETTINGS.maxInstructorConsecutivePeriods, 0, 24),
      maxGroupConsecutivePeriods: numberInRange(settingsRaw.maxGroupConsecutivePeriods, DEFAULT_SETTINGS.maxGroupConsecutivePeriods, 0, 24),
      closedSlots: textArray(settingsRaw.closedSlots),
      attempts: numberInRange(settingsRaw.attempts, DEFAULT_SETTINGS.attempts, 20, 1000),
    },
    weights: {
      instructorPreference: nonNegative(weightsRaw.instructorPreference, DEFAULT_WEIGHTS.instructorPreference),
      groupPreference: nonNegative(weightsRaw.groupPreference, DEFAULT_WEIGHTS.groupPreference),
      coursePreference: nonNegative(weightsRaw.coursePreference, DEFAULT_WEIGHTS.coursePreference),
      spacing: nonNegative(weightsRaw.spacing ?? weightsRaw.distance, DEFAULT_WEIGHTS.spacing),
      roomStability: nonNegative(weightsRaw.roomStability, DEFAULT_WEIGHTS.roomStability),
      capacityWaste: nonNegative(weightsRaw.capacityWaste, DEFAULT_WEIGHTS.capacityWaste),
      latePeriod: nonNegative(weightsRaw.latePeriod, DEFAULT_WEIGHTS.latePeriod),
      gaps: nonNegative(weightsRaw.gaps, DEFAULT_WEIGHTS.gaps),
      softConflict: nonNegative(weightsRaw.softConflict, DEFAULT_WEIGHTS.softConflict),
    },
  };
}

export function validateInput(input: TimetableInput): string[] {
  const errors: string[] = [];
  if (!input.courses.length) errors.push("حداقل یک گروه درسی لازم است.");
  if (!input.rooms.length) errors.push("حداقل یک فضای آموزشی لازم است.");
  const courseIds = new Set<string>();
  const roomIds = new Set<string>();
  input.courses.forEach((item) => {
    if (!item.id.trim()) errors.push("شناسه یکی از دروس خالی است.");
    if (courseIds.has(item.id)) errors.push(`شناسه درس «${item.id}» تکراری است.`);
    courseIds.add(item.id);
    if (!item.instructors.length) errors.push(`برای «${item.name}» استاد تعریف نشده است.`);
    if (!item.studentGroups.length) errors.push(`برای «${item.name}» گروه دانشجویی تعریف نشده است.`);
    if (item.duration > input.settings.timeCount) errors.push(`مدت جلسه «${item.name}» از تعداد بازه‌های روز بیشتر است.`);
  });
  input.rooms.forEach((item) => {
    if (roomIds.has(item.id)) errors.push(`شناسه فضای «${item.id}» تکراری است.`);
    roomIds.add(item.id);
  });
  input.courses.forEach((item) => {
    if (item.fixedRoomId && !roomIds.has(item.fixedRoomId)) errors.push(`کلاس ثابت «${item.fixedRoomId}» برای «${item.name}» وجود ندارد.`);
  });
  input.conflicts.forEach((item) => {
    if (!courseIds.has(item.firstCourseId) || !courseIds.has(item.secondCourseId)) errors.push(`دو درس قید تعارض «${item.id}» معتبر نیستند.`);
    if (item.firstCourseId === item.secondCourseId) errors.push(`قید تعارض «${item.id}» یک درس را با خودش مرتبط کرده است.`);
  });
  return [...new Set(errors)];
}

const slotKey = (day: number, period: number) => `${day}-${period}`;

export function parseSlot(value: string): { day: number; period: number } | null {
  const match = /^(\d+)-(\d+)$/.exec(value.trim());
  if (!match) return null;
  return { day: Number(match[1]), period: Number(match[2]) };
}

const occupiedKeys = (day: number, startPeriod: number, duration: number) =>
  Array.from({ length: duration }, (_, offset) => slotKey(day, startPeriod + offset));

const activeInWeek = (pattern: WeekPattern, week: "odd" | "even") => pattern === "all" || pattern === week;
const patternsOverlap = (first: WeekPattern, second: WeekPattern) => first === "all" || second === "all" || first === second;

const intersects = (first: string[], second: string[]) => {
  const set = new Set(first);
  return second.some((item) => set.has(item));
};

const placementsOverlap = (first: Placement, second: Placement) => {
  if (first.candidate.day !== second.candidate.day || !patternsOverlap(first.event.course.weekPattern, second.event.course.weekPattern)) return false;
  const firstEnd = first.candidate.startPeriod + first.event.course.duration;
  const secondEnd = second.candidate.startPeriod + second.event.course.duration;
  return first.candidate.startPeriod < secondEnd && second.candidate.startPeriod < firstEnd;
};

const pairKey = (first: string, second: string) => [first, second].sort().join("||");

function conflictMap(input: TimetableInput) {
  const result = new Map<string, CourseConflict>();
  input.conflicts.forEach((item) => result.set(pairKey(item.firstCourseId, item.secondCourseId), item));
  return result;
}

function ruleFor(map: RuleMap, name: string): EntityRule {
  return map[name] || { preferredSlots: [], unavailableSlots: [], maxDailyPeriods: 0, maxConsecutivePeriods: 0 };
}

function roomMatches(courseItem: CourseSection, room: Room) {
  if (courseItem.fixedRoomId && courseItem.fixedRoomId !== room.id) return false;
  if (room.capacity < courseItem.enrollment) return false;
  if (courseItem.roomType !== "any" && courseItem.roomType !== room.roomType) return false;
  const roomFeatures = new Set(room.features.map((item) => item.trim().toLocaleLowerCase("fa")));
  return courseItem.requiredFeatures.every((item) => roomFeatures.has(item.trim().toLocaleLowerCase("fa")));
}

function buildStaticCandidates(event: Event, input: TimetableInput): Candidate[] {
  const candidates: Candidate[] = [];
  const { course: item } = event;
  const fixed = item.fixedSlots[String(event.session)];
  const parsedFixed = fixed ? parseSlot(fixed) : null;
  if (fixed && !parsedFixed) return [];
  const rooms = input.rooms.filter((room) => roomMatches(item, room));

  for (let day = 0; day < input.settings.dayCount; day++) {
    for (let startPeriod = 0; startPeriod + item.duration <= input.settings.timeCount; startPeriod++) {
      if (parsedFixed && (parsedFixed.day !== day || parsedFixed.period !== startPeriod)) continue;
      const keys = occupiedKeys(day, startPeriod, item.duration);
      if (keys.some((key) => input.settings.closedSlots.includes(key) || item.forbiddenSlots.includes(key))) continue;
      if (item.instructors.some((name) => keys.some((key) => ruleFor(input.instructorRules, name).unavailableSlots.includes(key)))) continue;
      if (item.studentGroups.some((name) => keys.some((key) => ruleFor(input.groupRules, name).unavailableSlots.includes(key)))) continue;
      rooms.forEach((room) => {
        if (!keys.some((key) => room.unavailableSlots.includes(key))) candidates.push({ day, startPeriod, roomId: room.id });
      });
    }
  }
  return candidates;
}

function resourceLimitViolation(
  placement: Placement,
  scheduled: Placement[],
  names: string[],
  type: "instructor" | "group",
  input: TimetableInput,
): string | null {
  const rules = type === "instructor" ? input.instructorRules : input.groupRules;
  const defaultDaily = type === "instructor" ? input.settings.maxInstructorDailyPeriods : input.settings.maxGroupDailyPeriods;
  const defaultConsecutive = type === "instructor" ? input.settings.maxInstructorConsecutivePeriods : input.settings.maxGroupConsecutivePeriods;
  const label = type === "instructor" ? "استاد" : "گروه دانشجویی";
  const room = input.rooms.find((item) => item.id === placement.candidate.roomId);
  if (!room) return "فضای آموزشی انتخاب‌شده وجود ندارد";

  for (const name of names) {
    const rule = ruleFor(rules, name);
    const dailyLimit = rule.maxDailyPeriods || defaultDaily;
    const consecutiveLimit = rule.maxConsecutivePeriods || defaultConsecutive;
    for (const week of ["odd", "even"] as const) {
      if (!activeInWeek(placement.event.course.weekPattern, week)) continue;
      const periods = new Set<number>();
      scheduled.forEach((item) => {
        const itemNames = type === "instructor" ? item.event.course.instructors : item.event.course.studentGroups;
        if (item.candidate.day !== placement.candidate.day || !itemNames.includes(name) || !activeInWeek(item.event.course.weekPattern, week)) return;
        for (let period = item.candidate.startPeriod; period < item.candidate.startPeriod + item.event.course.duration; period++) periods.add(period);
      });
      for (let period = placement.candidate.startPeriod; period < placement.candidate.startPeriod + placement.event.course.duration; period++) periods.add(period);
      if (dailyLimit > 0 && periods.size > dailyLimit) return `سقف بار روزانه ${label} «${name}»`;
      if (consecutiveLimit > 0) {
        let run = 0;
        let maxRun = 0;
        for (let period = 0; period < input.settings.timeCount; period++) {
          run = periods.has(period) ? run + 1 : 0;
          maxRun = Math.max(maxRun, run);
        }
        if (maxRun > consecutiveLimit) return `سقف بازه‌های متوالی ${label} «${name}»`;
      }
    }
  }
  return null;
}

function hardBlockReason(placement: Placement, scheduled: Placement[], input: TimetableInput, conflicts: Map<string, CourseConflict>): string | null {
  const itemRoom = input.rooms.find((room) => room.id === placement.candidate.roomId);
  if (!itemRoom) return "فضای آموزشی نامعتبر";

  for (const other of scheduled) {
    const otherRoom = input.rooms.find((room) => room.id === other.candidate.roomId);
    if (!otherRoom) continue;
    if (placementsOverlap(placement, other)) {
      if (placement.candidate.roomId === other.candidate.roomId) return "تداخل فضای آموزشی";
      if (intersects(placement.event.course.instructors, other.event.course.instructors)) return "تداخل استاد";
      if (intersects(placement.event.course.studentGroups, other.event.course.studentGroups)) return "تداخل گروه دانشجویی";
      const conflict = conflicts.get(pairKey(placement.event.course.id, other.event.course.id));
      if (conflict?.kind === "hard") return "تعارض صریح بین دو درس";
    }

    if (placement.event.course.id === other.event.course.id && patternsOverlap(placement.event.course.weekPattern, other.event.course.weekPattern)) {
      const distance = Math.abs(placement.candidate.day - other.candidate.day);
      if (input.settings.separateCourseMeetings && distance === 0) return "دو جلسه یک درس در یک روز";
      if (input.settings.minimumDayGapIsHard && distance < placement.event.course.minDayGap) return "فاصله روزانه اجباری جلسات درس";
    }

    const sharesPerson = intersects(placement.event.course.instructors, other.event.course.instructors)
      || intersects(placement.event.course.studentGroups, other.event.course.studentGroups);
    if (input.settings.travelBufferPeriods > 0 && sharesPerson && placement.candidate.day === other.candidate.day
      && patternsOverlap(placement.event.course.weekPattern, other.event.course.weekPattern) && itemRoom.building !== otherRoom.building) {
      const firstStart = placement.candidate.startPeriod;
      const firstEnd = firstStart + placement.event.course.duration;
      const secondStart = other.candidate.startPeriod;
      const secondEnd = secondStart + other.event.course.duration;
      const gap = firstEnd <= secondStart ? secondStart - firstEnd : secondEnd <= firstStart ? firstStart - secondEnd : -1;
      if (gap >= 0 && gap < input.settings.travelBufferPeriods) return "زمان ناکافی جابه‌جایی بین ساختمان‌ها";
    }
  }

  return resourceLimitViolation(placement, scheduled, placement.event.course.instructors, "instructor", input)
    || resourceLimitViolation(placement, scheduled, placement.event.course.studentGroups, "group", input);
}

function staticDiagnosis(event: Event, input: TimetableInput): string[] {
  const reasons: string[] = [];
  const matchingRooms = input.rooms.filter((room) => roomMatches(event.course, room));
  if (!matchingRooms.length) {
    if (event.course.fixedRoomId && !input.rooms.some((room) => room.id === event.course.fixedRoomId)) reasons.push("کلاس ثابت تعریف‌شده وجود ندارد");
    if (!input.rooms.some((room) => room.capacity >= event.course.enrollment)) reasons.push("هیچ فضایی ظرفیت کافی ندارد");
    if (!input.rooms.some((room) => event.course.roomType === "any" || room.roomType === event.course.roomType)) reasons.push("نوع فضای موردنیاز موجود نیست");
    if (!reasons.length) reasons.push("تجهیزات، ظرفیت یا کلاس ثابت با هیچ فضا سازگار نیست");
  }
  const fixed = event.course.fixedSlots[String(event.session)];
  if (fixed && !parseSlot(fixed)) reasons.push("قالب زمان ثابت نامعتبر است؛ قالب صحیح روز-بازه است");
  if (!reasons.length) reasons.push("عدم حضور، تعطیلی یا رزرو فضا تمام زمان‌های ممکن را مسدود کرده است");
  return reasons;
}

function preferredHit(slots: string[], placement: Placement) {
  return !slots.length || slots.includes(slotKey(placement.candidate.day, placement.candidate.startPeriod));
}

function incrementalScore(placement: Placement, scheduled: Placement[], input: TimetableInput, conflicts: Map<string, CourseConflict>) {
  const { course: item } = placement.event;
  const key = slotKey(placement.candidate.day, placement.candidate.startPeriod);
  const room = input.rooms.find((entry) => entry.id === placement.candidate.roomId)!;
  let score = 0;
  if (item.preferredSlots.length && !item.preferredSlots.includes(key)) score += input.weights.coursePreference;
  item.instructors.forEach((name) => {
    const slots = ruleFor(input.instructorRules, name).preferredSlots;
    if (slots.length && !slots.includes(key)) score += input.weights.instructorPreference;
  });
  item.studentGroups.forEach((name) => {
    const slots = ruleFor(input.groupRules, name).preferredSlots;
    if (slots.length && !slots.includes(key)) score += input.weights.groupPreference;
  });
  scheduled.forEach((other) => {
    if (other.event.course.id === item.id) {
      const distance = Math.abs(other.candidate.day - placement.candidate.day);
      score += Math.max(0, item.minDayGap - distance) * input.weights.spacing;
      if (item.roomConsistency && other.candidate.roomId !== placement.candidate.roomId) score += input.weights.roomStability;
    }
    if (placementsOverlap(placement, other)) {
      const conflict = conflicts.get(pairKey(item.id, other.event.course.id));
      if (conflict?.kind === "soft") score += conflict.weight * input.weights.softConflict;
    }
  });
  if (item.preferredRoomIds.length && !item.preferredRoomIds.includes(room.id)) score += input.weights.roomStability;
  score += Math.round(((room.capacity - item.enrollment) / room.capacity) * 10) * input.weights.capacityWaste;
  if (placement.candidate.startPeriod + item.duration >= input.settings.timeCount) score += input.weights.latePeriod;
  return score;
}

function resourceGaps(placements: Placement[], input: TimetableInput, type: "instructor" | "group") {
  const names = new Set<string>();
  placements.forEach((item) => (type === "instructor" ? item.event.course.instructors : item.event.course.studentGroups).forEach((name) => names.add(name)));
  let total = 0;
  names.forEach((name) => {
    for (let day = 0; day < input.settings.dayCount; day++) {
      let worstWeek = 0;
      for (const week of ["odd", "even"] as const) {
        const periods = new Set<number>();
        placements.forEach((item) => {
          const resources = type === "instructor" ? item.event.course.instructors : item.event.course.studentGroups;
          if (item.candidate.day !== day || !resources.includes(name) || !activeInWeek(item.event.course.weekPattern, week)) return;
          for (let period = item.candidate.startPeriod; period < item.candidate.startPeriod + item.event.course.duration; period++) periods.add(period);
        });
        if (periods.size > 1) {
          const sorted = [...periods].sort((a, b) => a - b);
          worstWeek = Math.max(worstWeek, sorted[sorted.length - 1] - sorted[0] + 1 - periods.size);
        }
      }
      total += worstWeek;
    }
  });
  return total;
}

function evaluatePlacements(placements: Placement[], input: TimetableInput, conflicts: Map<string, CourseConflict>) {
  const breakdown: PenaltyBreakdown = {
    instructorPreference: 0,
    groupPreference: 0,
    coursePreference: 0,
    spacing: 0,
    roomStability: 0,
    capacityWaste: 0,
    latePeriod: 0,
    gaps: 0,
    softConflict: 0,
  };
  let preferenceHits = 0;
  let preferenceEligible = 0;
  let usedSeats = 0;
  let availableSeats = 0;

  placements.forEach((placement) => {
    const item = placement.event.course;
    const room = input.rooms.find((entry) => entry.id === placement.candidate.roomId)!;
    const key = slotKey(placement.candidate.day, placement.candidate.startPeriod);
    if (item.preferredSlots.length) {
      preferenceEligible++;
      if (item.preferredSlots.includes(key)) preferenceHits++; else breakdown.coursePreference++;
    }
    item.instructors.forEach((name) => {
      const slots = ruleFor(input.instructorRules, name).preferredSlots;
      if (!slots.length) return;
      preferenceEligible++;
      if (slots.includes(key)) preferenceHits++; else breakdown.instructorPreference++;
    });
    item.studentGroups.forEach((name) => {
      const slots = ruleFor(input.groupRules, name).preferredSlots;
      if (!slots.length) return;
      preferenceEligible++;
      if (slots.includes(key)) preferenceHits++; else breakdown.groupPreference++;
    });
    breakdown.capacityWaste += Math.round(((room.capacity - item.enrollment) / room.capacity) * 10);
    if (placement.candidate.startPeriod + item.duration >= input.settings.timeCount) breakdown.latePeriod++;
    usedSeats += item.enrollment * item.duration;
    availableSeats += room.capacity * item.duration;
  });

  input.courses.forEach((item) => {
    const coursePlacements = placements.filter((placement) => placement.event.course.id === item.id);
    for (let first = 0; first < coursePlacements.length; first++) {
      for (let second = first + 1; second < coursePlacements.length; second++) {
        const distance = Math.abs(coursePlacements[first].candidate.day - coursePlacements[second].candidate.day);
        breakdown.spacing += Math.max(0, item.minDayGap - distance);
      }
    }
    if (item.roomConsistency) breakdown.roomStability += Math.max(0, new Set(coursePlacements.map((entry) => entry.candidate.roomId)).size - 1);
    if (item.preferredRoomIds.length) breakdown.roomStability += coursePlacements.filter((entry) => !item.preferredRoomIds.includes(entry.candidate.roomId)).length;
  });

  for (let first = 0; first < placements.length; first++) {
    for (let second = first + 1; second < placements.length; second++) {
      if (!placementsOverlap(placements[first], placements[second])) continue;
      const conflict = conflicts.get(pairKey(placements[first].event.course.id, placements[second].event.course.id));
      if (conflict?.kind === "soft") breakdown.softConflict += conflict.weight;
    }
  }
  breakdown.gaps = resourceGaps(placements, input, "instructor") + resourceGaps(placements, input, "group");

  const objective =
    breakdown.instructorPreference * input.weights.instructorPreference
    + breakdown.groupPreference * input.weights.groupPreference
    + breakdown.coursePreference * input.weights.coursePreference
    + breakdown.spacing * input.weights.spacing
    + breakdown.roomStability * input.weights.roomStability
    + breakdown.capacityWaste * input.weights.capacityWaste
    + breakdown.latePeriod * input.weights.latePeriod
    + breakdown.gaps * input.weights.gaps
    + breakdown.softConflict * input.weights.softConflict;

  return {
    breakdown,
    objective,
    preferenceRate: preferenceEligible ? Math.round((preferenceHits / preferenceEligible) * 100) : 100,
    roomUtilization: availableSeats ? Math.round((usedSeats / availableSeats) * 100) : 0,
  };
}

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function validatePlacements(placements: Placement[], input: TimetableInput, conflicts: Map<string, CourseConflict>) {
  const violations: string[] = [];
  const accepted: Placement[] = [];
  placements.forEach((placement) => {
    const staticallyValid = buildStaticCandidates(placement.event, input).some((candidate) =>
      candidate.day === placement.candidate.day && candidate.startPeriod === placement.candidate.startPeriod && candidate.roomId === placement.candidate.roomId);
    if (!staticallyValid) violations.push(`${placement.event.course.name}: زمان یا فضای نامعتبر`);
    const dynamic = hardBlockReason(placement, accepted, input, conflicts);
    if (dynamic) violations.push(`${placement.event.course.name}: ${dynamic}`);
    accepted.push(placement);
  });
  return violations;
}

function improvePlacements(placements: Placement[], candidates: Map<string, Candidate[]>, input: TimetableInput, conflicts: Map<string, CourseConflict>) {
  if (placements.length > 45) return placements;
  let working = [...placements];
  let currentObjective = evaluatePlacements(working, input, conflicts).objective;
  for (let pass = 0; pass < 2; pass++) {
    let improved = false;
    for (const original of [...working]) {
      const rest = working.filter((item) => item.event.id !== original.event.id);
      let best = original;
      let bestObjective = currentObjective;
      const feasible = (candidates.get(original.event.id) || [])
        .map((candidate) => ({ event: original.event, candidate }))
        .filter((placement) => !hardBlockReason(placement, rest, input, conflicts))
        .sort((first, second) => incrementalScore(first, rest, input, conflicts) - incrementalScore(second, rest, input, conflicts))
        .slice(0, 36);
      feasible.forEach((placement) => {
        const objective = evaluatePlacements([...rest, placement], input, conflicts).objective;
        if (objective < bestObjective) {
          best = placement;
          bestObjective = objective;
        }
      });
      if (bestObjective < currentObjective) {
        working = [...rest, best];
        currentObjective = bestObjective;
        improved = true;
      }
    }
    if (!improved) break;
  }
  return working;
}

export function solveTimetable(rawInput: TimetableInput): SolveResult {
  const started = typeof performance !== "undefined" ? performance.now() : Date.now();
  const input = normalizeTimetableInput(rawInput);
  const validationErrors = validateInput(input);
  const emptyBreakdown: PenaltyBreakdown = {
    instructorPreference: 0,
    groupPreference: 0,
    coursePreference: 0,
    spacing: 0,
    roomStability: 0,
    capacityWaste: 0,
    latePeriod: 0,
    gaps: 0,
    softConflict: 0,
  };
  if (validationErrors.length) {
    return { schedule: [], unscheduled: [], hardViolations: [], objective: 0, breakdown: emptyBreakdown, preferenceRate: 0, roomUtilization: 0, durationMs: 0, validationErrors };
  }

  const events: Event[] = input.courses.flatMap((item) =>
    Array.from({ length: item.meetingsPerWeek }, (_, index) => ({ id: `${item.id}::${index + 1}`, course: item, session: index + 1 })),
  );
  const candidates = new Map(events.map((event) => [event.id, buildStaticCandidates(event, input)]));
  const conflicts = conflictMap(input);
  const resourceLoad = (event: Event) => events.filter((other) =>
    intersects(event.course.instructors, other.course.instructors) || intersects(event.course.studentGroups, other.course.studentGroups)).length;

  let bestPlacements: Placement[] = [];
  let bestUnscheduled = [...events];
  let bestKey = Number.POSITIVE_INFINITY;
  const attemptCount = Math.min(input.settings.attempts, events.length > 60 ? 80 : input.settings.attempts);

  for (let attempt = 0; attempt < attemptCount; attempt++) {
    const random = seededRandom(2_607_143 + attempt * 104_729);
    const ordered = events
      .map((event) => ({ event, jitter: random(), load: resourceLoad(event) }))
      .sort((first, second) =>
        (candidates.get(first.event.id)?.length || 0) - (candidates.get(second.event.id)?.length || 0)
        || second.load - first.load
        || second.event.course.duration - first.event.course.duration
        || first.jitter - second.jitter)
      .map((item) => item.event);

    const placements: Placement[] = [];
    const unscheduled: Event[] = [];
    ordered.forEach((event) => {
      const feasible = (candidates.get(event.id) || [])
        .map((candidate) => ({ event, candidate, random: random() }))
        .filter((item) => !hardBlockReason(item, placements, input, conflicts))
        .map((item) => ({ ...item, score: incrementalScore(item, placements, input, conflicts) + item.random * (attempt ? 8 : 0) }))
        .sort((first, second) => first.score - second.score);
      if (!feasible.length) {
        unscheduled.push(event);
        return;
      }
      const shortlist = Math.min(feasible.length, attempt ? 3 : 1);
      const selected = feasible[Math.floor(random() * shortlist)];
      placements.push({ event, candidate: selected.candidate });
    });

    const evaluation = evaluatePlacements(placements, input, conflicts);
    const key = unscheduled.length * 1_000_000_000 + evaluation.objective;
    if (key < bestKey) {
      bestKey = key;
      bestPlacements = placements;
      bestUnscheduled = unscheduled;
    }
    if (!unscheduled.length && evaluation.objective === 0) break;
  }

  if (!bestUnscheduled.length) bestPlacements = improvePlacements(bestPlacements, candidates, input, conflicts);
  const evaluation = evaluatePlacements(bestPlacements, input, conflicts);
  const hardViolations = validatePlacements(bestPlacements, input, conflicts);
  const schedule: ScheduleItem[] = bestPlacements.map((placement) => {
    const room = input.rooms.find((item) => item.id === placement.candidate.roomId)!;
    const preferenceSets = [
      placement.event.course.preferredSlots,
      ...placement.event.course.instructors.map((name) => ruleFor(input.instructorRules, name).preferredSlots),
      ...placement.event.course.studentGroups.map((name) => ruleFor(input.groupRules, name).preferredSlots),
    ].filter((slots) => slots.length);
    return {
      eventId: placement.event.id,
      courseId: placement.event.course.id,
      code: placement.event.course.code,
      name: placement.event.course.name,
      instructors: placement.event.course.instructors,
      studentGroups: placement.event.course.studentGroups,
      session: placement.event.session,
      day: placement.candidate.day,
      startPeriod: placement.candidate.startPeriod,
      duration: placement.event.course.duration,
      roomId: room.id,
      roomName: room.name,
      building: room.building,
      weekPattern: placement.event.course.weekPattern,
      preferenceMet: preferenceSets.length ? preferenceSets.every((slots) => preferredHit(slots, placement)) : null,
    };
  }).sort((first, second) => first.day - second.day || first.startPeriod - second.startPeriod || first.code.localeCompare(second.code, "fa"));

  const unscheduled: UnscheduledItem[] = bestUnscheduled.map((event) => {
    const staticOptions = candidates.get(event.id) || [];
    if (!staticOptions.length) return { eventId: event.id, label: `${event.course.code} — جلسه ${event.session}`, reasons: staticDiagnosis(event, input) };
    const reasonCounts = new Map<string, number>();
    staticOptions.forEach((candidate) => {
      const reason = hardBlockReason({ event, candidate }, bestPlacements, input, conflicts) || "ترکیب انتخاب‌های فعلی مانع تخصیص شده است";
      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
    });
    const reasons = [...reasonCounts.entries()].sort((first, second) => second[1] - first[1]).slice(0, 3).map(([reason]) => reason);
    return { eventId: event.id, label: `${event.course.code} — جلسه ${event.session}`, reasons };
  });

  const ended = typeof performance !== "undefined" ? performance.now() : Date.now();
  return {
    schedule,
    unscheduled,
    hardViolations,
    objective: evaluation.objective,
    breakdown: evaluation.breakdown,
    preferenceRate: evaluation.preferenceRate,
    roomUtilization: evaluation.roomUtilization,
    durationMs: Math.max(0.1, Math.round((ended - started) * 10) / 10),
    validationErrors,
  };
}
