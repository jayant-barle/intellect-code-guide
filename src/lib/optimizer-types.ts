import { z } from "zod";

export type PerformanceSeverity = "Critical" | "High" | "Medium" | "Low" | "Information";
export type IssueType = "confirmed" | "potential";

export interface PerformanceIssue {
  id: string;
  title: string;
  severity: PerformanceSeverity;
  type: IssueType;
  lineStart: number;
  lineEnd: number;
  currentComplexity: string;
  potentialComplexity: string;
  issue: string;
  suggestion: string;
  potentialImprovement: string;
  codeSnippet?: string;
}

export interface TheoreticalComplexity {
  currentTime: string;
  currentSpace: string;
  potentialTime: string;
  potentialSpace: string;
  scalabilityVerdict: string;
  complexityExplanation: string;
}

export interface AiOptimizationExplanation {
  whyFaster: string;
  tradeoffs: string;
  behaviorNotes: string;
}

export interface PerformanceAnalysisResult {
  valid: boolean;
  syntaxError?: {
    message: string;
    line: number;
    offset: number;
    text: string;
  };
  isOptimal: boolean;
  issues: PerformanceIssue[];
  summary: {
    totalIssues: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    infoCount: number;
    confirmedCount: number;
    potentialCount: number;
  };
  complexity: TheoreticalComplexity;
  optimizedCode: string;
  aiExplanation: AiOptimizationExplanation;
}

export interface BenchmarkResult {
  available: boolean;
  reason?: string;
  originalTimeSec: number;
  optimizedTimeSec: number;
  speedupPercent: number;
  originalPeakKb: number;
  optimizedPeakKb: number;
  resultsMatch: boolean;
  iterations: number;
  workloadDescription: string;
  measured: boolean;
}

export const analyzePerformanceInputSchema = z.object({
  code: z.string().min(1, "Python code is required").max(30000),
});

export const runBenchmarkInputSchema = z.object({
  originalCode: z.string().min(1, "Original code is required").max(30000),
  optimizedCode: z.string().min(1, "Optimized code is required").max(30000),
});
