import type {
  Assignment,
  Employee,
  InfeasibleScheduleResult,
  ScheduleInput,
  ScheduleResult,
  SolveOptions,
} from "./types";
import {
  assignmentKey,
  assertValidInput,
  coverageUnits,
  isAvailable,
  preferenceFor,
  shiftHours,
  shiftsOverlap,
  sortAssignments,
  type CoverageUnit,
} from "./internal";
import { calculateScheduleMetrics } from "./metrics";
import { explainInfeasibility } from "./explanations";

interface InternalSolveOptions extends SolveOptions {
  assignmentBonuses?: ReadonlyMap<string, number>;
}

interface Candidate {
  employee: Employee;
  score: number;
}

export function buildGreedySchedule(input: ScheduleInput): ScheduleResult {
  const startedAt = performance.now();
  assertValidInput(input);
  const assignments: Assignment[] = [];
  const hours = new Map<string, number>();
  const shifts = new Map(input.shifts.map((shift) => [shift.id, shift]));
  let nodesVisited = 0;

  for (const unit of coverageUnits(input)) {
    const candidates = candidatesFor(input, unit)
      .filter(({ employee }) => canAssign(employee, unit, assignments, hours, shifts))
      .sort(compareCandidates);
    nodesVisited += candidates.length;
    const selected = candidates[0];
    if (!selected) continue;
    const assignment = toAssignment(unit, selected.employee);
    assignments.push(assignment);
    hours.set(
      selected.employee.id,
      (hours.get(selected.employee.id) ?? 0) + shiftHours(unit.shift),
    );
  }

  const ordered = sortAssignments(assignments);
  const metrics = calculateScheduleMetrics(input, ordered);
  const diagnostics = {
    nodesVisited,
    branchesPruned: 0,
    solveTimeMs: performance.now() - startedAt,
    termination: "complete" as const,
    optimality: "not_applicable" as const,
  };
  if (assignments.length === coverageUnits(input).length) {
    return {
      status: "feasible",
      strategy: "greedy",
      assignments: ordered,
      metrics,
      diagnostics,
    };
  }
  return {
    status: "infeasible",
    strategy: "greedy",
    assignments: ordered,
    metrics,
    reasons: explainInfeasibility(input),
    diagnostics,
  };
}

export function solveSchedule(
  input: ScheduleInput,
  options: SolveOptions = {},
): ScheduleResult {
  return solveScheduleInternal(input, options);
}

