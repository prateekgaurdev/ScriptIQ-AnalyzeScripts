import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import EmotionalArcChart from "@/components/EmotionalArcChart";
import EngagementRadar from "@/components/EngagementRadar";
import ScriptReader from "@/components/ScriptReader";
import { history } from "@/lib/history";
import type { Analysis } from "@/lib/api";
import { downloadMarkdown, openPrintReport } from "@/lib/export";
import { cn } from "@/lib/utils";
import { Download, FileDown, Pencil, RefreshCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

const IMPACT_BADGE: Record<string, string> = {
  high: "bg-accent/15 text-accent",
  medium: "bg-warning/15 text-warning-foreground",
  low: "bg-muted text-muted-foreground",
};
const EFF_BADGE: Record<string, string> = {
  strong: "bg-success/15 text-success",
  moderate: "bg-warning/15 text-warning-foreground",
  weak: "bg-muted text-muted-foreground",
};

const Results = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [a, setA] = useState<Analysis | undefined>(() => (id ? history.get(id) : undefined));
  const [showReader, setShowReader] = useState(true);

  useEffect(() => {
    if (id) setA(history.get(id));
  }, [id]);

  const grouped = useMemo(() => {
    if (!a) return { high: [], medium: [], low: [] };
    return {
      high: a.suggestions.filter((s) => s.impact === "high"),
      medium: a.suggestions.filter((s) => s.impact === "medium"),
      low: a.suggestions.filter((s) => s.impact === "low"),
    };
  }, [a]);

  if (!a) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container-editorial py-24 text-center">
          <div className="eyebrow justify-center">Not found</div>
          <h1 className="font-serif-display mt-3 text-4xl">No analysis with that id</h1>
          <p className="mt-3 text-muted-foreground">It may have been cleared from local history.</p>
          <Link to="/analyze" className="mt-6 inline-block rounded-full bg-foreground px-5 py-2 text-sm text-background">
            Run a new analysis
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const rename = () => {
    const next = window.prompt("Rename analysis", a.title);
    if (next && next.trim()) {
      history.rename(a.id, next.trim());
      setA(history.get(a.id));
    }
  };
  const remove = () => {
    if (window.confirm("Delete this analysis from history?")) {
      history.remove(a.id);
      navigate("/history");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="container-editorial py-10">
        {/* Header strip */}
        <header className="flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="eyebrow">{a.genre}</div>
              <span className="font-mono-data text-[11px] text-muted-foreground">
                {new Date(a.createdAt).toLocaleString()}
              </span>
            </div>
            <h1 className="font-serif-display mt-2 text-4xl font-medium leading-tight md:text-5xl">
              {a.title}
              <button onClick={rename} className="ml-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </h1>
            <div className="mt-3 font-mono-data text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              tokens in {a.tokens.input.toLocaleString()} · out {a.tokens.output.toLocaleString()} · cost ${a.tokens.cost.toFixed(4)}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => openPrintReport(a.id)} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-wider hover:bg-secondary">
              <FileDown className="h-3.5 w-3.5" /> Export PDF
            </button>
            <button onClick={() => downloadMarkdown(a)} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-wider hover:bg-secondary">
              <Download className="h-3.5 w-3.5" /> Markdown
            </button>
            <button onClick={() => { history.save(a); toast.success("Saved to history"); }} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-wider hover:bg-secondary">
              Save
            </button>
            <Link to="/analyze" className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs uppercase tracking-wider text-background hover:bg-foreground/85">
              <RefreshCcw className="h-3.5 w-3.5" /> Re-analyse
            </Link>
            <button onClick={remove} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Reader toggle */}
        <div className="mt-6 flex items-center justify-between">
          <div className="eyebrow">Scene-by-scene reader</div>
          <button
            onClick={() => setShowReader((v) => !v)}
            className="text-xs uppercase tracking-wider text-foreground/70 underline-offset-4 hover:underline"
          >
            {showReader ? "Hide reader" : "Show reader"}
          </button>
        </div>
        {showReader && (
          <div className="mt-3">
            <ScriptReader analysis={a} />
          </div>
        )}

        {/* Summary + score */}
        <section className="mt-12 grid gap-6 lg:grid-cols-12">
          <div className="rounded-md border border-border bg-card p-8 lg:col-span-7">
            <div className="eyebrow">Coverage summary</div>
            <p className="font-serif-display mt-4 text-2xl italic leading-snug text-foreground/90">
              "{a.summary}"
            </p>
            <div className="mt-8 grid gap-6 border-t border-border pt-6 sm:grid-cols-2">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-success">Strengths</div>
                <ul className="mt-3 space-y-2 text-sm">
                  {a.strengths.map((s, i) => (
                    <li key={i} className="flex gap-2"><span className="text-success">✓</span><span>{s}</span></li>
                  ))}
                </ul>
              </div>
              <div className="sm:border-l sm:border-border sm:pl-6">
                <div className="text-xs font-medium uppercase tracking-wider text-accent">Weaknesses</div>
                <ul className="mt-3 space-y-2 text-sm">
                  {a.weaknesses.map((s, i) => (
                    <li key={i} className="flex gap-2"><span className="text-accent">✕</span><span>{s}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-8 lg:col-span-5">
            <div className="flex items-baseline justify-between">
              <div className="eyebrow">Engagement</div>
              <span className="font-mono-data text-[11px] text-muted-foreground">confidence {(a.confidence * 100).toFixed(0)}%</span>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <div className="font-mono-data text-7xl font-medium leading-none">{a.engagementScore.toFixed(1)}</div>
              <div className="font-mono-data text-sm text-muted-foreground">/ 10</div>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-foreground" style={{ width: `${a.engagementScore * 10}%` }} />
            </div>
            <div className="mt-6">
              <EngagementRadar factors={a.factors} />
            </div>
          </div>
        </section>

        {/* Arc + Cliffhangers */}
        <section className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="rounded-md border border-border bg-card p-8 lg:col-span-7">
            <div className="eyebrow">Emotional arc</div>
            <h3 className="font-serif-display mt-2 text-2xl">How it lands, beat by beat</h3>
            <div className="mt-6">
              <EmotionalArcChart arc={a.arc} height={280} />
            </div>
          </div>
          <div className="rounded-md border border-border bg-card p-8 lg:col-span-5">
            <div className="eyebrow">Cliffhangers</div>
            <ol className="mt-4 space-y-5">
              {a.cliffhangers.map((c) => (
                <li key={c.beat} className="relative pl-6">
                  <span className="absolute left-0 top-1 h-3 w-3 rounded-full border-2 border-foreground bg-background" />
                  <div className="flex items-center gap-2">
                    <span className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-muted-foreground">beat {c.beat}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider", EFF_BADGE[c.effectiveness])}>
                      {c.effectiveness}
                    </span>
                  </div>
                  <div className="font-serif-display mt-1 text-lg">{c.scene}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{c.rationale}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Suggestions */}
        <section className="mt-6 rounded-md border border-border bg-card p-8">
          <div className="flex items-end justify-between">
            <div>
              <div className="eyebrow">Notes &amp; suggestions</div>
              <h3 className="font-serif-display mt-2 text-2xl">What to fix first</h3>
            </div>
            <span className="font-mono-data text-[11px] text-muted-foreground">{a.suggestions.length} notes</span>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {(["high", "medium", "low"] as const).map((impact) => (
              <div key={impact} className="space-y-3">
                <div className={cn("inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider", IMPACT_BADGE[impact])}>
                  {impact} impact · {grouped[impact].length}
                </div>
                {grouped[impact].map((s) => (
                  <div key={s.id} className="rounded-md border border-border p-4">
                    <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{s.area}</div>
                    <div className="mt-1 text-sm font-medium">{s.title}</div>
                    <p className="mt-1.5 text-sm text-muted-foreground">{s.detail}</p>
                  </div>
                ))}
                {!grouped[impact].length && (
                  <div className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">— none —</div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Results;
