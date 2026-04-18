import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
} from "recharts";
import type { EmotionPoint } from "@/lib/api";

interface Props {
  arc: EmotionPoint[];
  activeBeat?: number | null;
  onBeatClick?: (beat: number) => void;
  height?: number;
  compact?: boolean;
}

export default function EmotionalArcChart({ arc, activeBeat, onBeatClick, height = 240, compact }: Props) {
  const data = arc.map((p) => ({ ...p, x: p.beat }));
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="hsl(var(--hairline))" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="x"
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }}
            tickLine={false}
            axisLine={{ stroke: "hsl(var(--hairline))" }}
            label={compact ? undefined : { value: "Beat", position: "insideBottom", offset: -2, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            domain={[0, 10]}
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }}
            tickLine={false}
            axisLine={{ stroke: "hsl(var(--hairline))" }}
            width={28}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              fontSize: 12,
            }}
            labelFormatter={(b) => `Beat ${b}`}
            formatter={(v: number, _n, p) => [`${v} · ${(p.payload as EmotionPoint).dominant}`, (p.payload as EmotionPoint).label]}
          />
          <Line
            type="monotone"
            dataKey="intensity"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 4, stroke: "hsl(var(--primary))", strokeWidth: 1.5, fill: "hsl(var(--background))" }}
            activeDot={{ r: 6, onClick: (_e, payload: any) => onBeatClick?.(payload?.payload?.beat) }}
          />
          {activeBeat != null && (
            <ReferenceDot x={activeBeat} y={data.find((d) => d.beat === activeBeat)?.intensity ?? 0} r={7} fill="hsl(var(--accent))" stroke="none" />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
