import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Code2,
  Cpu,
  FileCode2,
  GitBranch,
  Layers,
  Repeat,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CodeAnalysisResult } from "@/lib/test-generator-types";

interface TestAnalysisSummaryProps {
  analysis: CodeAnalysisResult | null;
  isAnalyzing?: boolean;
}

export function TestAnalysisSummary({ analysis, isAnalyzing }: TestAnalysisSummaryProps) {
  if (!analysis) {
    return (
      <div className="rounded-lg border border-border/60 bg-surface/40 p-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Code2 className="size-4 text-muted-foreground/70" />
          <span>Paste Python code and click <strong>Analyze</strong> or <strong>Generate Tests</strong> to inspect functions and syntax.</span>
        </div>
      </div>
    );
  }

  // Syntax error state
  if (!analysis.valid && analysis.syntaxError) {
    const err = analysis.syntaxError;
    return (
      <div className="overflow-hidden rounded-lg border border-destructive/40 bg-destructive/10 p-4 animate-in fade-in duration-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-5 shrink-0 text-destructive mt-0.5" />
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-mono text-xs font-semibold text-destructive uppercase tracking-wider">
                Python Syntax Error
              </h4>
              <Badge variant="destructive" className="font-mono text-[10px]">
                Line {err.line}, Col {err.offset}
              </Badge>
            </div>
            <p className="font-mono text-xs text-foreground/90">{err.message}</p>
            {err.text && (
              <div className="mt-2 rounded border border-destructive/20 bg-background/60 p-2 font-mono text-[11px] text-destructive-foreground">
                <span className="text-muted-foreground mr-2">{err.line} |</span>
                <span>{err.text}</span>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Please correct the syntax error above before generating unit tests.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { metrics, functions, classes, raisedExceptions, imports, boundaryConditions } = analysis;

  return (
    <div className="rounded-lg border border-border bg-surface p-4 space-y-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid size-6 place-items-center rounded bg-neon/15 text-neon">
            <Zap className="size-3.5" />
          </div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
            Code Analysis
          </span>
          {isAnalyzing && (
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-neon animate-pulse">
              analyzing...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <CheckCircle2 className="size-3" />
            Valid Python AST
          </span>
        </div>
      </div>

      {/* Numerical Metrics Summary */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <div className="rounded-md border border-border/50 bg-surface-2/40 p-2 text-center">
          <div className="font-mono text-base font-semibold text-foreground">{metrics.functions}</div>
          <div className="text-[10px] text-muted-foreground">Functions</div>
        </div>
        <div className="rounded-md border border-border/50 bg-surface-2/40 p-2 text-center">
          <div className="font-mono text-base font-semibold text-foreground">{metrics.classes}</div>
          <div className="text-[10px] text-muted-foreground">Classes</div>
        </div>
        <div className="rounded-md border border-border/50 bg-surface-2/40 p-2 text-center">
          <div className="font-mono text-base font-semibold text-foreground">{metrics.methods}</div>
          <div className="text-[10px] text-muted-foreground">Methods</div>
        </div>
        <div className="rounded-md border border-border/50 bg-surface-2/40 p-2 text-center">
          <div className="font-mono text-base font-semibold text-foreground">{metrics.branches}</div>
          <div className="text-[10px] text-muted-foreground">Branches</div>
        </div>
        <div className="rounded-md border border-border/50 bg-surface-2/40 p-2 text-center">
          <div className="font-mono text-base font-semibold text-foreground">{metrics.loops}</div>
          <div className="text-[10px] text-muted-foreground">Loops</div>
        </div>
        <div className="rounded-md border border-border/50 bg-surface-2/40 p-2 text-center">
          <div className="font-mono text-base font-semibold text-foreground">
            {metrics.exceptions + raisedExceptions.length}
          </div>
          <div className="text-[10px] text-muted-foreground">Exceptions</div>
        </div>
      </div>

      {/* Detected Function Signatures & Class Methods */}
      <div className="space-y-2 pt-1 border-t border-border/40">
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] font-mono text-muted-foreground mr-1">Targets:</span>
          {functions.map((f) => (
            <Badge
              key={f.name}
              variant="outline"
              className="font-mono text-[10px] border-neon/40 bg-neon/5 text-neon"
            >
              {f.name}({f.params.map((p) => p.name).join(", ")})
              {f.returns ? ` -> ${f.returns}` : ""}
            </Badge>
          ))}
          {classes.map((c) => (
            <Badge
              key={c.name}
              variant="outline"
              className="font-mono text-[10px] border-blue-500/40 bg-blue-500/5 text-blue-400"
            >
              class {c.name} ({c.methods.length} methods)
            </Badge>
          ))}
          {functions.length === 0 && classes.length === 0 && (
            <span className="text-[11px] text-muted-foreground italic">
              Script code (no top-level functions or classes detected)
            </span>
          )}
        </div>

        {/* Boundary checks and exceptions */}
        {(raisedExceptions.length > 0 || boundaryConditions.length > 0 || imports.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
            {raisedExceptions.length > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
                <ShieldAlert className="size-2.5" />
                Raises: {raisedExceptions.join(", ")}
              </span>
            )}
            {boundaryConditions.length > 0 && (
              <span className="inline-flex items-center gap-1 text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-mono">
                <GitBranch className="size-2.5" />
                {boundaryConditions.length} Boundary Checks ({[...new Set(boundaryConditions)].slice(0, 4).join(", ")})
              </span>
            )}
            {imports.length > 0 && (
              <span className="inline-flex items-center gap-1 text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 font-mono">
                <Layers className="size-2.5" />
                Imports: {imports.slice(0, 3).join(", ")}
                {imports.length > 3 ? ` +${imports.length - 3}` : ""}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
