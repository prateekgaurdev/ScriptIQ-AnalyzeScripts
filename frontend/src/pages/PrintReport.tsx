import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { history } from "@/lib/history";

const PrintReport = () => {
  const { id } = useParams();
  const a = id ? history.get(id) : undefined;

  useEffect(() => {
    if (a) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [a]);

  if (!a) {
    return <div className="p-12 font-serif-display text-2xl">No analysis to print.</div>;
  }

  return (
    <div className="bg-background text-foreground">
      <style>{`
        @page { size: A4; margin: 22mm 18mm; }
        body { background: white !important; }
      `}</style>
      <article className="mx-auto max-w-3xl px-10 py-12">
        <header className="border-b border-border pb-6">
          <div className="eyebrow">{a.genre} · ScriptIQ coverage</div>
          <h1 className="font-serif-display mt-3 text-5xl font-medium leading-tight">{a.title}</h1>
          <div className="mt-3 font-mono-data text-xs text-muted-foreground">
            {new Date(a.createdAt).toLocaleString()} · engagement {a.engagementScore.toFixed(1)} / 10 · confidence {(a.confidence * 100).toFixed(0)}%
          </div>
        </header>

        <section className="mt-8">
          <p className="font-serif-display text-xl italic leading-relaxed">"{a.summary}"</p>
        </section>

        <section className="mt-10 grid grid-cols-2 gap-8">
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wider text-success">Strengths</h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              {a.strengths.map((s, i) => <li key={i}>— {s}</li>)}
            </ul>
          </div>
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wider text-accent">Weaknesses</h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              {a.weaknesses.map((s, i) => <li key={i}>— {s}</li>)}
            </ul>
          </div>
        </section>

        <section className="mt-10 print-page">
          <h2 className="font-serif-display text-2xl">Engagement factors</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 font-medium">Factor</th>
                <th className="py-2 text-right font-medium">Score</th>
                <th className="py-2 text-right font-medium">Weight</th>
              </tr>
            </thead>
            <tbody>
              {a.factors.map((f) => (
                <tr key={f.name} className="border-b border-border/60">
                  <td className="py-2">{f.name}<div className="text-xs text-muted-foreground">{f.note}</div></td>
                  <td className="py-2 text-right font-mono-data">{f.score.toFixed(1)}</td>
                  <td className="py-2 text-right font-mono-data">{(f.weight * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-10">
          <h2 className="font-serif-display text-2xl">Suggestions</h2>
          {(["high", "medium", "low"] as const).map((impact) => {
            const items = a.suggestions.filter((s) => s.impact === impact);
            if (!items.length) return null;
            return (
              <div key={impact} className="mt-4">
                <h3 className="text-xs font-medium uppercase tracking-wider">{impact} impact</h3>
                <ul className="mt-2 space-y-2 text-sm">
                  {items.map((s) => (
                    <li key={s.id}>
                      <strong>{s.title}</strong> <span className="text-muted-foreground">({s.area})</span> — {s.detail}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        <section className="mt-10">
          <h2 className="font-serif-display text-2xl">Cliffhangers</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {a.cliffhangers.map((c) => (
              <li key={c.beat}>
                <strong>Beat {c.beat} · {c.scene}</strong> — <em>{c.effectiveness}</em> — {c.rationale}
              </li>
            ))}
          </ul>
        </section>

        <footer className="mt-12 border-t border-border pt-4 text-center font-mono-data text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          ScriptIQ · editorial coverage · vol. 01
        </footer>
      </article>
    </div>
  );
};

export default PrintReport;
