import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpDown,
  Award,
  Bug,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Code2,
  Copy,
  ExternalLink,
  Filter,
  Gauge,
  GitCompare,
  Loader2,
  Play,
  Repeat,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReviewCompareModal } from "@/components/ReviewCompareModal";
import { listAnalyses, type HistoryEntry } from "@/lib/analyze.functions";
import { computeQualityScore } from "@/lib/quality-score";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Code Review — PyLens Python Analysis" },
      {
        name: "description",
        content:
          "Review all saved Python code analyses with bugs, improvements, complexity, and track quality over time.",
      },
      { property: "og:title", content: "Code Review — PyLens" },
      {
        property: "og:description",
        content: "Track Python code bugs, Big-O complexity, and improvements over time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReviewPage,
});

type FilterOption = "all" | "bugs" | "clean" | "inefficient";
type SortOption = "recent" | "score-desc" | "score-asc" | "runs";

function ReviewPage() {
  const navigate = useNavigate();
  const fetchHistory = useServerFn(listAnalyses);
  const { data = [], isPending } = useQuery({
    queryKey: ["analysis-history"],
    queryFn: () => fetchHistory(),
  });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterOption>("all");
  const [sort, setSort] = useState<SortOption>("recent");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparePair, setComparePair] = useState<[HistoryEntry, HistoryEntry] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Compute quality reports for all entries
  const entriesWithReports = useMemo(() => {
    return data.map((entry) => ({
      entry,
      report: computeQualityScore(entry.code, entry.result),
    }));
  }, [data]);

  // Aggregate metrics
  const stats = useMemo(() => {
    if (!entriesWithReports.length) return null;
    const total = entriesWithReports.length;
    const avgScore = Math.round(
      entriesWithReports.reduce((acc, curr) => acc + curr.report.overallScore, 0) / total,
    );
    const totalBugs = entriesWithReports.reduce(
      (acc, curr) => acc + (curr.entry.result?.bugs.length ?? 0),
      0,
    );
    const cleanCount = entriesWithReports.filter(
      (curr) => (curr.entry.result?.bugs.length ?? 0) === 0,
    ).length;

    return {
      total,
      avgScore,
      totalBugs,
      cleanCount,
      cleanPercent: Math.round((cleanCount / total) * 100),
    };
  }, [entriesWithReports]);

  // Filter and sort entries
  const filteredEntries = useMemo(() => {
    return entriesWithReports
      .filter(({ entry, report }) => {
        // Search filter
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchesCode = entry.code.toLowerCase().includes(q);
          const matchesBug = entry.result?.bugs.some((b) => b.title.toLowerCase().includes(q));
          if (!matchesCode && !matchesBug) return false;
        }

        // Category filter
        if (filter === "bugs") {
          return (entry.result?.bugs.length ?? 0) > 0;
        }
        if (filter === "clean") {
          return (entry.result?.bugs.length ?? 0) === 0;
        }
        if (filter === "inefficient") {
          return report.complexitySubScore.score < 70;
        }
        return true;
      })
      .sort((a, b) => {
        if (sort === "recent") {
          return (
            new Date(b.entry.last_used_at).getTime() - new Date(a.entry.last_used_at).getTime()
          );
        }
        if (sort === "score-desc") {
          return b.report.overallScore - a.report.overallScore;
        }
        if (sort === "score-asc") {
          return a.report.overallScore - b.report.overallScore;
        }
        if (sort === "runs") {
          return b.entry.hit_count - a.entry.hit_count;
        }
        return 0;
      });
  }, [entriesWithReports, search, filter, sort]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 2) {
        // Keep the latest clicked and the previous one
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const handleLaunchCompare = () => {
    if (selectedIds.length !== 2) return;
    const a = data.find((d) => d.id === selectedIds[0]);
    const b = data.find((d) => d.id === selectedIds[1]);
    if (a && b) {
      setComparePair([a, b]);
    }
  };

  const handleQuickCompareWithPrev = (currEntry: HistoryEntry, index: number) => {
    // Compare with previous in the current list
    const prevItem = filteredEntries[index + 1]?.entry ?? filteredEntries[index - 1]?.entry;
    if (prevItem) {
      setComparePair([prevItem, currEntry]);
    } else {
      toast.info("Need at least 2 saved analyses to compare.");
    }
  };

  const handleOpenInEditor = (code: string) => {
    try {
      sessionStorage.setItem("pylens_load_code", code);
      navigate({ to: "/" });
      toast.success("Code loaded in editor");
    } catch {
      navigator.clipboard.writeText(code);
      toast.success("Code copied to clipboard! Paste into the editor.");
      navigate({ to: "/" });
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground">
              Code Review
            </h1>
            <Badge
              variant="outline"
              className="border-neon/30 bg-neon/10 font-mono text-xs text-neon"
            >
              Analytics & History
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Audit your saved Python analyses, inspect bugs and complexity, and compare revisions
            over time.
          </p>
        </div>

        {selectedIds.length === 2 ? (
          <Button
            type="button"
            size="sm"
            onClick={handleLaunchCompare}
            className="gap-1.5 font-mono text-xs bg-neon text-background hover:bg-neon/90 animate-pulse"
          >
            <GitCompare className="size-3.5" />
            Compare Selected (2)
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: "/" })}
            className="gap-1.5 font-mono text-xs"
          >
            <Play className="size-3 text-neon" />
            New Analysis
          </Button>
        )}
      </div>

      {/* Stats Summary Bar */}
      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface p-4 space-y-1">
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Total Saved Reviews
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-2xl font-bold text-foreground">{stats.total}</span>
              <Repeat className="size-4 text-muted-foreground" />
            </div>
            <p className="font-mono text-[10px] text-muted-foreground">cached server-side</p>
          </div>

          <div className="rounded-xl border border-neon/30 bg-surface p-4 space-y-1">
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Avg Quality Score
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-2xl font-bold text-neon">{stats.avgScore}/100</span>
              <Award className="size-4 text-neon" />
            </div>
            <p className="font-mono text-[10px] text-neon">
              {stats.avgScore >= 85 ? "High Clean Code Ratio" : "Optimization Recommended"}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4 space-y-1">
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Bug-Free Ratio
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-2xl font-bold text-foreground">
                {stats.cleanPercent}%
              </span>
              <ShieldCheck className="size-4 text-neon" />
            </div>
            <p className="font-mono text-[10px] text-muted-foreground">
              {stats.cleanCount} of {stats.total} snippets sound
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4 space-y-1">
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Total Bugs Logged
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-2xl font-bold text-destructive">
                {stats.totalBugs}
              </span>
              <Bug className="size-4 text-destructive" />
            </div>
            <p className="font-mono text-[10px] text-muted-foreground">across all saved versions</p>
          </div>
        </div>
      ) : null}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code or bug titles…"
            className="pl-9 font-mono text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter options */}
          <div className="flex items-center gap-1 bg-surface-2/60 rounded-lg p-1 border border-border">
            {(["all", "clean", "bugs", "inefficient"] as FilterOption[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setFilter(opt)}
                className={`rounded-md px-2.5 py-1 font-mono text-[11px] capitalize transition ${
                  filter === opt
                    ? "bg-neon/15 text-neon font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          {/* Sort selection */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="h-8 rounded-lg border border-border bg-surface px-2.5 font-mono text-xs text-muted-foreground outline-none hover:border-neon/40 focus:border-neon"
          >
            <option value="recent">Sort: Recent</option>
            <option value="score-desc">Sort: Highest Score</option>
            <option value="score-asc">Sort: Lowest Score</option>
            <option value="runs">Sort: Most Executions</option>
          </select>
        </div>
      </div>

      {/* Floating Selection Banner */}
      {selectedIds.length > 0 ? (
        <div className="flex items-center justify-between rounded-xl border border-neon/40 bg-neon/10 px-4 py-2.5 font-mono text-xs text-neon">
          <div className="flex items-center gap-2">
            <Check className="size-4" />
            <span>
              {selectedIds.length} of 2 selected for comparison
              {selectedIds.length === 1 ? " (select one more to compare)" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length === 2 ? (
              <Button
                type="button"
                size="sm"
                onClick={handleLaunchCompare}
                className="h-7 gap-1 bg-neon font-mono text-xs text-background hover:bg-neon/90"
              >
                <GitCompare className="size-3" />
                Compare
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      {/* Review List */}
      {isPending ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-neon" />
          <p className="font-mono text-xs">Loading your saved code reviews…</p>
        </div>
      ) : !filteredEntries.length ? (
        <div className="grid min-h-[280px] place-items-center rounded-2xl border border-dashed border-border bg-surface/30 p-8 text-center font-mono text-xs text-muted-foreground">
          <div className="space-y-3 max-w-sm">
            <Code2 className="size-8 mx-auto text-neon opacity-70" />
            <p className="text-foreground font-medium">No saved code reviews found</p>
            <p className="text-[11px] leading-relaxed">
              {search || filter !== "all"
                ? "No reviews match your filter criteria. Try resetting the filters."
                : "Run an analysis on the home page to save your first review."}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/" })}
              className="gap-1.5"
            >
              <Play className="size-3" /> Go to Editor
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map(({ entry, report }, index) => {
            const isSelected = selectedIds.includes(entry.id);
            const isExpanded = expandedId === entry.id;
            const bugs = entry.result?.bugs ?? [];
            const improvements = entry.result?.improvements ?? [];
            const complexity = entry.result?.complexity;

            return (
              <div
                key={entry.id}
                className={`overflow-hidden rounded-xl border transition-all ${
                  isSelected
                    ? "border-neon bg-neon/5 ring-1 ring-neon/40"
                    : "border-border bg-surface hover:border-border/80"
                }`}
              >
                {/* Review Header Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-surface-2/20 px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(entry.id)}
                      className="size-4 rounded border-border accent-neon"
                      title="Select to compare"
                    />

                    {/* Quality Badge */}
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold text-foreground">
                        {report.overallScore}
                        <span className="text-xs font-normal text-muted-foreground">/100</span>
                      </span>
                      <Badge
                        variant="outline"
                        className={`font-mono text-[10px] uppercase tracking-wider ${
                          report.badgeTone === "neon"
                            ? "border-neon/30 bg-neon/10 text-neon"
                            : report.badgeTone === "warn"
                              ? "border-warn/30 bg-warn/10 text-warn"
                              : "border-destructive/30 bg-destructive/10 text-destructive"
                        }`}
                      >
                        Grade {report.letterGrade} · {report.badgeText}
                      </Badge>
                    </div>

                    {/* Timestamp & run count */}
                    <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                      <Clock className="size-3" />
                      {new Date(entry.last_used_at).toLocaleDateString()} at{" "}
                      {new Date(entry.last_used_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                      <Repeat className="size-3" />
                      {entry.hit_count} run{entry.hit_count === 1 ? "" : "s"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuickCompareWithPrev(entry, index)}
                      className="h-7 gap-1 font-mono text-[11px] text-muted-foreground hover:text-neon"
                    >
                      <GitCompare className="size-3" />
                      Compare
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenInEditor(entry.code)}
                      className="h-7 gap-1 font-mono text-[11px] hover:text-neon"
                    >
                      <ExternalLink className="size-3" />
                      Open
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="size-7 text-muted-foreground"
                    >
                      <ChevronDown
                        className={`size-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </Button>
                  </div>
                </div>

                {/* Metrics Chips Row */}
                <div className="flex flex-wrap items-center gap-3 px-5 py-3 bg-surface/60 border-b border-border/40 font-mono text-xs">
                  {/* Bugs chip */}
                  <span
                    className={`flex items-center gap-1.5 rounded-md px-2 py-1 ${
                      bugs.length > 0
                        ? "border border-destructive/30 bg-destructive/10 text-destructive"
                        : "border border-neon/30 bg-neon/10 text-neon"
                    }`}
                  >
                    <Bug className="size-3.5" />
                    <span>
                      {bugs.length > 0
                        ? `${bugs.length} bug${bugs.length === 1 ? "" : "s"}`
                        : "0 bugs"}
                    </span>
                  </span>

                  {/* Complexity chip */}
                  {complexity?.time ? (
                    <span className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2 py-1 text-foreground">
                      <Clock className="size-3.5 text-neon" />
                      <span>Time: {complexity.time}</span>
                      {complexity.space ? (
                        <span className="text-muted-foreground">· Space: {complexity.space}</span>
                      ) : null}
                    </span>
                  ) : null}

                  {/* Improvements chip */}
                  <span className="flex items-center gap-1.5 rounded-md border border-warn/30 bg-warn/10 px-2 py-1 text-warn">
                    <Wand2 className="size-3.5" />
                    <span>{improvements.length} suggestions</span>
                  </span>
                </div>

                {/* Code Preview */}
                <div className="px-5 py-3">
                  <pre className="scroll-slim max-h-28 overflow-auto rounded-lg border border-border bg-background/50 p-3 font-mono text-xs leading-5 text-foreground">
                    <code>{entry.code}</code>
                  </pre>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded ? (
                  <div className="border-t border-border bg-surface-2/20 p-5 space-y-4">
                    {/* Bugs breakdown */}
                    {bugs.length > 0 ? (
                      <div className="space-y-2">
                        <span className="font-mono text-xs font-semibold text-destructive flex items-center gap-1.5">
                          <Bug className="size-3.5" />
                          Detected Issues & Fixes
                        </span>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {bugs.map((b, i) => (
                            <div
                              key={i}
                              className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono font-medium text-foreground">
                                  {b.title} {typeof b.line === "number" ? `(line ${b.line})` : ""}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="font-mono text-[9px] uppercase border-destructive text-destructive"
                                >
                                  {b.severity}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground">{b.cause}</p>
                              {b.fix ? (
                                <p className="font-mono text-[11px] text-neon">Fix: {b.fix}</p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 font-mono text-xs text-neon">
                        <CheckCircle2 className="size-4" />
                        <span>Code is clean and verified bug-free.</span>
                      </div>
                    )}

                    {/* Improvements breakdown */}
                    {improvements.length > 0 ? (
                      <div className="space-y-2">
                        <span className="font-mono text-xs font-semibold text-warn flex items-center gap-1.5">
                          <Wand2 className="size-3.5" />
                          Recommended Refactorings
                        </span>
                        <div className="space-y-2">
                          {improvements.map((tip, i) => (
                            <div
                              key={i}
                              className="rounded-lg border border-warn/30 bg-warn/5 p-3 text-xs space-y-1.5"
                            >
                              <p className="font-mono font-medium text-foreground">{tip.title}</p>
                              <p className="text-muted-foreground leading-relaxed">
                                {tip.rationale}
                              </p>
                              {tip.before || tip.after ? (
                                <div className="grid gap-2 sm:grid-cols-2 pt-1 font-mono text-[11px]">
                                  {tip.before ? (
                                    <pre className="p-2 rounded bg-surface border border-border text-muted-foreground overflow-x-auto">
                                      <code>{tip.before}</code>
                                    </pre>
                                  ) : null}
                                  {tip.after ? (
                                    <pre className="p-2 rounded bg-neon/5 border border-neon/30 text-neon overflow-x-auto">
                                      <code>{tip.after}</code>
                                    </pre>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* Complexity breakdown */}
                    {complexity?.verdict ? (
                      <div className="rounded-lg border border-border bg-surface p-3 text-xs space-y-1">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Gauge className="size-3.5 text-neon" />
                          Big-O Scalability Verdict
                        </span>
                        <p className="text-muted-foreground leading-relaxed">
                          {complexity.verdict}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Comparison Modal */}
      {comparePair ? (
        <ReviewCompareModal
          entryA={comparePair[0]}
          entryB={comparePair[1]}
          onClose={() => setComparePair(null)}
          onSelectForEditor={handleOpenInEditor}
        />
      ) : null}
    </div>
  );
}
