import { Link } from "react-router-dom";
import type { SampleMeta } from "@/lib/api";
import { ArrowUpRight } from "lucide-react";

export default function SampleCard({ sample }: { sample: SampleMeta }) {
  return (
    <Link
      to={`/analyze?sample=${sample.id}`}
      className="group flex flex-col justify-between rounded-md border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-sm"
    >
      <div>
        <div className="eyebrow">{sample.genre}</div>
        <h3 className="mt-3 font-serif-display text-xl font-medium leading-tight">{sample.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{sample.blurb}</p>
      </div>
      <div className="mt-5 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-foreground/70">
        Read it through ScriptIQ <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
