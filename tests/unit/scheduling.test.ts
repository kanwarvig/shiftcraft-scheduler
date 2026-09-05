import { describe, expect, it } from "vitest";
import {
  buildGreedySchedule,
  rescheduleForAbsences,
  solveSchedule,
  validateManualAssignments,
  type Assignment,
  type ScheduleInput,
} from "../../src/lib/scheduling";
import {
  createHarbourPineScenario,
  HARBOUR_PINE_CAFE_NAME,
} from "../../src/lib/data";

describe("Harbour & Pine synthetic scenario", () => {
  it("is named, fixed, and returned as a fresh object", () => {
    const first = createHarbourPineScenario();
    const second = createHarbourPineScenario();

    expect(first.cafeName).toBe(HARBOUR_PINE_CAFE_NAME);
    expect(first.weekStart).toBe("2026-09-07");
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.employees).not.toBe(second.employees);
  });

  it("finds a valid schedule with a better weighted preference score than greedy", () => {
    const input = createHarbourPineScenario();
    const greedy = buildGreedySchedule(input);
    const optimized = solveSchedule(input);

    expect(greedy.status).toBe("feasible");
    expect(optimized.status).toBe("feasible");
    expect(validateManualAssignments(input, optimized.assignments).isValid).toBe(true);
    expect(optimized.metrics.preferenceScore).toBeGreaterThan(
      greedy.metrics.preferenceScore,
    );
    expect(optimized.metrics.coveragePercent).toBe(100);
    expect(optimized.diagnostics.nodesVisited).toBeGreaterThan(0);
    expect(optimized.diagnostics.solveTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("returns identical assignments across repeated solves", () => {
    const input = createHarbourPineScenario();
    const first = solveSchedule(input);
    const second = solveSchedule(input);

    expect(first.status).toBe("feasible");
    expect(second.status).toBe("feasible");
    expect(second.assignments).toEqual(first.assignments);
    expect(second.metrics).toEqual(first.metrics);
  });

  it("reacts to changed availability by explaining newly infeasible keyholder coverage", () => {
    const input = createHarbourPineScenario();
    const changed: ScheduleInput = {
      ...input,
      employees: input.employees.map((employee) =>
        employee.skills.includes("keyholder")
          ? {
              ...employee,
              availability: employee.availability.filter(
                ({ date }) => date !== "2026-09-07",
              ),
            }
          : employee,
      ),
    };

    const original = solveSchedule(input);
    const result = solveSchedule(changed);

    expect(original.status).toBe("feasible");
    expect(result.status).toBe("infeasible");
    if (result.status !== "infeasible") throw new Error("Expected infeasible result");
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "NO_QUALIFIED_AVAILABLE_EMPLOYEE",
          shiftId: "mon-breakfast",
          skill: "keyholder",
        }),
      ]),
    );
  });

  it("does not claim feasibility, infeasibility, or optimality after a search limit", () => {
    const result = solveSchedule(createHarbourPineScenario(), { maxNodes: 1 });

    expect(result.status).toBe("search_limit");
    expect(result.diagnostics.termination).toBe("max_nodes");
    expect(result.diagnostics.optimality).toBe("unknown");
  });
});

describe("hard constraints and explanations", () => {
  it("explains when required skill coverage has no available employee", () => {
    const input: ScheduleInput = {
      cafeName: "Impossible Café",
      weekStart: "2026-09-07",
      employees: [
        {
          id: "barista-only",
          name: "Barista Only",
          skills: ["barista"],
          availability: [{ date: "2026-09-07", start: "08:00", end: "12:00" }],
          maxWeeklyHours: 4,
        },
      ],
      shifts: [
        {
          id: "bake",
          name: "Bake shift",
          date: "2026-09-07",
          start: "08:00",
          end: "12:00",
          coverage: [{ skill: "baker", count: 1 }],
        },
      ],
    };

    const result = solveSchedule(input);
    expect(result.status).toBe("infeasible");
    if (result.status !== "infeasible") throw new Error("Expected infeasible result");
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "NO_QUALIFIED_AVAILABLE_EMPLOYEE",
          shiftId: "bake",
          skill: "baker",
          required: 1,
          available: 0,
        }),
      ]),
    );
  });

  it("reports overlap and weekly-hour violations in manual assignments", () => {
    const input = overlappingInput();
    const assignments: Assignment[] = [
      { employeeId: "alex", shiftId: "first", skill: "barista" },
      { employeeId: "alex", shiftId: "second", skill: "barista" },
    ];

    const validation = validateManualAssignments(input, assignments);
    expect(validation.isValid).toBe(false);
    expect(validation.violations.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        "OVERLAPPING_SHIFTS",
        "MAX_WEEKLY_HOURS_EXCEEDED",
      ]),
    );
  });

  it("reports unavailable, unskilled, duplicate, and under-coverage edits", () => {
    const input = overlappingInput();
    const assignments: Assignment[] = [
      { employeeId: "casey", shiftId: "first", skill: "barista" },
      { employeeId: "casey", shiftId: "first", skill: "barista" },
    ];

    const validation = validateManualAssignments(input, assignments);
    expect(validation.violations.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        "EMPLOYEE_UNAVAILABLE",
        "MISSING_SKILL",
        "DUPLICATE_ASSIGNMENT",
        "UNDER_COVERAGE",
      ]),
    );
  });
});

