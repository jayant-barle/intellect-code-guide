import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Clock, Repeat } from "lucide-react";

import { listAnalyses } from "@/lib/analyze.functions";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — PyLens Python Code Analyses" },
      {
        name: "description",
        content: "Revisit your recent PyLens Python code analyses, explanations and flowcharts.",
      },
      { property: "og:title", content: "History — PyLens" },
      {
        property: "og:description",
        content: "Revisit your recent PyLens Python code analyses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const fetchHistory = useServerFn(listAnalyses);
  const { data, isPending } = useQuery({
    queryKey: ["analysis-history"],
    queryFn: () => fetchHistory(),
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-mono text-xl font-semibold text-foreground">History</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Saved analyses — running the same code again replays these instantly.
      </p>

      {isPending ? (
        <div className="mt-8 flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> loading saved analyses…
        </div>
      ) : !data?.length ? (
        <p className="mt-8 font-mono text-xs text-muted-foreground">
          No analyses saved yet — run one from the home page.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {data.map((entry) => (
            <li
              key={entry.id}
              className="overflow-hidden rounded-lg border border-border bg-surface"
            >
              <pre className="scroll-slim max-h-32 overflow-auto p-4 font-mono text-xs leading-6 text-foreground">
                <code>{entry.code}</code>
              </pre>
              <div className="flex flex-wrap items-center gap-4 border-t border-border px-4 py-2 font-mono text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3" />
                  {new Date(entry.last_used_at).toLocaleString()}
                </span>
                <span className="flex items-center gap-1.5">
                  <Repeat className="size-3" />
                  {entry.hit_count} run{entry.hit_count === 1 ? "" : "s"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
