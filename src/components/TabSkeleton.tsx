import { Skeleton } from "@/components/ui/skeleton";
import type { AnalysisKind } from "@/lib/analysis-types";

function Rows({ count }: { count: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="size-7 shrink-0 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-[70%]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TabSkeleton({ kind }: { kind: AnalysisKind }) {
  if (kind === "quality") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-6 rounded-2xl border border-border bg-surface p-6">
          <Skeleton className="size-28 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-3 rounded-xl border border-border bg-surface p-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-3 w-40" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kind === "flowchart") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-[320px] w-full rounded-lg" />
      </div>
    );
  }

  if (kind === "comments") {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-surface p-5">
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} className="h-3.5" style={{ width: `${45 + ((i * 17) % 50)}%` }} />
        ))}
      </div>
    );
  }

  if (kind === "bigo") {
    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="space-y-3 rounded-lg border border-border bg-surface p-6">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
        <Rows count={3} />
      </div>
    );
  }

  if (kind === "bugs" || kind === "improve") {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="space-y-3 rounded-lg border border-border bg-surface p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-4 rounded-full" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-[80%]" />
          </div>
        ))}
      </div>
    );
  }

  return <Rows count={6} />;
}
