import type {
  AbsenceRescheduleResult,
  Assignment,
  EmployeeId,
  ScheduleInput,
  SolveOptions,
} from "./types";
import {
  assignmentKey,
  coverageUnits,
  preferenceFor,
} from "./internal";
import { solveScheduleInternal } from "./solver";
import { validateManualAssignments } from "./validation";

export function rescheduleForAbsences(
  input: ScheduleInput,
  currentAssignments: Assignment[],
  absentEmployeeIds: EmployeeId[],
  options: SolveOptions = {},
): AbsenceRescheduleResult {
  const startedAt = performance.now();
  const currentValidation = validateManualAssignments(input, currentAssignments);
  if (!currentValidation.isValid) {
    throw new Error("Current assignments must be valid before rescheduling absences");
  }

  const knownEmployeeIds = new Set(input.employees.map((employee) => employee.id));
  const absent = [...new Set(absentEmployeeIds)].sort();
  for (const employeeId of absent) {
    if (!knownEmployeeIds.has(employeeId)) {
      throw new Error(`Absent employee ${employeeId} does not exist`);
    }
  }
  const absentSet = new Set(absent);
  const retainedTargets = currentAssignments.filter(
    (assignment) => !absentSet.has(assignment.employeeId),
  );
  const retainedKeys = new Set(retainedTargets.map(assignmentKey));

  // One retained assignment must outweigh every possible preference trade-off,
  // making disruption the primary objective and preferences the tie-breaker.
  const preferenceRange = coverageUnits(input).reduce((total, unit) => {
    const largestMagnitude = input.employees.reduce(
      (largest, employee) =>
        Math.max(largest, Math.abs(preferenceFor(employee, unit.shift.id))),
      0,
    );
    return total + largestMagnitude * 2;
  }, 0);
  const retentionBonus = preferenceRange + 1;
  const bonuses = new Map<string, number>();
  for (const key of retainedKeys) bonuses.set(key, retentionBonus);

  const reducedInput: ScheduleInput = {
    ...input,
    employees: input.employees.filter((employee) => !absentSet.has(employee.id)),
  };
  const result = solveScheduleInternal(reducedInput, {
    ...options,
    assignmentBonuses: bonuses,
  });
  const resultKeys = new Set(result.assignments.map(assignmentKey));
  const retainedAssignmentCount = [...retainedKeys].filter((key) =>
    resultKeys.has(key),
  ).length;

  return {
    ...result,
    diagnostics: {
      ...result.diagnostics,
      solveTimeMs: performance.now() - startedAt,
    },
    absentEmployeeIds: absent,
    retainedAssignmentCount,
    displacedAssignmentCount: retainedTargets.length - retainedAssignmentCount,
  };
}
