import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PipelineProgress from "@/components/PipelineProgress";
import { analyzeScriptStream, getSamples, getSampleContent, type SampleMeta } from "@/lib/api";
import { history } from "@/lib/history";
import { cn } from "@/lib/utils";
import { Upload, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Mode = "paste" | "upload" | "sample";

const Analyze = () => {
  const [samples, setSamples] = useState<SampleMeta[]>([]);
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const initialSampleId = params.get("sample");

  const [mode, setMode] = useState<Mode>(initialSampleId ? "sample" : "paste");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [activeSample, setActiveSample] = useState<string | null>(initialSampleId);
  const [isRunning, setRunning] = useState(false);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  // Fetch samples on mount
  useEffect(() => {
    getSamples().then(setSamples);
  }, []);

  // Handle initial sample from URL
  useEffect(() => {
    if (initialSampleId && samples.length > 0) {
      const s = samples.find((x) => x.id === initialSampleId);
      if (s) {
        setTitle(s.title);
        setActiveSample(s.id);
        getSampleContent(s.id).then(setText);
      }
    }
  }, [initialSampleId, samples]);

  const onSelectSample = async (id: string) => {
    const s = samples.find((x) => x.id === id);
    if (!s) return;
    setActiveSample(id);
    setTitle(s.title);
    const content = await getSampleContent(id);
    setText(content);
  };

  const onUpload = async (file: File) => {
    const t = await file.text();
    setText(t);
    setTitle(file.name.replace(/\.[^/.]+$/, ""));
  };

  const submit = async () => {
    if (!text.trim()) {
      toast.error("Add a scene to analyse first.");
      return;
    }
    setRunning(true);
    setDone(new Set());
    setActiveNode(null);
    try {
      const analysis = await analyzeScriptStream({ title, text }, (e) => {
        if (e.type === "node_start") setActiveNode(e.node);
        if (e.type === "node_end") {
          setDone((prev) => new Set(prev).add(e.node));
          setActiveNode(null);
        }
      });
      history.save(analysis);
      toast.success("Analysis complete.");
      navigate(`/results/${analysis.id}`);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Try again.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="container-editorial py-12">
        <div className="eyebrow">Step one</div>
        <h1 className="font-serif-display mt-2 text-4xl font-medium md:text-5xl">Bring us a scene.</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Paste a screenplay excerpt, drop a file, or pick a sample. The pipeline does the rest.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-md border border-border bg-card">
            {/* Mode segmented control */}
            <div className="flex items-center gap-1 border-b border-border p-2">
              {(
                [
                  { id: "paste", label: "Paste", icon: FileText },
                  { id: "upload", label: "Upload", icon: Upload },
                  { id: "sample", label: "Sample", icon: Sparkles },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs uppercase tracking-wider transition",
                    mode === m.id
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-secondary",
                  )}
                >
                  <m.icon className="h-3.5 w-3.5" />
                  {m.label}
                </button>
              ))}
              <div className="ml-auto pr-2">
                <input
                  className="w-48 rounded-md border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-foreground/40"
                  placeholder="Title (optional)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </div>

            {mode === "paste" && (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`INT. EASTBOUND EXPRESS - NIGHT\n\nRain streaks the windows. ANNA slips into compartment 7B...`}
                className="block min-h-[420px] w-full resize-y bg-transparent p-5 font-mono text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground/60"
              />
            )}

            {mode === "upload" && (
              <label
                className="flex min-h-[420px] cursor-pointer flex-col items-center justify-center gap-3 p-8 text-center"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) onUpload(f);
                }}
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="font-serif-display text-xl">Drop a file</div>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Plain text (.txt) or Fountain (.fountain). We'll read it as-is — no upload to a server in mock mode.
                </p>
                <input
                  type="file"
                  accept=".txt,.fountain,.md,.fdx,text/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
                />
                <span className="rounded-full border border-border px-4 py-1.5 text-xs uppercase tracking-wider">
                  Browse files
                </span>
                {text && (
                  <p className="font-mono-data text-[11px] text-muted-foreground">{text.length.toLocaleString()} chars loaded</p>
                )}
              </label>
            )}

            {mode === "sample" && (
              <div className="grid gap-3 p-5 sm:grid-cols-3">
                {samples.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onSelectSample(s.id)}
                    className={cn(
                      "rounded-md border border-border p-4 text-left transition hover:border-foreground/40",
                      activeSample === s.id && "border-foreground/60 bg-secondary",
                    )}
                  >
                    <div className="eyebrow">{s.genre}</div>
                    <div className="font-serif-display mt-2 text-lg">{s.title}</div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{s.blurb}</p>
                  </button>
                ))}
                {activeSample && (
                  <pre className="col-span-full max-h-72 overflow-y-auto rounded-md border border-border bg-background p-4 font-mono text-[12px] leading-relaxed">
                    {text}
                  </pre>
                )}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border p-4">
              <div className="font-mono-data text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {text.length.toLocaleString()} chars · ~{Math.max(1, Math.round(text.split(/\s+/).length / 200))} pages
              </div>
              <button
                onClick={submit}
                disabled={isRunning}
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition hover:bg-foreground/85 disabled:opacity-50"
              >
                {isRunning ? "Analysing…" : "Run analysis"}
              </button>
            </div>
          </div>

          {/* Pipeline panel */}
          <aside>
            <div className="eyebrow">Pipeline</div>
            <h2 className="font-serif-display mt-2 text-2xl font-medium">Six readers in sequence</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Each node validates the last. Live status appears here while the analysis runs.
            </p>
            <div className="mt-5">
              <PipelineProgress active={activeNode} done={done} />
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Analyze;
