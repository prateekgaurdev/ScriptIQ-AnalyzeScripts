export default function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="container-editorial flex flex-col gap-4 py-10 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="font-serif-display text-2xl font-semibold tracking-tight">
            Script<span className="italic text-accent">IQ</span>
          </div>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Editorial-grade script coverage powered by a six-stage LangGraph pipeline and Gemini 2.5 Flash. A reader, not a robot.
          </p>
        </div>
        <div className="font-mono-data text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          © {new Date().getFullYear()} ScriptIQ · Vol. 01
        </div>
      </div>
    </footer>
  );
}
