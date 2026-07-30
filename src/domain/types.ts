export type WeekPattern = "all" | "odd" | "even";
export type RoomType = "lecture" | "computer" | "laboratory" | "workshop" | "studio" | "any";
export type ConflictKind = "hard" | "soft";
export type SolverMode = "fast" | "exact";
export type SolverStatus =
  | "optimal"
  | "feasible"
  | "partial"
  | "failed-required"
  | "fallback"
  | "invalid"
  | "unknown";

export type SlotKey = `${string}:${number}`;

export type DayDefinition = {
  id: string;
  label: string;
  enabled: boolean;
};

export type PeriodDefinition = {
  index: number;
  label: string;
  start: string;
  end: string;
  breakAfter: boolean;
  breakLabel?: string;
};

export type TimeRules = {
  unavailableDays: string[];
  unavailableSlots: SlotKey[];
  undesiredDays: string[];
  undesiredSlots: SlotKey[];
};

export type Instructor = {
  id: string;
  name: string;
  timeRules: TimeRules;
  softMaxDailyPeriods: number;
  softMaxConsecutivePeriods: number;
};

export type StudentGroup = {
  id: string;
  name: string;
  size: number;
  timeRules: TimeRules;
  softMaxDailyPeriods: number;
  softMaxConsecutivePeriods: number;
};

export type Room = {
  id: string;
  name: string;
  building: string;
  capacity: number;
  roomType: Exclude<RoomType, "any">;
  equipmentIds: string[];
  unavailableSlots: SlotKey[];
};

export type Equipment = {
  id: string;
  name: string;
};

export type SessionDefaults = {
  instructorId: string;
  studentGroupId: string;
  enrollment: number;
  durationPeriods: number;
  allowBreakCrossing: boolean;
  roomType: RoomType;
  requiredEquipmentIds: string[];
  preferredEquipmentIds: string[];
  weekPattern: WeekPattern;
};

export type WeeklySession = SessionDefaults & {
  id: string;
  label: string;
  required: boolean;
  fixedSlot: SlotKey | null;
  fixedRoomId: string | null;
  preferredRoomIds: string[];
  timeRules: TimeRules;
};

export type CourseSection = {
  id: string;
  groupNumber: number;
  code: string;
  name: string;
  defaults: SessionDefaults;
  sessions: WeeklySession[];
};

export type CourseConflict = {
  id: string;
  firstCourseId: string;
  secondCourseId: string;
  kind: ConflictKind;
  weight: number;
};

export type SoftWeights = {
  unscheduledSession: number;
  instructorUndesiredTime: number;
  groupUndesiredTime: number;
  sessionUndesiredTime: number;
  preferredRoomRank: number;
  missingPreferredEquipment: number;
  dailyLoad: number;
  consecutivePeriods: number;
  resourceGaps: number;
  buildingTravel: number;
  sameCourseSameDay: number;
  minimumDayGap: number;
  softConflict: number;
};

export type SolverSettings = {
  exactCourseLimit: number;
  exactTimeLimitSeconds: number;
  fastAttempts: number;
  minimumDayGap: number;
  defaultInstructorMaxDailyPeriods: number;
  defaultGroupMaxDailyPeriods: number;
  defaultInstructorMaxConsecutivePeriods: number;
  defaultGroupMaxConsecutivePeriods: number;
};

export type TimetableInput = {
  schemaVersion: 3;
  title: string;
  days: DayDefinition[];
  periods: PeriodDefinition[];
  closedSlots: SlotKey[];
  equipment: Equipment[];
  instructors: Instructor[];
  studentGroups: StudentGroup[];
  rooms: Room[];
  courses: CourseSection[];
  conflicts: CourseConflict[];
  weights: SoftWeights;
  settings: SolverSettings;
  retiredGroupNumbers: number[];
};

export type CandidatePlacement = {
  sessionId: string;
  courseId: string;
  dayId: string;
  startPeriod: number;
  occupiedPeriods: number[];
  roomId: string;
};

export type ScheduleItem = CandidatePlacement & {
  courseCode: string;
  courseName: string;
  groupNumber: number;
  sessionLabel: string;
  instructorId: string;
  instructorName: string;
  studentGroupId: string;
  studentGroupName: string;
  roomName: string;
  building: string;
  weekPattern: WeekPattern;
  required: boolean;
};

export type UnscheduledSession = {
  courseId: string;
  sessionId: string;
  label: string;
  required: boolean;
  reasons: string[];
};

export type PenaltyBreakdown = Omit<SoftWeights, "unscheduledSession"> & {
  unscheduledSession: number;
};

export type SolveResult = {
  mode: SolverMode;
  engine: "browser-heuristic" | "ortools-cp-sat";
  status: SolverStatus;
  solverStatus?: "OPTIMAL" | "FEASIBLE" | "INFEASIBLE" | "MODEL_INVALID" | "UNKNOWN";
  schedule: ScheduleItem[];
  unscheduled: UnscheduledSession[];
  hardViolations: string[];
  objective: number;
  bestBound?: number;
  breakdown: PenaltyBreakdown;
  durationMs: number;
  validationErrors: string[];
  diagnostics: string[];
  fallbackReason?: string;
  manuallyEdited?: boolean;
  publishable?: boolean;
};

export type ValidationIssue = {
  path: string;
  message: string;
  severity: "error" | "warning";
};
