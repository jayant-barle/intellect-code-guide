import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Bug,
  Gauge,
  GitBranch,
  Loader2,
  MessageSquareCode,
  Play,
  ListTree,
  Wand2,
} from "lucide-react";
import { CodeEditor } from "@/components/CodeEditor";
import { AnalysisResultView } from "@/components/AnalysisResultView";
import { analyzeCode } from "@/lib/analysis.functions";
import type { AnalysisKind, AnalysisResult } from "@/lib/analysis-types";
import { SAMPLES } from "@/lib/samples";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PyLens — AI Python Code Analysis for Learners" },
      {
        name: "description",
        content:
          "Paste Python code and get line-by-line explanations, flowcharts, auto-comments, bug detection, improvements and Big-O analysis.",
      },
      { property: "og:title", content: "PyLens — AI Python Code Analysis" },
      {
        property: "og:description",
        content:
          "Line-by-line explanations, Mermaid flowcharts, bug detection and Big-O complexity for your Python code.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const TABS: { kind: AnalysisKind; label: string; icon: typeof Bug }[] = [
  { kind: "explain", label: "Explain", icon: ListTree },
  { kind: "flowchart", label: "Flowchart", icon: GitBranch },
  { kind: "comments", label: "Comments", icon: MessageSquareCode },
  { kind: "bugs", label: "Bugs", icon: Bug },
  { kind: "improve", label: "Improve", icon: Wand2 },
  { kind: "bigo", label: "Big-O", icon: Gauge },
];

function Index() {
  const [code, setCode] = useState(SAMPLES[0].code);
  const [kind, setKind] = useState<AnalysisKind>("explain");
  const [highlightLine, setHighlightLine] = useState<number | null>(null);
  const [results, setResults] = useState<Partial<Record<AnalysisKind, AnalysisResult>>>({});

  const analyze = useServerFn(analyzeCode);

  const mutation = useMutation({
    mutationFn: (next: AnalysisKind) => analyze({ data: { kind: next, code } }),
    onSuccess: (data) => setResults((prev) => ({ ...prev, [data.kind]: data })),
  });

  const run = (next: AnalysisKind) => {
    setKind(next);
    setHighlightLine(null);
    mutation.mutate(next);
  };

  const current = results[kind];
  const busy = mutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-md border border-neon/40 bg-neon/10 font-mono text-sm font-semibold text-neon">
              py
            </div>
            <div>
              <h1 className="font-mono text-base font-semibold tracking-tight text-foreground">
                PyLens
              </h1>
              <p className="text-xs text-muted-foreground">
                AI code analysis for Python learners
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => run(kind)}
            disabled={busy || code.trim().length === 0}
            className="ml-auto inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-mono text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            {busy ? "analysing" : "run analysis"}
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1600px] gap-6 px-6 py-8 lg:grid-cols-2">
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              samples
            </span>
            {SAMPLES.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  setCode(s.code);
                  setResults({});
                }}
                className="rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-muted-foreground transition hover:border-neon/40 hover:text-neon"
              >
                {s.label}
              </button>
            ))}
          </div>

          <CodeEditor value={code} onChange={setCode} highlightLine={highlightLine} />
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-surface p-1.5">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = tab.kind === kind;
              return (
                <button
                  key={tab.kind}
                  type="button"
                  onClick={() => (results[tab.kind] ? setKind(tab.kind) : run(tab.kind))}
                  disabled={busy}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-2 font-mono text-xs transition disabled:opacity-60",
                    active
                      ? "bg-neon/10 text-neon ring-1 ring-neon/40"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="scroll-slim min-h-[420px] rounded-lg border border-border bg-background/40 p-6">
            {busy ? (
              <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="size-5 animate-spin text-neon" />
                <p className="font-mono text-xs">reading your code…</p>
              </div>
            ) : mutation.isError ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-5">
                <p className="text-sm text-destructive">
                  {(mutation.error as Error).message}
                </p>
              </div>
            ) : current ? (
              <AnalysisResultView result={current} onHoverLine={setHighlightLine} />
            ) : (
              <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-2 text-center">
                <p className="font-mono text-sm text-foreground">
                  Pick an analysis to get started
                </p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Explanations, flowcharts, comments, bugs, improvements and Big-O — all from
                  the code on the left.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
