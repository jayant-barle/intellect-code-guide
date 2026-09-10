import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  ExternalLink,
  Flame,
  Hourglass,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import {
  listAnalyses,
  retryAnalysis,
  deleteAnalysis,
  type HistoryEntry,
} from "@/lib/analyze.functions";
import { computeQualityScore } from "@/lib/quality-score";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type StalenessThreshold = "1h" | "6h" | "12h" | "24h" | "3d" | "7d" | "30d";

const THRESHOLD_MS: Record<StalenessThreshold, number> = {
  "1h": 1000 * 60 * 60,
  "6h": 1000 * 60 * 60 * 6,
  "12h": 1000 * 60 * 60 * 12,
  "24h": 1000 * 60 * 60 * 24,
  "3d": 1000 * 60 * 60 * 24 * 3,
  "7d": 1000 * 60 * 60 * 24 * 7,
  "30d": 1000 * 60 * 60 * 24 * 30,
};

const THRESHOLD_LABELS: Record<StalenessThreshold, string> = {
  "1h": "1 Hour",
  "6h": "6 Hours",
  "12h": "12 Hours",
  "24h": "24 Hours (Default)",
  "3d": "3 Days",
  "7d": "7 Days",
  "30d": "30 Days",
};

type FilterStatus = "all" | "stale" | "fresh" | "bugs";
type SortOption = "recent" | "oldest" | "runs" | "score-desc" | "score-asc";

function formatRelativeTime(dateString: string): string {
  try {
    const now = Date.now();
    const past = new Date(dateString).getTime();
    if (isNaN(past)) return "Unknown";
    const diffSec = Math.floor((now - past) / 1000);

    if (diffSec < 45) return "just now";
    if (diffSec < 90) return "1 min ago";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`;
    if (diffSec < 7200) return "1 hour ago";
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
    if (diffSec < 172800) return "yesterday";
    const days = Math.floor(diffSec / 86400);
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? "" : "s"} ago`;
  } catch {
    return dateString;
  }
}

function truncateHash(hash: string, length = 10): string {
  if (!hash) return "—";
  if (hash.length <= length + 6) return hash;
  return `${hash.slice(0, length)}…${hash.slice(-4)}`;
}

