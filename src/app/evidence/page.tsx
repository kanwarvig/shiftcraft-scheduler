import Link from "next/link";

const hardRules = [
  ["Coverage", "Every required role is filled exactly to demand."],
  ["Availability", "A person can only work inside a declared time window."],
  ["Role skill", "The assigned person must hold the required role skill."],
  ["No overlap", "One person cannot cover overlapping shifts."],
  ["Weekly hours", "Assignments cannot exceed a person’s blocking maximum."],
];

export default function EvidencePage() {
  return (
    <main className="evidence-page page-enter">
      <header className="route-heading wide evidence-heading">
        <div><p className="eyebrow cobalt">MODEL &amp; EVIDENCE</p><h1>What the demo proves—and what it doesn’t.</h1></div>
        <p>ShiftCraft keeps computation, model boundaries, and uncertainty visible so the schedule can be judged on evidence rather than polish.</p>
      </header>
      <section className="evidence-grid">
        <article className="evidence-feature dark"><p className="eyebrow">COMPUTED, NOT STAGED</p><h2>Every displayed roster is generated at request time.</h2><p>The bundled fixture contains people, demand, availability, skills, limits, and preferences—never assignments. The validated API calls the deterministic solver for every run.</p><Link href="/planner?case=feasible">Run the fixture →</Link></article>
        <article className="evidence-feature warm"><p className="eyebrow">HARD RULES</p><h2>Preferences optimize only after feasibility.</h2><div className="hard-rule-list">{hardRules.map(([name, detail]) => <div key={name}><span>✓</span><p><b>{name}</b><small>{detail}</small></p></div>)}</div></article>
        <article className="evidence-feature metric-definition"><p className="eyebrow">METRIC DEFINITIONS</p><h2>Read the scorecard correctly.</h2><dl><div><dt>Coverage</dt><dd>Filled required role slots ÷ all required role slots.</dd></div><div><dt>Preference match</dt><dd>Achieved weighted preference score relative to the fixture’s positive opportunity.</dd></div><div><dt>Disruption</dt><dd>Prior non-absent assignments that moved or changed role during repair.</dd></div><div><dt>Solve time</dt><dd>Measured solver execution for this deterministic fixture—not a scale benchmark.</dd></div></dl></article>
        <article className="evidence-feature boundary"><p className="eyebrow">HONEST BOUNDARY</p><h2>This is a scheduling lab, not a workforce system.</h2><p>All names, shifts, availability, preferences, and scenarios are synthetic. There is no payroll, time clock, compliance advice, authentication, calendar connection, messaging, or real-user validation.</p><div className="boundary-tags"><span>Synthetic café data</span><span>Session-only state</span><span>No external integrations</span></div></article>
      </section>
      <section className="evidence-cta"><div><p className="eyebrow">SEE THE MODEL RESPOND</p><h2>Change one hard limit, then compare both strategies.</h2></div><Link className="button primary elevated" href="/planner">Configure a plan <span>→</span></Link></section>
    </main>
  );
}
