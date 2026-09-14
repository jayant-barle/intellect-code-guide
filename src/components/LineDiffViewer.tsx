import { useMemo, useState } from "react";
import { ArrowUpDown, Check, Columns, Copy, ExternalLink, List, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  computeLineDiff,
  computeSplitDiff,
  type DiffLine,
  type DiffLineType,
  type SplitDiffRow,
} from "@/lib/diff-utils";

interface LineDiffViewerProps {
  codeA: string;
  codeB: string;
  labelA?: string;
  labelB?: string;
  subLabelA?: string;
  subLabelB?: string;
  onSwap?: () => void;
  onSelectForEditor?: (code: string) => void;
  className?: string;
}

export function LineDiffViewer({
  codeA,
  codeB,
  labelA = "Version A (Baseline)",
  labelB = "Version B (Comparison)",
  subLabelA,
  subLabelB,
  onSwap,
  onSelectForEditor,
  className,
}: LineDiffViewerProps) {
  const [viewMode, setViewMode] = useState<"split" | "unified">("split");
  const [copiedDiff, setCopiedDiff] = useState(false);
  const [copiedCodeB, setCopiedCodeB] = useState(false);

  const diff = useMemo(() => computeLineDiff(codeA, codeB), [codeA, codeB]);
  const splitRows = useMemo(() => computeSplitDiff(diff), [diff]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    let unchanged = 0;

    for (const item of diff) {
      if (item.type === "added") added++;
      else if (item.type === "removed") removed++;
      else unchanged++;
    }

    return { added, removed, unchanged, isIdentical: added === 0 && removed === 0 };
  }, [diff]);

  const copyDiff = async () => {
    try {
      const patch = [
        `--- ${labelA}`,
        `+++ ${labelB}`,
        ...diff.map((line) => {
          const prefix = line.type === "added" ? "+" : line.type === "removed" ? "-" : " ";
          return `${prefix} ${line.content}`;
        }),
      ].join("\n");

      await navigator.clipboard.writeText(patch);
      setCopiedDiff(true);
      toast.success("Unified diff copied to clipboard");
      setTimeout(() => setCopiedDiff(false), 1500);
    } catch {
      toast.error("Failed to copy diff");
    }
  };

  const copyCodeB = async () => {
    try {
      await navigator.clipboard.writeText(codeB);
      setCopiedCodeB(true);
      toast.success("Code copied to clipboard");
      setTimeout(() => setCopiedCodeB(false), 1500);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-surface shadow-md",
        className,
      )}
    >
      {/* Header Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-2/40 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <Badge
            variant="outline"
            className="gap-1 border-neon/40 bg-neon/10 text-neon font-semibold"
          >
            <Plus className="size-3" />
            {stats.added} addition{stats.added === 1 ? "" : "s"}
          </Badge>
          <Badge
            variant="outline"
            className="gap-1 border-destructive/40 bg-destructive/10 text-destructive font-semibold"
          >
            <Minus className="size-3" />
            {stats.removed} deletion{stats.removed === 1 ? "" : "s"}
          </Badge>
          <span className="text-muted-foreground text-[11px]">
            ({stats.unchanged} unchanged line{stats.unchanged === 1 ? "" : "s"})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center rounded-lg border border-border bg-surface p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[11px] transition-colors cursor-pointer",
                viewMode === "split"
                  ? "bg-neon text-background font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Side-by-side split view"
            >
              <Columns className="size-3" />
              <span>Split</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("unified")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[11px] transition-colors cursor-pointer",
                viewMode === "unified"
                  ? "bg-neon text-background font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Unified inline diff view"
            >
              <List className="size-3" />
              <span>Unified</span>
            </button>
          </div>

          {onSwap && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSwap}
              className="h-7 gap-1 font-mono text-[11px]"
              title="Swap comparison order"
            >
              <ArrowUpDown className="size-3" />
              <span>Swap</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyDiff}
            className="h-7 gap-1 font-mono text-[11px]"
            title="Copy git patch diff"
          >
            {copiedDiff ? <Check className="size-3 text-neon" /> : <Copy className="size-3" />}
            <span>{copiedDiff ? "Copied" : "Copy Diff"}</span>
          </Button>

          {onSelectForEditor && (
            <Button
              type="button"
              size="sm"
              onClick={() => onSelectForEditor(codeB)}
              className="h-7 gap-1 font-mono text-[11px] bg-neon text-background hover:bg-neon/90 font-semibold"
              title="Open Target code in main editor"
            >
              <ExternalLink className="size-3" />
              <span>Open in Editor</span>
            </Button>
          )}
        </div>
      </div>

      {/* Identical Notification Banner */}
      {stats.isIdentical ? (
        <div className="p-6 text-center font-mono">
          <div className="mx-auto mb-2 grid size-10 place-items-center rounded-full border border-neon/30 bg-neon/10 text-neon">
            <Check className="size-5" />
          </div>
          <p className="text-sm font-semibold text-foreground">Verbatim Identical Analyses</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Both saved analyses contain identical Python code with 0 line differences.
          </p>
        </div>
      ) : null}

      {/* Column Headers for Split View */}
      {viewMode === "split" && (
        <div className="grid grid-cols-2 border-b border-border bg-surface-2/60 font-mono text-xs">
          <div className="flex items-center justify-between border-r border-border px-4 py-2">
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-foreground">{labelA}</span>
              {subLabelA && (
                <span className="text-[10px] text-muted-foreground">({subLabelA})</span>
              )}
            </div>
            <span className="text-[10px] uppercase text-destructive font-semibold">
              Baseline (-)
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-neon">{labelB}</span>
              {subLabelB && (
                <span className="text-[10px] text-muted-foreground">({subLabelB})</span>
              )}
            </div>
            <span className="text-[10px] uppercase text-neon font-semibold">Target (+)</span>
          </div>
        </div>
      )}

      {/* Diff Content Body */}
      <div className="scroll-slim max-h-[600px] overflow-auto font-mono text-[12px] leading-6">
        {viewMode === "split" ? (
          /* Side-by-Side Split Diff */
          <div className="divide-y divide-border/40">
            {splitRows.map((row, idx) => {
              const left = row.left;
              const right = row.right;

              return (
                <div key={idx} className="grid grid-cols-2">
                  {/* Left Column (Version A) */}
                  <div
                    className={cn(
                      "flex min-w-0 border-r border-border select-text",
                      left?.type === "removed"
                        ? "bg-destructive/15 text-destructive"
                        : "text-foreground",
                      !left && "bg-surface-2/20",
                    )}
                  >
                    <div className="w-10 shrink-0 select-none border-r border-border/40 bg-surface-2/40 pr-2 text-right text-[11px] text-muted-foreground">
                      {left?.lineNum ?? ""}
                    </div>
                    <div className="w-5 shrink-0 select-none text-center font-bold">
                      {left?.type === "removed" ? "-" : ""}
                    </div>
                    <div className="min-w-0 flex-1 overflow-x-auto whitespace-pre px-2">
                      {left?.content ?? ""}
                    </div>
                  </div>

                  {/* Right Column (Version B) */}
                  <div
                    className={cn(
                      "flex min-w-0 select-text",
                      right?.type === "added" ? "bg-neon/15 text-neon" : "text-foreground",
                      !right && "bg-surface-2/20",
                    )}
                  >
                    <div className="w-10 shrink-0 select-none border-r border-border/40 bg-surface-2/40 pr-2 text-right text-[11px] text-muted-foreground">
                      {right?.lineNum ?? ""}
                    </div>
                    <div className="w-5 shrink-0 select-none text-center font-bold">
                      {right?.type === "added" ? "+" : ""}
                    </div>
                    <div className="min-w-0 flex-1 overflow-x-auto whitespace-pre px-2">
                      {right?.content ?? ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Unified Inline Diff */
          <div className="divide-y divide-border/40">
            {diff.map((line, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex min-w-0 select-text",
                  line.type === "added" && "bg-neon/15 text-neon",
                  line.type === "removed" && "bg-destructive/15 text-destructive",
                  line.type === "unchanged" && "text-foreground",
                )}
              >
                {/* Old line number */}
                <div className="w-10 shrink-0 select-none border-r border-border/40 bg-surface-2/40 pr-2 text-right text-[11px] text-muted-foreground">
                  {line.lineA ?? ""}
                </div>
                {/* New line number */}
                <div className="w-10 shrink-0 select-none border-r border-border/40 bg-surface-2/40 pr-2 text-right text-[11px] text-muted-foreground">
                  {line.lineB ?? ""}
                </div>
                {/* Operator symbol */}
                <div className="w-6 shrink-0 select-none text-center font-bold">
                  {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                </div>
                {/* Code content */}
                <div className="min-w-0 flex-1 overflow-x-auto whitespace-pre px-2">
                  {line.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info Bar */}
      <div className="flex flex-wrap items-center justify-between border-t border-border bg-surface-2/30 px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
        <span>Line-by-line comparison · Green (+) additions, Red (-) deletions</span>
        <button
          type="button"
          onClick={copyCodeB}
          className="hover:text-neon cursor-pointer transition-colors"
        >
          {copiedCodeB ? "Target code copied!" : "Copy Target code"}
        </button>
      </div>
    </div>
  );
}