describe("absence rescheduling", () => {
  it("replaces the absent worker while retaining every valid remaining assignment", () => {
    const input = absenceInput();
    const current: Assignment[] = [
      { employeeId: "alex", shiftId: "open", skill: "barista" },
      { employeeId: "blair", shiftId: "mid", skill: "barista" },
      { employeeId: "casey", shiftId: "close", skill: "barista" },
    ];

    const result = rescheduleForAbsences(input, current, ["alex"]);

    expect(result.status).toBe("feasible");
    expect(result.assignments).not.toContainEqual(
      expect.objectContaining({ employeeId: "alex" }),
    );
    expect(result.assignments).toEqual(
      expect.arrayContaining([current[1], current[2]]),
    );
    expect(result.retainedAssignmentCount).toBe(2);
    expect(result.displacedAssignmentCount).toBe(0);
    expect(validateManualAssignments(
      { ...input, employees: input.employees.filter(({ id }) => id !== "alex") },
      result.assignments,
    ).isValid).toBe(true);
  });
});

function overlappingInput(): ScheduleInput {
  return {
    cafeName: "Overlap Café",
    weekStart: "2026-09-07",
    employees: [
      {
        id: "alex",
        name: "Alex",
        skills: ["barista"],
        availability: [{ date: "2026-09-07", start: "08:00", end: "14:00" }],
        maxWeeklyHours: 4,
      },
      {
        id: "casey",
        name: "Casey",
        skills: ["register"],
        availability: [{ date: "2026-09-07", start: "06:00", end: "07:00" }],
        maxWeeklyHours: 8,
      },
    ],
    shifts: [
      {
        id: "first",
        name: "First",
        date: "2026-09-07",
        start: "08:00",
        end: "12:00",
        coverage: [{ skill: "barista", count: 1 }],
      },
      {
        id: "second",
        name: "Second",
        date: "2026-09-07",
        start: "10:00",
        end: "14:00",
        coverage: [{ skill: "barista", count: 1 }],
      },
    ],
  };
}

function absenceInput(): ScheduleInput {
  return {
    cafeName: "Absence Café",
    weekStart: "2026-09-07",
    employees: [
      {
        id: "alex",
        name: "Alex",
        skills: ["barista"],
        availability: [{ date: "2026-09-07", start: "06:00", end: "10:00" }],
        maxWeeklyHours: 4,
      },
      {
        id: "blair",
        name: "Blair",
        skills: ["barista"],
        availability: [{ date: "2026-09-07", start: "06:00", end: "18:00" }],
        maxWeeklyHours: 8,
        shiftPreferences: { open: 100, mid: -100 },
      },
      {
        id: "casey",
        name: "Casey",
        skills: ["barista"],
        availability: [{ date: "2026-09-07", start: "06:00", end: "18:00" }],
        maxWeeklyHours: 8,
      },
    ],
    shifts: [
      {
        id: "open",
        name: "Open",
        date: "2026-09-07",
        start: "06:00",
        end: "10:00",
        coverage: [{ skill: "barista", count: 1 }],
      },
      {
        id: "mid",
        name: "Mid",
        date: "2026-09-07",
        start: "10:00",
        end: "14:00",
        coverage: [{ skill: "barista", count: 1 }],
      },
      {
        id: "close",
        name: "Close",
        date: "2026-09-07",
        start: "14:00",
        end: "18:00",
        coverage: [{ skill: "barista", count: 1 }],
      },
    ],
  };
}
