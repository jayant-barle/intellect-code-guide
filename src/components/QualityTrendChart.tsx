import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Bug,
  Gauge,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { QualityReport } from "@/lib/quality-score";

export type TrendEntry = {
  entry: {
    id: string;
    code: string;
    created_at: string;
    last_used_at: string;
    hit_count: number;
    result: unknown;
  };
  report: QualityReport;
};

type ChartDataPoint = {
  id: string;
  date: string;
  fullDate: string;
  codePreview: string;
  score: number;
  grade: string;
  bugs: number;
  complexity: number;
  readability: number;
};

function getCodePreview(code: string): string {
  if (!code) return "Python Snippet";
  const firstLine = code
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !l.startsWith("#"));
  if (!firstLine) return "Python Snippet";
  return firstLine.length > 36 ? `${firstLine.slice(0, 33)}…` : firstLine;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartDataPoint }[];
  label?: string;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;

  return (
    <div className="rounded-xl border border-border bg-surface/95 backdrop-blur p-3.5 shadow-2xl font-mono text-xs space-y-2 min-w-[220px]">
      <div className="border-b border-border/60 pb-1.5">
        <p className="font-semibold text-foreground truncate max-w-[200px]" title={d.codePreview}>
          {d.codePreview}
        </p>
        <p className="text-muted-foreground text-[10px] mt-0.5">{d.fullDate}</p>
      </div>

      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Sparkles className="size-3 text-neon" />
            Quality Score
          </span>
          <span className="font-bold text-neon">
            {d.score}/100 <span className="text-[10px] text-muted-foreground">({d.grade})</span>
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Bug className="size-3 text-destructive" />
            Bugs Detected
          </span>
          <span className={`font-semibold ${d.bugs === 0 ? "text-neon" : "text-destructive"}`}>
            {d.bugs === 0 ? "0 (Clean)" : `${d.bugs} ${d.bugs === 1 ? "bug" : "bugs"}`}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Gauge className="size-3 text-[hsl(210,90%,60%)]" />
            Complexity
          </span>
          <span className="font-medium text-[hsl(210,90%,60%)]">{d.complexity}/100</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <BookOpen className="size-3 text-[hsl(280,80%,65%)]" />
            Readability
          </span>
          <span className="font-medium text-[hsl(280,80%,65%)]">{d.readability}/100</span>
        </div>
      </div>
    </div>
  );
}

