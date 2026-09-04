import { useRef, useState } from "react";
import {
  AlertTriangle,
  Bug,
  Check,
  Clock,
  Copy,
  Database,
  Download,
  GitBranch,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { MermaidChart } from "@/components/MermaidChart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AnalysisKind } from "@/lib/analysis-types";
import type { AnalyzeResponse } from "@/lib/api-analysis";
import { improvementLines } from "@/lib/annotations";

const severityStyles: Record<string, string> = {
  high: "border-destructive/40 bg-destructive/10 text-destructive",
  medium: "border-warn/40 bg-warn/10 text-warn",
  low: "border-border bg-surface-2 text-muted-foreground",
};

function SectionHint({ children }: { children: string }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </p>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Copy failed. Please try again.");
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={copy}
      className="h-8 gap-1.5 font-mono text-[11px]"
    >
      {copied ? (
        <Check className="size-3.5 text-neon" />
      ) : (
        <Copy className="size-3.5" />
      )}
      {copied ? "Copied" : "Copy to Clipboard"}
    </Button>
  );
}

function ExportBar({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <SectionHint>{title}</SectionHint>
      {children}
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return (
    <div className="grid min-h-[240px] place-items-center rounded-lg border border-dashed border-border bg-surface/40 p-6 text-center font-mono text-xs text-muted-foreground">
      {children}
    </div>
  );
}

function FlowchartView({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const downloadSvg = () => {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) {
      toast.error("Flowchart is not ready yet.");
      return;
    }
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const source = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
    const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "pylens-flowchart.svg";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Flowchart downloaded");
  };

  return (
    <div className="flex flex-col gap-3">
      <ExportBar title="control flow">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={downloadSvg}
          className="h-8 gap-1.5 font-mono text-[11px]"
        >
          <Download className="size-3.5" />
          Download SVG
        </Button>
      </ExportBar>
      <div
        ref={containerRef}
        className="grid min-h-[380px] place-items-center rounded-lg border border-border bg-surface/60 p-8"
      >
        <MermaidChart chart={chart} />
      </div>
      <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <GitBranch className="size-3.5 text-neon" />
        rendered with mermaid.js
      </p>
    </div>
  );
}

export function ApiResultView({
  kind,
  data,
  code,
  onHoverLine,
}: {
  kind: AnalysisKind;
  data: AnalyzeResponse;
  code: string;
  onHoverLine?: (line: number | null) => void;
}) {
  const tipLines = improvementLines(code, data);
  if (kind === "explain") {
    if (!data.explanation?.length) return <Empty>No explanation returned.</Empty>;
    return (
      <div className="flex flex-col gap-3">
        <ExportBar title="line-by-line">
          <CopyButton
            label="Explanation"
            text={data.explanation
              .map((row) =>
                `Line ${row.line}${row.code ? `: ${row.code.trim()}` : ""}\n${row.explanation}`,
              )
              .join("\n\n")}
          />
        </ExportBar>
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {data.explanation.map((row, i) => (
            <li
              key={`${row.line}-${i}`}
              onMouseEnter={() => onHoverLine?.(row.line)}
              onMouseLeave={() => onHoverLine?.(null)}
              className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 px-4 py-3 transition hover:bg-surface-2/60"
            >
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border border-neon/30 bg-neon/10 font-mono text-[11px] text-neon">
                {row.line}
              </span>
              <div className="min-w-0">
                {row.code ? (
                  <pre className="mb-1 overflow-x-auto font-mono text-xs text-muted-foreground">
                    <code>{row.code}</code>
                  </pre>
                ) : null}
                <p className="text-sm leading-relaxed text-foreground">{row.explanation}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (kind === "flowchart") {
    if (!data.mermaid_chart) return <Empty>No flowchart returned.</Empty>;
    return <FlowchartView chart={data.mermaid_chart} />;
  }

  if (kind === "comments") {
    if (!data.commented_code) return <Empty>No commented code returned.</Empty>;
    return (
      <div className="flex flex-col gap-3">
        <ExportBar title="auto-commented source">
          <CopyButton text={data.commented_code} label="Commented code" />
        </ExportBar>
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2">
            <Wand2 className="size-3.5 text-neon" />
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              analysis.py — read only
            </span>
          </div>
          <pre className="scroll-slim overflow-x-auto p-4 font-mono text-[13px] leading-7">
            <code>
              {data.commented_code.split("\n").map((raw, i) => {
                const idx = raw.indexOf("#");
                const code = idx >= 0 ? raw.slice(0, idx) : raw;
                const comment = idx >= 0 ? raw.slice(idx) : "";
                return (
                  <div key={i} className="whitespace-pre">
                    <span className="text-foreground">{code}</span>
                    {comment ? <span className="text-neon">{comment}</span> : null}
                  </div>
                );
              })}
            </code>
          </pre>
        </div>
      </div>
    );
  }

  if (kind === "bugs") {
    if (!data.bugs?.length) {
      return (
        <div className="flex flex-col gap-3">
          <ExportBar title="detected issues">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => toast.info("No bugs to copy")}
              className="h-8 gap-1.5 font-mono text-[11px]"
            >
              <Copy className="size-3.5" />
              Copy to Clipboard
            </Button>
          </ExportBar>
          <Empty>No bugs detected.</Empty>
        </div>
      );
    }
    const bugsText = data.bugs
      .map((bug) => {
        const head = `${bug.title}${typeof bug.line === "number" ? ` (line ${bug.line})` : ""} [${bug.severity}]`;
        return `${head}\nCause: ${bug.cause}${bug.fix ? `\nFix: ${bug.fix}` : ""}`;
      })
      .join("\n\n");
    return (
      <div className="flex flex-col gap-3">
        <ExportBar title="detected issues">
          <CopyButton text={bugsText} label="Bugs" />
        </ExportBar>
        {data.bugs.map((bug, i) => (
          <Alert
            key={`${bug.title}-${i}`}
            variant="destructive"
            className="bg-destructive/5"
            onMouseEnter={() =>
              typeof bug.line === "number" ? onHoverLine?.(bug.line) : undefined
            }
            onMouseLeave={() => onHoverLine?.(null)}
          >
            <Bug className="size-4" />
            <AlertTitle className="flex flex-wrap items-center gap-2">
              <span className="min-w-0">{bug.title}</span>
              <Badge
                variant="outline"
                className={`shrink-0 font-mono text-[10px] uppercase ${
                  severityStyles[bug.severity] ?? severityStyles.low
                }`}
              >
                {bug.severity}
              </Badge>
              {typeof bug.line === "number" ? (
                <span className="font-mono text-[11px] text-muted-foreground">line {bug.line}</span>
              ) : null}
            </AlertTitle>
            <AlertDescription className="flex flex-col gap-1 text-muted-foreground">
              <span>{bug.cause}</span>
              {bug.fix ? (
                <span className="text-foreground">
                  <span className="font-mono text-[11px] uppercase text-neon">fix </span>
                  {bug.fix}
                </span>
              ) : null}
            </AlertDescription>
          </Alert>
        ))}
      </div>
    );
  }

  if (kind === "improve") {
    if (!data.improvements?.length) return <Empty>No improvements suggested.</Empty>;
    return (
      <div className="flex flex-col gap-3">
        <SectionHint>suggestions</SectionHint>
        {data.improvements.map((tip, i) => (
          <Alert
            key={`${tip.title}-${i}`}
            className="border-warn/40 bg-warn/5 text-warn [&>svg]:text-warn"
            onMouseEnter={() => onHoverLine?.(tipLines[i] ?? null)}
            onMouseLeave={() => onHoverLine?.(null)}
          >
            <AlertTriangle className="size-4" />
            <AlertTitle className="flex flex-wrap items-center gap-2">
              <span className="min-w-0">{tip.title}</span>
              {tipLines[i] ? (
                <span className="font-mono text-[11px] text-muted-foreground">
                  line {tipLines[i]}
                </span>
              ) : null}
            </AlertTitle>
            <AlertDescription className="flex flex-col gap-2 text-muted-foreground">
              <span>{tip.rationale}</span>
              {tip.before || tip.after ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {tip.before ? (
                    <pre className="scroll-slim overflow-x-auto rounded-md border border-border bg-surface p-3 font-mono text-xs text-muted-foreground">
                      <code>{tip.before}</code>
                    </pre>
                  ) : null}
                  {tip.after ? (
                    <pre className="scroll-slim overflow-x-auto rounded-md border border-neon/30 bg-neon/5 p-3 font-mono text-xs text-foreground">
                      <code>{tip.after}</code>
                    </pre>
                  ) : null}
                </div>
              ) : null}
            </AlertDescription>
          </Alert>
        ))}
      </div>
    );
  }

  const c = data.complexity;
  if (!c) return <Empty>No complexity analysis returned.</Empty>;
  const cards = [
    { label: "Time Complexity", value: c.time, icon: Clock },
    { label: "Space Complexity", value: c.space, icon: Database },
  ];
  return (
    <div className="flex flex-col gap-3">
      <SectionHint>big-o analysis</SectionHint>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.label}
            className="flex flex-col gap-3 rounded-xl border border-neon/25 bg-surface p-6"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <card.icon className="size-4 shrink-0 text-neon" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
                {card.label}
              </span>
            </div>
            <p className="font-mono text-4xl font-semibold text-neon">{card.value}</p>
          </div>
        ))}
      </div>
      {c.verdict ? <p className="text-sm text-muted-foreground">{c.verdict}</p> : null}
      {c.breakdown?.length ? (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {c.breakdown.map((row, i) => (
            <li key={`${row.name}-${i}`} className="flex flex-col gap-1 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-foreground">{row.name}</span>
                <Badge variant="outline" className="font-mono text-[10px] text-neon">
                  {row.time}
                </Badge>
                <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
                  {row.space}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{row.justification}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
