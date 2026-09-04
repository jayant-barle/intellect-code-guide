import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bug,
  Check,
  ChevronRight,
  Copy,
  Gauge,
  GitBranch,
  Loader2,
  MessageSquareCode,
  Play,
  RefreshCw,
  ListTree,
  Wand2,
} from "lucide-react";
import { CodeEditor } from "@/components/CodeEditor";
import { ApiResultView } from "@/components/ApiResultView";
import { TabSkeleton } from "@/components/TabSkeleton";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { AnalysisKind } from "@/lib/analysis-types";
import { requestAnalysis, type AnalyzeResponse } from "@/lib/api-analysis";
import { SAMPLES } from "@/lib/samples";
import { buildAnnotations } from "@/lib/annotations";

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

const STEP_LABELS: Record<AnalysisKind, string> = {
  explain: "explanation",
  flowchart: "flowchart",
  comments: "auto-comments",
  bugs: "bug detection",
  improve: "improvements",
  bigo: "Big-O analysis",
};

function ErrorCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Error details copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Copy failed. Please try again.");
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={copy}
      className="h-7 gap-1.5 font-mono text-[11px]"
    >
      {copied ? (
        <Check className="size-3 text-neon" />
      ) : (
        <Copy className="size-3" />
      )}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

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

  const annotations = useMemo(() => buildAnnotations(code, result), [code, result]);
  const bugCount = annotations.filter((a) => a.type === "bug").length;
  const tipCount = annotations.length - bugCount;

  const busy = mutation.isPending;
  const isEmpty = code.trim().length === 0;
  const errorMessage =
    mutation.error instanceof Error && mutation.error.message
      ? mutation.error.message
      : "Something went wrong while analyzing your code. Please try again.";

  const updateCode = (next: string) => {
    setCode(next);
    if (result) setResult(null);
    if (mutation.isError) mutation.reset();
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

        <CodeEditor
          value={code}
          onChange={updateCode}
          highlightLine={highlightLine}
          annotations={annotations}
        />

        {annotations.length ? (
          <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-destructive" />
              {bugCount} bug{bugCount === 1 ? "" : "s"} highlighted
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-warn" />
              {tipCount} improvement{tipCount === 1 ? "" : "s"} highlighted
            </span>
          </div>
        ) : null}

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
                  disabled={busy}
                  className="gap-1.5 font-mono text-xs data-[state=active]:bg-neon/10 data-[state=active]:text-neon"
                >
                  {busy && tab.kind === kind ? (
                    <Loader2 className="size-3.5 shrink-0 animate-spin" />
                  ) : (
                    <Icon className="size-3.5 shrink-0" />
                  )}
                  <span className="truncate">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {TABS.map((tab) => (
            <TabsContent key={tab.kind} value={tab.kind} className="mt-0">
              <div
                aria-busy={busy}
                className="scroll-slim min-h-[420px] rounded-lg border border-border bg-background/40 p-6"
              >
                {busy ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 font-mono text-xs text-neon">
                      <Loader2 className="size-3.5 animate-spin" />
                      analyzing your code — {tab.label.toLowerCase()} incoming…
                    </div>
                    <div className="pointer-events-none select-none opacity-70">
                      <TabSkeleton kind={tab.kind} />
                    </div>
                  </div>
                ) : mutation.isError ? (
                  <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-4 text-center">
                    <AlertTriangle className="size-6 text-destructive" />
                    <div className="space-y-1">
                      <p className="font-mono text-sm text-destructive">
                        Failed to generate {STEP_LABELS[tab.kind]}
                      </p>
                      <p className="max-w-sm font-mono text-xs text-muted-foreground">
                        {errorMessage}
                      </p>
                    </div>
                    <Collapsible className="w-full max-w-sm">
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="group gap-1.5 font-mono text-xs"
                        >
                          <ChevronRight className="size-3.5 transition-transform group-data-[state=open]:rotate-90" />
                          View details
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-2 rounded-md border border-border bg-surface p-3 text-left">
                          <div className="flex items-start gap-2">
                            <pre className="flex-1 whitespace-pre-wrap break-all font-mono text-xs text-muted-foreground">
                              {`Failed step: ${STEP_LABELS[tab.kind]}\n\n${errorMessage}`}
                            </pre>
                            <ErrorCopyButton
                              text={`Failed step: ${STEP_LABELS[tab.kind]}\n\n${errorMessage}`}
                            />
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={run}
                      disabled={isEmpty}
                      className="font-mono"
                    >
                      <RefreshCw className="size-3.5" />
                      Retry analysis
                    </Button>
                  </div>
                ) : result ? (
                  <ApiResultView
                    kind={tab.kind}
                    data={result}
                    code={code}
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
