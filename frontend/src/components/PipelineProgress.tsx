import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { PIPELINE_NODES } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function PipelineProgress({
  active,
  done,
}: {
  active: string | null;
  done: Set<string>;
}) {
  return (
    <ol className="space-y-2">
      {PIPELINE_NODES.map((n, i) => {
        const isDone = done.has(n.id);
        const isActive = active === n.id;
        return (
          <li
            key={n.id}
            className={cn(
              "flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 transition",
              isActive && "border-foreground/40 shadow-sm",
              isDone && "opacity-90",
            )}
          >
            <span className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex-1 text-sm">{n.label}</span>
            {isDone ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : isActive ? (
              <Loader2 className="h-4 w-4 animate-spin text-foreground" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/40" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
