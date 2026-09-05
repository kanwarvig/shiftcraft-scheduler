import Link from "next/link";
import { CASES } from "@/lib/product";

export default function ScenariosPage() {
  return (
    <main className="cases-page page-enter">
      <header className="route-heading wide">
        <div><p className="eyebrow cobalt">GUIDED CASES</p><h1>Learn the model through decisions.</h1></div>
        <p>Each case isolates a different operating question. Nothing is precomputed: choosing one loads its inputs, and generating calls the real solver.</p>
      </header>
      <section className="case-stories">
        {CASES.map((item, index) => (
          <article className={`case-story ${item.tone}`} key={item.id}>
            <div className="case-story-index"><span>{item.number}</span><i /></div>
            <div className="case-story-copy"><p className="eyebrow">{item.verb}</p><h2>{item.title}</h2><p>{item.summary}</p></div>
            <div className="case-story-question"><small>QUESTION</small><b>{item.question}</b><small>YOU’LL INSPECT</small><p>{item.outcome}</p></div>
            <Link className={`button ${index === 0 ? "primary" : "secondary"} elevated`} href={`/planner?case=${item.id}`}>Open case <span>→</span></Link>
          </article>
        ))}
      </section>
      <section className="case-path-note"><p className="eyebrow">THE SAME WORKFLOW, THREE OUTCOMES</p><div><span>Choose case</span><i>→</i><span>Confirm rules</span><i>→</i><span>Generate</span><i>→</i><span>Inspect why</span></div></section>
    </main>
  );
}
