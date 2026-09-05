"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePlanner } from "@/components/PlannerState";
import { CASES, getCase, STRATEGY_COPY, type Strategy } from "@/lib/product";
import type { ScenarioId } from "@/lib/scenario";

const scenarioIds: ScenarioId[] = ["feasible", "infeasible", "absence"];

export function PlannerWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { scenario, strategy, input, hydrated, isSolving, error, selectScenario, setStrategy, setEmployeeHours, solve } = usePlanner();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("avery");
  const selectedEmployee = input.employees.find((employee) => employee.id === selectedEmployeeId) ?? input.employees[0];
  const activeCase = getCase(scenario);
  const requestedCase = searchParams.get("case") as ScenarioId | null;

  useEffect(() => {
    if (hydrated && requestedCase && scenarioIds.includes(requestedCase) && requestedCase !== scenario) selectScenario(requestedCase);
  }, [hydrated, requestedCase, scenario, selectScenario]);

  async function generate() {
    const ok = await solve();
    if (ok) router.push("/schedule");
  }

  if (!hydrated) return <div className="route-loading"><span /><p>Restoring this browser session…</p></div>;

  return (
    <main className="planner-page page-enter">
      <header className="route-heading">
        <div><p className="eyebrow cobalt">PLAN · STEP 1 OF 2</p><h1>Set the rules for the week.</h1></div>
        <p>Choose a case, confirm one meaningful constraint, then let the solver do the heavy lifting.</p>
      </header>

      <div className="planner-layout">
        <section className="planner-main" aria-label="Schedule configuration">
          <div className="panel-heading"><span className="step-dot">1</span><div><p className="eyebrow">CHOOSE A CASE</p><h2>What needs a decision?</h2></div></div>
          <div className="case-picker" role="radiogroup" aria-label="Scheduling case">
            {CASES.map((item) => (
              <button key={item.id} className={`case-choice elevated ${scenario === item.id ? "selected" : ""}`} type="button" role="radio" aria-checked={scenario === item.id} onClick={() => selectScenario(item.id)} data-testid={`scenario-${item.id}`}>
                <span>{item.number}</span><div><small>{item.verb}</small><b>{item.title}</b><p>{item.summary}</p></div><i aria-hidden="true">{scenario === item.id ? "●" : "○"}</i>
              </button>
            ))}
          </div>

          <div className="configuration-panel" data-testid="input-editor">
            <div className="panel-heading"><span className="step-dot">2</span><div><p className="eyebrow">CONFIGURE CONSTRAINTS</p><h2>Confirm the operating limits.</h2></div></div>
            <div className="constraint-summary">
              <article><span className="constraint-icon">✓</span><div><b>Coverage &amp; skills</b><p>{input.shifts.length} shifts · roles require barista, register, kitchen, or keyholder skills.</p></div></article>
              <article><span className="constraint-icon">◷</span><div><b>Availability &amp; overlap</b><p>Assignments must sit inside availability and cannot overlap.</p></div></article>
              <article><span className="constraint-icon">↥</span><div><b>Weekly hours</b><p>Each person has a blocking weekly maximum you can test below.</p></div></article>
            </div>
            <div className="hours-editor">
              <label><span>Staff member</span><select value={selectedEmployee?.id} onChange={(event) => setSelectedEmployeeId(event.target.value)}>{input.employees.map((employee) => <option value={employee.id} key={employee.id}>{employee.name}</option>)}</select></label>
              <label><span>Maximum weekly hours</span><div className="number-field"><input aria-label="Maximum weekly hours" type="number" min="1" max="168" value={selectedEmployee?.maxWeeklyHours ?? 1} onChange={(event) => setEmployeeHours(selectedEmployee?.id ?? "", Number(event.target.value))} /><small>HRS</small></div></label>
              <div className="employee-skills"><span>Eligible roles</span><div>{selectedEmployee?.skills.map((skill) => <i key={skill}>{skill.replaceAll("-", " ")}</i>)}</div></div>
            </div>
          </div>
        </section>

        <aside className="run-card">
          <div className={`run-card-accent ${activeCase.tone}`} />
          <p className="eyebrow">READY TO GENERATE</p>
          <h2>{activeCase.title}</h2>
          <p className="run-question">{activeCase.question}</p>
          <dl><div><dt>People</dt><dd>{input.employees.length}</dd></div><div><dt>Shifts</dt><dd>{input.shifts.length}</dd></div><div><dt>Fixture</dt><dd>V1</dd></div></dl>
          <label className="strategy-control"><span>Decision strategy</span><select value={strategy} onChange={(event) => setStrategy(event.target.value as Strategy)}>{(Object.keys(STRATEGY_COPY) as Strategy[]).reverse().map((key) => <option key={key} value={key}>{STRATEGY_COPY[key].label}</option>)}</select><small>{STRATEGY_COPY[strategy].detail}</small></label>
          {error ? <div className="error-callout" role="alert"><b>Couldn’t generate</b><span>{error}</span></div> : null}
          <button className="button primary elevated generate-button" type="button" onClick={generate} disabled={isSolving} data-testid="solve-button">
            <span>{isSolving ? (scenario === "absence" ? "Repairing schedule…" : "Generating schedule…") : (scenario === "absence" ? "Repair schedule" : "Generate schedule")}</span>
            <i aria-hidden="true">{isSolving ? "···" : "→"}</i>
          </button>
          <p className="session-note"><span>●</span> Results stay in this browser tab only.</p>
        </aside>
      </div>

      {isSolving ? <div className="solving-overlay" role="status" data-testid="solving-state"><div className="solver-orbit"><i /><i /><i /></div><p>{scenario === "absence" ? "Locking valid work and repairing gaps" : "Checking coverage, skills, hours, then preferences"}</p></div> : null}
    </main>
  );
}
