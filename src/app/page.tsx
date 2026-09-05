import Link from "next/link";
import { CASES } from "@/lib/product";

export default function HomePage() {
  return (
    <main className="overview-page page-enter">
      <section className="overview-hero">
        <div className="hero-copy-block">
          <p className="eyebrow cobalt">EXPLAINABLE WORKFORCE PLANNING</p>
          <h1>Build the week.<br /><em>Know why it works.</em></h1>
          <p className="hero-lede">
            Start with a staffing case, set the hard rules, and generate a schedule
            you can inspect or repair—without silently bending a constraint.
          </p>
          <div className="hero-actions">
            <Link className="button primary elevated" href="/planner?case=feasible" data-testid="start-planning">
              Start planning <span aria-hidden="true">→</span>
            </Link>
            <Link className="text-link" href="/scenarios">Preview the cases</Link>
          </div>
        </div>

        <div className="week-preview" aria-label="Illustrative schedule layers">
          <div className="preview-topline"><span>MON 07</span><span>SHIFT COVERAGE</span></div>
          <div className="preview-shift">
            <div><small>07:00</small><b>Breakfast</b></div>
            <span className="coverage-badge good">3 / 3 covered</span>
          </div>
          <div className="timeline-line"><i /><i /><i /><i /></div>
          <div className="preview-people">
            <span className="avatar ochre">AC</span><span className="avatar forest">LM</span><span className="avatar cobalt-bg">MS</span>
            <p><b>Every role has an owner</b><small>Availability, skill and hours checked</small></p>
          </div>
          <div className="preview-proof"><span>0 hard violations</span><span>100% coverage</span></div>
        </div>
      </section>

      <section className="workflow-band" aria-labelledby="workflow-title">
        <div className="section-heading">
          <p className="eyebrow">ONE DECISION AT A TIME</p>
          <h2 id="workflow-title">From staffing question to defensible plan.</h2>
        </div>
        <ol className="workflow-steps">
          <li><span>01</span><div><b>Choose a case</b><p>Begin with a healthy week, a staffing gap, or an absence.</p></div></li>
          <li><span>02</span><div><b>Configure rules</b><p>Review people, roles, availability, and hour limits.</p></div></li>
          <li><span>03</span><div><b>Generate</b><p>Run the baseline and the whole-week preference search.</p></div></li>
          <li><span>04</span><div><b>Inspect &amp; repair</b><p>See reasons, compare outcomes, and test a safe reassignment.</p></div></li>
        </ol>
      </section>

      <section className="case-preview-section">
        <div className="section-heading compact">
          <p className="eyebrow">GUIDED CASES</p>
          <h2>Three questions a manager actually asks.</h2>
        </div>
        <div className="case-preview-grid">
          {CASES.map((item) => (
            <Link className={`case-preview-card elevated ${item.tone}`} href={`/planner?case=${item.id}`} key={item.id}>
              <span className="case-number">{item.number}</span>
              <div><p className="eyebrow">{item.verb}</p><h3>{item.title}</h3><p>{item.summary}</p></div>
              <span className="card-arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="boundary-note">
        <p className="eyebrow">HONEST BOUNDARY</p>
        <p>Harbour &amp; Pine is a fixed synthetic fixture. ShiftCraft demonstrates scheduling logic—not payroll, compliance advice, employee messaging, or real-world deployment.</p>
        <Link href="/evidence">Read the model evidence →</Link>
      </section>
    </main>
  );
}
