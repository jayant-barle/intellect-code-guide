import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  AlignLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  Code2,
  Copy,
  Cpu,
  FileCode2,
  Gauge,
  History,
  Lightbulb,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  Wand2,
  Zap,
} from "lucide-react";

import { CodeEditor } from "@/components/CodeEditor";
import { LineDiffViewer } from "@/components/LineDiffViewer";
import { PerformanceIssueCard } from "@/components/PerformanceIssueCard";
import { BenchmarkComparisonView } from "@/components/BenchmarkComparisonView";
import { OptimizationExplanationCard } from "@/components/OptimizationExplanationCard";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { analyzePerformanceFn, runBenchmarkFn } from "@/lib/optimizer.functions";
import { formatPythonFn } from "@/lib/test-generator.functions";
import type { PerformanceAnalysisResult, BenchmarkResult } from "@/lib/optimizer-types";
import { OPTIMIZER_SAMPLES } from "@/lib/optimizer-samples";

export const Route = createFileRoute("/optimizer")({
  head: () => ({
    meta: [
      { title: "AI Performance Optimizer — PyLens" },
      {
        name: "description",
        content:
          "Analyze Python code bottlenecks, calculate theoretical Big-O complexity, generate optimized code, and run empirical benchmarks in a secure sandbox.",
      },
      { property: "og:title", content: "AI Performance Optimizer — PyLens" },
      {
        property: "og:description",
        content: "Identify Python algorithmic bottlenecks, set lookups, and benchmark execution time.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: OptimizerPage,
});

const DEFAULT_OPTIMIZER_CODE = `def find_common(a, b):
    result = []
    for x in a:
        for y in b:
            if x == y:
                result.append(x)
    return result

# Benchmark execution sample
sample_a = list(range(1000))
sample_b = list(range(500, 1500))
common = find_common(sample_a, sample_b)
`;

function OptimizerPage() {
  const [code, setCode] = useState(DEFAULT_OPTIMIZER_CODE);
  const [activeTab, setActiveTab] = useState<"overview" | "compare" | "benchmark" | "explain">("overview");
  const [analysisResult, setAnalysisResult] = useState<PerformanceAnalysisResult | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [copiedOptimized, setCopiedOptimized] = useState(false);

  useEffect(() => {
    try {
      const pendingCode =
        sessionStorage.getItem("pylens_code_transfer") ||
        sessionStorage.getItem("pylens_load_code");
      if (pendingCode) {
        sessionStorage.removeItem("pylens_code_transfer");
        sessionStorage.removeItem("pylens_load_code");
        setCode(pendingCode);
        setAnalysisResult(null);
        setBenchmarkResult(null);
        toast.info("Loaded file code into Performance Optimizer");
      }
    } catch {
      // ignore
    }
  }, []);

  // Server functions
  const analyzeServerFn = useServerFn(analyzePerformanceFn);
  const benchmarkServerFn = useServerFn(runBenchmarkFn);
  const formatServerFn = useServerFn(formatPythonFn);

  // 1. Analyze & Optimize Mutation
  const analyzeMutation = useMutation({
    mutationFn: async (pythonCode: string) => {
      return analyzeServerFn({ data: { code: pythonCode } });
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      setBenchmarkResult(null); // Reset past benchmark for new analysis
      if (!data.valid && data.syntaxError) {
        toast.error(`Python syntax error at line ${data.syntaxError.line}: ${data.syntaxError.message}`);
      } else if (data.isOptimal) {
        toast.success("Code analyzed: Current implementation is already optimal!");
      } else {
        toast.success(
          `Detected ${data.summary.totalIssues} performance opportunities. Optimized code generated!`,
        );
      }
    },
    onError: (err) => {
      toast.error(
        `Analysis failed: ${err instanceof Error ? err.message : "Unable to analyze code right now."}`,
      );
    },
  });

  // 2. Benchmark Mutation
  const benchmarkMutation = useMutation({
    mutationFn: async ({
      originalCode,
      optimizedCode,
    }: {
      originalCode: string;
      optimizedCode: string;
    }) => {
      return benchmarkServerFn({
        data: {
          originalCode,
          optimizedCode,
        },
      });
    },
    onSuccess: (data) => {
      setBenchmarkResult(data);
      setActiveTab("benchmark");
      if (data.available && data.speedupPercent > 0) {
        toast.success(
          `Benchmark finished: ${data.speedupPercent.toFixed(1)}% speed improvement measured!`,
        );
      } else if (!data.available) {
        toast.info(data.reason || "Benchmark unavailable for this code pattern.");
      } else {
        toast.info("Benchmark complete: Both versions execute with comparable runtimes.");
      }
    },
    onError: (err) => {
      toast.error(`Benchmark failed: ${err instanceof Error ? err.message : String(err)}`);
    },
  });

  // 3. Format Mutation
  const formatMutation = useMutation({
    mutationFn: async (pythonCode: string) => {
      return formatServerFn({ data: { code: pythonCode } });
    },
    onSuccess: (data) => {
      setCode(data.formatted);
      toast.success("Code formatted (PEP 8 standard)");
    },
    onError: () => {
      toast.error("Could not format code. Verify syntax first.");
    },
  });

  const handleAnalyze = () => {
    if (!code.trim()) {
      toast.error("Please enter Python code before analyzing performance.");
      return;
    }
    analyzeMutation.mutate(code);
  };

  const handleRunBenchmark = () => {
    if (!analysisResult) {
      toast.error("Please analyze performance first before running benchmark.");
      return;
    }
    benchmarkMutation.mutate({
      originalCode: code,
      optimizedCode: analysisResult.optimizedCode,
    });
  };

  const handleApplyOptimization = (optCode: string) => {
    setCode(optCode);
    toast.success("Applied optimized code to editor!");
  };

  const handleCopyOptimized = async () => {
    if (!analysisResult?.optimizedCode) return;
    try {
      await navigator.clipboard.writeText(analysisResult.optimizedCode);
      setCopiedOptimized(true);
      toast.success("Optimized code copied to clipboard");
      setTimeout(() => setCopiedOptimized(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleLoadSample = (sampleCode: string) => {
    setCode(sampleCode);
    setAnalysisResult(null);
    setBenchmarkResult(null);
    toast.info("Sample loaded into editor");
  };

  const handleClear = () => {
    setCode("");
    setAnalysisResult(null);
    setBenchmarkResult(null);
    toast.info("Editor cleared");
  };

  // Keyboard shortcut Ctrl+Enter or Cmd+Enter to analyze
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleAnalyze();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [code]);

  // Syntax highlight line
  const syntaxHighlightLine =
    analysisResult && !analysisResult.valid && analysisResult.syntaxError
      ? analysisResult.syntaxError.line
      : null;

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neon">
              <Zap className="size-3.5" />
              Algorithmic Performance Engineering
            </div>
            <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
              AI Performance Optimizer
              <span className="font-mono text-xs font-normal text-muted-foreground border border-border/80 px-2 py-0.5 rounded bg-surface">
                Big-O & Benchmarks
              </span>
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs text-muted-foreground leading-relaxed">
              Detect loops, redundant calculations, and inefficient data structures in Python code.
              Compare theoretical Big-O complexity with empirical execution benchmarks in a secure sandbox.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Samples Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 font-mono text-xs border-border bg-surface hover:bg-surface-2"
                >
                  <Code2 className="size-3.5 text-neon" />
                  Load Pattern
                  <ChevronDown className="size-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 font-mono text-xs">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Select Performance Scenario
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {OPTIMIZER_SAMPLES.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onClick={() => handleLoadSample(s.code)}
                    className="flex flex-col items-start py-2 cursor-pointer"
                  >
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <span>{s.name}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                      {s.description}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Format Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => formatMutation.mutate(code)}
              disabled={formatMutation.isPending || !code.trim()}
              className="gap-1.5 font-mono text-xs border-border bg-surface hover:bg-surface-2"
              title="Auto-format code to PEP 8 standard"
            >
              <AlignLeft className="size-3.5" />
              Format
            </Button>

            {/* Clear Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={!code}
              className="gap-1.5 font-mono text-xs border-border bg-surface hover:bg-surface-2 text-muted-foreground hover:text-destructive"
              title="Clear editor"
            >
              <Trash2 className="size-3.5" />
              Clear
            </Button>
          </div>
        </div>

        {/* Two-Column Professional Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Code Input (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-sm">
              <div className="flex items-center justify-between border-b border-border bg-surface-2/60 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-neon animate-pulse" />
                    target_script.py
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    ({code.split("\n").length} lines)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground">Python 3.14</span>
                </div>
              </div>

              {/* Code Editor */}
              <div className="min-h-[420px] max-h-[580px] overflow-hidden">
                <CodeEditor
                  value={code}
                  onChange={setCode}
                  highlightLine={syntaxHighlightLine}
                />
              </div>

              {/* Editor Bottom Bar with Primary Analyze Button */}
              <div className="flex items-center justify-between border-t border-border bg-surface-2/40 p-3">
                <span className="text-[11px] text-muted-foreground font-mono">
                  Press <kbd className="rounded border bg-surface px-1 text-[10px]">Ctrl+Enter</kbd> to analyze
                </span>
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzeMutation.isPending || !code.trim()}
                  className="gap-2 font-mono text-xs bg-neon text-background hover:bg-neon/90 font-semibold shadow-md shadow-neon/20 px-5"
                >
                  {analyzeMutation.isPending ? (
                    <>
                      <RotateCcw className="size-3.5 animate-spin" />
                      Analyzing Performance...
                    </>
                  ) : (
                    <>
                      <Zap className="size-3.5 fill-current" />
                      ⚡ Analyze Performance
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Syntax Error Notice if invalid */}
            {analysisResult && !analysisResult.valid && analysisResult.syntaxError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs font-semibold text-destructive uppercase tracking-wider">
                    <AlertTriangle className="size-4" />
                    Python Syntax Error Detected
                  </div>
                  <Badge variant="destructive" className="font-mono text-[10px]">
                    Line {analysisResult.syntaxError.line}
                  </Badge>
                </div>
                <p className="font-mono text-xs text-foreground/90">
                  {analysisResult.syntaxError.message}
                </p>
                {analysisResult.syntaxError.text && (
                  <pre className="rounded border border-destructive/20 bg-background/60 p-2 font-mono text-[11px] text-destructive-foreground">
                    <code>{analysisResult.syntaxError.text}</code>
                  </pre>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Please fix the syntax error above before running performance analysis.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Performance Results, Diff, Benchmark (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {analysisResult && analysisResult.valid ? (
              <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-sm">
                {/* Header Summary Dashboard */}
                <div className="border-b border-border bg-surface-2/60 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="grid size-8 place-items-center rounded bg-neon/15 text-neon">
                        <Gauge className="size-4" />
                      </div>
                      <div>
                        <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                          Performance Analysis Dashboard
                        </h2>
                        <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                          {analysisResult.isOptimal
                            ? "Current implementation is already optimal"
                            : `${analysisResult.summary.totalIssues} bottleneck(s) identified • ${analysisResult.summary.confirmedCount} confirmed`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleRunBenchmark}
                        disabled={benchmarkMutation.isPending}
                        className="gap-1.5 font-mono text-xs bg-neon text-background hover:bg-neon/90 font-medium shrink-0"
                      >
                        {benchmarkMutation.isPending ? (
                          <>
                            <RotateCcw className="size-3 animate-spin" />
                            Benchmarking...
                          </>
                        ) : (
                          <>
                            <Play className="size-3 fill-current" />
                            Benchmark
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Summary Metric Pills */}
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pt-1 font-mono text-center">
                    <div className="rounded border border-border/40 bg-surface p-2">
                      <div className="text-base font-bold text-foreground">
                        {analysisResult.summary.totalIssues}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase">Issues</div>
                    </div>
                    <div className="rounded border border-destructive/30 bg-destructive/5 p-2">
                      <div className="text-base font-bold text-destructive">
                        {analysisResult.summary.criticalCount}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase">Critical</div>
                    </div>
                    <div className="rounded border border-orange-500/30 bg-orange-500/5 p-2">
                      <div className="text-base font-bold text-orange-400">
                        {analysisResult.summary.highCount}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase">High</div>
                    </div>
                    <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2">
                      <div className="text-base font-bold text-amber-400">
                        {analysisResult.summary.mediumCount}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase">Medium</div>
                    </div>
                    <div className="rounded border border-border/40 bg-surface p-2 col-span-4 sm:col-span-1">
                      <div className="text-base font-bold text-neon">
                        {analysisResult.complexity.currentTime} → {analysisResult.complexity.potentialTime}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase">Scaling Gain</div>
                    </div>
                  </div>
                </div>

                {/* Navigation Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                  <div className="border-b border-border px-3.5 flex items-center justify-between">
                    <TabsList className="bg-transparent h-10 p-0 gap-4">
                      <TabsTrigger
                        value="overview"
                        className="font-mono text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-neon rounded-none px-1 h-10 text-muted-foreground data-[state=active]:text-foreground"
                      >
                        Bottlenecks ({analysisResult.issues.length})
                      </TabsTrigger>
                      <TabsTrigger
                        value="compare"
                        className="font-mono text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-neon rounded-none px-1 h-10 text-muted-foreground data-[state=active]:text-foreground"
                      >
                        Original vs Optimized
                      </TabsTrigger>
                      <TabsTrigger
                        value="benchmark"
                        className="font-mono text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-neon rounded-none px-1 h-10 text-muted-foreground data-[state=active]:text-foreground relative"
                      >
                        Benchmark
                        {benchmarkResult?.measured && (
                          <span className="ml-1.5 size-2 rounded-full inline-block bg-emerald-400" />
                        )}
                      </TabsTrigger>
                      <TabsTrigger
                        value="explain"
                        className="font-mono text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-neon rounded-none px-1 h-10 text-muted-foreground data-[state=active]:text-foreground"
                      >
                        AI Explanation
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* 1. Overview & Bottlenecks */}
                  <TabsContent value="overview" className="p-4 space-y-3.5 m-0 focus-visible:outline-none">
                    {analysisResult.isOptimal ? (
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-3">
                        <div className="grid size-12 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400 mx-auto border border-emerald-500/30">
                          <Check className="size-6" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-mono text-sm font-bold text-foreground">
                            No Significant Performance Optimization Detected
                          </h3>
                          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                            Time Complexity: <strong className="text-foreground">{analysisResult.complexity.currentTime}</strong> • Space Complexity: <strong className="text-foreground">{analysisResult.complexity.currentSpace}</strong>
                          </p>
                          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed pt-1">
                            The current implementation is already efficient and does not exhibit quadratic iterations, redundant allocations, or unmemoized recursion.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 scroll-slim">
                        {analysisResult.issues.map((issue) => (
                          <PerformanceIssueCard key={issue.id} issue={issue} />
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* 2. Original vs Optimized Diff View */}
                  <TabsContent value="compare" className="p-4 space-y-3.5 m-0 focus-visible:outline-none">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                      <span className="font-mono text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <FileCode2 className="size-4 text-neon" />
                        Side-by-Side Implementation Comparison
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyOptimized}
                          className="h-7 gap-1 font-mono text-xs border-border bg-surface hover:bg-surface-2"
                        >
                          {copiedOptimized ? <Check className="size-3 text-neon" /> : <Copy className="size-3" />}
                          {copiedOptimized ? "Copied" : "Copy Optimized"}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApplyOptimization(analysisResult.optimizedCode)}
                          className="h-7 gap-1 font-mono text-xs bg-neon text-background hover:bg-neon/90"
                        >
                          <Wand2 className="size-3" />
                          Apply Optimization to Editor
                        </Button>
                      </div>
                    </div>

                    <LineDiffViewer
                      codeA={code}
                      codeB={analysisResult.optimizedCode}
                      labelA="Original Code"
                      labelB="Optimized Code"
                      subLabelA={`${analysisResult.complexity.currentTime} time`}
                      subLabelB={`${analysisResult.complexity.potentialTime} time`}
                      onSelectForEditor={handleApplyOptimization}
                    />
                  </TabsContent>

                  {/* 3. Benchmark View */}
                  <TabsContent value="benchmark" className="p-4 m-0 focus-visible:outline-none">
                    <BenchmarkComparisonView
                      benchmark={benchmarkResult}
                      complexity={analysisResult.complexity}
                      isBenchmarking={benchmarkMutation.isPending}
                      onRunBenchmark={handleRunBenchmark}
                    />
                  </TabsContent>

                  {/* 4. AI Explanation View */}
                  <TabsContent value="explain" className="p-4 m-0 focus-visible:outline-none">
                    <OptimizationExplanationCard
                      explanation={analysisResult.aiExplanation}
                      isOptimal={analysisResult.isOptimal}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              /* Empty state before running analysis */
              <div className="flex flex-col items-center justify-center p-12 rounded-lg border border-dashed border-border/80 bg-surface/40 text-center space-y-4 min-h-[420px]">
                <div className="grid size-14 place-items-center rounded-2xl bg-neon/10 text-neon border border-neon/30 shadow-inner">
                  <Zap className="size-7" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h3 className="font-mono text-base font-semibold text-foreground">
                    Ready for Performance Analysis
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Paste your Python code on the left, then click{" "}
                    <strong className="text-foreground">⚡ Analyze Performance</strong>. PyLens will
                    analyze the AST for nested loops, repeated computations, and memory bloat, compute
                    theoretical Big-O scaling, and provide an empirical benchmark in an isolated sandbox.
                  </p>
                </div>
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzeMutation.isPending || !code.trim()}
                  className="gap-2 font-mono text-xs bg-neon text-background hover:bg-neon/90 font-semibold shadow-md shadow-neon/20 px-5"
                >
                  <Zap className="size-3.5 fill-current" />
                  Analyze Performance Now
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
