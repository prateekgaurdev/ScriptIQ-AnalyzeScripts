import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SampleCard from "@/components/SampleCard";
import { getSamples, PIPELINE_NODES } from "@/lib/api";
import { ArrowRight } from "lucide-react";

const Index = () => {
  const [samples, setSamples] = useState<any[]>([]);

  useEffect(() => {
    getSamples().then(setSamples);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="container-editorial relative pb-20 pt-16 md:pt-24">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-8 anim-fade-up">
            <div className="eyebrow">Vol. 01 · Editorial coverage</div>
            <h1 className="font-serif-display mt-6 text-5xl font-medium leading-[1.02] tracking-tight md:text-7xl">
              Read scripts the way an{" "}
              <span className="italic text-accent">editor</span> would.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              ScriptIQ runs a six-stage pipeline powered by Gemini 2.5 Flash over your screenplay —
              emotional arcs, engagement scoring, cliffhanger analysis, and prioritised notes —
              and writes them up like a reader, not a robot.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/analyze"
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:bg-foreground/85"
              >
                Analyse a script <ArrowRight className="h-4 w-4" />
              </Link>
              {samples.length > 0 && (
                <Link
                  to={`/analyze?sample=${samples[0].id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary"
                >
                  Try a sample
                </Link>
              )}
            </div>
          </div>
          <div className="md:col-span-4">
            <div className="hairline-l hidden h-full pl-8 md:block">
              <div className="font-mono-data text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                The dossier
              </div>
              <ul className="mt-4 space-y-4 text-sm leading-relaxed">
                <li>— Emotional arc, beat by beat</li>
                <li>— Six-factor engagement score</li>
                <li>— Cliffhanger effectiveness chart</li>
                <li>— Prioritised, area-tagged notes</li>
                <li>— Markdown &amp; PDF coverage export</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="border-y border-border bg-secondary/40">
        <div className="container-editorial grid gap-0 py-14 md:grid-cols-3">
          {[
            { eyebrow: "01 — Arc", title: "Emotional arc", body: "See how every beat lands. Tension, joy, fear — visualised over the spine of your script." },
            { eyebrow: "02 — Score", title: "Engagement score", body: "Six weighted factors: hook, voice, pacing, conflict, payoff, subtext. One honest number." },
            { eyebrow: "03 — Notes", title: "Prioritised notes", body: "Area-tagged, impact-ranked suggestions. Skip the platitudes. Read the ones that matter." },
          ].map((c, i) => (
            <div
              key={c.title}
              className={`px-6 md:px-10 ${i > 0 ? "md:border-l md:border-border" : ""}`}
            >
              <div className="eyebrow">{c.eyebrow}</div>
              <h3 className="font-serif-display mt-3 text-2xl font-medium">{c.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pipeline */}
      <section className="container-editorial py-16">
        <div className="flex items-end justify-between">
          <div>
            <div className="eyebrow">The pipeline</div>
            <h2 className="font-serif-display mt-2 text-3xl font-medium md:text-4xl">Six readers, in sequence.</h2>
          </div>
          <div className="hidden font-mono-data text-[11px] uppercase tracking-[0.2em] text-muted-foreground md:block">
            LangGraph · stateful
          </div>
        </div>
        <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {PIPELINE_NODES.map((n, i) => (
            <li key={n.id} className="rounded-md border border-border bg-card p-4">
              <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                node {String(i + 1).padStart(2, "0")}
              </div>
              <div className="mt-2 font-serif-display text-lg leading-tight">{n.label}</div>
            </li>
          ))}
        </ol>
      </section>

      {/* Samples */}
      <section className="container-editorial pb-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="eyebrow">Try it on</div>
            <h2 className="font-serif-display mt-2 text-3xl font-medium md:text-4xl">Three samples, three genres.</h2>
          </div>
          <Link to="/analyze" className="text-sm text-foreground/70 underline-offset-4 hover:underline">
            or paste your own →
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {samples.map((s) => (
            <SampleCard key={s.id} sample={s} />
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Index;
