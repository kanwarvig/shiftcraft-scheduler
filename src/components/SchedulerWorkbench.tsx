"use client";

import { useMemo, useState } from "react";
import type { Assignment, ConstraintViolation, ScheduleInput, ScheduleResult } from "@/lib/scheduling";
import { validateManualAssignments } from "@/lib/scheduling";
import { createScenarioInput, type ScenarioId } from "@/lib/scenario";
import { isScheduleSuccess, type ScheduleResponse } from "@/lib/api/contracts";

type Strategy = "greedy" | "branch-and-bound";
type ResultWithRecovery = ScheduleResult & {
  retainedAssignmentCount?: number;
  displacedAssignmentCount?: number;
  absentEmployeeIds?: string[];
};

const scenarios: Array<{ id: ScenarioId; eyebrow: string; title: string; summary: string }> = [
  { id: "feasible", eyebrow: "01 · PLAN", title: "Rush week", summary: "A complete week with a tight mix of barista and keyholder coverage." },
  { id: "infeasible", eyebrow: "02 · EXPLAIN", title: "Keyholder gap", summary: "A required opening role has no qualified, available person." },
  { id: "absence", eyebrow: "03 · REPAIR", title: "Barista calls out", summary: "Keep valid work in place and move only what the absence breaks." },
];

const strategyCopy: Record<Strategy, { label: string; detail: string }> = {
  greedy: { label: "Greedy baseline", detail: "Best local option, slot by slot." },
  "branch-and-bound": { label: "Preference search", detail: "Whole-week search with pruning." },
};

async function requestSchedule(scenario: ScenarioId, strategy: Strategy, input: ScheduleInput, currentAssignments?: Assignment[]) {
  const response = await fetch("/api/schedule", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenario, strategy, input, currentAssignments }),
  });
  const payload = (await response.json()) as ScheduleResponse;
  if (!response.ok || !isScheduleSuccess(payload)) {
    throw new Error("error" in payload ? payload.error.message : "Schedule request failed.");
  }
  return payload.data;
}

const dateLabel = (date: string) => new Intl.DateTimeFormat("en-CA", {
  weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
}).format(new Date(`${date}T12:00:00Z`));
const skillLabel = (skill: string) => skill.replaceAll("-", " ");

