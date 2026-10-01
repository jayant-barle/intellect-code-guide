import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Code2,
  Copy,
  ExternalLink,
  Flame,
  HelpCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  Terminal,
  Wand2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TestRunResult, IndividualTestResult } from "@/lib/test-generator-types";

interface TestResultsViewProps {
  results: TestRunResult | null;
  isRunning?: boolean;
  onRunTests: () => void;
  onApplyFix?: (fixedCode: string) => void;
}

type FilterState = "all" | "failed" | "passed" | "errors";

export function TestResultsView({
  results,
  isRunning,
  onRunTests,
  onApplyFix,
}: TestResultsViewProps) {
  const [filter, setFilter] = useState<FilterState>("all");
  const [showRawOutput, setShowRawOutput] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [appliedFixTest, setAppliedFixTest] = useState<string | null>(null);

  if (!results && !isRunning) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed border-border/80 bg-surface/50 text-center space-y-4">
        <div className="grid size-12 place-items-center rounded-xl bg-neon/10 text-neon border border-neon/30">
          <Play className="size-6 ml-0.5" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h4 className="font-mono text-sm font-semibold text-foreground">Ready to Execute Tests</h4>
          <p className="text-xs text-muted-foreground">
            Execute the generated pytest suite in an isolated, secure sandbox workspace.
          </p>
        </div>
        <Button
          onClick={onRunTests}
          className="gap-2 font-mono text-xs bg-neon text-background hover:bg-neon/90 font-semibold shadow-md shadow-neon/20 px-5"
        >
          <Play className="size-3.5 fill-current" />
          Run Pytest Suite
        </Button>
      </div>
    );
  }

  if (isRunning) {
    return (
      <div className="flex flex-col items-center justify-center p-12 rounded-lg border border-border bg-surface text-center space-y-4 animate-in fade-in">
        <div className="grid size-12 place-items-center rounded-xl bg-neon/15 text-neon border border-neon/40 animate-pulse">
          <RotateCcw className="size-6 animate-spin" />
        </div>
        <div className="space-y-1">
          <h4 className="font-mono text-sm font-semibold text-foreground">
            Running Tests in Sandbox...
          </h4>
          <p className="text-xs text-muted-foreground font-mono">
            Executing pytest in isolated temporary environment
          </p>
        </div>
      </div>
    );
  }

  if (!results) return null;

  const { summary, duration, tests, stdout, stderr, exitCode, securityAudit } = results;
  const isAllPassed = summary.failed === 0 && summary.errors === 0 && summary.passed > 0;
  const passRate =
    summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;

  const filteredTests = tests.filter((t) => {
    if (filter === "passed") return t.outcome === "passed";
    if (filter === "failed") return t.outcome === "failed";
    if (filter === "errors") return t.outcome === "error";
    return true;
  });

  const handleCopyRaw = async () => {
    try {
      await navigator.clipboard.writeText(`${stdout}\n${stderr}`);
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleApplyFix = (testName: string, fixedCode: string) => {
    if (onApplyFix) {
      onApplyFix(fixedCode);
      setAppliedFixTest(testName);
      setTimeout(() => setAppliedFixTest(null), 3000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Status Banner */}
      <div
        className={`rounded-lg border p-4 transition-all duration-200 ${
          isAllPassed
            ? "border-emerald-500/40 bg-emerald-500/10"
            : summary.failed > 0
            ? "border-destructive/40 bg-destructive/10"
            : "border-amber-500/40 bg-amber-500/10"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`grid size-10 shrink-0 place-items-center rounded-lg border ${
                isAllPassed
                  ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
                  : summary.failed > 0
                  ? "border-destructive/50 bg-destructive/20 text-destructive"
                  : "border-amber-500/50 bg-amber-500/20 text-amber-400"
              }`}
            >
              {isAllPassed ? (
                <CheckCircle2 className="size-5" />
              ) : (
                <XCircle className="size-5" />
              )}
            </div>
            <div>
              <h3 className="font-mono text-sm font-semibold text-foreground">
                {isAllPassed
                  ? `All ${summary.passed} Tests Passed Successfully!`
                  : `${summary.failed} of ${summary.total} Tests Failed`}
              </h3>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground font-mono">
                <span>Pass Rate: {passRate}%</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {duration.toFixed(3)}s total
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-500">
                  <ShieldCheck className="size-3" />
                  Sandbox Safe
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={onRunTests}
              className="gap-1.5 font-mono text-xs bg-neon text-background hover:bg-neon/90 font-medium"
            >
              <RotateCcw className="size-3.5" />
              Re-run Tests
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Score Bar */}
      <div className="grid grid-cols-4 gap-2">
        <div
          onClick={() => setFilter("all")}
          className={`cursor-pointer rounded-lg border p-2.5 text-center transition-colors ${
            filter === "all" ? "border-neon bg-neon/10" : "border-border bg-surface hover:bg-surface-2"
          }`}
        >
          <div className="font-mono text-lg font-bold text-foreground">{summary.total}</div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Total Tests
          </div>
        </div>
        <div
          onClick={() => setFilter("passed")}
          className={`cursor-pointer rounded-lg border p-2.5 text-center transition-colors ${
            filter === "passed"
              ? "border-emerald-500 bg-emerald-500/15"
              : "border-border bg-surface hover:bg-surface-2"
          }`}
        >
          <div className="font-mono text-lg font-bold text-emerald-400">{summary.passed}</div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Passed
          </div>
        </div>
        <div
          onClick={() => setFilter("failed")}
          className={`cursor-pointer rounded-lg border p-2.5 text-center transition-colors ${
            filter === "failed"
              ? "border-destructive bg-destructive/15"
              : "border-border bg-surface hover:bg-surface-2"
          }`}
        >
          <div className="font-mono text-lg font-bold text-destructive">{summary.failed}</div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Failed
          </div>
        </div>
        <div
          onClick={() => setFilter("errors")}
          className={`cursor-pointer rounded-lg border p-2.5 text-center transition-colors ${
            filter === "errors"
              ? "border-amber-500 bg-amber-500/15"
              : "border-border bg-surface hover:bg-surface-2"
          }`}
        >
          <div className="font-mono text-lg font-bold text-amber-400">{summary.errors}</div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Errors
          </div>
        </div>
      </div>

      {/* Tests Execution List */}
      <div className="space-y-3">
        {filteredTests.map((test) => (
          <div
            key={test.nodeid}
            className={`rounded-lg border bg-surface overflow-hidden ${
              test.outcome === "passed"
                ? "border-emerald-500/25"
                : test.outcome === "failed"
                ? "border-destructive/40"
                : "border-amber-500/40"
            }`}
          >
            <div className="flex items-center justify-between p-3 select-none">
              <div className="flex items-center gap-2.5 min-w-0">
                {test.outcome === "passed" && (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                )}
                {test.outcome === "failed" && (
                  <XCircle className="size-4 shrink-0 text-destructive" />
                )}
                {test.outcome === "error" && (
                  <AlertTriangle className="size-4 shrink-0 text-amber-400" />
                )}
                <span className="font-mono text-xs font-semibold text-foreground truncate">
                  {test.name}
                </span>
                <Badge
                  variant="outline"
                  className={`font-mono text-[9px] uppercase ${
                    test.outcome === "passed"
                      ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/5"
                      : "border-destructive/40 text-destructive bg-destructive/5"
                  }`}
                >
                  {test.outcome}
                </Badge>
              </div>

              <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-muted-foreground">
                <Clock className="size-3" />
                <span>{test.duration.toFixed(4)}s</span>
              </div>
            </div>

            {/* Failure Breakdown & Suggested Fix */}
            {(test.outcome === "failed" || test.outcome === "error") && test.error && (
              <div className="border-t border-destructive/20 bg-destructive/5 p-3.5 space-y-3">
                {/* Traceback snippet */}
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-destructive font-semibold mb-1">
                    Traceback / Assertion Error:
                  </div>
                  <pre className="rounded border border-destructive/30 bg-background/90 p-2.5 font-mono text-[11px] text-destructive-foreground overflow-x-auto leading-relaxed max-h-40 scroll-slim">
                    <code>{test.error}</code>
                  </pre>
                </div>

                {/* Explanation of Failed Test */}
                {test.failureExplanation && (
                  <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-foreground space-y-1">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-amber-400">
                      <HelpCircle className="size-3.5" />
                      Failure Diagnosis
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {test.failureExplanation}
                    </p>
                  </div>
                )}

                {/* Suggested Fix */}
                {test.suggestedFix && test.suggestedFix.fixedFullCode !== test.suggestedFix.beforeCode && (
                  <div className="rounded border border-neon/30 bg-neon/5 p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-neon">
                        <Wand2 className="size-3.5" />
                        Suggested Fix to Pass Test
                      </div>
                      {onApplyFix && (
                        <Button
                          size="sm"
                          onClick={() => handleApplyFix(test.name, test.suggestedFix!.fixedFullCode)}
                          className="h-7 gap-1 font-mono text-xs bg-neon text-background hover:bg-neon/90"
                        >
                          {appliedFixTest === test.name ? (
                            <>
                              <Check className="size-3" />
                              Applied!
                            </>
                          ) : (
                            <>
                              <Wand2 className="size-3" />
                              Apply Fix to Code
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Diff Preview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                      <div className="rounded border border-destructive/30 bg-destructive/10 p-2">
                        <div className="text-[9px] uppercase tracking-wider text-destructive mb-1 font-semibold">
                          Current Code:
                        </div>
                        <pre className="text-destructive-foreground overflow-x-auto">
                          <code>{test.suggestedFix.beforeCode}</code>
                        </pre>
                      </div>
                      <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-2">
                        <div className="text-[9px] uppercase tracking-wider text-emerald-400 mb-1 font-semibold">
                          Proposed Fix:
                        </div>
                        <pre className="text-emerald-400 overflow-x-auto">
                          <code>{test.suggestedFix.afterCode}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Raw Output Drawer */}
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <div
          onClick={() => setShowRawOutput(!showRawOutput)}
          className="flex cursor-pointer items-center justify-between p-3 select-none hover:bg-surface-2/40"
        >
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <Terminal className="size-3.5 text-neon" />
            <span>Raw Pytest Console Output</span>
            <span className="text-[10px] text-muted-foreground/70">(Exit Code: {exitCode})</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-foreground"
            >
              {showRawOutput ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </Button>
          </div>
        </div>

        {showRawOutput && (
          <div className="border-t border-border/60 bg-black/80 p-3 space-y-2 animate-in fade-in-50 duration-150">
            <div className="flex items-center justify-between pb-1">
              <span className="font-mono text-[10px] text-muted-foreground">Terminal Stdout & Stderr</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyRaw}
                className="h-6 gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground px-2"
              >
                {copiedRaw ? <Check className="size-3 text-neon" /> : <Copy className="size-3" />}
                {copiedRaw ? "Copied" : "Copy output"}
              </Button>
            </div>
            <pre className="font-mono text-[11px] text-emerald-400/90 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto scroll-slim">
              {stdout || "(no stdout)"}
              {stderr ? `\n\n[stderr]\n${stderr}` : ""}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
