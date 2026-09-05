import { useState } from "react";
import { AlertTriangle, ChevronDown, Sparkles } from "lucide-react";
import { CodeBlock } from "./CodeBlock";
import { MermaidChart } from "./MermaidChart";
import type { AnalysisResult } from "@/lib/analysis-types";
import { cn } from "@/lib/utils";

function severityClass(severity: string) {
  const s = severity.toLowerCase();
  if (s.startsWith("h")) return "border-destructive/40 bg-destructive/10 text-destructive";
  if (s.startsWith("m")) return "border-warn/40 bg-warn/10 text-warn";
  return "border-info/40 bg-info/10 text-info";
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </h3>
  );
}

export function AnalysisResultView({
  result,
  onHoverLine,
}: {
  result: AnalysisResult;
  onHoverLine: (line: number | null) => void;
}) {
  const [showSource, setShowSource] = useState(false);

  if (result.kind === "explain") {
    return (
      <div className="space-y-6">
        <p className="text-sm leading-relaxed text-foreground/90">{result.data.summary}</p>
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {result.data.lines.map((row, i) => (
            <div
              key={i}
              onMouseEnter={() => onHoverLine(row.line)}
              onMouseLeave={() => onHoverLine(null)}
              className="grid grid-cols-[3rem_1fr] gap-4 px-4 py-3 transition-colors hover:bg-neon/5"
            >
              <span className="font-mono text-xs text-neon-dim">{row.line}</span>
              <div className="space-y-1.5">
                <code className="block font-mono text-[13px] text-foreground">{row.code}</code>
                <p className="text-sm leading-relaxed text-muted-foreground">{row.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (result.kind === "flowchart") {
    return (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">{result.data.notes}</p>
        <div className="rounded-lg border border-border bg-surface p-6">
          <MermaidChart chart={result.data.mermaid} />
        </div>
        <button
          type="button"
          onClick={() => setShowSource((v) => !v)}
          className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-neon"
        >
          <ChevronDown
            className={cn("size-3.5 transition-transform", showSource && "rotate-180")}
          />
          {showSource ? "hide" : "view"} mermaid source
        </button>
        {showSource ? <CodeBlock code={result.data.mermaid} /> : null}
      </div>
    );
  }

  if (result.kind === "comments") {
    return (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">{result.data.notes}</p>
        <CodeBlock code={result.data.code} label="commented.py" />
      </div>
    );
  }

  if (result.kind === "bugs") {
    if (result.data.findings.length === 0) {
      return (
        <div className="flex items-center gap-3 rounded-lg border border-neon/30 bg-neon/5 px-5 py-4">
          <Sparkles className="size-4 text-neon" />
          <p className="text-sm text-foreground">No bugs detected in this snippet.</p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {result.data.findings.map((f, i) => (
          <div
            key={i}
            onMouseEnter={() => onHoverLine(f.line)}
            onMouseLeave={() => onHoverLine(null)}
            className="rounded-lg border border-border bg-surface p-5 transition-colors hover:border-neon/30"
          >
            <div className="flex flex-wrap items-center gap-3">
              <AlertTriangle className="size-4 text-warn" />
              <h4 className="text-sm font-semibold text-foreground">{f.title}</h4>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest",
                  severityClass(f.severity),
                )}
              >
                {f.severity}
              </span>
              <span className="font-mono text-xs text-muted-foreground">line {f.line}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.cause}</p>
            <div className="mt-3 border-l-2 border-neon/50 pl-4">
              <SectionTitle>fix</SectionTitle>
              <p className="mt-1 text-sm leading-relaxed text-foreground/90">{f.fix}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (result.kind === "improve") {
    return (
      <div className="space-y-5">
        {result.data.suggestions.map((s, i) => (
          <div key={i} className="rounded-lg border border-border bg-surface p-5">
            <h4 className="text-sm font-semibold text-foreground">{s.title}</h4>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.rationale}</p>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <CodeBlock code={s.before} label="before" />
              <CodeBlock code={s.after} label="after" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-neon/30 bg-neon/5 p-5">
          <SectionTitle>time complexity</SectionTitle>
          <p className="mt-2 font-mono text-2xl text-neon">{result.data.overallTime}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <SectionTitle>space complexity</SectionTitle>
          <p className="mt-2 font-mono text-2xl text-foreground">{result.data.overallSpace}</p>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-foreground/90">{result.data.verdict}</p>
      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {result.data.breakdown.map((b, i) => (
          <div key={i} className="space-y-2 px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <code className="font-mono text-sm text-foreground">{b.name}</code>
              <span className="font-mono text-xs text-neon">{b.time}</span>
              <span className="font-mono text-xs text-muted-foreground">{b.space}</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{b.justification}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