export function SchedulerWorkbench() {
  const [scenario, setScenario] = useState<ScenarioId>("feasible");
  const [strategy, setStrategy] = useState<Strategy>("branch-and-bound");
  const [result, setResult] = useState<ResultWithRecovery | null>(null);
  const [comparison, setComparison] = useState<Partial<Record<Strategy, ScheduleResult>>>({});
  const [isSolving, setIsSolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState<ScheduleInput | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("avery");
  const [announcement, setAnnouncement] = useState("Choose a scenario and run the scheduler.");

  const scenarioInput = useMemo(() => createScenarioInput(scenario), [scenario]);
  const input = customInput ?? scenarioInput;
  const employeeMap = useMemo(() => new Map(input.employees.map((employee) => [employee.id, employee])), [input]);
  const assignments = useMemo(() => result?.assignments ?? [], [result]);
  const validation = useMemo(() => validateManualAssignments(input, assignments), [assignments, input]);

  async function solve() {
    setIsSolving(true);
    setError(null);
    setSelectedShiftId(null);
    try {
      const current = result?.status === "feasible" ? result.assignments : undefined;
      const [greedy, search] = await Promise.all([
        requestSchedule(scenario, "greedy", input, current),
        requestSchedule(scenario, "branch-and-bound", input, current),
      ]);
      const selected = strategy === "greedy" ? greedy : search;
      setResult(selected);
      setComparison({ greedy, "branch-and-bound": search });
      setAnnouncement(selected.status === "feasible"
        ? `Schedule ready with ${selected.metrics.coveragePercent}% coverage.`
        : selected.status === "infeasible"
          ? `No valid schedule. ${selected.reasons[0]?.message ?? "Review the conflicts."}`
          : selected.message);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to run scheduler.";
      setError(message);
      setAnnouncement(message);
    } finally {
      setIsSolving(false);
    }
  }

  function changeScenario(next: ScenarioId) {
    setScenario(next); setCustomInput(null); setResult(null); setComparison({}); setSelectedShiftId(null); setError(null);
    setAnnouncement(`${scenarios.find((item) => item.id === next)?.title} loaded.`);
  }

  function resetDemo() {
    setScenario("feasible"); setStrategy("branch-and-bound"); setCustomInput(null); setResult(null); setComparison({});
    setSelectedShiftId(null); setAnnouncement("Demo reset. Rush week is ready to solve.");
  }

  function attemptAssignment(employeeId: string, skill: string) {
    if (!result || !selectedShiftId) return;
    const shift = input.shifts.find((item) => item.id === selectedShiftId);
    const target = result.assignments.find((item) => item.shiftId === selectedShiftId && item.skill === skill);
    if (!shift) return;
    const next = target
      ? result.assignments.map((item) => item === target ? { ...item, employeeId } : item)
      : [...result.assignments, { employeeId, shiftId: shift.id, skill }];
    const checked = validateManualAssignments(input, next);
    if (!checked.isValid) {
      setAnnouncement(checked.violations.find((item) => item.employeeId === employeeId)?.message ?? "That edit breaks a hard constraint.");
      return;
    }
    setResult({ ...result, status: "feasible", assignments: next, metrics: checked.metrics });
    setAnnouncement(`${employeeMap.get(employeeId)?.name} assigned to ${shift.name}.`);
  }

  const selectedShift = input.shifts.find((shift) => shift.id === selectedShiftId);
  const selectedEmployee = input.employees.find((employee) => employee.id === selectedEmployeeId) ?? input.employees[0];
  const dates = [...new Set(input.shifts.map((shift) => shift.date))];

  return (
    <main className="app-shell" id="top">
      <p className="sr-only" aria-live="polite">{announcement}</p>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Shiftcraft home"><span className="brand-mark">SC</span><span>Shiftcraft</span></a>
        <div className="header-context"><span className="fixture-chip">SYNTHETIC OPERATIONS LAB</span><span>Harbour &amp; Pine Café · Sep 7–8</span></div>
        <button className="text-button" type="button" onClick={resetDemo}>Reset demo</button>
      </header>

      <section className="hero">
        <div><p className="kicker">DECISION SUPPORT / STAFFING</p><h1>A schedule that can<br /><em>explain itself.</em></h1></div>
        <div className="hero-copy">
          <p>Fill every café role without bending availability, skills, or weekly-hour limits—then see exactly where the trade-offs land.</p>
          <div className="legend"><span><i className="dot hard" /> Hard constraints must hold</span><span><i className="dot soft" /> Preferences are optimized</span></div>
        </div>
      </section>

      <div className="workspace">
        <aside className="scenario-rail" aria-label="Guided scenarios">
          <div className="rail-heading"><span>GUIDED CASES</span><span>LOAD → SOLVE → INSPECT</span></div>
          {scenarios.map((item) => (
            <button className={`scenario-card ${scenario === item.id ? "active" : ""}`} key={item.id} type="button"
              onClick={() => changeScenario(item.id)} aria-pressed={scenario === item.id} data-testid={`scenario-${item.id}`}>
              <span className="scenario-index">{item.eyebrow}</span><strong>{item.title}</strong><span>{item.summary}</span><b>↗</b>
            </button>
          ))}
          <div className="constraint-note"><span className="eyebrow">MODEL BOUNDARY</span><p><b>Hard:</b> coverage, availability, role skills, overlap, max hours.</p><p><b>Soft:</b> weighted shift preferences.</p></div>
          <div className="input-editor" data-testid="input-editor">
            <span className="eyebrow">CONFIGURE INPUT</span>
            <label><span>Staff member</span><select value={selectedEmployee?.id} onChange={(event) => setSelectedEmployeeId(event.target.value)}>{input.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
            <label><span>Maximum weekly hours</span><input aria-label="Maximum weekly hours" type="number" min="1" max="168" value={selectedEmployee?.maxWeeklyHours ?? 1} onChange={(event) => {
              const maxWeeklyHours = Number(event.target.value);
              setCustomInput({ ...input, employees: input.employees.map((employee) => employee.id === selectedEmployee?.id ? { ...employee, maxWeeklyHours } : employee) });
              setResult(null); setComparison({});
            }} /></label>
            <p>Change a real hard constraint, then solve again. The full typed model is also accepted by the API.</p>
          </div>
        </aside>

        <section className="decision-panel">
          <div className="control-deck">
            <div><span className="eyebrow">ACTIVE CASE</span><h2>{scenarios.find((item) => item.id === scenario)?.title}</h2></div>
            <label className="strategy-select"><span>ALGORITHM</span><select value={strategy} onChange={(event) => setStrategy(event.target.value as Strategy)}>
              <option value="branch-and-bound">Preference search</option><option value="greedy">Greedy baseline</option>
            </select></label>
            <button className="solve-button" type="button" onClick={solve} disabled={isSolving} data-testid="solve-button">
              <span>{isSolving ? "Computing…" : scenario === "absence" ? "Repair schedule" : "Generate schedule"}</span><b>→</b>
            </button>
          </div>
          <div className="run-meta"><span>DETERMINISTIC FIXTURE V1</span><span>{input.employees.length} PEOPLE</span><span>{input.shifts.length} SHIFTS</span><span>SESSION ONLY</span></div>
          {error ? <div className="error-banner" role="alert">{error}</div> : null}
          {!result ? <EmptyState scenario={scenario} /> : result.status === "infeasible" ? <InfeasibleState result={result} /> : result.status === "search_limit" ? <SearchLimitState result={result} /> : <>
            <MetricStrip result={result} validationCount={validation.violations.length} />
            {scenario === "absence" ? <RecoveryBanner result={result} employeeMap={employeeMap} /> : null}
            <ScheduleBoard dates={dates} input={input} assignments={assignments} selectedShiftId={selectedShiftId} onSelectShift={setSelectedShiftId} />
          </>}
          {Object.keys(comparison).length ? <ComparisonTable comparison={comparison} /> : null}
        </section>
      </div>

      {selectedShift && result?.status === "feasible" ? <AssignmentDrawer shift={selectedShift} assignments={assignments} input={input} onAssign={attemptAssignment} onClose={() => setSelectedShiftId(null)} /> : null}

      <footer className="evidence-footer">
        <div><span className="eyebrow">WHAT THIS PROVES</span><p>Every displayed schedule is computed from the fixture at request time. The stronger search never relaxes a hard rule.</p></div>
        <div><span className="eyebrow">HONEST BOUNDARY</span><p>Synthetic café data; session-only edits. No payroll, routing, calendar integration, or real-user validation is claimed.</p></div>
        <a href="https://github.com/kanwarvig/shiftcraft-scheduler" target="_blank" rel="noreferrer">SOURCE &amp; MODEL NOTES ↗</a>
      </footer>
    </main>
  );
}

function EmptyState({ scenario }: { scenario: ScenarioId }) {
  const copy = { feasible: ["Can every role be covered?", "Compare a quick greedy pass with a search that weighs the whole week."], infeasible: ["What makes this impossible?", "The solver stops instead of quietly violating a rule, then names the staffing conflict."], absence: ["How little needs to move?", "Remove one scheduled barista and repair only what the call-out affects."] }[scenario];
  return <div className="empty-state" data-testid="empty-state"><div className="empty-glyph"><span /><span /><span /></div><span className="eyebrow">READY TO COMPUTE</span><h3>{copy[0]}</h3><p>{copy[1]}</p></div>;
}

function MetricStrip({ result, validationCount }: { result: ResultWithRecovery; validationCount: number }) {
  const items = [["Coverage", `${result.metrics.coveragePercent}%`, `${result.metrics.filledCoverage}/${result.metrics.requiredCoverage} required roles`], ["Hard violations", String(validationCount), validationCount ? "Needs attention" : "All rules hold"], ["Preference match", `${result.metrics.preferenceSatisfactionPercent}%`, `weighted score ${result.metrics.preferenceScore}`], ["Solve time", `${result.diagnostics.solveTimeMs?.toFixed(1) ?? "—"} ms`, `${result.diagnostics.nodesVisited} search nodes`]];
  return <div className="metric-strip" data-testid="metric-strip">{items.map(([label, value, detail]) => <div key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>)}</div>;
}

function InfeasibleState({ result }: { result: Extract<ScheduleResult, { status: "infeasible" }> }) {
  return <div className="infeasible-state" data-testid="infeasible-result"><div className="conflict-symbol">!</div><div><span className="eyebrow">NO VALID SCHEDULE</span><h3>The requirements conflict.</h3><p>The engine left the rule intact and returned a concrete explanation.</p></div><div className="reason-list">{result.reasons.map((reason, index) => <article key={`${reason.code}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{reason.message}</strong><small>{reason.code.replaceAll("_", " ")}</small></div></article>)}</div><div className="repair-ideas"><span className="eyebrow">MANAGER DECISION</span><p>Extend a qualified keyholder&apos;s availability, reduce the requirement, or add a trained relief worker. Shiftcraft will not choose a policy exception for you.</p></div></div>;
}

function SearchLimitState({ result }: { result: Extract<ScheduleResult, { status: "search_limit" }> }) {
  return <div className="infeasible-state"><div className="conflict-symbol">?</div><div><span className="eyebrow">SEARCH PAUSED</span><h3>Outcome still unknown.</h3><p>{result.message}</p></div><div className="reason-list"><article><span>01</span><div><strong>The engine will not label a bounded search as infeasible or optimal.</strong><small>{result.diagnostics.nodesVisited} nodes evaluated</small></div></article></div></div>;
}

function RecoveryBanner({ result, employeeMap }: { result: ResultWithRecovery; employeeMap: Map<string, { name: string }> }) {
  const names = result.absentEmployeeIds?.map((id) => employeeMap.get(id)?.name ?? id).join(", ");
  return <div className="recovery-banner" data-testid="recovery-summary"><span className="recovery-icon">↻</span><div><strong>{names || "One barista"} removed</strong><p>Valid assignments were locked before repair.</p></div><div><b>{result.retainedAssignmentCount ?? "—"}</b><span>unchanged</span></div><div><b>{result.displacedAssignmentCount ?? "—"}</b><span>disrupted</span></div></div>;
}

function ScheduleBoard({ dates, input, assignments, selectedShiftId, onSelectShift }: { dates: string[]; input: ReturnType<typeof createScenarioInput>; assignments: Assignment[]; selectedShiftId: string | null; onSelectShift: (id: string) => void }) {
  const people = new Map(input.employees.map((employee) => [employee.id, employee]));
  return <div className="board-wrap" data-testid="schedule-board"><div className="board-heading"><div><span className="eyebrow">COMPUTED ROSTER</span><h3>Week at a glance</h3></div><p>Select any shift to test a manual reassignment against every hard rule.</p></div><div className="schedule-grid" role="table" aria-label="Computed weekly schedule">{dates.map((date) => <section className="day-column" key={date} role="rowgroup"><header><span>{dateLabel(date)}</span></header>{input.shifts.filter((shift) => shift.date === date).map((shift) => {
    const assigned = assignments.filter((item) => item.shiftId === shift.id); const required = shift.coverage.reduce((sum, item) => sum + item.count, 0);
    return <button type="button" className={`shift-card ${selectedShiftId === shift.id ? "selected" : ""} ${assigned.length < required ? "open" : ""}`} key={shift.id} onClick={() => onSelectShift(shift.id)} aria-label={`Edit ${shift.name}, ${shift.start} to ${shift.end}`}><span className="shift-time">{shift.start}–{shift.end}</span><strong>{shift.name}</strong><span className="coverage-line">{assigned.length}/{required} roles filled</span><span className="assignee-stack">{assigned.map((item) => <span key={`${item.employeeId}-${item.skill}`}><i>{people.get(item.employeeId)?.name.split(" ").map((part) => part[0]).join("")}</i><span><b>{people.get(item.employeeId)?.name}</b><small>{skillLabel(item.skill)}</small></span></span>)}{assigned.length < required ? <em>+ {required - assigned.length} open</em> : null}</span></button>;
  })}</section>)}</div></div>;
}

function ComparisonTable({ comparison }: { comparison: Partial<Record<Strategy, ScheduleResult>> }) {
  return <section className="comparison" data-testid="algorithm-comparison"><div className="board-heading"><div><span className="eyebrow">ALGORITHM EVIDENCE</span><h3>Baseline vs. search</h3></div><p>Same people and rules. Only the decision strategy changes.</p></div><div className="comparison-table" role="table"><div className="comparison-row header"><span>Strategy</span><span>Result</span><span>Coverage</span><span>Preference</span><span>Time</span></div>{(["greedy", "branch-and-bound"] as Strategy[]).map((key) => { const item = comparison[key]; return item ? <div className="comparison-row" key={key}><span><strong>{strategyCopy[key].label}</strong><small>{strategyCopy[key].detail}</small></span><span><i className={`status-pill ${item.status}`}>{item.status}</i></span><span>{item.metrics.coveragePercent}%</span><span>{item.metrics.preferenceSatisfactionPercent}%</span><span>{item.diagnostics.solveTimeMs?.toFixed(1) ?? "—"} ms</span></div> : null; })}</div></section>;
}

function AssignmentDrawer({ shift, assignments, input, onAssign, onClose }: { shift: ReturnType<typeof createScenarioInput>["shifts"][number]; assignments: Assignment[]; input: ReturnType<typeof createScenarioInput>; onAssign: (id: string, skill: string) => void; onClose: () => void }) {
  const [skill, setSkill] = useState(shift.coverage[0]?.skill ?? "");
  const target = assignments.find((item) => item.shiftId === shift.id && item.skill === skill);
  const blockers = (employeeId: string): ConstraintViolation[] => { const next = target ? assignments.map((item) => item === target ? { ...item, employeeId } : item) : [...assignments, { employeeId, shiftId: shift.id, skill }]; return validateManualAssignments(input, next).violations.filter((item) => item.employeeId === employeeId); };
  return <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="assignment-drawer" aria-label="Manual assignment validator" data-testid="assignment-drawer"><header><div><span className="eyebrow">LIVE VALIDATION</span><h3>{shift.name}</h3><p>{dateLabel(shift.date)} · {shift.start}–{shift.end}</p></div><button type="button" onClick={onClose} aria-label="Close assignment panel">×</button></header><div className="role-picker" aria-label="Coverage role">{shift.coverage.map((requirement) => <button type="button" key={requirement.skill} className={skill === requirement.skill ? "active" : ""} onClick={() => setSkill(requirement.skill)} data-testid={`role-option-${requirement.skill}`}>{skillLabel(requirement.skill)} · {requirement.count}</button>)}</div><div className="rule-callout"><i className="dot hard" /><p><b>Hard rules are blocking.</b> Preference penalties never make someone ineligible.</p></div><div className="candidate-list">{input.employees.map((employee) => { const violations = blockers(employee.id); const isAssigned = target?.employeeId === employee.id; return <button type="button" key={employee.id} disabled={isAssigned} aria-disabled={Boolean(violations.length)} onClick={() => onAssign(employee.id, skill)} data-testid={`candidate-${employee.id}`}><i>{employee.name.split(" ").map((part) => part[0]).join("")}</i><span><strong>{employee.name}</strong><small>{employee.skills.map(skillLabel).join(" · ")}</small></span><span className={violations.length ? "blocked" : "eligible"}>{isAssigned ? "Assigned" : violations[0]?.message ?? "Eligible →"}</span></button>; })}</div><footer>Choose a specific coverage role. Edits live only for this browser session.</footer></aside></div>;
}
