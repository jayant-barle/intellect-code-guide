import {
  Award,
  Bug,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  Gauge,
  Lightbulb,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AnalysisKind } from "@/lib/analysis-types";
import type { QualityReport, SubScore } from "@/lib/quality-score";

interface QualityScoreViewProps {
  report: QualityReport;
  onNavigateTab?: (kind: AnalysisKind) => void;
}

const toneMap = {
  neon: {
    text: "text-neon",
    border: "border-neon/30",
    bg: "bg-neon/10",
    glow: "shadow-[0_0_24px_-4px_rgba(110,231,168,0.25)]",
    ring: "stroke-neon",
    indicator: "bg-neon",
  },
  warn: {
    text: "text-warn",
    border: "border-warn/30",
    bg: "bg-warn/10",
    glow: "shadow-[0_0_24px_-4px_rgba(245,158,11,0.2)]",
    ring: "stroke-warn",
    indicator: "bg-warn",
  },
  destructive: {
    text: "text-destructive",
    border: "border-destructive/30",
    bg: "bg-destructive/10",
    glow: "shadow-[0_0_24px_-4px_rgba(239,68,68,0.2)]",
    ring: "stroke-destructive",
    indicator: "bg-destructive",
  },
  info: {
    text: "text-info",
    border: "border-info/30",
    bg: "bg-info/10",
    glow: "",
    ring: "stroke-info",
    indicator: "bg-info",
  },
};

function CircularScore({ score, tone }: { score: number; tone: keyof typeof toneMap }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const styles = toneMap[tone];

  return (
    <div className="relative flex size-36 shrink-0 items-center justify-center">
      <svg className="size-full -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          className="stroke-surface-2"
          strokeWidth="10"
          fill="transparent"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          className={`${styles.ring} transition-all duration-700 ease-out`}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="font-mono text-3xl font-bold tracking-tight text-foreground">{score}</span>
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          out of 100
        </span>
      </div>
    </div>
  );
}

function SubScoreCard({
  sub,
  icon: Icon,
  actionLabel,
  onAction,
}: {
  sub: SubScore;
  icon: React.ComponentType<{ className?: string }>;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const toneKey: keyof typeof toneMap =
    sub.status === "excellent"
      ? "neon"
      : sub.status === "good"
        ? "info"
        : sub.status === "warning"
          ? "warn"
          : "destructive";
  const styles = toneMap[toneKey];

  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-surface p-5 transition-colors hover:border-border/80">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`grid size-7 place-items-center rounded-md ${styles.bg} ${styles.text}`}
            >
              <Icon className="size-4" />
            </div>
            <div>
              <h4 className="font-mono text-xs font-medium text-foreground">{sub.label}</h4>
              <span className="font-mono text-[10px] text-muted-foreground">
                Weight {Math.round(sub.weight * 100)}%
              </span>
            </div>
          </div>
          <span className={`font-mono text-lg font-bold ${styles.text}`}>
            {sub.score}
            <span className="text-xs font-normal text-muted-foreground">/100</span>
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className={`h-full rounded-full ${styles.indicator} transition-all duration-500`}
            style={{ width: `${sub.score}%` }}
          />
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">{sub.summary}</p>

        {sub.details.length > 0 ? (
          <ul className="space-y-1 pt-1">
            {sub.details.map((detail, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 font-mono text-[11px] text-muted-foreground"
              >
                <span className={`mt-1 size-1 shrink-0 rounded-full ${styles.indicator}`} />
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {actionLabel && onAction ? (
        <div className="pt-4 mt-2 border-t border-border/60">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onAction}
            className="h-7 w-full justify-between px-2 font-mono text-[11px] text-muted-foreground hover:text-neon"
          >
            <span>{actionLabel}</span>
            <ChevronRight className="size-3" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function QualityScoreView({ report, onNavigateTab }: QualityScoreViewProps) {
  const styles = toneMap[report.badgeTone];

  return (
    <div className="flex flex-col gap-6">
      {/* Hero Score Card */}
      <div
        className={`relative overflow-hidden rounded-2xl border ${styles.border} bg-surface p-6 ${styles.glow} transition-all`}
      >
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
            <CircularScore score={report.overallScore} tone={report.badgeTone} />
            <div className="space-y-2 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  Grade {report.letterGrade}
                </span>
                <Badge
                  variant="outline"
                  className={`font-mono text-xs uppercase tracking-wider ${styles.border} ${styles.bg} ${styles.text}`}
                >
                  {report.badgeText}
                </Badge>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                {report.summary}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center sm:items-end gap-1 font-mono text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-3 text-neon" />
              Multi-factor evaluation
            </span>
            <span>Bugs (40%) + Big-O (30%) + Clean (30%)</span>
          </div>
        </div>
      </div>

      {/* 3 Sub-Scores Grid */}
      <div className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Score Breakdown
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <SubScoreCard
            sub={report.bugsSubScore}
            icon={Bug}
            actionLabel="View detected bugs"
            onAction={() => onNavigateTab?.("bugs")}
          />
          <SubScoreCard
            sub={report.complexitySubScore}
            icon={Clock}
            actionLabel="View Big-O complexity"
            onAction={() => onNavigateTab?.("bigo")}
          />
          <SubScoreCard
            sub={report.readabilitySubScore}
            icon={Code2}
            actionLabel="View improvements"
            onAction={() => onNavigateTab?.("improve")}
          />
        </div>
      </div>

      {/* Strengths & Recommendations */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Strengths */}
        {report.strengths.length > 0 ? (
          <div className="rounded-xl border border-neon/20 bg-neon/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-neon">
              <ShieldCheck className="size-4" />
              <h4 className="font-mono text-xs uppercase tracking-wider font-semibold">
                Strengths & Highlights
              </h4>
            </div>
            <ul className="space-y-2">
              {report.strengths.map((str, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-foreground/90 leading-relaxed"
                >
                  <CheckCircle2 className="size-3.5 shrink-0 mt-0.5 text-neon" />
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Recommendations */}
        {report.recommendations.length > 0 ? (
          <div className="rounded-xl border border-warn/25 bg-warn/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-warn">
              <Lightbulb className="size-4" />
              <h4 className="font-mono text-xs uppercase tracking-wider font-semibold">
                Recommendations to Reach 100/100
              </h4>
            </div>
            <ul className="space-y-2">
              {report.recommendations.map((rec, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-foreground/90 leading-relaxed"
                >
                  <ChevronRight className="size-3.5 shrink-0 mt-0.5 text-warn" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
