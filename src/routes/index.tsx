import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
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
import { ApiResultView } from "@/components/ApiResultView";
import { TabSkeleton } from "@/components/TabSkeleton";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalysisKind } from "@/lib/analysis-types";
import { requestAnalysis, type AnalyzeResponse } from "@/lib/api-analysis";
import { SAMPLES } from "@/lib/samples";

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
  { kind: "explain", label: "Explanation", icon: ListTree },
  { kind: "flowchart", label: "Flowchart", icon: GitBranch },
  { kind: "comments", label: "Auto-Comments", icon: MessageSquareCode },
  { kind: "bugs", label: "Bugs", icon: Bug },
  { kind: "improve", label: "Improvements", icon: Wand2 },
  { kind: "bigo", label: "Complexity", icon: Gauge },
];

function Index() {
  const [code, setCode] = useState(SAMPLES[0].code);
  const [kind, setKind] = useState<AnalysisKind>("explain");
  const [highlightLine, setHighlightLine] = useState<number | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const mutation = useMutation({
    mutationFn: (python: string) => requestAnalysis(python),
    onSuccess: (data) => setResult(data),
    onError: () => {
      setResult(null);
      toast.error("Analysis failed. Please try again.");
    },
  });

  const busy = mutation.isPending;
  const isEmpty = code.trim().length === 0;

  const updateCode = (next: string) => {
    setCode(next);
    if (result) setResult(null);
    setHighlightLine(null);
  };

  const run = () => {
    if (isEmpty || busy) return;
    setHighlightLine(null);
    mutation.mutate(code);
  };

  return (
    <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-2">
      <section className="flex min-w-0 flex-col gap-4">
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
                setResult(null);
                setHighlightLine(null);
              }}
              className="rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-muted-foreground transition hover:border-neon/40 hover:text-neon"
            >
              {s.label}
            </button>
          ))}
        </div>

        <CodeEditor value={code} onChange={updateCode} highlightLine={highlightLine} />

        <Button
          size="lg"
          onClick={run}
          disabled={busy || isEmpty}
          className="w-full font-mono"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          {busy ? "Analyzing…" : "Analyze Code"}
        </Button>
        {isEmpty ? (
          <p className="font-mono text-xs text-muted-foreground">
            Paste some Python code to enable analysis.
          </p>
        ) : null}
      </section>

      <section className="flex min-w-0 flex-col gap-4">
        <Tabs
          value={kind}
          onValueChange={(v) => setKind(v as AnalysisKind)}
          className="gap-4"
        >
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-surface p-1.5 sm:grid-cols-3 xl:grid-cols-6">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.kind}
                  value={tab.kind}
                  className="gap-1.5 font-mono text-xs data-[state=active]:bg-neon/10 data-[state=active]:text-neon"
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {TABS.map((tab) => (
            <TabsContent key={tab.kind} value={tab.kind} className="mt-0">
              <div className="scroll-slim min-h-[420px] rounded-lg border border-border bg-background/40 p-6">
                {busy ? (
                  <TabSkeleton kind={tab.kind} />
                ) : result ? (
                  <ApiResultView
                    kind={tab.kind}
                    data={result}
                    onHoverLine={setHighlightLine}
                  />
                ) : (
                  <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                    <Play className="size-5 text-neon" />
                    <p className="font-mono text-xs">
                      run “Analyze Code” to see {tab.label.toLowerCase()}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </div>
  );
}
