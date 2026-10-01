import { Check, CheckCircle2, FileCheck, HelpCircle, Layers, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import type { AiOptimizationExplanation } from "@/lib/optimizer-types";

interface OptimizationExplanationCardProps {
  explanation: AiOptimizationExplanation;
  isOptimal?: boolean;
}

export function OptimizationExplanationCard({
  explanation,
  isOptimal,
}: OptimizationExplanationCardProps) {
  if (isOptimal) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
        <div className="flex items-center gap-2 font-mono text-xs font-semibold text-emerald-400">
          <CheckCircle2 className="size-4" />
          Optimal Implementation Confirmed
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {explanation.whyFaster}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <div className="grid size-7 place-items-center rounded-md bg-neon/15 text-neon">
          <Sparkles className="size-4" />
        </div>
        <h3 className="font-mono text-sm font-bold text-foreground uppercase tracking-wider">
          Optimization Technical Breakdown
        </h3>
      </div>

      <div className="space-y-3.5 text-xs">
        {/* Why Faster */}
        <div className="space-y-1.5">
          <div className="font-mono text-[11px] font-semibold text-neon flex items-center gap-1.5">
            <HelpCircle className="size-3.5" />
            Why is the optimized version faster?
          </div>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap pl-5">
            {explanation.whyFaster}
          </p>
        </div>

        {/* Tradeoffs */}
        {explanation.tradeoffs && (
          <div className="space-y-1.5 pt-2 border-t border-border/40">
            <div className="font-mono text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
              <Layers className="size-3.5" />
              Memory & Algorithmic Trade-offs
            </div>
            <p className="text-muted-foreground leading-relaxed pl-5">
              {explanation.tradeoffs}
            </p>
          </div>
        )}

        {/* Behavior Invariance Guarantee */}
        {explanation.behaviorNotes && (
          <div className="space-y-1.5 pt-2 border-t border-border/40">
            <div className="font-mono text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" />
              Behavior & Semantics Preservation
            </div>
            <p className="text-muted-foreground leading-relaxed pl-5">
              {explanation.behaviorNotes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
