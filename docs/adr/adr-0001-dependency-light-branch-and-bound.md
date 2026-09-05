---
title: "ADR-0001: Use a dependency-light deterministic branch-and-bound scheduler"
status: "Accepted"
date: "2026-09-04"
authors: "ShiftCraft maintainers"
tags: ["architecture", "decision", "scheduling", "optimization"]
supersedes: ""
superseded_by: ""
---

# ADR-0001: Use a dependency-light deterministic branch-and-bound scheduler

## Status

**Accepted** | Proposed | Rejected | Superseded | Deprecated

## Context

ShiftCraft must demonstrate the difference between a fast local heuristic and a stronger, explainable scheduling approach on a small synthetic café week. A valid schedule must respect staff availability, required skills, per-slot coverage, weekly hour limits, and non-overlap. Among feasible schedules it should account for weighted preferences and, during recovery, minimize disruption to existing valid assignments.

The solver runs as dependency-light TypeScript inside the application and is currently invoked by a first-party Next.js route. The project has no external optimizer service, database, or operational requirement to solve large workforce instances. Reviewers must be able to inspect the trade-offs, reproduce a result, and test validation independently. The implementation also needs to remain small enough to maintain within a portfolio project.

Stakeholders are the ShiftCraft maintainers, technical reviewers, and portfolio viewers. The fictional café and roster are demonstration fixtures, not real stakeholders or validated users.

## Decision

Implement two solvers against one domain contract:

- **DEC-001**: Keep a deterministic greedy solver as the transparent speed and quality baseline.
- **DEC-002**: Implement a dependency-light branch-and-bound/backtracking solver in TypeScript for the stronger result.
- **DEC-003**: Use hard constraints to reject and prune candidates; use weighted soft preferences and disruption only to rank feasible schedules.
- **DEC-004**: Assign the most-constrained remaining slot first, use stable candidate ordering and tie-breakers, and prune with an optimistic suffix-score bound.
- **DEC-005**: Keep a solver-independent validator for manual edits and as a test oracle for solver results. A node-limited run returns `search_limit` with unknown optimality; it cannot be reported as proven feasible, optimal, or infeasible.
- **DEC-006**: Keep the scheduling engine independent of React, Next.js, and browser session-state management.

This approach is selected because the demonstration benefits from code-level explainability and deterministic reproduction more than it benefits from industrial-scale optimization features.

## Consequences

### Positive

- **POS-001**: The full decision path and every feasibility rule can be reviewed and unit-tested in the repository.
- **POS-002**: The browser build does not require a native optimization runtime, remote solver, API credential, or network request.
- **POS-003**: Stable ordering makes identical inputs reproducible, which improves scenario tests and solver comparison.
- **POS-004**: A shared contract makes the greedy baseline, stronger solver, manual validator, and recovery flow comparable.
- **POS-005**: Disruption can be modeled explicitly instead of rebuilding an absence schedule from scratch without regard for existing assignments.

### Negative

- **NEG-001**: Branch-and-bound remains exponential in the worst case; performance on the included synthetic week says little about larger rosters.
- **NEG-002**: The project owns search correctness, pruning correctness, tie-breaking, and numeric scoring behavior that a mature optimization package would otherwise provide.
- **NEG-003**: The model is less expressive than a full constraint-programming or mixed-integer formulation and will become harder to evolve as rules multiply.
- **NEG-004**: Solve time varies by runtime, host load, and scenario and cannot be treated as a controlled benchmark.
- **NEG-005**: A configured search bound can yield the best schedule found so far without proving it is globally optimal.

## Alternatives considered

### Greedy-only scheduling

- **ALT-001**: **Description**: Assign each slot to the best currently eligible staff member and never revisit earlier choices.
- **ALT-002**: **Rejection reason**: This is retained as a baseline but rejected as the only solver because local choices can create avoidable later gaps and cannot support a credible stronger-solver comparison.

### External optimization service or SaaS API

- **ALT-003**: **Description**: Send the scheduling model to a hosted optimizer and return its result to the browser.
- **ALT-004**: **Rejection reason**: This adds data transfer, secrets, availability, cost, and service integration to a browser-local synthetic demo without evidence that its scale requires them.

### Constraint-programming or mixed-integer dependency

- **ALT-005**: **Description**: Model the schedule with an established CP-SAT or MILP library, locally if browser-compatible or behind a server.
- **ALT-006**: **Rejection reason**: Such tools are stronger for richer or larger models, but their runtime/bundle or server needs and abstraction overhead exceed this project's intentionally small scope. This option should be reconsidered if scale or rule complexity grows.

### Unbounded exhaustive search

- **ALT-007**: **Description**: Enumerate every possible assignment and select the highest-scoring feasible schedule.
- **ALT-008**: **Rejection reason**: It is simple to describe but wastes obvious hard-rule and score bounds, increasing the risk of an unresponsive browser.

## Implementation notes

- **IMP-001**: Normalize inputs and order slots by fewest eligible candidates, then stable slot identifier; order staff candidates by deterministic score and identifier.
- **IMP-002**: Centralize availability, skill, coverage, hour, and overlap predicates so manual edits and both solvers agree.
- **IMP-003**: Represent score components separately: preference contribution, disruption cost, and any deterministic tie-breaker. Hard violations are never score terms.
- **IMP-004**: Track node count, pruned branches, and elapsed time for the exhaustive public solver. Add a termination reason and optimality flag before exposing bounded search publicly.
- **IMP-005**: Test small instances against exhaustive enumeration to detect unsafe pruning and verify deterministic output across repeated runs.
- **IMP-006**: Revisit this ADR if representative instances exceed the interactive budget, hard rules become materially richer, or production/real-data use enters scope.

## Acceptance and success criteria

- **ACC-001**: Every result marked feasible passes the independent hard-constraint validator.
- **ACC-002**: Repeated runs with identical input and configuration return the same assignments and score.
- **ACC-003**: For small exhaustive-test fixtures, the branch-and-bound score matches the best enumerated feasible score.
- **ACC-004**: Any future bounded public run makes termination visible and does not claim proof that was not reached.
- **ACC-005**: Absence recovery never retains an assignment made invalid by the absence and reports how many otherwise-valid assignments changed.

## References

- **REF-001**: [ShiftCraft architecture](../architecture.md)
- **REF-002**: [Scope and limitations](../scope-and-limitations.md)
- **REF-003**: [Runbook](../runbook.md)
