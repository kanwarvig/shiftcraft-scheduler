import type {
  InfeasibilityReason,
  ScheduleInput,
} from "./types";
import { isAvailable, shiftHours } from "./internal";

export function explainInfeasibility(input: ScheduleInput): InfeasibilityReason[] {
  const reasons: InfeasibilityReason[] = [];

  for (const shift of input.shifts) {
    for (const requirement of shift.coverage) {
      const candidates = input.employees.filter(
        (employee) =>
          employee.skills.includes(requirement.skill) && isAvailable(employee, shift),
      );
      if (candidates.length === 0) {
        reasons.push({
          code: "NO_QUALIFIED_AVAILABLE_EMPLOYEE",
          message: `${shift.name} needs ${requirement.skill}, but no qualified employee is available.`,
          shiftId: shift.id,
          skill: requirement.skill,
          required: requirement.count,
          available: 0,
        });
      } else if (candidates.length < requirement.count) {
        reasons.push({
          code: "INSUFFICIENT_QUALIFIED_EMPLOYEES",
          message: `${shift.name} needs ${requirement.count} ${requirement.skill} employees, but only ${candidates.length} are qualified and available.`,
          shiftId: shift.id,
          skill: requirement.skill,
          required: requirement.count,
          available: candidates.length,
        });
      }
    }
  }

  const requiredHours = input.shifts.reduce(
    (total, shift) =>
      total +
      shiftHours(shift) *
        shift.coverage.reduce((sum, requirement) => sum + requirement.count, 0),
    0,
  );
  const availableHours = input.employees.reduce(
    (total, employee) => total + employee.maxWeeklyHours,
    0,
  );
  if (availableHours < requiredHours) {
    reasons.push({
      code: "INSUFFICIENT_TOTAL_HOURS",
      message: `Coverage requires ${requiredHours} staff-hours, but weekly limits provide only ${availableHours}.`,
      required: requiredHours,
      available: availableHours,
    });
  }

  reasons.push({
    code: "NO_FEASIBLE_COMBINATION",
    message:
      "No assignment combination satisfies availability, skills, overlapping-shift, coverage, and weekly-hour constraints together.",
  });
  return reasons;
}
