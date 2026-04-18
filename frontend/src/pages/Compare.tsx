import { useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import EmotionalArcChart from "@/components/EmotionalArcChart";
import { compareScripts, getSamples, getSampleContent, type Analysis } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

const Compare = () => {
  const [samples, setSamples] = useState<any[]>([]);
  const [aText, setAText] = useState("");
  const [bText, setBText] = useState("");
  const [aTitle, setATitle] = useState("");
  const [bTitle, setBTitle] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ a: Analysis, b: Analysis } | null>(null);
  useEffect(() => {
    console.log("Compare component mounted");
    getSamples().then(async (list) => {
      setSamples(list);
      if (list.length >= 2) {
        setATitle(list[0].title);
        setBTitle(list[list.length - 1].title);
        const [contentA, contentB] = await Promise.all([
          getSampleContent(list[0].id),
          getSampleContent(list[list.length - 1].id),
        ]);
        setAText(contentA);
        setBText(contentB);
      }
    });
  }, []);

  const run = async () => {
    if (!aText.trim() || !bText.trim()) {
      toast.error("Both scripts need text.");
      return;
    }
    setRunning(true);
    try {
      const r = await compareScripts({ title: aTitle, text: aText }, { title: bTitle, text: bText });
      setResult(r);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container-editorial py-12">
        <div className="eyebrow">Side by side</div>
        <h1 className="font-serif-display mt-2 text-4xl font-medium md:text-5xl">Compare two scripts.</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Run them through the same pipeline. See who wins which factor.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {[
            { label: "Script A", title: aTitle, setTitle: setATitle, text: aText, setText: setAText },
            { label: "Script B", title: bTitle, setTitle: setBTitle, text: bText, setText: setBText },
          ].map((col, i) => (
            <div key={i} className="rounded-md border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border p-3">
                <span className="font-mono-data text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{col.label}</span>
                <input
                  className="w-56 rounded-md border border-border bg-background px-3 py-1 text-xs outline-none"
                  value={col.title}
                  onChange={(e) => col.setTitle(e.target.value)}
                />
              </div>
              <textarea
                value={col.text}
                onChange={(e) => col.setText(e.target.value)}
                className="block min-h-[280px] w-full resize-y bg-transparent p-4 font-mono text-[12px] leading-relaxed outline-none"
              />
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={run}
            disabled={running}
            className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {running ? "Comparing…" : "Compare"}
          </button>
        </div>

        {result && (
          <section className="mt-12 space-y-8">
            {/* Side-by-side cards */}
            <div className="grid gap-6 lg:grid-cols-2">
              {[result.a, result.b].map((x, i) => (
                <div key={i} className="rounded-md border border-border bg-card p-6">
                  <div className="flex items-center justify-between">
                    <div className="eyebrow">{i === 0 ? "Script A" : "Script B"} · {x.genre}</div>
                    <span className="font-mono-data text-2xl font-medium">{(x.engagementScore || 0).toFixed(1)}</span>
                  </div>
                  <h3 className="font-serif-display mt-2 text-2xl">{x.title}</h3>
                  <p className="font-serif-display mt-2 italic text-muted-foreground">"{x.summary}"</p>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full bg-foreground" style={{ width: `${(x.engagementScore || 0) * 10}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Winner-per-factor table */}
            <div className="rounded-md border border-border bg-card p-6">
              <div className="eyebrow">Winner per factor</div>
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2">Factor</th>
                    <th className="py-2 text-right">A</th>
                    <th className="py-2 text-right">B</th>
                    <th className="py-2 text-right">Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {result.a.factors.map((fA, idx) => {
                    const fB = result.b.factors[idx];
                    if (!fB) return null;
                    const winner = fA.score === fB.score ? "tie" : fA.score > fB.score ? "A" : "B";
                    return (
                      <tr key={fA.name} className="border-b border-border/60">
                        <td className="py-2">{fA.name}</td>
                        <td className={cn("py-2 text-right font-mono-data", winner === "A" && "text-foreground font-medium")}>{(fA.score || 0).toFixed(1)}</td>
                        <td className={cn("py-2 text-right font-mono-data", winner === "B" && "text-foreground font-medium")}>{(fB.score || 0).toFixed(1)}</td>
                        <td className="py-2 text-right">
                          <span className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider",
                            winner === "A" && "bg-primary/15 text-primary",
                            winner === "B" && "bg-accent/15 text-accent",
                            winner === "tie" && "bg-muted text-muted-foreground",
                          )}>
                            {winner}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Overlaid arc */}
            <div className="rounded-md border border-border bg-card p-6">
              <div className="eyebrow">Emotional arcs · overlay</div>
              <div className="mt-4 h-72 w-full">
                <ResponsiveContainer>
                  <LineChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid stroke="hsl(var(--hairline))" strokeDasharray="2 4" vertical={false} />
                    <XAxis type="number" dataKey="beat" domain={[1, "dataMax"]} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
                    <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} width={28} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
                    <Legend />
                    <Line data={result.a.arc} type="monotone" dataKey="intensity" name={result.a.title} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    <Line data={result.b.arc} type="monotone" dataKey="intensity" name={result.b.title} stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default Compare;
