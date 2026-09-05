import type {
  Assignment,
  Employee,
  ScheduleInput,
  Shift,
  SkillId,
} from "./types";

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function minutes(time: string): number {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}

export function shiftHours(shift: Shift): number {
  return (minutes(shift.end) - minutes(shift.start)) / 60;
}

export function isAvailable(employee: Employee, shift: Shift): boolean {
  return employee.availability.some(
    (window) =>
      window.date === shift.date &&
      minutes(window.start) <= minutes(shift.start) &&
      minutes(window.end) >= minutes(shift.end),
  );
}

export function shiftsOverlap(first: Shift, second: Shift): boolean {
  return (
    first.date === second.date &&
    minutes(first.start) < minutes(second.end) &&
    minutes(second.start) < minutes(first.end)
  );
}

export function preferenceFor(employee: Employee, shiftId: string): number {
  return employee.shiftPreferences?.[shiftId] ?? 0;
}

export function assignmentKey(assignment: Assignment): string {
  return `${assignment.shiftId}\u0000${assignment.skill}\u0000${assignment.employeeId}`;
}

export function sortAssignments(assignments: Assignment[]): Assignment[] {
  return [...assignments].sort((a, b) =>
    assignmentKey(a).localeCompare(assignmentKey(b)),
  );
}

export interface CoverageUnit {
  shift: Shift;
  skill: SkillId;
  ordinal: number;
}

export function coverageUnits(input: ScheduleInput): CoverageUnit[] {
  return input.shifts.flatMap((shift) =>
    shift.coverage.flatMap((requirement) =>
      Array.from({ length: requirement.count }, (_, ordinal) => ({
        shift,
        skill: requirement.skill,
        ordinal,
      })),
    ),
  );
}

export function assertValidInput(input: ScheduleInput): void {
  if (!input.cafeName.trim()) throw new Error("cafeName must not be empty");
  if (!DATE_PATTERN.test(input.weekStart)) {
    throw new Error("weekStart must use YYYY-MM-DD format");
  }

  const employeeIds = new Set<string>();
  for (const employee of input.employees) {
    if (!employee.id || employeeIds.has(employee.id)) {
      throw new Error(`Employee ids must be non-empty and unique: ${employee.id}`);
    }
    employeeIds.add(employee.id);
    if (!Number.isFinite(employee.maxWeeklyHours) || employee.maxWeeklyHours < 0) {
      throw new Error(`Employee ${employee.id} has an invalid maxWeeklyHours`);
    }
    for (const window of employee.availability) {
      assertWindow(window.date, window.start, window.end, `Employee ${employee.id}`);
    }
  }

  const shiftIds = new Set<string>();
  for (const shift of input.shifts) {
    if (!shift.id || shiftIds.has(shift.id)) {
      throw new Error(`Shift ids must be non-empty and unique: ${shift.id}`);
    }
    shiftIds.add(shift.id);
    assertWindow(shift.date, shift.start, shift.end, `Shift ${shift.id}`);
    const skills = new Set<string>();
    for (const requirement of shift.coverage) {
      if (!requirement.skill || skills.has(requirement.skill)) {
        throw new Error(`Shift ${shift.id} coverage skills must be non-empty and unique`);
      }
      skills.add(requirement.skill);
      if (!Number.isInteger(requirement.count) || requirement.count < 1) {
        throw new Error(`Shift ${shift.id} has an invalid coverage count`);
      }
    }
  }
}

function assertWindow(date: string, start: string, end: string, owner: string): void {
  if (!DATE_PATTERN.test(date) || !TIME_PATTERN.test(start) || !TIME_PATTERN.test(end)) {
    throw new Error(`${owner} has an invalid date or time`);
  }
  if (minutes(start) >= minutes(end)) {
    throw new Error(`${owner} must end after it starts`);
  }
}
