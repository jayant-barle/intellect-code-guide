import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  Bug,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  ExternalLink,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HistoryEntry } from "@/lib/analyze.functions";
import { computeQualityScore } from "@/lib/quality-score";

interface ReviewCompareModalProps {
  entryA: HistoryEntry;
  entryB: HistoryEntry;
  onClose: () => void;
  onSelectForEditor: (code: string) => void;
}

export function ReviewCompareModal({
  entryA,
  entryB,
  onClose,
  onSelectForEditor,
}: ReviewCompareModalProps) {
  const [swapped, setSwapped] = useState(false);

  // Chronologically order: older first, newer second (unless user explicitly swapped)
  const [older, newer] = useMemo(() => {
    const timeA = new Date(entryA.created_at).getTime();
    const timeB = new Date(entryB.created_at).getTime();
    const isAOlder = timeA <= timeB;
    const base = isAOlder ? [entryA, entryB] : [entryB, entryA];
    return swapped ? [base[1], base[0]] : base;
  }, [entryA, entryB, swapped]);

  const reportOlder = useMemo(
    () => computeQualityScore(older.code, older.result),
    [older.code, older.result],
  );
  const reportNewer = useMemo(
    () => computeQualityScore(newer.code, newer.result),
    [newer.code, newer.result],
  );

  const scoreDiff = reportNewer.overallScore - reportOlder.overallScore;
  const bugsDiff =
    reportOlder.bugsSubScore.details.length - reportNewer.bugsSubScore.details.length;

  const [copiedOlder, setCopiedOlder] = useState(false);
  const [copiedNewer, setCopiedNewer] = useState(false);

  const copyCode = async (code: string, isNewer: boolean) => {
    try {
      await navigator.clipboard.writeText(code);
      if (isNewer) {
        setCopiedNewer(true);
        setTimeout(() => setCopiedNewer(false), 1500);
      } else {
        setCopiedOlder(true);
        setTimeout(() => setCopiedOlder(false), 1500);
      }
      toast.success("Code copied to clipboard");
    } catch {
      toast.error("Failed to copy code");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-2/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-lg border border-neon/30 bg-neon/10 text-neon">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h2 className="font-mono text-base font-bold text-foreground">
                Code Review Comparison
              </h2>
              <p className="font-mono text-xs text-muted-foreground">
                Comparing analysis versions over time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSwapped((s) => !s)}
              className="h-8 gap-1.5 font-mono text-xs"
            >
              <ArrowUpDown className="size-3.5" />
              Swap Sides
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="size-8 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="scroll-slim flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Delta Banner */}
          <div className="grid gap-4 rounded-xl border border-border bg-surface-2/30 p-4 sm:grid-cols-3">
            {/* Score Delta */}
            <div className="flex flex-col gap-1.5 border-b border-border/60 pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Quality Score Shift
              </span>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-2xl font-bold text-foreground">
                  {reportOlder.overallScore}
                </span>
                <ArrowRight className="size-4 text-muted-foreground" />
                <span className="font-mono text-2xl font-bold text-neon">
                  {reportNewer.overallScore}
                </span>
                {scoreDiff > 0 ? (
                  <Badge className="gap-1 border-neon/40 bg-neon/10 font-mono text-xs text-neon">
                    <TrendingUp className="size-3" />+{scoreDiff} pts
                  </Badge>
                ) : scoreDiff < 0 ? (
                  <Badge className="gap-1 border-destructive/40 bg-destructive/10 font-mono text-xs text-destructive">
                    <TrendingDown className="size-3" />
                    {scoreDiff} pts
                  </Badge>
                ) : (
                  <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
                    No change
                  </Badge>
                )}
              </div>
            </div>

            {/* Bugs Delta */}
            <div className="flex flex-col gap-1.5 border-b border-border/60 pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Bugs Detected
              </span>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xl font-bold text-foreground">
                  {older.result?.bugs.length ?? 0}
                </span>
                <ArrowRight className="size-4 text-muted-foreground" />
                <span className="font-mono text-xl font-bold text-foreground">
                  {newer.result?.bugs.length ?? 0}
                </span>
                {bugsDiff > 0 ? (
                  <Badge className="gap-1 border-neon/40 bg-neon/10 font-mono text-xs text-neon">
                    <CheckCircle2 className="size-3" />
                    {bugsDiff} fixed
                  </Badge>
                ) : bugsDiff < 0 ? (
                  <Badge className="gap-1 border-destructive/40 bg-destructive/10 font-mono text-xs text-destructive">
                    +{Math.abs(bugsDiff)} new bugs
                  </Badge>
                ) : (
                  <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
                    Identical count
                  </Badge>
                )}
              </div>
            </div>

            {/* Complexity Delta */}
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Big-O Time Complexity
              </span>
              <div className="flex items-center gap-2.5">
                <Badge variant="outline" className="font-mono text-xs">
                  {older.result?.complexity?.time ?? "N/A"}
                </Badge>
                <ArrowRight className="size-4 text-muted-foreground" />
                <Badge
                  className={`font-mono text-xs ${
                    reportNewer.complexitySubScore.score >= reportOlder.complexitySubScore.score
                      ? "border-neon/40 bg-neon/10 text-neon"
                      : "border-warn/40 bg-warn/10 text-warn"
                  }`}
                >
                  {newer.result?.complexity?.time ?? "N/A"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Side by Side Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Older Version Column */}
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface-2/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px] uppercase">
                      Baseline (Earlier)
                    </Badge>
                    <span className="font-mono text-xs font-bold text-foreground">
                      Grade {reportOlder.letterGrade} ({reportOlder.overallScore}/100)
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {new Date(older.created_at).toLocaleString()} · {older.hit_count} run
                    {older.hit_count === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyCode(older.code, false)}
                    className="h-7 gap-1 font-mono text-[11px]"
                  >
                    {copiedOlder ? (
                      <Check className="size-3 text-neon" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    {copiedOlder ? "Copied" : "Copy"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectForEditor(older.code)}
                    className="h-7 gap-1 font-mono text-[11px] text-neon hover:text-neon"
                  >
                    <ExternalLink className="size-3" />
                    Edit
                  </Button>
                </div>
              </div>

              {/* Code block */}
              <div className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Source Code
                </span>
                <pre className="scroll-slim max-h-48 overflow-auto rounded-lg border border-border bg-background/60 p-3 font-mono text-xs leading-5 text-foreground">
                  <code>{older.code}</code>
                </pre>
              </div>

              {/* Bugs in Older */}
              <div className="space-y-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Bug className="size-3 text-destructive" />
                  Bugs Detected ({older.result?.bugs.length ?? 0})
                </span>
                {older.result?.bugs.length ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto scroll-slim">
                    {older.result.bugs.map((b, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs"
                      >
                        <p className="font-mono font-medium text-foreground">
                          {b.title} {typeof b.line === "number" ? `(line ${b.line})` : ""}
                        </p>
                        <p className="text-muted-foreground text-[11px] mt-0.5">{b.cause}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-xs text-neon">No bugs detected.</p>
                )}
              </div>

              {/* Improvements in Older */}
              <div className="space-y-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Code2 className="size-3 text-warn" />
                  Suggestions ({older.result?.improvements.length ?? 0})
                </span>
                {older.result?.improvements.length ? (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {older.result.improvements.slice(0, 3).map((imp, i) => (
                      <li key={i} className="flex items-start gap-1.5 font-mono text-[11px]">
                        <span className="mt-1 size-1 shrink-0 rounded-full bg-warn" />
                        <span>{imp.title}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-mono text-xs text-muted-foreground">No suggestions.</p>
                )}
              </div>
            </div>

            {/* Newer Version Column */}
            <div className="flex flex-col gap-4 rounded-xl border border-neon/30 bg-neon/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge className="border-neon/40 bg-neon/15 font-mono text-[10px] uppercase text-neon">
                      Target (Later)
                    </Badge>
                    <span className="font-mono text-xs font-bold text-neon">
                      Grade {reportNewer.letterGrade} ({reportNewer.overallScore}/100)
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {new Date(newer.created_at).toLocaleString()} · {newer.hit_count} run
                    {newer.hit_count === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyCode(newer.code, true)}
                    className="h-7 gap-1 font-mono text-[11px]"
                  >
                    {copiedNewer ? (
                      <Check className="size-3 text-neon" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    {copiedNewer ? "Copied" : "Copy"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onSelectForEditor(newer.code)}
                    className="h-7 gap-1 font-mono text-[11px] bg-neon text-background hover:bg-neon/90"
                  >
                    <ExternalLink className="size-3" />
                    Edit
                  </Button>
                </div>
              </div>

              {/* Code block */}
              <div className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Source Code
                </span>
                <pre className="scroll-slim max-h-48 overflow-auto rounded-lg border border-border bg-background/60 p-3 font-mono text-xs leading-5 text-foreground">
                  <code>{newer.code}</code>
                </pre>
              </div>

              {/* Bugs in Newer */}
              <div className="space-y-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Bug className="size-3 text-destructive" />
                  Bugs Detected ({newer.result?.bugs.length ?? 0})
                </span>
                {newer.result?.bugs.length ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto scroll-slim">
                    {newer.result.bugs.map((b, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs"
                      >
                        <p className="font-mono font-medium text-foreground">
                          {b.title} {typeof b.line === "number" ? `(line ${b.line})` : ""}
                        </p>
                        <p className="text-muted-foreground text-[11px] mt-0.5">{b.cause}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-xs text-neon">No bugs detected.</p>
                )}
              </div>

              {/* Improvements in Newer */}
              <div className="space-y-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Code2 className="size-3 text-warn" />
                  Suggestions ({newer.result?.improvements.length ?? 0})
                </span>
                {newer.result?.improvements.length ? (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {newer.result.improvements.slice(0, 3).map((imp, i) => (
                      <li key={i} className="flex items-start gap-1.5 font-mono text-[11px]">
                        <span className="mt-1 size-1 shrink-0 rounded-full bg-warn" />
                        <span>{imp.title}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-mono text-xs text-muted-foreground">No suggestions.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-border bg-surface-2/30 px-6 py-3 font-mono text-xs text-muted-foreground">
          <span>Tip: Select any 2 analyses on the review page to compare changes.</span>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
