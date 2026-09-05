"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePlanner, type ResultWithRecovery } from "@/components/PlannerState";
import { getCase, STRATEGY_COPY, type Strategy } from "@/lib/product";
import type { Assignment, ConstraintViolation, ScheduleInput, ScheduleResult, Shift } from "@/lib/scheduling";
import { validateManualAssignments } from "@/lib/scheduling";

const dateLabel = (date: string) => new Intl.DateTimeFormat("en-CA", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
const skillLabel = (skill: string) => skill.replaceAll("-", " ");

export function ScheduleWorkspace() {
  const { hydrated, scenario, input, result, comparison, generatedAt, isSolving, solve, assign } = usePlanner();
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const validation = useMemo(() => validateManualAssignments(input, result?.assignments ?? []), [input, result]);
  const activeCase = getCase(scenario);
  const selectedShift = input.shifts.find((shift) => shift.id === selectedShiftId) ?? null;

  if (!hydrated) return <div className="route-loading"><span /><p>Restoring the current plan…</p></div>;

  if (!result) {
    return (
      <main className="schedule-empty page-enter">
        <div className="empty-board-art" aria-hidden="true"><span /><span /><span /></div>
        <p className="eyebrow cobalt">SCHEDULE · STEP 2 OF 2</p>
        <h1>No computed schedule yet.</h1>
        <p>Choose a case and confirm its constraints first. ShiftCraft will bring the computed result back here.</p>
        <Link className="button primary elevated" href="/planner">Configure a plan <span>→</span></Link>
      </main>
    );
  }

  return (
    <main className="schedule-page page-enter">
      <header className="schedule-toolbar">
        <div>
          <p className="eyebrow cobalt">SCHEDULE · {activeCase.verb}</p>
          <h1>{activeCase.title}</h1>
          <p>{generatedAt ? `Computed ${new Intl.DateTimeFormat("en-CA", { hour: "numeric", minute: "2-digit" }).format(new Date(generatedAt))}` : "Computed this session"} · Harbour &amp; Pine Café</p>
        </div>
        <div className="toolbar-actions">
          <Link className="button secondary" href={`/planner?case=${scenario}`}>Edit constraints</Link>
          <button className="button primary elevated" type="button" onClick={() => void solve()} disabled={isSolving}>{isSolving ? "Regenerating…" : scenario === "absence" ? "Repair again" : "Regenerate"}</button>
        </div>
      </header>

      {result.status === "infeasible" ? <InfeasibleResult result={result} /> : result.status === "search_limit" ? <SearchLimitResult result={result} /> : (
        <>
          <MetricStrip result={result} violationCount={validation.violations.length} />
          {scenario === "absence" ? <RecoverySummary result={result} input={input} /> : null}
          <div className="schedule-layout">
            <ScheduleBoard input={input} assignments={result.assignments} selectedShiftId={selectedShiftId} onSelect={setSelectedShiftId} />
            <aside className="schedule-inspector" aria-label="Schedule insight panel">
              {selectedShift ? <AssignmentInspector key={selectedShift.id} shift={selectedShift} assignments={result.assignments} input={input} onAssign={(skill, employeeId) => assign(selectedShift.id, skill, employeeId)} onClose={() => setSelectedShiftId(null)} /> : <ScheduleSummary comparison={comparison} />}
            </aside>
          </div>
        </>
      )}
    </main>
  );
}

function MetricStrip({ result, violationCount }: { result: ResultWithRecovery; violationCount: number }) {
  const metrics = [
    { label: "Coverage", value: `${result.metrics.coveragePercent}%`, detail: `${result.metrics.filledCoverage}/${result.metrics.requiredCoverage} roles`, tone: "forest" },
    { label: "Hard violations", value: String(violationCount), detail: violationCount ? "Needs attention" : "All rules hold", tone: violationCount ? "ochre" : "forest" },
    { label: "Preference match", value: `${result.metrics.preferenceSatisfactionPercent}%`, detail: `Score ${result.metrics.preferenceScore}`, tone: "cobalt" },
    { label: "Solve time", value: `${result.diagnostics.solveTimeMs.toFixed(1)} ms`, detail: `${result.diagnostics.nodesVisited} nodes`, tone: "ink" },
  ];
  return <section className="metric-strip" data-testid="metric-strip" aria-label="Schedule metrics">{metrics.map((item) => <article key={item.label}><span>{item.label}</span><strong className={item.tone}>{item.value}</strong><small>{item.detail}</small></article>)}</section>;
}

function RecoverySummary({ result, input }: { result: ResultWithRecovery; input: ScheduleInput }) {
  const names = result.absentEmployeeIds?.map((id) => input.employees.find((employee) => employee.id === id)?.name ?? id).join(", ");
  return <section className="recovery-summary" data-testid="recovery-summary"><span className="recovery-mark">↻</span><div><p className="eyebrow">ABSENCE DIFF</p><h2>{names || "One barista"} removed</h2><p>Still-valid assignments were locked before the solver repaired the uncovered role.</p></div><dl><div><dt>Unchanged</dt><dd>{result.retainedAssignmentCount ?? "—"}</dd></div><div><dt>Disrupted</dt><dd>{result.displacedAssignmentCount ?? "—"}</dd></div></dl></section>;
}

function ScheduleBoard({ input, assignments, selectedShiftId, onSelect }: { input: ScheduleInput; assignments: Assignment[]; selectedShiftId: string | null; onSelect: (id: string) => void }) {
  const people = new Map(input.employees.map((employee) => [employee.id, employee]));
  const dates = [...new Set(input.shifts.map((shift) => shift.date))];
  return (
    <section className="schedule-board" data-testid="schedule-board">
      <header className="board-title"><div><p className="eyebrow">COMPUTED ROSTER</p><h2>Week at a glance</h2></div><div className="coverage-legend"><span><i className="status-dot covered" />Covered</span><span><i className="status-dot attention" />Needs attention</span></div></header>
      <div className="schedule-grid" role="table" aria-label="Computed weekly schedule">
        {dates.map((date) => <section className="day-column" key={date} role="rowgroup"><header><div><span>{dateLabel(date)}</span><small>{input.shifts.filter((shift) => shift.date === date).length} shifts</small></div><i>100%</i></header>{input.shifts.filter((shift) => shift.date === date).map((shift) => {
          const assigned = assignments.filter((item) => item.shiftId === shift.id);
          const required = shift.coverage.reduce((sum, item) => sum + item.count, 0);
          const covered = assigned.length >= required;
          return <button className={`shift-row elevated ${selectedShiftId === shift.id ? "selected" : ""}`} type="button" key={shift.id} onClick={() => onSelect(shift.id)} aria-label={`Inspect ${shift.name}, ${shift.start} to ${shift.end}`}>
            <span className="shift-time"><b>{shift.start}</b><small>{shift.end}</small></span>
            <span className="shift-detail"><b>{shift.name.replace(/^(Monday|Tuesday) /, "")}</b><small className={covered ? "covered-text" : "attention-text"}>{covered ? "All roles covered" : `${required - assigned.length} role open`}</small></span>
            <span className="shift-people">{assigned.map((item) => <i className={`mini-avatar ${item.skill === "keyholder" ? "ochre" : item.skill === "kitchen" ? "cobalt-bg" : "forest"}`} key={`${item.employeeId}-${item.skill}`} title={`${people.get(item.employeeId)?.name}, ${skillLabel(item.skill)}`}>{people.get(item.employeeId)?.name.split(" ").map((part) => part[0]).join("")}</i>)}</span>
            <span className="shift-arrow" aria-hidden="true">→</span>
          </button>;
        })}</section>)}
      </div>
      <p className="board-hint">Select a shift to see role eligibility and test a validated reassignment.</p>
    </section>
  );
}

function ScheduleSummary({ comparison }: { comparison: Partial<Record<Strategy, ScheduleResult>> }) {
  return <div className="inspector-summary"><p className="eyebrow cobalt">WHY THIS WORKS</p><h2>Every hard rule holds.</h2><p>Coverage, availability, role skill, overlap, and weekly-hour limits were checked before preferences influenced the result.</p><div className="rule-stack"><span><i>✓</i> Required coverage filled</span><span><i>✓</i> Only qualified people assigned</span><span><i>✓</i> No overlaps or hour overruns</span></div><div className="comparison-card" data-testid="algorithm-comparison"><header><p className="eyebrow">BASELINE COMPARISON</p><span>Same inputs</span></header>{(["greedy", "branch-and-bound"] as Strategy[]).map((key) => { const item = comparison[key]; return item ? <div className="comparison-line" key={key}><span><b>{STRATEGY_COPY[key].label}</b><small>{item.status}</small></span><span><b>{item.metrics.preferenceSatisfactionPercent}%</b><small>preference</small></span></div> : null; })}</div><p className="inspector-prompt"><span>↖</span>Select a shift to inspect who is eligible and why.</p></div>;
}

function AssignmentInspector({ shift, assignments, input, onAssign, onClose }: { shift: Shift; assignments: Assignment[]; input: ScheduleInput; onAssign: (skill: string, employeeId: string) => { ok: boolean; message: string }; onClose: () => void }) {
  const [skill, setSkill] = useState(shift.coverage[0]?.skill ?? "");
  const [feedback, setFeedback] = useState("Hard rules are blocking; preferences never make someone ineligible.");
  const target = assignments.find((item) => item.shiftId === shift.id && item.skill === skill);
  const blockers = (employeeId: string): ConstraintViolation[] => {
    const next = target ? assignments.map((item) => item === target ? { ...item, employeeId } : item) : [...assignments, { employeeId, shiftId: shift.id, skill }];
    return validateManualAssignments(input, next).violations.filter((item) => item.employeeId === employeeId);
  };
  function attempt(employeeId: string) {
    const outcome = onAssign(skill, employeeId);
    setFeedback(outcome.message);
  }
  return <div className="assignment-inspector" data-testid="assignment-drawer"><header><div><p className="eyebrow cobalt">SHIFT INSPECTOR</p><h2>{shift.name}</h2><span>{dateLabel(shift.date)} · {shift.start}–{shift.end}</span></div><button type="button" onClick={onClose} aria-label="Close shift inspector">×</button></header><div className="role-picker" aria-label="Coverage role">{shift.coverage.map((requirement) => <button type="button" key={requirement.skill} className={skill === requirement.skill ? "active" : ""} onClick={() => setSkill(requirement.skill)} data-testid={`role-option-${requirement.skill}`}>{skillLabel(requirement.skill)} <span>{requirement.count}</span></button>)}</div><p className="validation-feedback" aria-live="polite"><i>◆</i>{feedback}</p><div className="candidate-list"><p className="eyebrow">ELIGIBILITY</p>{input.employees.map((employee) => { const violations = blockers(employee.id); const isAssigned = target?.employeeId === employee.id; return <button type="button" key={employee.id} disabled={isAssigned} aria-disabled={Boolean(violations.length)} onClick={() => attempt(employee.id)} data-testid={`candidate-${employee.id}`}><i className="candidate-avatar">{employee.name.split(" ").map((part) => part[0]).join("")}</i><span><b>{employee.name}</b><small>{employee.skills.map(skillLabel).join(" · ")}</small></span><span className={violations.length ? "blocked" : "eligible"}>{isAssigned ? "Assigned" : violations[0]?.message ?? "Eligible →"}</span></button>; })}</div></div>;
}

function InfeasibleResult({ result }: { result: Extract<ScheduleResult, { status: "infeasible" }> }) {
  return <section className="infeasible-result" data-testid="infeasible-result"><div className="conflict-intro"><span className="conflict-mark">!</span><div><p className="eyebrow ochre-text">NO VALID SCHEDULE</p><h2>The requirements conflict.</h2><p>The solver kept every hard rule intact and returned the exact staffing gap instead.</p></div></div><div className="conflict-reasons"><p className="eyebrow">WHAT BLOCKED THE PLAN</p>{result.reasons.map((reason, index) => <article key={`${reason.code}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{reason.message}</b><small>{reason.code.replaceAll("_", " ").toLowerCase()}</small></div></article>)}</div><div className="repair-panel"><p className="eyebrow">MANAGER-OWNED REPAIR</p><h3>Choose a policy change; the model will not invent one.</h3><ul><li>Extend a qualified keyholder’s availability.</li><li>Reduce the opening requirement.</li><li>Add a trained relief worker.</li></ul><Link className="button primary elevated" href="/planner?case=infeasible">Edit constraints <span>→</span></Link></div></section>;
}

function SearchLimitResult({ result }: { result: Extract<ScheduleResult, { status: "search_limit" }> }) {
  return <section className="infeasible-result"><div className="conflict-intro"><span className="conflict-mark">?</span><div><p className="eyebrow ochre-text">SEARCH LIMIT REACHED</p><h2>Outcome still unknown.</h2><p>{result.message}</p></div></div><div className="repair-panel"><p>The engine will not label a bounded search as infeasible or optimal. It evaluated {result.diagnostics.nodesVisited} nodes.</p><Link className="button primary" href="/planner">Review the plan</Link></div></section>;
}
