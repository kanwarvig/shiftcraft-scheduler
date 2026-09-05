import type {
  Assignment,
  ScheduleInput,
  ScheduleMetrics,
} from "./types";
import { coverageUnits, isAvailable, preferenceFor, shiftHours } from "./internal";

export function calculateScheduleMetrics(
  input: ScheduleInput,
  assignments: Assignment[],
): ScheduleMetrics {
  const employees = new Map(input.employees.map((employee) => [employee.id, employee]));
  const shifts = new Map(input.shifts.map((shift) => [shift.id, shift]));
  const scheduledHoursByEmployee: Record<string, number> = {};
  let totalAssignedHours = 0;
  let preferenceScore = 0;

  for (const assignment of assignments) {
    const employee = employees.get(assignment.employeeId);
    const shift = shifts.get(assignment.shiftId);
    if (!employee || !shift) continue;
    const hours = shiftHours(shift);
    totalAssignedHours += hours;
    scheduledHoursByEmployee[employee.id] =
      (scheduledHoursByEmployee[employee.id] ?? 0) + hours;
    preferenceScore += preferenceFor(employee, shift.id);
  }

  const preferenceBounds = coverageUnits(input).reduce(
    (bounds, unit) => {
      const scores = input.employees
        .filter((employee) => employee.skills.includes(unit.skill) && isAvailable(employee, unit.shift))
        .map((employee) => preferenceFor(employee, unit.shift.id));
      return {
        minimum: bounds.minimum + Math.min(0, ...scores),
        maximum: bounds.maximum + Math.max(0, ...scores),
      };
    },
    { minimum: 0, maximum: 0 },
  );

  const requiredCoverage = input.shifts.reduce(
    (total, shift) =>
      total + shift.coverage.reduce((sum, requirement) => sum + requirement.count, 0),
    0,
  );
  const filledCoverage = assignments.filter(
    (assignment) => employees.has(assignment.employeeId) && shifts.has(assignment.shiftId),
  ).length;

  return {
    assignedEmployees: Object.keys(scheduledHoursByEmployee).length,
    assignmentCount: assignments.length,
    totalAssignedHours,
    scheduledHoursByEmployee,
    preferenceScore,
    preferenceSatisfactionPercent:
      preferenceBounds.maximum === preferenceBounds.minimum
        ? 100
        : roundPercent(Math.max(0, Math.min(100, ((preferenceScore - preferenceBounds.minimum) /
            (preferenceBounds.maximum - preferenceBounds.minimum)) * 100))),
    requiredCoverage,
    filledCoverage,
    coveragePercent:
      requiredCoverage === 0 ? 100 : roundPercent((filledCoverage / requiredCoverage) * 100),
  };
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}
