# ShiftCraft runbook

This runbook covers local development and release verification for the browser-local demonstration. It does not describe production workforce operations.

## Prerequisites

- Node.js 20 or later
- npm
- A modern browser for interaction and session-state checks
- Git, when running secret scans locally

No database, API key, optimizer service, or seeded real-world data is required.

## Clean setup

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. Use `npm ci`, rather than `npm install`, for CI/release reproduction because it honors the committed lockfile exactly.

## Required verification

Run the repository gates from its root:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Then run the browser suite:

```bash
npm run test:e2e
```

A releasable change needs all five commands to pass. Do not describe a build-only result as fully verified.

## Manual scenario checks

Use only the bundled synthetic data.

### Feasible rush week

1. Load the feasible rush-week scenario.
2. Run both the greedy and branch-and-bound solvers against the same input.
3. Change one staff member's maximum hours in **Configure input** and confirm the submitted model and result reflect that constraint.
4. Confirm every filled assignment shows an eligible skill match and valid availability.
5. Confirm the stronger solver's result passes with zero hard violations.
6. Compare coverage, preference satisfaction, and solve duration; do not assume the stronger solver must be faster.
7. Re-run without changing input and confirm the deterministic result is unchanged.

### Keyholder staffing gap

1. Load the keyholder gap scenario.
2. Run the solver.
3. Confirm the result identifies uncovered demand and does not claim a fully feasible schedule.
4. Confirm preference score cannot hide or cancel the hard coverage failure.

### Barista absence recovery

1. Begin with the feasible scheduled week.
2. Apply the bundled barista absence.
3. Run recovery.
4. Confirm assignments involving the absent staff member are removed or replaced.
5. Confirm all retained and replacement assignments pass the same hard-rule validator.
6. Confirm the changed-assignment metric matches the visible before/after schedule.

### Manual assignment

1. Make one valid manual assignment and confirm it is accepted.
2. Attempt an assignment that violates availability, skill, hours, or overlap.
3. Confirm it is rejected with a specific reason and the last valid schedule remains intact.

## Session-state check

1. Change or solve the demo state.
2. Confirm the interface labels edits as **Session-only browser state**.
3. Navigate between **Plan** and **Schedule**, then reload the same tab; confirm the current result is restored.
4. Select **Reset session**; confirm the synthetic default returns and results are cleared.
5. Close the tab and open a new one; confirm the previous tab session is not recovered.

Never use real staff information for this check. Session-only state is not a system of record, backup, or collaboration mechanism.

## Secret scan

CI runs Gitleaks over the repository. To reproduce locally when Gitleaks is installed:

```bash
gitleaks git --redact --no-banner
```

Treat a suspected secret as compromised until disproven. Remove it from the change, rotate the credential through its provider, and inspect history before proceeding. Do not paste secret values into issues or logs.

## Release checklist

- [ ] `npm ci` succeeds from a clean checkout.
- [ ] Lint, typecheck, tests, and production build pass.
- [ ] Playwright end-to-end tests pass.
- [ ] All four manual checks above pass on the target deployment.
- [ ] Synthetic-data and session-only-state disclosures are visible.
- [ ] No result claims optimality after a timeout/search-limit termination.
- [ ] No real employee data, credentials, or private URLs are bundled.
- [ ] Scope/limitation text still matches the shipped feature set.
- [ ] The exact public URL—not only a preview build—has been opened and exercised before calling the release live.

## Common failures

| Symptom | Check | Safe response |
| --- | --- | --- |
| `npm ci` reports lock mismatch | `package.json` and `package-lock.json` were changed together | Regenerate the lockfile intentionally; do not bypass with an unlocked install in CI |
| Build fails after typecheck passes | Next.js server/client boundaries, browser globals, or production-only rendering | Keep session interactions inside the client component and rerun the full gate |
| Schedule says feasible with a visible gap | Coverage normalization and independent result validation | Treat as a release blocker; do not rely on the score display |
| Repeated input produces different assignments | Unstable iteration order or incomplete tie-breaker | Sort slots/candidates by stable identifiers and add a regression test |
| Recovery changes too many assignments | Missing/incorrect disruption cost or existing-schedule seed | Inspect score components and before/after assignment identifiers |
| State disappears after same-tab reload | Session snapshot failed to restore | Inspect `shiftcraft-session-v1` in `sessionStorage`; do not promise durable recovery |
| Solver becomes unresponsive | Search space or bound weakened | Enforce the documented limit, surface bounded termination, and reduce/test the fixture |

## Recovery and rollback

Because there is no persisted user data, application rollback and session reset are separate:

- Roll back the deployment using the hosting provider's previous known-good artifact.
- Ask the user to use **Reset session** when current session state is inconsistent. Reload may restore the same snapshot; do not promise recovery after reset or tab close.
- If only one scenario or solver is defective, do not hide invalid results behind a successful build; disable the affected path or restore the previous known-good release.
- After rollback, repeat the manual scenarios on the exact public URL and record which commit/artifact was verified.

## Escalation thresholds

Stop release and investigate when any feasible result has a hard violation, a bounded run is labeled optimal/infeasible without proof, the session-only boundary is misstated, a suspected credential is detected, or the deployed public surface differs from the verified build.
