import { useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  FileCode,
  Flame,
  HelpCircle,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TestCaseItem, TestCategory } from "@/lib/test-generator-types";

interface TestCaseCardProps {
  testCase: TestCaseItem;
  status?: "passed" | "failed" | "error" | "skipped";
  duration?: number;
}

const CATEGORY_COLORS: Record<
  TestCategory,
  { bg: string; text: string; border: string }
> = {
  Normal: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/25",
  },
  "Edge Case": {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/25",
  },
  Boundary: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/25",
  },
  "Invalid Input": {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/25",
  },
  Exception: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/25",
  },
};

export function TestCaseCard({ testCase, status, duration }: TestCaseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const colors = CATEGORY_COLORS[testCase.category] || CATEGORY_COLORS.Normal;

  const handleCopyCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(testCase.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={`rounded-lg border bg-surface transition-all duration-150 overflow-hidden ${
        status === "passed"
          ? "border-emerald-500/30 hover:border-emerald-500/50"
          : status === "failed"
          ? "border-destructive/40 hover:border-destructive/60"
          : status === "error"
          ? "border-amber-500/40 hover:border-amber-500/60"
          : "border-border hover:border-border/80"
      }`}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex cursor-pointer items-start justify-between gap-3 p-3.5 select-none hover:bg-surface-2/40"
      >
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-foreground">
              {testCase.name}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
            >
              {testCase.category}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">
              Target: <strong className="text-foreground/80">{testCase.targetFunction}</strong>
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">{testCase.reason}</p>

          {/* Quick Input / Expected Output Preview */}
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="rounded border border-border/40 bg-surface-2/50 px-2.5 py-1.5 flex items-center justify-between">
              <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
                Input:
              </span>
              <span className="text-foreground truncate max-w-[200px]" title={testCase.input}>
                {testCase.input || "(empty)"}
              </span>
            </div>
            <div className="rounded border border-border/40 bg-surface-2/50 px-2.5 py-1.5 flex items-center justify-between">
              <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
                Expected:
              </span>
              <span
                className={`truncate max-w-[200px] ${
                  testCase.expectedOutput.includes("Determined")
                    ? "text-muted-foreground italic text-[10px]"
                    : testCase.expectedOutput.includes("Raises")
                    ? "text-rose-400 font-medium"
                    : "text-neon font-medium"
                }`}
                title={testCase.expectedOutput}
              >
                {testCase.expectedOutput}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          {status && (
            <div className="flex items-center gap-1.5 font-mono text-xs">
              {status === "passed" && (
                <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded text-[10px] font-medium">
                  <CheckCircle2 className="size-3" />
                  Passed
                </span>
              )}
              {status === "failed" && (
                <span className="flex items-center gap-1 text-destructive bg-destructive/10 border border-destructive/25 px-2 py-0.5 rounded text-[10px] font-medium">
                  <XCircle className="size-3" />
                  Failed
                </span>
              )}
              {status === "error" && (
                <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded text-[10px] font-medium">
                  <ShieldAlert className="size-3" />
                  Error
                </span>
              )}
              {typeof duration === "number" && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="size-2.5" />
                  {duration.toFixed(3)}s
                </span>
              )}
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </Button>
        </div>
      </div>

      {/* Expanded Code View */}
      {expanded && (
        <div className="border-t border-border/60 bg-surface-2/30 p-3 animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between pb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <FileCode className="size-3 text-neon" />
              Pytest Function Source
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyCode}
              className="h-6 gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground px-2"
            >
              {copied ? <Check className="size-3 text-neon" /> : <Copy className="size-3" />}
              {copied ? "Copied" : "Copy test"}
            </Button>
          </div>
          <pre className="rounded border border-border/50 bg-background/80 p-3 font-mono text-xs text-foreground overflow-x-auto leading-relaxed">
            <code>{testCase.code}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
