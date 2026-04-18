import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { history } from "@/lib/history";
import type { Analysis, Genre } from "@/lib/api";
import { Download, Pencil, Trash2 } from "lucide-react";
import { downloadMarkdown } from "@/lib/export";
import { cn } from "@/lib/utils";

function Sparkline({ values }: { values: number[] }) {
  if (!values.length) return null;
  const max = Math.max(...values, 10);
  const w = 120;
  const h = 28;
  const step = w / Math.max(values.length - 1, 1);
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${i * step},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="text-foreground/60">
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

const HistoryPage = () => {
  const [items, setItems] = useState<Analysis[]>(() => history.list());
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState<Genre | "all">("all");

  useEffect(() => {
    const refresh = () => setItems(history.list());
    window.addEventListener("scriptiq:history-updated", refresh);
    return () => window.removeEventListener("scriptiq:history-updated", refresh);
  }, []);

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (genre === "all" || i.genre === genre) &&
          i.title.toLowerCase().includes(q.toLowerCase()),
      ),
    [items, q, genre],
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container-editorial py-12">
        <div className="flex items-end justify-between">
          <div>
            <div className="eyebrow">The archive</div>
            <h1 className="font-serif-display mt-2 text-4xl font-medium md:text-5xl">Past coverage</h1>
            <p className="mt-2 max-w-xl text-muted-foreground">Stored locally on this device. No accounts, no cloud.</p>
          </div>
          <Link to="/analyze" className="rounded-full bg-foreground px-4 py-2 text-xs uppercase tracking-wider text-background">
            New analysis
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-border pb-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title…"
            className="w-64 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-foreground/40"
          />
          <div className="flex items-center gap-1">
            {(["all", "thriller", "romance", "drama"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] uppercase tracking-wider",
                  genre === g ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary",
                )}
              >
                {g}
              </button>
            ))}
          </div>
          <span className="ml-auto font-mono-data text-[11px] text-muted-foreground">{filtered.length} of {items.length}</span>
        </div>

        {!items.length ? (
          <div className="mt-16 rounded-md border border-dashed border-border p-16 text-center">
            <div className="font-serif-display text-3xl">An empty archive.</div>
            <p className="mt-2 text-muted-foreground">Run your first analysis and it'll appear here.</p>
            <Link to="/analyze" className="mt-6 inline-block rounded-full bg-foreground px-5 py-2 text-sm text-background">
              Analyse a script
            </Link>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {filtered.map((a) => (
              <li key={a.id} className="grid grid-cols-12 items-center gap-4 py-5">
                <div className="col-span-12 md:col-span-5">
                  <div className="eyebrow">{a.genre}</div>
                  <Link to={`/results/${a.id}`} className="font-serif-display mt-1 block text-2xl hover:text-accent">
                    {a.title}
                  </Link>
                  <div className="mt-1 font-mono-data text-[11px] text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Sparkline values={a.arc.map((p) => p.intensity)} />
                </div>
                <div className="col-span-3 md:col-span-2 text-right">
                  <div className="font-mono-data text-3xl">{a.engagementScore.toFixed(1)}</div>
                  <div className="font-mono-data text-[10px] uppercase tracking-wider text-muted-foreground">engagement</div>
                </div>
                <div className="col-span-5 md:col-span-3 flex items-center justify-end gap-1">
                  <button
                    onClick={() => {
                      const next = window.prompt("Rename", a.title);
                      if (next?.trim()) {
                        history.rename(a.id, next.trim());
                        setItems(history.list());
                      }
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
                    aria-label="Rename"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => downloadMarkdown(a)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
                    aria-label="Export markdown"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("Delete this analysis?")) {
                        history.remove(a.id);
                        setItems(history.list());
                      }
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <Link
                    to={`/results/${a.id}`}
                    className="ml-2 rounded-full border border-border px-3 py-1 text-xs uppercase tracking-wider hover:bg-secondary"
                  >
                    Open
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default HistoryPage;
