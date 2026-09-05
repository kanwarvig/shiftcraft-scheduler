# ShiftCraft

ShiftCraft is a constraint-aware staff scheduling portfolio project for a fictional café, Harbour & Pine. It turns a synthetic weekly roster, shift demand, staff availability, skills, hour limits, and preferences into an explainable schedule. It also compares a fast greedy baseline with a deterministic branch-and-bound solver and shows the effect of an absence without silently breaking valid assignments.

> **Demonstration scope:** all people, availability, preferences, shifts, and scenarios are synthetic. This project has not been validated with real users or real employment data and is not a production workforce-management system.

## What the demo covers

- Weekly staff, skills, availability, maximum-hours, and preference inputs
- Shift slots with start/end times and required skills
- Hard-rule validation: availability, required skill, slot coverage, weekly hour limits, and overlapping shifts
- Weighted preference scoring and a rescheduling disruption penalty
- A greedy baseline and a deterministic branch-and-bound/backtracking solver
- Manual assignment validation
- Absence recovery that tries to retain still-valid assignments and minimize changes
- Comparable metrics: coverage, hard violations, preference satisfaction, solve time, and changed assignments
- Three synthetic scenarios: a feasible rush week, a keyholder staffing gap, and a barista absence

The fixture defines inputs and constraints only. It never contains assignments or solver output; every displayed roster is computed at request time.

ShiftCraft deliberately excludes payroll, time clocks, compliance advice, route planning, calendar integration, employee messaging, authentication, and multi-user collaboration. See [Scope and limitations](docs/scope-and-limitations.md) for the full boundary.

## Requirement-to-evidence map

| Requirement | Implementation evidence | Automated evidence | Public interaction |
| --- | --- | --- | --- |
| Synthetic roster and configurable demand inputs, with no precomputed assignments | `src/lib/data/harbourPineScenario.ts`, `src/lib/scenario.ts`, `src/components/PlannerWorkspace.tsx` | Fresh fixture and changed-input cases in `tests/unit/scheduling.test.ts` | Change a staff member's maximum hours in **Plan**, then generate |
| Caller-supplied models are validated at the API boundary | `src/lib/api/contracts.ts`, `src/app/api/schedule/route.ts` | `tests/unit/api-contracts.test.ts` | Every solve sends the current full model, including UI edits, to `POST /api/schedule` |
| Hard feasibility rules stay blocking | `src/lib/scheduling/validation.ts`, `src/lib/scheduling/internal.ts` | Constraint and manual-edit cases in `tests/unit/scheduling.test.ts` | Generate, select a shift and a specific coverage role, complete a valid edit, then test a blocked candidate |
| Greedy baseline versus deterministic stronger search | `src/lib/scheduling/solver.ts`, `src/app/api/schedule/route.ts` | Preference-quality and repeatability cases in `tests/unit/scheduling.test.ts` | **Generate schedule**, then inspect **Baseline vs. search** |
| Infeasible demand is explained, not silently relaxed | `src/lib/scheduling/explanations.ts`, `src/lib/scenario.ts` | No-qualified-employee case in `tests/unit/scheduling.test.ts` | Load the staffing-gap case and select **Generate schedule** |
| Absence recovery prioritizes valid assignment retention | `src/lib/scheduling/absence.ts` | Retention and validity case in `tests/unit/scheduling.test.ts` | Load **Barista calls out** and select **Repair schedule** |
| Session-only browser state | `src/components/PlannerState.tsx` | Route, refresh, and reset checks in `tests/e2e/shiftcraft.spec.ts` | Navigate between Plan and Schedule or refresh the same tab; **Reset session** clears it |
| Route-level workflow | `src/app/page.tsx`, `src/app/planner`, `src/app/schedule`, `src/app/scenarios`, `src/app/evidence` | Direct-load, navigation, refresh, and browser-back cases in `tests/e2e/shiftcraft.spec.ts` | Move through Overview → Plan → Schedule; inspect Cases and Evidence independently |
| Bounded search never overclaims | `src/lib/scheduling/types.ts`, `src/lib/scheduling/solver.ts` | Search-limit case in `tests/unit/scheduling.test.ts` | API returns `search_limit` with `optimality: unknown` when `maxNodes` is reached |
| CI and repository hygiene | `.github/workflows/ci.yml`, `.gitignore` | CI runs lint, typecheck, unit tests, build, production-server Playwright, and Gitleaks | Public repository Actions are the durable evidence after push |
| Exact public release proof | `playwright.config.ts`, `docs/runbook.md` | `PLAYWRIGHT_BASE_URL=<production alias> npm run test:e2e` | Repeat the feasible, infeasible, absence, configurable-input, valid-edit, and blocked-edit flows on the production alias |

File paths above are repository-relative so each claim can be checked directly in source.

## Run locally

Requirements:

- Node.js 20 or later
- npm (the committed lockfile is the source of dependency resolution)

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verify a change

The repository is expected to expose the same quality gates used by CI:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Browser tests are a separate local/release check because they require a built or running application:

```bash
npm run test:e2e
```

## Data and state

The application sends the current, caller-supplied typed scheduling model to its own validated Next.js route. The bundled scenario is only a reproducible starting point; changing the maximum-hours control changes the actual solver input. Results and manual edits live only in this browser tab's `sessionStorage`, which allows route changes and same-tab refresh without pretending there is a saved workspace. Closing the tab discards the session. There is no server-side database, account, cross-device sync, or backup. Do not enter real employee or sensitive personal data.

## Documentation

- [Architecture](docs/architecture.md) — boundaries, data flow, solver model, session state, and testing
- [ADR-0001](docs/adr/adr-0001-dependency-light-branch-and-bound.md) — why the stronger solver is implemented in-repository
- [Runbook](docs/runbook.md) — development, verification, release, and recovery procedures
- [Scope and limitations](docs/scope-and-limitations.md) — what is demonstrated, what is not, and how to interpret the metrics

## Technology

ShiftCraft uses Next.js, React, TypeScript, Tailwind CSS, Zod, Vitest, and Playwright. The scheduling domain is kept separate from the interface so feasibility and scoring can be tested without a browser.