export function QualityTrendChart({ data }: { data: TrendEntry[] }) {
  // Metric toggle visibility
  const [visibleMetrics, setVisibleMetrics] = useState({
    score: true,
    bugs: true,
    complexity: true,
    readability: false,
  });

  // Range window: 'all' | '10' | '5'
  const [rangeLimit, setRangeLimit] = useState<"all" | 10 | 5>("all");

  const allPoints = useMemo(() => {
    if (!data.length) return [];

    // Sort chronologically (oldest to newest)
    const sorted = [...data].sort(
      (a, b) => new Date(a.entry.created_at).getTime() - new Date(b.entry.created_at).getTime(),
    );

    return sorted.map((item): ChartDataPoint => {
      const d = new Date(item.entry.created_at);
      const bugsCount =
        item.entry.result && typeof item.entry.result === "object" && "bugs" in item.entry.result
          ? (item.entry.result as { bugs: unknown[] }).bugs.length
          : 0;

      return {
        id: item.entry.id,
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        fullDate: d.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        codePreview: getCodePreview(item.entry.code),
        score: item.report.overallScore,
        grade: item.report.letterGrade,
        bugs: bugsCount,
        complexity: item.report.complexitySubScore?.score ?? 75,
        readability: item.report.readabilitySubScore?.score ?? 80,
      };
    });
  }, [data]);

  // Apply range slice
  const chartData = useMemo(() => {
    if (rangeLimit === "all") return allPoints;
    return allPoints.slice(-rangeLimit);
  }, [allPoints, rangeLimit]);

  // Max bugs for right Y-axis
  const maxBugs = useMemo(() => {
    const max = Math.max(...chartData.map((d) => d.bugs), 1);
    return Math.max(max + 1, 3);
  }, [chartData]);

  // KPI Calculations
  const kpis = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0];
    const latest = chartData[chartData.length - 1];
    const delta = latest.score - first.score;
    const highest = Math.max(...chartData.map((d) => d.score));
    const cleanRuns = chartData.filter((d) => d.bugs === 0).length;
    return {
      delta,
      latestScore: latest.score,
      latestGrade: latest.grade,
      highestScore: highest,
      cleanRuns,
      totalRuns: chartData.length,
    };
  }, [chartData]);

  if (allPoints.length === 0) return null;

  // Single analysis baseline state
  if (allPoints.length === 1) {
    const single = allPoints[0];
    return (
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-neon" />
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Quality Trend Baseline
            </span>
          </div>
          <Badge
            variant="outline"
            className="border-neon/30 bg-neon/10 text-neon font-mono text-[10px]"
          >
            1 Analysis Logged
          </Badge>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-surface-2/40 border border-border/60">
          <div>
            <p className="font-mono text-xs text-muted-foreground">Initial Baseline Score</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-mono text-3xl font-bold text-neon">{single.score}/100</span>
              <span className="font-mono text-sm text-foreground">Grade {single.grade}</span>
            </div>
            <p className="font-mono text-xs text-muted-foreground mt-1">
              Snippet: <code className="text-foreground">{single.codePreview}</code>
            </p>
          </div>
          <div className="sm:text-right max-w-sm">
            <p className="font-mono text-xs text-foreground font-medium">
              Run another analysis to unlock trend trajectory
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Your second analysis will activate interactive graphs for score momentum, bug
              reductions, and Big-O tracking.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
      {/* Top Header & Range Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-md bg-neon/10 p-1.5 text-neon">
            <Activity className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-sm font-semibold tracking-tight text-foreground">
                Quality Trends & Trajectory
              </h2>
              {kpis && (
                <span
                  className={`inline-flex items-center gap-1 font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    kpis.delta > 0
                      ? "bg-neon/15 text-neon"
                      : kpis.delta < 0
                        ? "bg-destructive/15 text-destructive"
                        : "bg-surface-2 text-muted-foreground"
                  }`}
                >
                  {kpis.delta > 0 ? (
                    <TrendingUp className="size-3" />
                  ) : kpis.delta < 0 ? (
                    <TrendingDown className="size-3" />
                  ) : (
                    <Minus className="size-3" />
                  )}
                  {kpis.delta > 0 ? `+${kpis.delta} pts` : `${kpis.delta} pts`}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              Tracking code scores, bug resolution, and complexity over time
            </p>
          </div>
        </div>

        {/* Range Filters */}
        {allPoints.length > 5 && (
          <div className="flex items-center gap-1 bg-surface-2/60 rounded-lg p-1 border border-border self-start sm:self-auto font-mono text-[11px]">
            <button
              type="button"
              onClick={() => setRangeLimit("all")}
              className={`px-2.5 py-1 rounded transition-colors ${
                rangeLimit === "all"
                  ? "bg-neon text-background font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({allPoints.length})
            </button>
            {allPoints.length > 10 && (
              <button
                type="button"
                onClick={() => setRangeLimit(10)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  rangeLimit === 10
                    ? "bg-neon text-background font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Last 10
              </button>
            )}
            <button
              type="button"
              onClick={() => setRangeLimit(5)}
              className={`px-2.5 py-1 rounded transition-colors ${
                rangeLimit === 5
                  ? "bg-neon text-background font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Last 5
            </button>
          </div>
        )}
      </div>

      {/* KPI Stats Quick Bar */}
      {kpis && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 font-mono">
          <div className="rounded-lg bg-surface-2/40 border border-border/50 p-2.5">
            <span className="text-[10px] uppercase text-muted-foreground">Latest Score</span>
            <div className="text-base font-bold text-neon">
              {kpis.latestScore}/100{" "}
              <span className="text-[11px] font-normal text-muted-foreground">
                ({kpis.latestGrade})
              </span>
            </div>
          </div>
          <div className="rounded-lg bg-surface-2/40 border border-border/50 p-2.5">
            <span className="text-[10px] uppercase text-muted-foreground">Net Momentum</span>
            <div
              className={`text-base font-bold ${
                kpis.delta >= 0 ? "text-neon" : "text-destructive"
              }`}
            >
              {kpis.delta > 0 ? `+${kpis.delta}` : kpis.delta} pts
            </div>
          </div>
          <div className="rounded-lg bg-surface-2/40 border border-border/50 p-2.5">
            <span className="text-[10px] uppercase text-muted-foreground">Peak Quality</span>
            <div className="text-base font-bold text-foreground">{kpis.highestScore}/100</div>
          </div>
          <div className="rounded-lg bg-surface-2/40 border border-border/50 p-2.5">
            <span className="text-[10px] uppercase text-muted-foreground">Clean Runs</span>
            <div className="text-base font-bold text-foreground">
              {kpis.cleanRuns}/{kpis.totalRuns}{" "}
              <span className="text-[11px] font-normal text-muted-foreground">
                ({Math.round((kpis.cleanRuns / kpis.totalRuns) * 100)}%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Metric Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <button
            type="button"
            onClick={() => setVisibleMetrics((prev) => ({ ...prev, score: !prev.score }))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
              visibleMetrics.score
                ? "border-neon/40 bg-neon/15 text-neon font-semibold"
                : "border-border bg-surface-2/40 text-muted-foreground opacity-50"
            }`}
          >
            <span className="size-2 rounded-full bg-neon" />
            Quality Score
          </button>

          <button
            type="button"
            onClick={() => setVisibleMetrics((prev) => ({ ...prev, bugs: !prev.bugs }))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
              visibleMetrics.bugs
                ? "border-destructive/40 bg-destructive/15 text-destructive font-semibold"
                : "border-border bg-surface-2/40 text-muted-foreground opacity-50"
            }`}
          >
            <span className="size-2 rounded-full bg-destructive" />
            Bug Count
          </button>

          <button
            type="button"
            onClick={() =>
              setVisibleMetrics((prev) => ({
                ...prev,
                complexity: !prev.complexity,
              }))
            }
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
              visibleMetrics.complexity
                ? "border-[hsl(210,90%,60%)]/40 bg-[hsl(210,90%,60%)]/15 text-[hsl(210,90%,60%)] font-semibold"
                : "border-border bg-surface-2/40 text-muted-foreground opacity-50"
            }`}
          >
            <span className="size-2 rounded-full bg-[hsl(210,90%,60%)]" />
            Complexity
          </button>

          <button
            type="button"
            onClick={() =>
              setVisibleMetrics((prev) => ({
                ...prev,
                readability: !prev.readability,
              }))
            }
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
              visibleMetrics.readability
                ? "border-[hsl(280,80%,65%)]/40 bg-[hsl(280,80%,65%)]/15 text-[hsl(280,80%,65%)] font-semibold"
                : "border-border bg-surface-2/40 text-muted-foreground opacity-50"
            }`}
          >
            <span className="size-2 rounded-full bg-[hsl(280,80%,65%)]" />
            Readability
          </button>
        </div>

        <span className="font-mono text-[10px] text-muted-foreground">
          Click pills to toggle curves
        </span>
      </div>

      {/* Main Area Chart */}
      <ResponsiveContainer width="100%" height={230}>
        <AreaChart data={chartData} margin={{ top: 10, right: 12, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--neon)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--neon)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="bugGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="complexityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(210,90%,60%)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="hsl(210,90%,60%)" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="readabilityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(280,80%,65%)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="hsl(280,80%,65%)" stopOpacity={0.01} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />

          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          />

          {/* Left Y-Axis for Quality, Complexity & Readability (0 - 100) */}
          <YAxis
            yAxisId="score"
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          />

          {/* Right Y-Axis for Bug Count */}
          <YAxis
            yAxisId="bugs"
            orientation="right"
            domain={[0, maxBugs]}
            allowDecimals={false}
            hide={!visibleMetrics.bugs}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "var(--destructive)" }}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{
              stroke: "var(--neon)",
              strokeWidth: 1,
              strokeDasharray: "4 4",
            }}
          />

          {/* Quality Score Area */}
          {visibleMetrics.score && (
            <Area
              yAxisId="score"
              type="monotone"
              dataKey="score"
              name="Quality Score"
              stroke="var(--neon)"
              strokeWidth={2.5}
              fill="url(#scoreGradient)"
              dot={{
                r: 3.5,
                fill: "var(--neon)",
                stroke: "var(--background)",
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
                fill: "var(--neon)",
                stroke: "var(--background)",
                strokeWidth: 2,
              }}
            />
          )}

          {/* Complexity Score Area */}
          {visibleMetrics.complexity && (
            <Area
              yAxisId="score"
              type="monotone"
              dataKey="complexity"
              name="Complexity"
              stroke="hsl(210,90%,60%)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              fill="url(#complexityGradient)"
              dot={false}
            />
          )}

          {/* Readability Score Area */}
          {visibleMetrics.readability && (
            <Area
              yAxisId="score"
              type="monotone"
              dataKey="readability"
              name="Readability"
              stroke="hsl(280,80%,65%)"
              strokeWidth={1.5}
              strokeDasharray="2 2"
              fill="url(#readabilityGradient)"
              dot={false}
            />
          )}

          {/* Bug Count Area (mapped to right y-axis for proper non-squashed scaling) */}
          {visibleMetrics.bugs && (
            <Area
              yAxisId="bugs"
              type="monotone"
              dataKey="bugs"
              name="Bug Count"
              stroke="var(--destructive)"
              strokeWidth={2}
              strokeDasharray="3 3"
              fill="url(#bugGradient)"
              dot={{
                r: 3,
                fill: "var(--destructive)",
                stroke: "var(--background)",
                strokeWidth: 1.5,
              }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-muted-foreground pt-1 border-t border-border/40">
        <span>
          Showing {chartData.length} chronological analyses (oldest on left → newest on right)
        </span>
        {visibleMetrics.bugs && (
          <span className="text-destructive font-medium">
            Right Y-axis: Bug count (0–{maxBugs})
          </span>
        )}
      </div>
    </div>
  );
}
