# Scope, evidence, and limitations

## What ShiftCraft is

ShiftCraft is an engineering portfolio demonstration of small-scale constraint-aware staff scheduling. Its setting, Harbour & Pine Café, and every roster record, availability window, preference, shift, and absence are synthetic.

The project demonstrates:

- explicit modeling of hard constraints and weighted preferences;
- a greedy baseline for comparison;
- a deterministic branch-and-bound/backtracking solver for stronger search;
- transparent feasibility and schedule-quality metrics;
- validation of manual changes;
- absence recovery that values schedule stability;
- ephemeral, session-only browser state.

## What it is not

ShiftCraft is not:

- a production workforce-management, payroll, time-clock, HR, or compliance system;
- legal, employment-standards, collective-agreement, fatigue, or fairness advice;
- a route planner or dispatch tool;
- connected to calendars, messaging tools, point-of-sale systems, or employee records;
- a multi-user system, system of record, hosted optimizer, persisted workspace, or durable backup;
- evidence that the interface or schedule policy has been validated with café managers or staff.

No real-user research, usability study, field trial, or production deployment is claimed. Automated tests demonstrate software behavior under encoded assumptions; they do not validate whether those assumptions are appropriate for a real workplace.

## Constraints versus preferences

Hard constraints determine whether a roster is valid. ShiftCraft treats full-slot coverage, availability, required skills, weekly hour limits, and non-overlap as hard. A solver must not trade one of these away for a better score.

Soft preferences distinguish among valid schedules. Preference satisfaction and reschedule stability are weighted assumptions. A high preference score is not evidence of employee consent, fairness, wellbeing, or schedule quality beyond the rules represented in the demo.

If complete coverage is impossible, the system may display a partial result for diagnosis, but it must label it infeasible and identify the gap. “Best found” is not the same as “valid,” and “valid” is not the same as “fair” or “operationally approved.”

## How to interpret metrics

| Metric | What it means in this project | What it does not prove |
| --- | --- | --- |
| Coverage | Required synthetic slots assigned | Real demand accuracy or operational readiness |
| Hard violations | Validator failures under the encoded five rules | Legal compliance or complete policy coverage |
| Preference satisfaction | Weighted encoded preferences met | Employee satisfaction, consent, or fairness |
| Solve time | Elapsed time in this run and runtime | Controlled benchmark or large-scale performance |
| Assignments changed | Before/after assignment differences during recovery | Human disruption, communication cost, or acceptability |

The branch-and-bound solver can claim optimality only when it exhausts or safely prunes the defined search under the current objective. If a time or node limit ends the search, the result is the best found under that run; it is not proof of global optimality. Failure to find a schedule before a limit is also not proof that none exists.

## Data and state boundary

Results and edits remain only in `sessionStorage` for the current browser tab. This supports route changes and same-tab reload, but there is no durable browser storage, server sync, account, access control, audit history, collaboration, or recovery service. Closing the tab discards the current schedule.

Use the bundled synthetic data only. Do not enter names, employment details, accommodation information, contact information, or other real/sensitive data.

## Known technical limitations

- Search has exponential worst-case complexity and is scoped to the small bundled week.
- Performance varies with runtime, hardware, host load, scenario, weights, and search limits.
- The encoded preference weights are illustrative and have not been calibrated through user research.
- The model omits breaks, rest periods, certifications with expiry, role hierarchy, labor cost, demand forecasting, split shifts, leave workflows, and many jurisdiction-specific rules.
- Session state is intentionally ephemeral and cannot be recovered after reset or tab close.
- Synthetic scenarios can cover known branches but cannot represent the diversity or ambiguity of real scheduling operations.
- Accessibility and usability still require testing with representative users and assistive technologies; automated checks alone are insufficient.

## Before any real-world use

Real use would require discovery with managers and staff, jurisdiction-specific legal review, a threat/privacy assessment, authenticated and auditable server-side data, authorization and tenant isolation, a fairness and override policy, representative load testing, accessibility evaluation, integration failure handling, operational monitoring, incident response, and human approval of published schedules.

Those are future validation gates, not implied roadmap promises.
