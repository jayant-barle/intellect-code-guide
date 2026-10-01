import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Gauge,
  HardDrive,
  Play,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BenchmarkResult, TheoreticalComplexity } from "@/lib/optimizer-types";

interface BenchmarkComparisonViewProps {
  benchmark: BenchmarkResult | null;
  complexity: TheoreticalComplexity;
  isBenchmarking?: boolean;
  onRunBenchmark: () => void;
}

export function BenchmarkComparisonView({
  benchmark,
  complexity,
  isBenchmarking,
  onRunBenchmark,
}: BenchmarkComparisonViewProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-md bg-neon/15 text-neon">
              <Activity className="size-4" />
            </div>
            <h3 className="font-mono text-sm font-bold text-foreground uppercase tracking-wider">
              Performance Comparison
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Empirical runtime measurements vs theoretical Big-O complexity analysis.
          </p>
        </div>

        <Button
          onClick={onRunBenchmark}
          disabled={isBenchmarking}
          className="gap-2 font-mono text-xs bg-neon text-background hover:bg-neon/90 font-semibold shadow-md shadow-neon/20 px-4 shrink-0"
        >
          {isBenchmarking ? (
            <>
              <RotateCcw className="size-3.5 animate-spin" />
              Benchmarking in Sandbox...
            </>
          ) : (
            <>
              <Play className="size-3.5 fill-current" />
              ▶ Benchmark Code
            </>
          )}
        </Button>
      </div>

      {/* 1. Theoretical Complexity Breakdown */}
      <div className="rounded-lg border border-border/70 bg-surface-2/30 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-semibold">
            <Gauge className="size-3.5 text-neon" />
            Theoretical Complexity (Static Analysis)
          </span>
          <Badge variant="outline" className="font-mono text-[10px] border-neon/40 text-neon">
            {complexity.scalabilityVerdict}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-xs">
          <div className="rounded border border-border/40 bg-surface p-2">
            <div className="text-[10px] text-muted-foreground uppercase">Original Time</div>
            <div className="font-bold text-foreground mt-0.5">{complexity.currentTime}</div>
          </div>
          <div className="rounded border border-border/40 bg-surface p-2">
            <div className="text-[10px] text-muted-foreground uppercase">Optimized Time</div>
            <div className="font-bold text-neon mt-0.5">{complexity.potentialTime}</div>
          </div>
          <div className="rounded border border-border/40 bg-surface p-2">
            <div className="text-[10px] text-muted-foreground uppercase">Original Space</div>
            <div className="font-bold text-foreground mt-0.5">{complexity.currentSpace}</div>
          </div>
          <div className="rounded border border-border/40 bg-surface p-2">
            <div className="text-[10px] text-muted-foreground uppercase">Optimized Space</div>
            <div className="font-bold text-neon mt-0.5">{complexity.potentialSpace}</div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
          {complexity.complexityExplanation}
        </p>
      </div>

      {/* 2. Measured Benchmark Results */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-semibold">
            <Clock className="size-3.5 text-cyan-400" />
            Empirical Benchmark (Measured via tracemalloc & perf_counter)
          </span>
          <span className="text-[10px] font-mono text-emerald-500 flex items-center gap-1">
            <ShieldCheck className="size-3" />
            Isolated Sandbox
          </span>
        </div>

        {benchmark && benchmark.measured && benchmark.available ? (
          <div className="space-y-3">
            {/* Speed Improvement Banner */}
            <div
              className={`rounded-lg border p-3 flex flex-wrap items-center justify-between gap-3 ${
                benchmark.speedupPercent > 0
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-border bg-surface-2 text-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <TrendingUp className="size-4" />
                </div>
                <div>
                  <div className="font-mono text-sm font-bold">
                    {benchmark.speedupPercent > 0
                      ? `${benchmark.speedupPercent.toFixed(2)}% Speed Improvement`
                      : "Parity (Comparable Execution Time)"}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Workload: {benchmark.workloadDescription} ({benchmark.iterations} iterations)
                  </div>
                </div>
              </div>

              {benchmark.resultsMatch && (
                <div className="flex items-center gap-1 font-mono text-[11px] text-emerald-500 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded">
                  <CheckCircle2 className="size-3.5" />
                  Exact Return Parity Verified
                </div>
              )}
            </div>

            {/* Benchmark Table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-2/60 text-[10px] text-muted-foreground uppercase tracking-wider">
                    <th className="py-2.5 px-4 font-semibold">Metric</th>
                    <th className="py-2.5 px-4 font-semibold">Original</th>
                    <th className="py-2.5 px-4 font-semibold">Optimized</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 bg-surface">
                  <tr>
                    <td className="py-2.5 px-4 text-muted-foreground flex items-center gap-1.5">
                      <Clock className="size-3.5 text-muted-foreground" />
                      Execution Time
                    </td>
                    <td className="py-2.5 px-4 text-foreground font-medium">
                      {benchmark.originalTimeSec < 0.001
                        ? `${(benchmark.originalTimeSec * 1000).toFixed(3)} ms`
                        : `${benchmark.originalTimeSec.toFixed(4)} s`}
                    </td>
                    <td className="py-2.5 px-4 text-neon font-bold">
                      {benchmark.optimizedTimeSec < 0.001
                        ? `${(benchmark.optimizedTimeSec * 1000).toFixed(3)} ms`
                        : `${benchmark.optimizedTimeSec.toFixed(4)} s`}
                    </td>
                    <td className="py-2.5 px-4 text-right text-emerald-400 font-bold">
                      {benchmark.speedupPercent > 0
                        ? `-${benchmark.speedupPercent.toFixed(1)}%`
                        : "0.0%"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-muted-foreground flex items-center gap-1.5">
                      <HardDrive className="size-3.5 text-muted-foreground" />
                      Peak Memory Usage
                    </td>
                    <td className="py-2.5 px-4 text-foreground">
                      {benchmark.originalPeakKb > 1024
                        ? `${(benchmark.originalPeakKb / 1024).toFixed(2)} MB`
                        : `${benchmark.originalPeakKb.toFixed(2)} KB`}
                    </td>
                    <td className="py-2.5 px-4 text-foreground font-medium">
                      {benchmark.optimizedPeakKb > 1024
                        ? `${(benchmark.optimizedPeakKb / 1024).toFixed(2)} MB`
                        : `${benchmark.optimizedPeakKb.toFixed(2)} KB`}
                    </td>
                    <td className="py-2.5 px-4 text-right text-muted-foreground text-[11px]">
                      {benchmark.optimizedPeakKb > benchmark.originalPeakKb
                        ? `+${(benchmark.optimizedPeakKb - benchmark.originalPeakKb).toFixed(1)} KB`
                        : `${(benchmark.optimizedPeakKb - benchmark.originalPeakKb).toFixed(1)} KB`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-5 text-center space-y-2 bg-surface-2/20">
            <p className="text-xs text-muted-foreground font-mono">
              {benchmark && !benchmark.available
                ? `Benchmark unavailable: ${benchmark.reason}. Showing theoretical complexity comparison above.`
                : "Benchmark has not been run yet. Click '▶ Benchmark Code' to execute both implementations under identical conditions in the sandbox."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
