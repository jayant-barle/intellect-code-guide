import { useRef, useState, useCallback } from "react";
import {
  AlertTriangle,
  Bug,
  Check,
  Clock,
  Copy,
  Database,
  Download,
  GitBranch,
  Sparkles,
  Undo2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { MermaidChart } from "@/components/MermaidChart";
import { QualityScoreView } from "@/components/QualityScoreView";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AnalysisKind } from "@/lib/analysis-types";
import type { AnalyzeResponse } from "@/lib/api-analysis";
import { findSnippetLine, improvementLines } from "@/lib/annotations";
import { computeQualityScore } from "@/lib/quality-score";
import {
  applyImprovement,
  applyBugFix,
  extractCodeFromFix,
} from "@/lib/code-fixer";

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
      {copied ? <Check className="size-3.5 text-neon" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy to Clipboard"}
    </Button>
  );
}

function ApplyFixButton({
  onApply,
  onRevert,
  label,
  buttonText = "Apply Fix",
}: {
  onApply: () => { success: boolean; message?: string };
  onRevert?: () => boolean;
  label?: string;
  buttonText?: string;
}) {
  const [applied, setApplied] = useState(false);

  const handleClick = () => {
    const res = onApply();
    if (res.success) {
      setApplied(true);
      toast.success(label ?? "Fix applied to editor");
    } else {
      toast.error(res.message ?? "Could not apply fix — code pattern not found in editor.");
    }
  };

  const handleRevert = () => {
    if (onRevert) {
      const ok = onRevert();
      if (ok) {
        setApplied(false);
        toast.info("Reverted fix");
      } else {
        toast.error("Could not revert fix automatically.");
      }
    }
  };

  if (applied) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-md border border-neon/30 bg-neon/10 px-2 py-1 font-mono text-[11px] text-neon">
          <Check className="size-3" />
          Applied
        </span>
        {onRevert && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleRevert}
            className="h-7 gap-1 px-2 font-mono text-[11px] text-muted-foreground hover:text-foreground"
          >
            <Undo2 className="size-3" />
            Revert
          </Button>
        )}
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleClick}
      className="h-7 gap-1.5 font-mono text-[11px] border-neon/30 text-neon hover:bg-neon/10 hover:text-neon"
    >
      <Sparkles className="size-3" />
      {buttonText}
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
  onNavigateTab,
  onApplyFix,
}: {
  kind: AnalysisKind;
  data: AnalyzeResponse;
  code: string;
  onHoverLine?: (line: number | null) => void;
  onNavigateTab?: (kind: AnalysisKind) => void;
  onApplyFix?: (newCode: string, description?: string) => void;
}) {
  const tipLines = improvementLines(code, data);

  if (kind === "quality") {
    const report = computeQualityScore(code, data);
    return <QualityScoreView report={report} onNavigateTab={onNavigateTab} />;
  }

  if (kind === "explain") {
    if (!data.explanation?.length) return <Empty>No explanation returned.</Empty>;
    return (
      <div className="flex flex-col gap-3">
        <ExportBar title="line-by-line">
          <CopyButton
            label="Explanation"
            text={data.explanation
              .map(
                (row) =>
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
              {bug.fix && onApplyFix && typeof bug.line === "number" ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {extractCodeFromFix(bug.fix) ? (
                    <ApplyFixButton
                      buttonText="Apply Code Patch"
                      label={`Applied code patch for line ${bug.line}`}
                      onApply={() => {
                        const snippet = extractCodeFromFix(bug.fix!);
                        const res = applyBugFix(code, bug.line!, bug.fix!, snippet ?? undefined);
                        if (res.success) {
                          onApplyFix(res.newCode, `Applied code patch at line ${bug.line}`);
                          return { success: true };
                        }
                        return { success: false, message: res.message };
                      }}
                    />
                  ) : null}
                  <ApplyFixButton
                    buttonText="Insert Fix Comment"
                    label={`Added fix comment above line ${bug.line}`}
                    onApply={() => {
                      const res = applyBugFix(code, bug.line!, bug.fix!);
                      if (res.success) {
                        onApplyFix(res.newCode, `Added fix comment above line ${bug.line}`);
                        return { success: true };
                      }
                      return { success: false, message: res.message };
                    }}
                  />
                </div>
              ) : null}
            </AlertDescription>
          </Alert>
        ))}
      </div>
    );
  }

  if (kind === "improve") {
    if (!data.improvements?.length) return <Empty>No improvements suggested.</Empty>;

    const applicableTips = data.improvements.filter((t) => t.before && t.after);

    const handleApplyAll = () => {
      if (!onApplyFix || !applicableTips.length) return;
      let current = code;
      let count = 0;
      for (const tip of applicableTips) {
        const lineHint = findSnippetLine(current, tip.before!);
        const res = applyImprovement(current, tip.before!, tip.after!, lineHint);
        if (res.success) {
          current = res.newCode;
          count++;
        }
      }
      if (count > 0) {
        onApplyFix(current, `Batch applied ${count} improvement${count > 1 ? "s" : ""}`);
      } else {
        toast.error("Could not match improvement patterns in current code.");
      }
    };

    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionHint>suggestions</SectionHint>
          {onApplyFix && applicableTips.length > 1 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleApplyAll}
              className="h-8 gap-1.5 font-mono text-[11px] border-neon/40 bg-neon/10 text-neon hover:bg-neon/20"
            >
              <Sparkles className="size-3.5" />
              Apply All ({applicableTips.length})
            </Button>
          )}
        </div>
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
                <div className="grid gap-2 pt-1 sm:grid-cols-2 font-mono text-xs">
                  {tip.before ? (
                    <div className="overflow-hidden rounded-md border border-destructive/25 bg-surface">
                      <div className="flex items-center justify-between border-b border-destructive/20 bg-destructive/5 px-3 py-1.5 text-[10px]">
                        <span className="font-semibold text-destructive flex items-center gap-1">
                          <span>−</span> Current Code
                        </span>
                        <CopyButton text={tip.before} label="Current code" />
                      </div>
                      <pre className="scroll-slim overflow-x-auto p-3 text-muted-foreground leading-relaxed">
                        <code>{tip.before}</code>
                      </pre>
                    </div>
                  ) : null}
                  {tip.after ? (
                    <div className="overflow-hidden rounded-md border border-neon/30 bg-surface">
                      <div className="flex items-center justify-between border-b border-neon/20 bg-neon/5 px-3 py-1.5 text-[10px]">
                        <span className="font-semibold text-neon flex items-center gap-1">
                          <span>+</span> Recommended Replacement
                        </span>
                        <CopyButton text={tip.after} label="Recommended replacement" />
                      </div>
                      <pre className="scroll-slim overflow-x-auto p-3 text-foreground leading-relaxed">
                        <code>{tip.after}</code>
                      </pre>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {tip.before && tip.after && onApplyFix ? (
                <div className="mt-2 flex items-center justify-between">
                  <ApplyFixButton
                    label={`Applied: ${tip.title}`}
                    onApply={() => {
                      const res = applyImprovement(code, tip.before!, tip.after!, tipLines[i]);
                      if (res.success) {
                        onApplyFix(res.newCode, `Applied: ${tip.title}`);
                        return { success: true };
                      }
                      return { success: false, message: res.message };
                    }}
                    onRevert={() => {
                      const res = applyImprovement(code, tip.after!, tip.before!, tipLines[i]);
                      if (res.success) {
                        onApplyFix(res.newCode, `Reverted: ${tip.title}`);
                        return true;
                      }
                      return false;
                    }}
                  />
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