export function solveScheduleInternal(
  input: ScheduleInput,
  options: InternalSolveOptions,
): ScheduleResult {
  const startedAt = performance.now();
  assertValidInput(input);
  const maxNodes = options.maxNodes ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(maxNodes) && maxNodes !== Number.POSITIVE_INFINITY) {
    throw new Error("maxNodes must be a positive number");
  }
  if (maxNodes <= 0) throw new Error("maxNodes must be a positive number");

  const rawUnits = coverageUnits(input);
  const candidatesByUnit = new Map<CoverageUnit, Candidate[]>();
  for (const unit of rawUnits) {
    candidatesByUnit.set(
      unit,
      candidatesFor(input, unit, options.assignmentBonuses).sort(compareCandidates),
    );
  }
  const units = [...rawUnits].sort((a, b) => {
    const candidateDifference =
      candidatesByUnit.get(a)!.length - candidatesByUnit.get(b)!.length;
    if (candidateDifference !== 0) return candidateDifference;
    return unitKey(a).localeCompare(unitKey(b));
  });

  const suffixUpperBound = new Array<number>(units.length + 1).fill(0);
  for (let index = units.length - 1; index >= 0; index -= 1) {
    const candidates = candidatesByUnit.get(units[index])!;
    suffixUpperBound[index] =
      suffixUpperBound[index + 1] +
      (candidates.length > 0 ? candidates[0].score : Number.NEGATIVE_INFINITY);
  }

  let bestAssignments: Assignment[] | undefined;
  let bestScore = Number.NEGATIVE_INFINITY;
  let nodesVisited = 0;
  let branchesPruned = 0;
  let hitNodeLimit = false;
  const assignments: Assignment[] = [];
  const hours = new Map<string, number>();
  const shifts = new Map(input.shifts.map((shift) => [shift.id, shift]));
  const priorCandidateRank = new Map<string, number>();

  function search(index: number, score: number): void {
    if (nodesVisited >= maxNodes) {
      hitNodeLimit = true;
      return;
    }
    nodesVisited += 1;
    if (index === units.length) {
      if (score > bestScore) {
        bestScore = score;
        bestAssignments = sortAssignments(assignments);
      }
      return;
    }
    if (score + suffixUpperBound[index] <= bestScore) {
      branchesPruned += 1;
      return;
    }

    const unit = units[index];
    const candidates = candidatesByUnit.get(unit)!;
    const groupKey = `${unit.shift.id}\u0000${unit.skill}`;
    const minimumRank = priorCandidateRank.get(groupKey) ?? -1;
    for (let rank = minimumRank + 1; rank < candidates.length; rank += 1) {
      const candidate = candidates[rank];
      if (!canAssign(candidate.employee, unit, assignments, hours, shifts)) continue;
      const assignment = toAssignment(unit, candidate.employee);
      assignments.push(assignment);
      const previousHours = hours.get(candidate.employee.id) ?? 0;
      hours.set(candidate.employee.id, previousHours + shiftHours(unit.shift));
      const hadPriorRank = priorCandidateRank.has(groupKey);
      priorCandidateRank.set(groupKey, rank);
      search(index + 1, score + candidate.score);
      if (hadPriorRank) priorCandidateRank.set(groupKey, minimumRank);
      else priorCandidateRank.delete(groupKey);
      if (previousHours === 0) hours.delete(candidate.employee.id);
      else hours.set(candidate.employee.id, previousHours);
      assignments.pop();
    }
  }

  search(0, 0);
  if (hitNodeLimit) {
    const incumbent = bestAssignments ?? [];
    return {
      status: "search_limit",
      strategy: "branch-and-bound",
      assignments: incumbent,
      metrics: calculateScheduleMetrics(input, incumbent),
      message: bestAssignments
        ? "Search limit reached. This schedule is feasible, but optimality is unknown."
        : "Search limit reached before feasibility could be determined.",
      diagnostics: {
        nodesVisited,
        branchesPruned,
        solveTimeMs: performance.now() - startedAt,
        termination: "max_nodes",
        optimality: "unknown",
      },
    };
  }
  if (bestAssignments) {
    return {
      status: "feasible",
      strategy: "branch-and-bound",
      assignments: bestAssignments,
      metrics: calculateScheduleMetrics(input, bestAssignments),
      diagnostics: {
        nodesVisited,
        branchesPruned,
        solveTimeMs: performance.now() - startedAt,
        termination: "complete",
        optimality: "proven",
      },
    };
  }

  return infeasible(
    input,
    nodesVisited,
    branchesPruned,
    performance.now() - startedAt,
  );
}

function candidatesFor(
  input: ScheduleInput,
  unit: CoverageUnit,
  bonuses?: ReadonlyMap<string, number>,
): Candidate[] {
  return input.employees
    .filter(
      (employee) =>
        employee.skills.includes(unit.skill) && isAvailable(employee, unit.shift),
    )
    .map((employee) => {
      const assignment = toAssignment(unit, employee);
      return {
        employee,
        score:
          preferenceFor(employee, unit.shift.id) +
          (bonuses?.get(assignmentKey(assignment)) ?? 0),
      };
    });
}

function compareCandidates(first: Candidate, second: Candidate): number {
  return second.score - first.score || first.employee.id.localeCompare(second.employee.id);
}

function canAssign(
  employee: Employee,
  unit: CoverageUnit,
  assignments: Assignment[],
  hours: Map<string, number>,
  shifts: ReadonlyMap<string, CoverageUnit["shift"]>,
): boolean {
  if (
    (hours.get(employee.id) ?? 0) + shiftHours(unit.shift) >
    employee.maxWeeklyHours
  ) {
    return false;
  }
  for (const assignment of assignments) {
    if (assignment.employeeId !== employee.id) continue;
    if (assignment.shiftId === unit.shift.id) return false;
    // Assigned shifts always come from the same validated input.
    const assignedShift = shifts.get(assignment.shiftId);
    if (assignedShift && shiftsOverlap(assignedShift, unit.shift)) return false;
  }
  return true;
}

function toAssignment(unit: CoverageUnit, employee: Employee): Assignment {
  return { employeeId: employee.id, shiftId: unit.shift.id, skill: unit.skill };
}

function unitKey(unit: CoverageUnit): string {
  return `${unit.shift.date}\u0000${unit.shift.start}\u0000${unit.shift.id}\u0000${unit.skill}\u0000${String(unit.ordinal).padStart(4, "0")}`;
}

function infeasible(
  input: ScheduleInput,
  nodesVisited: number,
  branchesPruned: number,
  solveTimeMs: number,
): InfeasibleScheduleResult {
  return {
    status: "infeasible",
    strategy: "branch-and-bound",
    assignments: [],
    metrics: calculateScheduleMetrics(input, []),
    reasons: explainInfeasibility(input),
    diagnostics: {
      nodesVisited,
      branchesPruned,
      solveTimeMs,
      termination: "complete",
      optimality: "proven",
    },
  };
}
