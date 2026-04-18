// ScriptIQ API layer — connected to FastAPI backend
export const USE_MOCK = false;
export const API_BASE = "http://localhost:8000";

export type Genre = "thriller" | "romance" | "drama" | "comedy" | "horror" | "scifi";

export type Emotion = "joy" | "sadness" | "anger" | "fear" | "tension" | "calm" | "neutral";

export interface EmotionPoint {
  beat: number;
  label: string;
  intensity: number; // 0..10
  dominant: Emotion;
  excerpt: string;
}

export interface EngagementFactor {
  name: string;
  score: number; // 0..10
  weight: number; // 0..1
  note: string;
}

export interface Suggestion {
  id: string;
  area: string;
  impact: "high" | "medium" | "low";
  title: string;
  detail: string;
}

export interface Cliffhanger {
  beat: number;
  scene: string;
  effectiveness: "strong" | "moderate" | "weak";
  rationale: string;
}

export interface Analysis {
  id: string;
  title: string;
  genre: Genre;
  createdAt: string; // ISO
  summary: string;
  strengths: string[];
  weaknesses: string[];
  engagementScore: number; // 0..10
  confidence: number; // 0..1
  factors: EngagementFactor[];
  arc: EmotionPoint[];
  cliffhangers: Cliffhanger[];
  suggestions: Suggestion[];
  tokens: { input: number; output: number; cost: number };
  scriptText: string;
}

export interface SampleMeta {
  id: string;
  title: string;
  genre: Genre;
  blurb: string;
  text?: string; // Optional because we might fetch it on demand
}

export type StreamEvent =
  | { type: "node_start"; node: string }
  | { type: "node_end"; node: string }
  | { type: "done"; analysis: Analysis };

export const PIPELINE_NODES = [
  { id: "genre_detector", label: "Genre detector" },
  { id: "prompt_router", label: "Prompt router" },
  { id: "script_parser", label: "Script parser" },
  { id: "validate_parse", label: "Validate parse" },
  { id: "story_analyst", label: "Story analyst" },
  { id: "validate_analysis", label: "Validate analysis" },
] as const;

// ---------- Public API ----------
export async function getSamples(): Promise<SampleMeta[]> {
  try {
    const res = await fetch(`${API_BASE}/samples`);
    if (!res.ok) throw new Error("Failed to fetch samples");
    const data = await res.json();
    return data.samples;
  } catch (err) {
    console.error("API error fetching samples:", err);
    return []; // Fallback to empty
  }
}

