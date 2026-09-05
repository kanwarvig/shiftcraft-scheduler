import type {
  Assignment,
  ConstraintViolation,
  ScheduleInput,
  ScheduleValidation,
} from "./types";
import {
  assertValidInput,
  isAvailable,
  shiftHours,
  shiftsOverlap,
} from "./internal";
import { calculateScheduleMetrics } from "./metrics";

export function validateManualAssignments(
  input: ScheduleInput,
  assignments: Assignment[],
): ScheduleValidation {
  assertValidInput(input);
  const violations: ConstraintViolation[] = [];
  const employees = new Map(input.employees.map((employee) => [employee.id, employee]));
  const shifts = new Map(input.shifts.map((shift) => [shift.id, shift]));
  const seenPairs = new Set<string>();

  for (const assignment of assignments) {
    const employee = employees.get(assignment.employeeId);
    const shift = shifts.get(assignment.shiftId);
    if (!employee) {
      violations.push({
        code: "UNKNOWN_EMPLOYEE",
        message: `Employee ${assignment.employeeId} does not exist.`,
        employeeId: assignment.employeeId,
        shiftId: assignment.shiftId,
      });
    }
    if (!shift) {
      violations.push({
        code: "UNKNOWN_SHIFT",
        message: `Shift ${assignment.shiftId} does not exist.`,
        employeeId: assignment.employeeId,
        shiftId: assignment.shiftId,
      });
    }
    const pair = `${assignment.employeeId}\u0000${assignment.shiftId}`;
    if (seenPairs.has(pair)) {
      violations.push({
        code: "DUPLICATE_ASSIGNMENT",
        message: `${assignment.employeeId} is assigned to ${assignment.shiftId} more than once.`,
        employeeId: assignment.employeeId,
        shiftId: assignment.shiftId,
      });
    }
    seenPairs.add(pair);

    if (!employee || !shift) continue;
    if (!isAvailable(employee, shift)) {
      violations.push({
        code: "EMPLOYEE_UNAVAILABLE",
        message: `${employee.name} is not available for ${shift.name}.`,
        employeeId: employee.id,
        shiftId: shift.id,
      });
    }
    if (!employee.skills.includes(assignment.skill)) {
      violations.push({
        code: "MISSING_SKILL",
        message: `${employee.name} does not have the ${assignment.skill} skill.`,
        employeeId: employee.id,
        shiftId: shift.id,
        skill: assignment.skill,
      });
    }
    if (!shift.coverage.some((requirement) => requirement.skill === assignment.skill)) {
      violations.push({
        code: "UNREQUESTED_SKILL",
        message: `${shift.name} does not request ${assignment.skill} coverage.`,
        employeeId: employee.id,
        shiftId: shift.id,
        skill: assignment.skill,
      });
    }
  }

  for (const employee of input.employees) {
    const employeeAssignments = assignments.filter(
      (assignment) =>
        assignment.employeeId === employee.id && shifts.has(assignment.shiftId),
    );
    const uniqueShifts = [
      ...new Set(employeeAssignments.map((assignment) => assignment.shiftId)),
    ].map((shiftId) => shifts.get(shiftId)!);
    const hours = uniqueShifts.reduce((total, shift) => total + shiftHours(shift), 0);
    if (hours > employee.maxWeeklyHours) {
      violations.push({
        code: "MAX_WEEKLY_HOURS_EXCEEDED",
        message: `${employee.name} is scheduled for ${hours}h, above the ${employee.maxWeeklyHours}h maximum.`,
        employeeId: employee.id,
      });
    }
    for (let i = 0; i < uniqueShifts.length; i += 1) {
      for (let j = i + 1; j < uniqueShifts.length; j += 1) {
        if (shiftsOverlap(uniqueShifts[i], uniqueShifts[j])) {
          violations.push({
            code: "OVERLAPPING_SHIFTS",
            message: `${employee.name} is assigned to overlapping shifts ${uniqueShifts[i].id} and ${uniqueShifts[j].id}.`,
            employeeId: employee.id,
          });
        }
      }
    }
  }

  for (const shift of input.shifts) {
    for (const requirement of shift.coverage) {
      const actual = assignments.filter(
        (assignment) =>
          assignment.shiftId === shift.id && assignment.skill === requirement.skill,
      ).length;
      if (actual < requirement.count) {
        violations.push({
          code: "UNDER_COVERAGE",
          message: `${shift.name} needs ${requirement.count} ${requirement.skill}, but has ${actual}.`,
          shiftId: shift.id,
          skill: requirement.skill,
        });
      } else if (actual > requirement.count) {
        violations.push({
          code: "OVER_COVERAGE",
          message: `${shift.name} needs ${requirement.count} ${requirement.skill}, but has ${actual}.`,
          shiftId: shift.id,
          skill: requirement.skill,
        });
      }
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
    metrics: calculateScheduleMetrics(input, assignments),
  };
}
