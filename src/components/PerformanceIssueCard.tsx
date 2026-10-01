import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Gauge,
  Info,
  Lightbulb,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PerformanceIssue, PerformanceSeverity } from "@/lib/optimizer-types";

interface PerformanceIssueCardProps {
  issue: PerformanceIssue;
}

const SEVERITY_CONFIG: Record<
  PerformanceSeverity,
  { bg: string; text: string; border: string; icon: typeof AlertTriangle; label: string }
> = {
  Critical: {
    bg: "bg-destructive/15",
    text: "text-destructive",
    border: "border-destructive/30",
    icon: ShieldAlert,
    label: "Critical",
  },
  High: {
    bg: "bg-orange-500/15",
    text: "text-orange-400",
    border: "border-orange-500/30",
    icon: AlertTriangle,
    label: "High",
  },
  Medium: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/30",
    icon: AlertCircle,
    label: "Medium",
  },
  Low: {
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    border: "border-blue-500/30",
    icon: Info,
    label: "Low",
  },
  Information: {
    bg: "bg-slate-500/15",
    text: "text-slate-400",
    border: "border-slate-500/30",
    icon: Info,
    label: "Info",
  },
};

export function PerformanceIssueCard({ issue }: PerformanceIssueCardProps) {
  const config = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.Medium;
  const Icon = config.icon;

  return (
    <div
      className={`rounded-lg border bg-surface p-4 transition-all duration-150 space-y-3 ${
        issue.severity === "Critical"
          ? "border-destructive/40 shadow-sm shadow-destructive/5"
          : issue.severity === "High"
          ? "border-orange-500/40"
          : "border-border hover:border-border/80"
      }`}
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${config.bg} ${config.text} ${config.border}`}
          >
            <Icon className="size-3" />
            {config.label}
          </span>
          <span
            className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
              issue.type === "confirmed"
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
            }`}
          >
            {issue.type === "confirmed" ? "Confirmed Bottleneck" : "Optimization Opportunity"}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            Lines {issue.lineStart}–{issue.lineEnd}
          </span>
        </div>

        {/* Complexity badge comparison */}
        <div className="flex items-center gap-1.5 font-mono text-[11px] bg-surface-2 px-2.5 py-1 rounded border border-border/50">
          <span className="text-muted-foreground">{issue.currentComplexity}</span>
          <ArrowRight className="size-3 text-neon" />
          <span className="text-neon font-semibold">{issue.potentialComplexity}</span>
        </div>
      </div>

      {/* Title */}
      <div>
        <h4 className="font-mono text-xs font-semibold text-foreground flex items-center gap-1.5">
          {issue.title}
        </h4>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{issue.issue}</p>
      </div>

      {/* Suggestion & Improvement */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono pt-1 border-t border-border/40">
        <div className="rounded border border-border/50 bg-surface-2/40 p-2.5 space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Lightbulb className="size-3 text-amber-400" />
            Recommended Optimization
          </div>
          <p className="text-[11px] text-foreground font-sans leading-normal">
            {issue.suggestion}
          </p>
        </div>

        <div className="rounded border border-neon/30 bg-neon/5 p-2.5 space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-neon flex items-center gap-1">
            <Zap className="size-3" />
            Expected Scaling Gain
          </div>
          <p className="text-[11px] text-neon/90 font-mono leading-normal font-medium">
            {issue.potentialImprovement}
          </p>
        </div>
      </div>
    </div>
  );
}
