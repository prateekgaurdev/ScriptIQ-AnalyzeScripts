import { useEffect, useRef, useState } from "react";
import EmotionalArcChart from "./EmotionalArcChart";
import type { Analysis, EmotionPoint } from "@/lib/api";
import { cn } from "@/lib/utils";

const EMOTION_BG: Record<string, string> = {
  joy: "bg-emotion-joy/15",
  sadness: "bg-emotion-sadness/15",
  anger: "bg-emotion-anger/15",
  fear: "bg-emotion-fear/15",
  tension: "bg-emotion-tension/15",
  calm: "bg-emotion-calm/15",
  neutral: "bg-emotion-neutral/15",
};
const EMOTION_BAR: Record<string, string> = {
  joy: "bg-emotion-joy",
  sadness: "bg-emotion-sadness",
  anger: "bg-emotion-anger",
  fear: "bg-emotion-fear",
  tension: "bg-emotion-tension",
  calm: "bg-emotion-calm",
  neutral: "bg-emotion-neutral",
};

/** Splits the script text into N roughly even chunks aligned with arc beats. */
function chunkText(text: string, count: number): string[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length >= count) {
    const per = Math.ceil(paragraphs.length / count);
    const chunks: string[] = [];
    for (let i = 0; i < count; i++) chunks.push(paragraphs.slice(i * per, (i + 1) * per).join("\n\n"));
    return chunks;
  }
  // fallback by characters
  const per = Math.ceil(text.length / count);
  return Array.from({ length: count }, (_, i) => text.slice(i * per, (i + 1) * per));
}

export default function ScriptReader({ analysis }: { analysis: Analysis }) {
  const beats = analysis.arc;
  const chunks = chunkText(analysis.scriptText, beats.length);
  const refs = useRef<Array<HTMLDivElement | null>>([]);
  const [active, setActive] = useState<number | null>(beats[0]?.beat ?? null);

  // Observe which beat is in view
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (top) {
          const beat = Number((top.target as HTMLElement).dataset.beat);
          if (!Number.isNaN(beat)) setActive(beat);
        }
      },
      { root: document.querySelector("[data-reader-scroll]"), threshold: [0.4, 0.7] },
    );
    refs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [analysis.id]);

  const goToBeat = (beat: number) => {
    const el = refs.current[beat - 1];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(beat);
  };

  return (
    <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-md border border-border bg-card lg:grid-cols-[1.4fr_1fr]">
      {/* Left: script with beat highlights */}
      <div
        data-reader-scroll
        className="max-h-[640px] overflow-y-auto p-6 lg:border-r lg:border-border"
      >
        {beats.map((b: EmotionPoint, i) => (
          <div
            key={b.beat}
            ref={(el) => (refs.current[i] = el)}
            data-beat={b.beat}
            className={cn(
              "group relative -mx-3 mb-3 rounded-md px-3 py-3 transition",
              EMOTION_BG[b.dominant],
              active === b.beat && "ring-1 ring-foreground/20",
            )}
            onMouseEnter={() => setActive(b.beat)}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Beat {String(b.beat).padStart(2, "0")}
                </span>
                <span className="text-[11px] font-medium uppercase tracking-wider text-foreground/70">
                  {b.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono-data text-[10px] text-muted-foreground">{b.dominant}</span>
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-foreground/10">
                  <div className={cn("h-full", EMOTION_BAR[b.dominant])} style={{ width: `${b.intensity * 10}%` }} />
                </div>
              </div>
            </div>
            <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-foreground/90">
              {chunks[i] ?? b.excerpt}
            </pre>
          </div>
        ))}
      </div>

      {/* Right: live arc */}
      <div className="sticky top-16 self-start p-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="eyebrow">Emotional arc</div>
          <span className="font-mono-data text-[10px] text-muted-foreground">
            beat {active ?? "—"}
          </span>
        </div>
        <EmotionalArcChart arc={beats} activeBeat={active} onBeatClick={goToBeat} height={300} />
        <div className="mt-4 grid grid-cols-2 gap-2">
          {beats.map((b) => (
            <button
              key={b.beat}
              onClick={() => goToBeat(b.beat)}
              className={cn(
                "flex items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-xs transition hover:bg-secondary",
                active === b.beat && "border-foreground/40 bg-secondary",
              )}
            >
              <span className={cn("inline-block h-2 w-2 rounded-full", EMOTION_BAR[b.dominant])} />
              <span className="flex-1 truncate">{b.label}</span>
              <span className="font-mono-data text-[10px] text-muted-foreground">{b.intensity}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
