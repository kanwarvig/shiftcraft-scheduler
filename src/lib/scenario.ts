import { createHarbourPineScenario } from "@/lib/data/harbourPineScenario";
import type { Assignment, ScheduleInput } from "@/lib/scheduling";

export type ScenarioId = "feasible" | "infeasible" | "absence";

export function createScenarioInput(scenario: ScenarioId): ScheduleInput {
  const input = createHarbourPineScenario();
  if (scenario !== "infeasible") return input;

  const targetShift =
    input.shifts.find((shift) =>
      shift.coverage.some((requirement) => requirement.skill === "keyholder"),
    ) ?? input.shifts[0];
  const targetSkill =
    targetShift.coverage.find((requirement) => requirement.skill === "keyholder")?.skill ??
    targetShift.coverage[0]?.skill;

  return {
    ...input,
    employees: input.employees.map((employee) =>
      targetSkill && employee.skills.includes(targetSkill)
        ? {
            ...employee,
            availability: employee.availability.filter(
              (window) => window.date !== targetShift.date,
            ),
          }
        : employee,
    ),
  };
}

export function chooseAbsentEmployee(
  input: ScheduleInput,
  assignments: Assignment[],
): string {
  const baristaAssignment = assignments.find(
    (assignment) => assignment.skill === "barista",
  );
  if (baristaAssignment) return baristaAssignment.employeeId;

  return assignments[0]?.employeeId ?? input.employees[0]?.id ?? "";
}
