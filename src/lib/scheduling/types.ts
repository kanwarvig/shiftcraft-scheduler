export type EmployeeId = string;
export type ShiftId = string;
export type SkillId = string;

export interface TimeWindow {
  /** 24-hour local time in HH:mm format. */
  start: string;
  /** 24-hour local time in HH:mm format. */
  end: string;
}

export interface AvailabilityWindow extends TimeWindow {
  /** ISO calendar date (YYYY-MM-DD). */
  date: string;
}

export interface Employee {
  id: EmployeeId;
  name: string;
  skills: SkillId[];
  availability: AvailabilityWindow[];
  maxWeeklyHours: number;
  /** Positive values are preferred; negative values are undesirable. */
  shiftPreferences?: Partial<Record<ShiftId, number>>;
}

export interface CoverageRequirement {
  skill: SkillId;
  count: number;
}

export interface Shift extends TimeWindow {
  id: ShiftId;
  name: string;
  date: string;
  coverage: CoverageRequirement[];
}

export interface ScheduleInput {
  cafeName: string;
  /** ISO date for the first day represented by this schedule. */
  weekStart: string;
  employees: Employee[];
  shifts: Shift[];
}

export interface Assignment {
  employeeId: EmployeeId;
  shiftId: ShiftId;
  /** The coverage requirement this employee satisfies. */
  skill: SkillId;
}

export type ConstraintCode =
  | "UNKNOWN_EMPLOYEE"
  | "UNKNOWN_SHIFT"
  | "DUPLICATE_ASSIGNMENT"
  | "EMPLOYEE_UNAVAILABLE"
  | "MISSING_SKILL"
  | "UNREQUESTED_SKILL"
  | "OVERLAPPING_SHIFTS"
  | "MAX_WEEKLY_HOURS_EXCEEDED"
  | "UNDER_COVERAGE"
  | "OVER_COVERAGE";

export interface ConstraintViolation {
  code: ConstraintCode;
  message: string;
  employeeId?: EmployeeId;
  shiftId?: ShiftId;
  skill?: SkillId;
}

export interface ScheduleMetrics {
  assignedEmployees: number;
  assignmentCount: number;
  totalAssignedHours: number;
  scheduledHoursByEmployee: Record<EmployeeId, number>;
  preferenceScore: number;
  preferenceSatisfactionPercent: number;
  requiredCoverage: number;
  filledCoverage: number;
  coveragePercent: number;
}

export interface ScheduleValidation {
  isValid: boolean;
  violations: ConstraintViolation[];
  metrics: ScheduleMetrics;
}

export type InfeasibilityCode =
  | "NO_QUALIFIED_AVAILABLE_EMPLOYEE"
  | "INSUFFICIENT_QUALIFIED_EMPLOYEES"
  | "INSUFFICIENT_TOTAL_HOURS"
  | "NO_FEASIBLE_COMBINATION";

export interface InfeasibilityReason {
  code: InfeasibilityCode;
  message: string;
  shiftId?: ShiftId;
  skill?: SkillId;
  required?: number;
  available?: number;
}

export interface SolverDiagnostics {
  nodesVisited: number;
  branchesPruned: number;
  solveTimeMs: number;
  termination: "complete" | "max_nodes";
  optimality: "proven" | "not_applicable" | "unknown";
}

export interface FeasibleScheduleResult {
  status: "feasible";
  strategy: "greedy" | "branch-and-bound";
  assignments: Assignment[];
  metrics: ScheduleMetrics;
  diagnostics: SolverDiagnostics;
}

export interface InfeasibleScheduleResult {
  status: "infeasible";
  strategy: "greedy" | "branch-and-bound";
  /** A greedy result can include the best partial schedule it constructed. */
  assignments: Assignment[];
  metrics: ScheduleMetrics;
  reasons: InfeasibilityReason[];
  diagnostics: SolverDiagnostics;
}

export interface SearchLimitScheduleResult {
  status: "search_limit";
  strategy: "branch-and-bound";
  /** Best complete incumbent found before the limit, or empty if none was found. */
  assignments: Assignment[];
  metrics: ScheduleMetrics;
  message: string;
  diagnostics: SolverDiagnostics;
}

export type ScheduleResult =
  | FeasibleScheduleResult
  | InfeasibleScheduleResult
  | SearchLimitScheduleResult;

export interface SolveOptions {
  /** Optional safety valve. Omit for an exhaustive search. */
  maxNodes?: number;
}

export type AbsenceRescheduleResult = ScheduleResult & {
  absentEmployeeIds: EmployeeId[];
  /** Assignments for remaining employees that exactly match the prior schedule. */
  retainedAssignmentCount: number;
  /** Prior non-absent assignments that had to move or change role. */
  displacedAssignmentCount: number;
};
