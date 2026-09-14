import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Code2,
  ExternalLink,
  GitCompare,
  History,
  Loader2,
  Play,
  Repeat,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { listAnalyses, type HistoryEntry } from "@/lib/analyze.functions";
import { computeQualityScore } from "@/lib/quality-score";
import { LineDiffViewer } from "@/components/LineDiffViewer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History & Compare — PyLens Python Code Analyses" },
      {
        name: "description",
        content:
          "Revisit your recent PyLens Python code analyses and compare changes line by line between any two saved versions.",
      },
      { property: "og:title", content: "History & Compare — PyLens" },
      {
        property: "og:description",
        content: "Revisit and compare saved Python code analyses line by line.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

function getSnippetTitle(code: string): string {
  if (!code) return "Python Snippet";
  const firstLine = code
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !l.startsWith("#"));
  if (!firstLine) return "Python Snippet";
  return firstLine.length > 40 ? `${firstLine.slice(0, 37)}…` : firstLine;
}

function HistoryPage() {
  const navigate = useNavigate();
  const fetchHistory = useServerFn(listAnalyses);
  const { data = [], isPending } = useQuery({
    queryKey: ["analysis-history"],
    queryFn: () => fetchHistory(),
  });

  const [view, setView] = useState<"list" | "compare">("list");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compareIdA, setCompareIdA] = useState<string | null>(null);
  const [compareIdB, setCompareIdB] = useState<string | null>(null);

  // Compute reports for comparing entries
  const entryA = useMemo(() => {
    if (!data.length) return null;
    if (compareIdA) {
      return data.find((d) => d.id === compareIdA) ?? data[0];
    }
    return data[1] ?? data[0];
  }, [data, compareIdA]);

  const entryB = useMemo(() => {
    if (!data.length) return null;
    if (compareIdB) {
      return data.find((d) => d.id === compareIdB) ?? data[0];
    }
    return data[0];
  }, [data, compareIdB]);

  const reportA = useMemo(
    () => (entryA ? computeQualityScore(entryA.code, entryA.result) : null),
    [entryA],
  );
  const reportB = useMemo(
    () => (entryB ? computeQualityScore(entryB.code, entryB.result) : null),
    [entryB],
  );

  const scoreDiff = reportA && reportB ? reportB.overallScore - reportA.overallScore : null;

  const handleSelectForEditor = (code: string) => {
    try {
      sessionStorage.setItem("pylens_load_code", code);
      navigate({ to: "/" });
      toast.success("Loaded code into editor");
    } catch {
      toast.error("Failed to load into editor");
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 2) {
        toast.info("Selected newest 2 analyses for comparison");
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const handleOpenCompareWithSelected = () => {
    if (selectedIds.length === 2) {
      setCompareIdA(selectedIds[0]);
      setCompareIdB(selectedIds[1]);
      setView("compare");
    } else if (data.length >= 2) {
      setCompareIdA(data[1].id);
      setCompareIdB(data[0].id);
      setView("compare");
    }
  };

  const handleQuickCompare = (id: string) => {
    // Pick the selected item as B, and the next available or first other as A
    const other = data.find((d) => d.id !== id);
    if (other) {
      setCompareIdA(other.id);
      setCompareIdB(id);
      setView("compare");
    }
  };

  const handleSwapCompare = () => {
    const temp = compareIdA;
    setCompareIdA(compareIdB);
    setCompareIdB(temp);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neon">
            <span className="size-1.5 rounded-full bg-neon" />
            Analysis Audit Vault
          </div>
          <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground">
            {view === "compare" ? "Compare Saved Analyses" : "Analysis History"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {view === "compare"
              ? "Inspect line-by-line differences, code changes, and score momentum between two versions."
              : "Saved analyses with instant replay. Select any two to compare line-by-line."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {view === "compare" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setView("list")}
              className="gap-1.5 font-mono text-xs"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to List</span>
            </Button>
          ) : (
            data.length >= 2 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenCompareWithSelected}
                className="gap-1.5 font-mono text-xs hover:border-neon/40 hover:text-neon"
              >
                <GitCompare className="size-3.5 text-neon" />
                <span>Compare Versions</span>
              </Button>
            )
          )}
        </div>
      </div>

      {isPending ? (
        <div className="py-12 flex items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-neon" /> loading saved analyses…
        </div>
      ) : !data.length ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center font-mono">
          <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-neon/10 text-neon">
            <History className="size-5" />
          </div>
          <p className="text-sm font-semibold text-foreground">No analyses saved yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Run an analysis from the home workspace to begin tracking code revisions.
          </p>
          <Button
            asChild
            size="sm"
            className="mt-4 gap-1.5 font-mono text-xs bg-neon text-background hover:bg-neon/90"
          >
            <a href="/">
              <Play className="size-3.5" />
              Go to Workspace
            </a>
          </Button>
        </div>
      ) : view === "compare" && entryA && entryB ? (
        /* ================= COMPARE VIEW ================= */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Comparison Version Selectors & Quick Swapper */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              {/* Version A Selector */}
              <div className="space-y-1.5">
                <label className="font-mono text-xs font-semibold text-foreground flex items-center gap-2">
                  <span className="size-2 rounded-full bg-destructive" />
                  Base Version (A)
                </label>
                <Select value={entryA.id} onValueChange={(val) => setCompareIdA(val)}>
                  <SelectTrigger className="font-mono text-xs bg-background">
                    <SelectValue placeholder="Select Base Version" />
                  </SelectTrigger>
                  <SelectContent className="font-mono text-xs max-h-72">
                    {data.map((entry, idx) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        #{data.length - idx}: {getSnippetTitle(entry.code)} (
                        {new Date(entry.last_used_at).toLocaleDateString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground px-1">
                  <span>{new Date(entryA.last_used_at).toLocaleString()}</span>
                  <span>
                    {entryA.hit_count} run{entryA.hit_count === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center pt-2 sm:pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleSwapCompare}
                  className="size-9 shrink-0 hover:border-neon/40 hover:text-neon cursor-pointer"
                  title="Swap comparison order"
                >
                  <ArrowUpDown className="size-4" />
                </Button>
              </div>

              {/* Version B Selector */}
              <div className="space-y-1.5">
                <label className="font-mono text-xs font-semibold text-neon flex items-center gap-2">
                  <span className="size-2 rounded-full bg-neon" />
                  Target Version (B)
                </label>
                <Select value={entryB.id} onValueChange={(val) => setCompareIdB(val)}>
                  <SelectTrigger className="font-mono text-xs bg-background border-neon/40">
                    <SelectValue placeholder="Select Target Version" />
                  </SelectTrigger>
                  <SelectContent className="font-mono text-xs max-h-72">
                    {data.map((entry, idx) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        #{data.length - idx}: {getSnippetTitle(entry.code)} (
                        {new Date(entry.last_used_at).toLocaleDateString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground px-1">
                  <span>{new Date(entryB.last_used_at).toLocaleString()}</span>
                  <span>
                    {entryB.hit_count} run{entryB.hit_count === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quality Comparison Metric Strip */}
            {reportA && reportB && (
              <div className="grid gap-3 border-t border-border/60 pt-3 sm:grid-cols-3 font-mono text-xs">
                {/* Score Delta */}
                <div className="flex items-center justify-between rounded-lg bg-surface-2/40 border border-border/50 p-2.5">
                  <span className="text-muted-foreground text-[11px]">Score Shift</span>
                  <div className="flex items-center gap-2">
                    <span className="text-foreground">{reportA.overallScore}</span>
                    <ArrowRight className="size-3 text-muted-foreground" />
                    <span className="font-bold text-neon">{reportB.overallScore}</span>
                    {scoreDiff !== null && scoreDiff !== 0 && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "px-1.5 py-0 text-[10px]",
                          scoreDiff > 0
                            ? "border-neon/40 bg-neon/15 text-neon"
                            : "border-destructive/40 bg-destructive/15 text-destructive",
                        )}
                      >
                        {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Bug Delta */}
                <div className="flex items-center justify-between rounded-lg bg-surface-2/40 border border-border/50 p-2.5">
                  <span className="text-muted-foreground text-[11px]">Bugs Count</span>
                  <div className="flex items-center gap-2">
                    <span className="text-foreground">{entryA.result?.bugs?.length ?? 0}</span>
                    <ArrowRight className="size-3 text-muted-foreground" />
                    <span
                      className={
                        (entryB.result?.bugs?.length ?? 0) === 0
                          ? "font-bold text-neon"
                          : "font-bold text-destructive"
                      }
                    >
                      {entryB.result?.bugs?.length ?? 0}
                    </span>
                  </div>
                </div>

                {/* Time Complexity */}
                <div className="flex items-center justify-between rounded-lg bg-surface-2/40 border border-border/50 p-2.5">
                  <span className="text-muted-foreground text-[11px]">Complexity</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {entryA.result?.complexity?.time ?? "N/A"}
                    </span>
                    <ArrowRight className="size-3 text-muted-foreground" />
                    <span className="font-semibold text-foreground">
                      {entryB.result?.complexity?.time ?? "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Line by Line Diff Viewer Component */}
          <LineDiffViewer
            codeA={entryA.code}
            codeB={entryB.code}
            labelA={`A: ${getSnippetTitle(entryA.code)}`}
            labelB={`B: ${getSnippetTitle(entryB.code)}`}
            subLabelA={new Date(entryA.last_used_at).toLocaleDateString()}
            subLabelB={new Date(entryB.last_used_at).toLocaleDateString()}
            onSwap={handleSwapCompare}
            onSelectForEditor={handleSelectForEditor}
          />
        </div>
      ) : (
        /* ================= LIST VIEW ================= */
        <div className="space-y-4">
          {/* Floating Selection Banner */}
          {selectedIds.length > 0 && (
            <div className="sticky top-14 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neon/40 bg-surface/95 p-3.5 backdrop-blur shadow-lg">
              <div className="flex items-center gap-2.5 font-mono text-xs">
                <Badge className="bg-neon/15 border-neon/40 text-neon">
                  {selectedIds.length} of 2 selected
                </Badge>
                <span className="text-muted-foreground">
                  {selectedIds.length === 1
                    ? "Select 1 more analysis to compare line by line."
                    : "Ready to inspect line-by-line differences."}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds([])}
                  className="h-7 gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                  Clear
                </Button>

                <Button
                  type="button"
                  size="sm"
                  disabled={selectedIds.length !== 2}
                  onClick={handleOpenCompareWithSelected}
                  className="h-7 gap-1.5 font-mono text-xs bg-neon text-background hover:bg-neon/90 font-semibold cursor-pointer disabled:opacity-50"
                >
                  <GitCompare className="size-3.5" />
                  Compare Line-by-Line (2)
                </Button>
              </div>
            </div>
          )}

          {/* History Cards List */}
          <ul className="flex flex-col gap-3">
            {data.map((entry, index) => {
              const isSelected = selectedIds.includes(entry.id);
              const snippetTitle = getSnippetTitle(entry.code);
              const report = computeQualityScore(entry.code, entry.result);

              return (
                <li
                  key={entry.id}
                  className={cn(
                    "overflow-hidden rounded-lg border transition-all duration-200 bg-surface",
                    isSelected
                      ? "border-neon ring-1 ring-neon/40 shadow-xs"
                      : "border-border hover:border-border/80",
                  )}
                >
                  {/* Card Header Bar */}
                  <div className="flex items-center justify-between border-b border-border/60 bg-surface-2/30 px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={`select-${entry.id}`}
                        checked={isSelected}
                        onCheckedChange={() => handleToggleSelect(entry.id)}
                        aria-label={`Select analysis ${snippetTitle} for comparison`}
                      />
                      <label
                        htmlFor={`select-${entry.id}`}
                        className="flex items-center gap-2 font-mono text-xs font-semibold text-foreground cursor-pointer"
                      >
                        <span className="text-muted-foreground text-[10px]">
                          #{data.length - index}
                        </span>
                        <span>{snippetTitle}</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-mono text-[10px]",
                          report.overallScore >= 80
                            ? "border-neon/40 bg-neon/10 text-neon"
                            : report.overallScore >= 60
                              ? "border-warn/40 bg-warn/10 text-warn"
                              : "border-destructive/40 bg-destructive/10 text-destructive",
                        )}
                      >
                        Grade {report.letterGrade} ({report.overallScore}/100)
                      </Badge>
                    </div>
                  </div>

                  {/* Code Snippet */}
                  <pre className="scroll-slim max-h-36 overflow-auto p-4 font-mono text-xs leading-6 text-foreground bg-background/40">
                    <code>{entry.code}</code>
                  </pre>

                  {/* Card Footer Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2 font-mono text-[11px] text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3" />
                        {new Date(entry.last_used_at).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Repeat className="size-3" />
                        {entry.hit_count} run{entry.hit_count === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuickCompare(entry.id)}
                        disabled={data.length < 2}
                        className="h-7 gap-1 font-mono text-[11px] hover:text-neon"
                        title="Compare this analysis with another version"
                      >
                        <GitCompare className="size-3" />
                        <span>Compare</span>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectForEditor(entry.code)}
                        className="h-7 gap-1 font-mono text-[11px] hover:text-neon"
                        title="Load this code into PyLens editor"
                      >
                        <ExternalLink className="size-3" />
                        <span>Edit</span>
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