export async function getSampleContent(id: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/samples/${id}`);
    if (!res.ok) throw new Error("Failed to fetch sample content");
    const data = await res.json();
    return data.content;
  } catch (err) {
    console.error("API error fetching sample content:", err);
    return "";
  }
}

export async function analyzeScriptStream(
  input: { title?: string; text: string; genreHint?: Genre },
  onEvent: (e: StreamEvent) => void,
): Promise<Analysis> {
  const formData = new FormData();
  formData.append("script_text", input.text);
  if (input.title) formData.append("title", input.title);

  const response = await fetch(`${API_BASE}/analyze/stream`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Analysis failed");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let finalAnalysis: Analysis | null = null;
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const payload = JSON.parse(line.slice(6));
          
          if (payload.event === "node_start") {
            onEvent({ type: "node_start", node: payload.node });
          } else if (payload.event === "node_complete") {
            onEvent({ type: "node_end", node: payload.node });
          } else if (payload.event === "complete") {
            const result = payload.analysis;
            console.log("Analysis complete payload:", payload);
            
            try {
              // Map backend structure to frontend Analysis type with defensive checks
              finalAnalysis = {
                id: cryptoRandomId(),
                title: input.title || "Untitled",
                genre: (payload.genre || result?.genre || "drama") as Genre,
                createdAt: new Date().toISOString(),
                summary: result?.summary || "No summary provided.",
                strengths: [],
                weaknesses: [],
                engagementScore: result?.engagement?.overall || 0,
                confidence: result?.engagement?.confidence || 0.85,
                factors: (result?.engagement?.factors || []).map((f: any) => ({
                  name: String(f.factor || "Unknown").replace("_", " ").replace(/\b\w/g, (l: any) => l.toUpperCase()),
                  score: f.score || 0,
                  weight: 0.16,
                  note: f.explanation || "",
                })),
                arc: (result?.emotional_arc?.points || []).map((p: any) => ({
                  beat: p.beat_number || 0,
                  label: p.dominant_emotion || "neutral",
                  intensity: p.intensity || 0,
                  dominant: (p.dominant_emotion || "neutral").toLowerCase() as Emotion,
                  excerpt: p.note || "",
                })),
                cliffhangers: result?.cliffhanger?.present ? [{
                  beat: result?.cliffhanger?.beat_number || 0,
                  scene: `Scene ${result?.cliffhanger?.scene_number || "?"}`,
                  effectiveness: result?.cliffhanger?.effectiveness || "moderate",
                  rationale: result?.cliffhanger?.description || "",
                }] : [],
                suggestions: (result?.suggestions || []).map((s: any) => ({
                  id: `s-${s.index}`,
                  area: s.area || "general",
                  impact: (s.impact || "medium").toLowerCase() as any,
                  title: (s.suggestion || "").split(".")[0] || "Improvement",
                  detail: s.suggestion || "",
                })),
                tokens: {
                  input: result?.token_usage?.total || 0,
                  output: 0,
                  cost: result?.estimated_cost_usd || 0,
                },
                scriptText: input.text,
              };
              console.log("Mapped analysis object:", finalAnalysis);
              onEvent({ type: "done", analysis: finalAnalysis });
            } catch (err) {
              console.error("Mapping error in analyzeScriptStream:", err, result);
              throw new Error("Failed to process analysis results. See console for details.");
            }
          } else if (payload.event === "error") {
            console.error("Pipeline error event:", payload);
            throw new Error(payload.message || "Pipeline error");
          }
        } catch (e) {
          console.error("Error parsing SSE chunk:", e);
        }
      }
    }
  }

  if (!finalAnalysis) throw new Error("Stream ended without completion");
  return finalAnalysis;
}

export async function compareScripts(
  a: { title?: string; text: string },
  b: { title?: string; text: string },
): Promise<{ a: Analysis; b: Analysis }> {
  const formData = new FormData();
  formData.append("script_a_text", a.text);
  formData.append("script_b_text", b.text);
  if (a.title) formData.append("title_a", a.title);
  if (b.title) formData.append("title_b", b.title);

  const res = await fetch(`${API_BASE}/compare`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Comparison failed");
  }

  const data = await res.json();
  
  const mapResponse = (r: any, text: string, overrideTitle?: string) => ({
    id: cryptoRandomId(),
    title: r?.analysis?.title || r?.title || overrideTitle || "Untitled",
    genre: (r?.genre || r?.analysis?.genre || "drama") as Genre,
    createdAt: new Date().toISOString(),
    summary: r?.analysis?.summary || "No summary provided.",
    strengths: [],
    weaknesses: [],
    engagementScore: r?.analysis?.engagement?.overall || 0,
    confidence: r?.analysis?.engagement?.confidence || 0.85,
    factors: (r?.analysis?.engagement?.factors || []).map((f: any) => ({
      name: String(f.factor || "Unknown").replace("_", " ").replace(/\b\w/g, (l: any) => l.toUpperCase()),
      score: f.score || 0,
      weight: 0.16,
      note: f.explanation || "",
    })),
    arc: (r?.analysis?.emotional_arc?.points || []).map((p: any) => ({
      beat: p.beat_number || 0,
      label: p.dominant_emotion || "neutral",
      intensity: p.intensity || 0,
      dominant: (p.dominant_emotion || "neutral").toLowerCase() as Emotion,
      excerpt: p.note || "",
    })),
    cliffhangers: r?.analysis?.cliffhanger?.present ? [{
      beat: r.analysis.cliffhanger.beat_number || 0,
      scene: `Scene ${r.analysis.cliffhanger.scene_number || "?"}`,
      effectiveness: r.analysis.cliffhanger.effectiveness || "moderate",
      rationale: r.analysis.cliffhanger.description || "",
    }] : [],
    suggestions: (r?.analysis?.suggestions || []).map((s: any) => ({
      id: `s-${s.index}`,
      area: s.area || "general",
      impact: (s.impact || "medium").toLowerCase() as any,
      title: (s.suggestion || "").split(".")[0] || "Improvement",
      detail: s.suggestion || "",
    })),
    tokens: {
      input: r?.analysis?.token_usage?.total || 0,
      output: 0,
      cost: r?.analysis?.estimated_cost_usd || 0,
    },
    scriptText: text,
  });

  return {
    a: mapResponse(data.script_a, a.text, a.title),
    b: mapResponse(data.script_b, b.text, b.title),
  };
}

// ---------- Helpers ----------
function cryptoRandomId() {
  return Math.random().toString(36).slice(2, 10);
}

export const EMOTION_TOKEN: Record<Emotion, string> = {
  joy: "emotion-joy",
  sadness: "emotion-sadness",
  anger: "emotion-anger",
  fear: "emotion-fear",
  tension: "emotion-tension",
  calm: "emotion-calm",
  neutral: "emotion-neutral",
};