export function SettingsStatusView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchHistory = useServerFn(listAnalyses);
  const executeRetry = useServerFn(retryAnalysis);
  const executeDelete = useServerFn(deleteAnalysis);

  const {
    data: runs = [],
    isPending,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["analysis-history"],
    queryFn: () => fetchHistory(),
  });

  const [threshold, setThreshold] = useState<StalenessThreshold>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pylens_stale_threshold") as StalenessThreshold;
      if (saved && THRESHOLD_MS[saved]) return saved;
    }
    return "24h";
  });

  const handleThresholdChange = (val: StalenessThreshold) => {
    setThreshold(val);
    try {
      localStorage.setItem("pylens_stale_threshold", val);
    } catch {
      // ignore
    }
    toast.info(`Staleness threshold set to ${THRESHOLD_LABELS[val]}`);
  };

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortOption, setSortOption] = useState<SortOption>("recent");
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [batchRetrying, setBatchRetrying] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(
    null,
  );
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const thresholdMs = THRESHOLD_MS[threshold];
  const now = Date.now();

  // Annotate runs with staleness and quality score
  const annotatedRuns = useMemo(() => {
    return runs.map((run) => {
      const lastUsedMs = new Date(run.last_used_at).getTime();
      const ageMs = Math.max(0, now - (isNaN(lastUsedMs) ? 0 : lastUsedMs));
      const isStale = ageMs >= thresholdMs;
      const isAging = !isStale && ageMs >= thresholdMs * 0.7;
      const report = computeQualityScore(run.code, run.result);
      const bugCount = run.result?.bugs?.length ?? 0;

      return {
        ...run,
        ageMs,
        isStale,
        isAging,
        report,
        bugCount,
      };
    });
  }, [runs, thresholdMs, now]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = annotatedRuns.length;
    const staleCount = annotatedRuns.filter((r) => r.isStale).length;
    const freshCount = total - staleCount;
    const totalHits = annotatedRuns.reduce((sum, r) => sum + (r.hit_count || 1), 0);
    const avgScore = total
      ? Math.round(annotatedRuns.reduce((sum, r) => sum + r.report.overallScore, 0) / total)
      : 0;

    return {
      total,
      staleCount,
      freshCount,
      totalHits,
      avgScore,
    };
  }, [annotatedRuns]);

  // Filter and sort
  const filteredRuns = useMemo(() => {
    return annotatedRuns
      .filter((item) => {
        // Search filter
        if (search.trim()) {
          const q = search.toLowerCase().trim();
          const matchCode = item.code.toLowerCase().includes(q);
          const matchHash = item.code_hash?.toLowerCase().includes(q);
          const matchBug = item.result?.bugs?.some((b) => b.title.toLowerCase().includes(q));
          if (!matchCode && !matchHash && !matchBug) return false;
        }

        // Status filter
        if (filterStatus === "stale") return item.isStale;
        if (filterStatus === "fresh") return !item.isStale;
        if (filterStatus === "bugs") return item.bugCount > 0;
        return true;
      })
      .sort((a, b) => {
        if (sortOption === "recent") {
          return new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime();
        }
        if (sortOption === "oldest") {
          return new Date(a.last_used_at).getTime() - new Date(b.last_used_at).getTime();
        }
        if (sortOption === "runs") {
          return (b.hit_count || 1) - (a.hit_count || 1);
        }
        if (sortOption === "score-desc") {
          return b.report.overallScore - a.report.overallScore;
        }
        if (sortOption === "score-asc") {
          return a.report.overallScore - b.report.overallScore;
        }
        return 0;
      });
  }, [annotatedRuns, search, filterStatus, sortOption]);

  // Copy hash to clipboard
  const handleCopyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(hash);
      toast.success("SHA-256 Code hash copied to clipboard");
      setTimeout(() => setCopiedHash(null), 2000);
    } catch {
      toast.error("Failed to copy hash");
    }
  };

  // Quick Retry single run
  const handleQuickRetry = async (entry: HistoryEntry) => {
    setRetryingId(entry.id);
    try {
      toast.loading(`Re-analyzing code hash ${truncateHash(entry.code_hash, 6)}…`, {
        id: `retry-${entry.id}`,
      });

      await executeRetry({
        data: {
          code: entry.code,
          id: entry.id,
        },
      });

      await queryClient.invalidateQueries({ queryKey: ["analysis-history"] });
      toast.success("Analysis run refreshed! Timestamp updated to now.", {
        id: `retry-${entry.id}`,
      });
    } catch (err) {
      console.error("Retry failed:", err);
      toast.error("Retry failed. Please check network or API keys.", {
        id: `retry-${entry.id}`,
      });
    } finally {
      setRetryingId(null);
    }
  };

  // Batch Retry all stale runs
  const handleRetryAllStale = async () => {
    const staleItems = annotatedRuns.filter((r) => r.isStale);
    if (!staleItems.length) {
      toast.info("No stale analysis runs to retry!");
      return;
    }

    setBatchRetrying(true);
    setBatchProgress({ current: 0, total: staleItems.length });

    let successCount = 0;
    for (let i = 0; i < staleItems.length; i++) {
      const item = staleItems[i];
      setBatchProgress({ current: i + 1, total: staleItems.length });
      try {
        await executeRetry({
          data: {
            code: item.code,
            id: item.id,
          },
        });
        successCount++;
      } catch (err) {
        console.warn(`Failed to retry item ${item.id}:`, err);
      }
    }

    await queryClient.invalidateQueries({ queryKey: ["analysis-history"] });
    setBatchRetrying(false);
    setBatchProgress(null);
    toast.success(`Successfully retried ${successCount} of ${staleItems.length} stale runs!`);
  };

  // Open in editor
  const handleOpenInEditor = (code: string) => {
    try {
      sessionStorage.setItem("pylens_load_code", code);
      navigate({ to: "/" });
      toast.success("Loaded run code into PyLens editor");
    } catch {
      navigator.clipboard.writeText(code);
      toast.success("Code copied! Paste into PyLens editor.");
      navigate({ to: "/" });
    }
  };

  // Delete cache entry
  const handleDeleteEntry = async (id: string) => {
    try {
      await executeDelete({ data: { id } });
      await queryClient.invalidateQueries({ queryKey: ["analysis-history"] });
      toast.success("Analysis cache entry removed");
    } catch {
      toast.error("Failed to delete entry");
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        {/* Top KPI Summary Banner */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Runs */}
          <div className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border/80">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Total Cached Runs
              </span>
              <Layers className="size-4 text-neon" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-foreground">
                {isPending ? "…" : stats.total}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">in database</span>
            </div>
          </div>

          {/* Stale Runs Alert Card */}
          <div
            className={`rounded-xl border p-4 transition-colors ${
              stats.staleCount > 0
                ? "border-warn/40 bg-warn/5 hover:border-warn/60"
                : "border-border bg-surface"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Stale Runs
              </span>
              {stats.staleCount > 0 ? (
                <Hourglass className="size-4 text-warn animate-pulse" />
              ) : (
                <CheckCircle2 className="size-4 text-neon" />
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`font-mono text-2xl font-bold ${
                  stats.staleCount > 0 ? "text-warn" : "text-foreground"
                }`}
              >
                {isPending ? "…" : stats.staleCount}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                older than {threshold}
              </span>
            </div>
          </div>

          {/* Fresh Runs */}
          <div className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border/80">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Fresh Runs
              </span>
              <Sparkles className="size-4 text-neon" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-foreground">
                {isPending ? "…" : stats.freshCount}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                active & up-to-date
              </span>
            </div>
          </div>

          {/* Total Cache Hits */}
          <div className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border/80">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Cache Replays
              </span>
              <Zap className="size-4 text-neon" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-foreground">
                {isPending ? "…" : stats.totalHits}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">times replayed</span>
            </div>
          </div>
        </div>

        {/* Action & Filter Controls Bar */}
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code, SHA-256 hash, or bug title…"
              className="h-9 pl-9 font-mono text-xs bg-background/60 border-border"
            />
          </div>

          {/* Threshold & Status Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Staleness Threshold Selector */}
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs text-muted-foreground hidden md:inline">
                Stale after:
              </span>
              <Select
                value={threshold}
                onValueChange={(v) => handleThresholdChange(v as StalenessThreshold)}
              >
                <SelectTrigger className="h-9 w-[130px] font-mono text-xs bg-background/60">
                  <SelectValue placeholder="Threshold" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(THRESHOLD_LABELS) as StalenessThreshold[]).map((k) => (
                    <SelectItem key={k} value={k} className="font-mono text-xs">
                      {THRESHOLD_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort Dropdown */}
            <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
              <SelectTrigger className="h-9 w-[140px] font-mono text-xs bg-background/60">
                <ArrowUpDown className="mr-1.5 size-3 text-muted-foreground" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent" className="font-mono text-xs">
                  Most Recent
                </SelectItem>
                <SelectItem value="oldest" className="font-mono text-xs">
                  Oldest First
                </SelectItem>
                <SelectItem value="runs" className="font-mono text-xs">
                  Most Replays
                </SelectItem>
                <SelectItem value="score-desc" className="font-mono text-xs">
                  Highest Score
                </SelectItem>
                <SelectItem value="score-asc" className="font-mono text-xs">
                  Lowest Score
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Batch Retry Button */}
            {stats.staleCount > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={batchRetrying || isPending}
                onClick={handleRetryAllStale}
                className="h-9 gap-1.5 font-mono text-xs border-warn/40 bg-warn/10 text-warn hover:bg-warn/20"
              >
                {batchRetrying ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>
                      Retrying {batchProgress?.current}/{batchProgress?.total}…
                    </span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="size-3.5" />
                    <span>Retry All Stale ({stats.staleCount})</span>
                  </>
                )}
              </Button>
            )}

            {/* Refresh Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending || isRefetching}
              onClick={() => refetch()}
              className="h-9 w-9 p-0"
              title="Refresh analysis status list"
            >
              <RefreshCw
                className={`size-3.5 text-muted-foreground ${
                  isRefetching ? "animate-spin text-neon" : ""
                }`}
              />
            </Button>
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
          <Button
            type="button"
            size="sm"
            variant={filterStatus === "all" ? "default" : "ghost"}
            onClick={() => setFilterStatus("all")}
            className="h-7 gap-1.5 font-mono text-xs"
          >
            All Runs
            <span className="rounded bg-background/50 px-1.5 py-0.2 text-[10px]">
              {stats.total}
            </span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filterStatus === "stale" ? "destructive" : "ghost"}
            onClick={() => setFilterStatus("stale")}
            className={`h-7 gap-1.5 font-mono text-xs ${
              filterStatus === "stale"
                ? "bg-warn/90 text-background hover:bg-warn"
                : "text-warn hover:text-warn hover:bg-warn/10"
            }`}
          >
            <Hourglass className="size-3" />
            Stale Only
            <span className="rounded bg-background/40 px-1.5 py-0.2 text-[10px]">
              {stats.staleCount}
            </span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filterStatus === "fresh" ? "secondary" : "ghost"}
            onClick={() => setFilterStatus("fresh")}
            className="h-7 gap-1.5 font-mono text-xs"
          >
            <Sparkles className="size-3 text-neon" />
            Fresh Only
            <span className="rounded bg-background/50 px-1.5 py-0.2 text-[10px]">
              {stats.freshCount}
            </span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filterStatus === "bugs" ? "secondary" : "ghost"}
            onClick={() => setFilterStatus("bugs")}
            className="h-7 gap-1.5 font-mono text-xs"
          >
            With Bugs
          </Button>
        </div>

        {/* Runs List */}
        {isPending ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface/50 py-16">
            <Loader2 className="size-6 animate-spin text-neon" />
            <p className="mt-3 font-mono text-xs text-muted-foreground">
              Loading analysis runs and cache telemetry…
            </p>
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/30 px-4 py-16 text-center">
            <Code2 className="size-10 text-muted-foreground/50" />
            <h3 className="mt-4 font-mono text-sm font-semibold text-foreground">
              No matching analysis runs found
            </h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {search
                ? `No runs matched your search query "${search}". Try clearing the filter.`
                : filterStatus === "stale"
                  ? "Great news! None of your cached analysis runs are currently stale."
                  : "No code analyses have been saved yet. Run an analysis from the home workspace."}
            </p>
            <div className="mt-5 flex gap-2">
              {search || filterStatus !== "all" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setFilterStatus("all");
                  }}
                  className="font-mono text-xs"
                >
                  Clear Filters
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => navigate({ to: "/" })}
                  className="gap-1.5 font-mono text-xs bg-neon text-background hover:bg-neon/90"
                >
                  <Play className="size-3" />
                  Run First Analysis
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRuns.map((item) => {
              const isRetrying = retryingId === item.id;
              const isExpanded = expandedRowId === item.id;

              return (
                <div
                  key={item.id}
                  className={`overflow-hidden rounded-xl border transition-all ${
                    item.isStale
                      ? "border-warn/30 bg-surface/90 hover:border-warn/50"
                      : "border-border bg-surface hover:border-border/80"
                  }`}
                >
                  {/* Row Header Bar */}
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 bg-background/30">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Staleness Status Badge */}
                      {item.isStale ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-warn/40 bg-warn/10 font-mono text-[11px] text-warn"
                        >
                          <Hourglass className="size-3 animate-pulse" />
                          Stale ({formatRelativeTime(item.last_used_at)})
                        </Badge>
                      ) : item.isAging ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-yellow-500/40 bg-yellow-500/10 font-mono text-[11px] text-yellow-400"
                        >
                          <Clock className="size-3" />
                          Aging ({formatRelativeTime(item.last_used_at)})
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="gap-1 border-neon/40 bg-neon/10 font-mono text-[11px] text-neon"
                        >
                          <Sparkles className="size-3" />
                          Fresh ({formatRelativeTime(item.last_used_at)})
                        </Badge>
                      )}

                      {/* Code Hash Pill with 1-click Copy */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => handleCopyHash(item.code_hash)}
                            className="group inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 py-1 font-mono text-[11px] text-muted-foreground hover:border-neon/40 hover:text-foreground transition-colors"
                          >
                            <span className="text-[10px] uppercase text-muted-foreground/70">
                              hash:
                            </span>
                            <span className="font-semibold text-foreground">
                              {truncateHash(item.code_hash, 8)}
                            </span>
                            {copiedHash === item.code_hash ? (
                              <Check className="size-3 text-neon" />
                            ) : (
                              <Copy className="size-3 text-muted-foreground opacity-60 group-hover:opacity-100" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs break-all font-mono text-xs">
                          <p className="font-semibold text-neon">SHA-256 Code Hash:</p>
                          <p className="mt-1">{item.code_hash}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">Click to copy</p>
                        </TooltipContent>
                      </Tooltip>

                      {/* Quality Score & Bug Badges */}
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-2 text-foreground">
                        Score: {item.report.overallScore}/100
                      </span>

                      {item.bugCount > 0 ? (
                        <Badge
                          variant="outline"
                          className="border-destructive/40 bg-destructive/10 font-mono text-[11px] text-destructive gap-1"
                        >
                          <ShieldAlert className="size-3" />
                          {item.bugCount} bug{item.bugCount === 1 ? "" : "s"}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-neon/20 bg-neon/5 font-mono text-[11px] text-neon/80 gap-1"
                        >
                          <ShieldCheck className="size-3" />
                          Clean
                        </Badge>
                      )}

                      {/* Replay Count */}
                      <span className="font-mono text-[11px] text-muted-foreground flex items-center gap-1">
                        <Flame className="size-3 text-muted-foreground/70" />
                        {item.hit_count || 1} run{(item.hit_count || 1) === 1 ? "" : "s"}
                      </span>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2">
                      {/* QUICK RETRY BUTTON */}
                      <Button
                        type="button"
                        size="sm"
                        disabled={isRetrying || batchRetrying}
                        onClick={() => handleQuickRetry(item)}
                        className={`h-8 gap-1.5 font-mono text-xs ${
                          item.isStale
                            ? "bg-neon text-background hover:bg-neon/90 shadow-sm shadow-neon/20 font-semibold"
                            : "bg-surface-2 text-foreground hover:bg-surface-2/80 border border-border"
                        }`}
                        title="Re-run analysis engine and refresh cache timestamp"
                      >
                        {isRetrying ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            <span>Retrying…</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="size-3" />
                            <span>Quick Retry</span>
                          </>
                        )}
                      </Button>

                      {/* Open in Editor Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenInEditor(item.code)}
                        className="h-8 gap-1.5 font-mono text-xs"
                        title="Load this code into PyLens editor"
                      >
                        <ExternalLink className="size-3 text-muted-foreground" />
                        <span className="hidden sm:inline">Open in Editor</span>
                      </Button>

                      {/* Delete from cache */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEntry(item.id)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs font-mono">
                          Remove from database cache
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Code Preview Section */}
                  <div className="p-4">
                    <pre className="scroll-slim max-h-36 overflow-auto rounded-lg border border-border/70 bg-background/70 p-3 font-mono text-xs leading-5 text-foreground/90">
                      <code>{item.code}</code>
                    </pre>

                    {/* Timestamps & Telemetry Footer */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-4 font-mono text-[11px] text-muted-foreground">
                      <div className="flex flex-wrap items-center gap-4">
                        {/* Last executed */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1.5 cursor-help">
                              <Clock className="size-3 text-muted-foreground/70" />
                              Last Run: {formatRelativeTime(item.last_used_at)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="font-mono text-xs">
                            {new Date(item.last_used_at).toLocaleString()}
                          </TooltipContent>
                        </Tooltip>

                        {/* First created */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1.5 cursor-help">
                              <Layers className="size-3 text-muted-foreground/70" />
                              Created: {formatRelativeTime(item.created_at)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="font-mono text-xs">
                            {new Date(item.created_at).toLocaleString()}
                          </TooltipContent>
                        </Tooltip>

                        {/* Complexity Verdict */}
                        {item.result?.complexity && (
                          <span className="hidden md:inline text-muted-foreground/90">
                            Time: <span className="text-neon">{item.result.complexity.time}</span> |
                            Space: <span className="text-neon">{item.result.complexity.space}</span>
                          </span>
                        )}
                      </div>

                      {/* Expand / Collapse Details */}
                      <button
                        type="button"
                        onClick={() => setExpandedRowId(isExpanded ? null : item.id)}
                        className="text-[11px] text-neon hover:underline cursor-pointer"
                      >
                        {isExpanded ? "Hide Details ▲" : "View Breakdown ▼"}
                      </button>
                    </div>

                    {/* Expanded Breakdown */}
                    {isExpanded && item.result && (
                      <div className="mt-4 rounded-lg border border-border bg-background/40 p-3 space-y-3 font-mono text-xs">
                        {item.result.bugs && item.result.bugs.length > 0 && (
                          <div>
                            <span className="font-semibold text-destructive uppercase tracking-wider text-[10px]">
                              Detected Bugs ({item.result.bugs.length}):
                            </span>
                            <ul className="mt-1 space-y-1">
                              {item.result.bugs.map((b, idx) => (
                                <li key={idx} className="text-muted-foreground text-[11px]">
                                  • <span className="text-foreground">{b.title}</span> (line{" "}
                                  {b.line}, {b.severity} severity)
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {item.result.complexity && (
                          <div>
                            <span className="font-semibold text-neon uppercase tracking-wider text-[10px]">
                              Complexity Analysis:
                            </span>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {item.result.complexity.verdict}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
