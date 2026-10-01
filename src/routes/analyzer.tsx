import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  FolderGit2,
  FolderSearch,
  Loader2,
  Sparkles,
} from "lucide-react";

import { CodebaseLanding } from "@/components/CodebaseLanding";
import { CodebaseDashboard } from "@/components/CodebaseDashboard";
import {
  analyzeLocalPathFn,
  analyzeGitHubFn,
  analyzeZipFn,
} from "@/lib/codebase-analyzer.functions";
import type { CodebaseAnalysisResult } from "@/lib/codebase-analyzer-types";

export const Route = createFileRoute("/analyzer")({
  head: () => ({
    meta: [
      { title: "AI Codebase Analyzer — PyLens" },
      {
        name: "description",
        content:
          "Ingest and analyze entire codebases from ZIP uploads, local directories, or GitHub repositories with static AST parsing, security scans, quality checks, and AI architectural interpretation.",
      },
    ],
  }),
  component: AnalyzerPage,
});

const PROGRESS_STAGES = [
  "Reading project files & filtering build artifacts...",
  "Detecting languages and ecosystem...",
  "Analyzing project structure & modules...",
  "Scanning dependencies & manifest files...",
  "Checking code quality & complexity...",
  "Performing static security audit & secret redaction...",
  "Evaluating performance bottlenecks & loop overhead...",
  "Assessing test suites & untested functions...",
  "Inspecting documentation & docstring coverage...",
  "Generating AI architectural interpretation...",
];

function AnalyzerPage() {
  const [result, setResult] = useState<CodebaseAnalysisResult | null>(null);
  const [progressStageIndex, setProgressStageIndex] = useState<number>(0);
  const [lastSource, setLastSource] = useState<{
    type: "local" | "github" | "zip";
    payload: any;
  } | null>(null);

  const stageIntervalRef = useRef<number | null>(null);

  const startProgressAnimation = () => {
    setProgressStageIndex(0);
    if (stageIntervalRef.current) clearInterval(stageIntervalRef.current);
    stageIntervalRef.current = window.setInterval(() => {
      setProgressStageIndex((prev) => {
        if (prev < PROGRESS_STAGES.length - 1) return prev + 1;
        return prev;
      });
    }, 1200);
  };

  const stopProgressAnimation = () => {
    if (stageIntervalRef.current) {
      clearInterval(stageIntervalRef.current);
      stageIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (stageIntervalRef.current) clearInterval(stageIntervalRef.current);
    };
  }, []);

  // Server function wrappers
  const analyzeLocalServerFn = useServerFn(analyzeLocalPathFn);
  const analyzeGitHubServerFn = useServerFn(analyzeGitHubFn);
  const analyzeZipServerFn = useServerFn(analyzeZipFn);

  // 1. Local Path Mutation
  const localMutation = useMutation({
    mutationFn: async (folderPath: string) => {
      startProgressAnimation();
      return analyzeLocalServerFn({ data: { folderPath } });
    },
    onSuccess: (data, folderPath) => {
      stopProgressAnimation();
      setResult(data);
      setLastSource({ type: "local", payload: folderPath });
      toast.success(
        `Codebase analyzed successfully! Found ${data.overview.totalFiles} files.`,
      );
    },
    onError: (err) => {
      stopProgressAnimation();
      toast.error(
        `Local analysis failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    },
  });

  // 2. GitHub Mutation
  const gitHubMutation = useMutation({
    mutationFn: async (repoUrl: string) => {
      startProgressAnimation();
      return analyzeGitHubServerFn({ data: { repoUrl } });
    },
    onSuccess: (data, repoUrl) => {
      stopProgressAnimation();
      setResult(data);
      setLastSource({ type: "github", payload: repoUrl });
      toast.success(
        `GitHub repository analyzed! Parsed ${data.overview.totalFiles} files.`,
      );
    },
    onError: (err) => {
      stopProgressAnimation();
      toast.error(
        `GitHub analysis failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    },
  });

  // 3. ZIP Mutation
  const zipMutation = useMutation({
    mutationFn: async ({
      base64Data,
      filename,
    }: {
      base64Data: string;
      filename: string;
    }) => {
      startProgressAnimation();
      return analyzeZipServerFn({ data: { base64Data, filename } });
    },
    onSuccess: (data, variables) => {
      stopProgressAnimation();
      setResult(data);
      setLastSource({ type: "zip", payload: variables });
      toast.success(
        `Archive unpacked and analyzed! Evaluated ${data.overview.totalFiles} files.`,
      );
    },
    onError: (err) => {
      stopProgressAnimation();
      toast.error(
        `Archive analysis failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    },
  });

  const isLoading =
    localMutation.isPending ||
    gitHubMutation.isPending ||
    zipMutation.isPending;

  // Re-run analysis on the last project
  const handleRefresh = () => {
    if (!lastSource) return;
    if (lastSource.type === "local") {
      localMutation.mutate(lastSource.payload);
    } else if (lastSource.type === "github") {
      gitHubMutation.mutate(lastSource.payload);
    } else if (lastSource.type === "zip") {
      zipMutation.mutate(lastSource.payload);
    }
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* If Analyzing: Show Live Progress View */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[500px] p-8 text-center space-y-6 rounded-2xl border border-neon/30 bg-surface/50 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-neon/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="size-16 rounded-2xl bg-neon/10 border border-neon/30 flex items-center justify-center animate-pulse">
              <FolderSearch className="size-8 text-neon" />
            </div>
            <Loader2 className="size-6 text-neon animate-spin absolute -top-1 -right-1" />
          </div>

          <div className="space-y-2 max-w-md">
            <h2 className="text-xl font-bold font-mono text-foreground">
              Analyzing Codebase
            </h2>
            <p className="font-mono text-xs text-neon">
              {PROGRESS_STAGES[progressStageIndex]}
            </p>
          </div>

          {/* Sequential Step Progress Tracker */}
          <div className="w-full max-w-md p-4 rounded-xl border border-border/70 bg-surface text-left space-y-2 font-mono text-xs">
            {PROGRESS_STAGES.map((step, idx) => {
              const isPast = idx < progressStageIndex;
              const isCurrent = idx === progressStageIndex;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2.5 transition-colors ${
                    isPast
                      ? "text-foreground font-medium"
                      : isCurrent
                      ? "text-neon font-bold"
                      : "text-muted-foreground/40"
                  }`}
                >
                  {isPast ? (
                    <CheckCircle2 className="size-3.5 text-neon shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="size-3.5 text-neon animate-spin shrink-0" />
                  ) : (
                    <span className="size-3.5 rounded-full border border-border shrink-0" />
                  )}
                  <span className="truncate">{step}</span>
                </div>
              );
            })}
          </div>

          <p className="font-mono text-[11px] text-muted-foreground max-w-sm">
            Static analysis runs safely without executing untrusted code. Secrets and private keys are never exposed.
          </p>
        </div>
      ) : result ? (
        /* Results View */
        <CodebaseDashboard
          result={result}
          onReset={() => setResult(null)}
          onRefresh={handleRefresh}
          isRefreshing={isLoading}
        />
      ) : (
        /* Ingestion Landing View */
        <CodebaseLanding
          onAnalyzeLocalPath={(path) => localMutation.mutate(path)}
          onAnalyzeGitHub={(url) => gitHubMutation.mutate(url)}
          onAnalyzeZip={(base64, filename) =>
            zipMutation.mutate({ base64Data: base64, filename })
          }
          isLoading={isLoading}
          progressStep={PROGRESS_STAGES[progressStageIndex]}
        />
      )}
    </div>
  );
}
