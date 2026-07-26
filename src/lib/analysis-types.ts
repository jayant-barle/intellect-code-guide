import { z } from "zod";

export const ANALYSIS_KINDS = [
  "explain",
  "flowchart",
  "comments",
  "bugs",
  "improve",
  "bigo",
] as const;

export type AnalysisKind = (typeof ANALYSIS_KINDS)[number];

export const explainSchema = z.object({
  summary: z.string(),
  lines: z.array(
    z.object({
      line: z.number(),
      code: z.string(),
      explanation: z.string(),
    }),
  ),
});

export const flowchartSchema = z.object({
  mermaid: z.string(),
  notes: z.string(),
});

export const commentsSchema = z.object({
  code: z.string(),
  notes: z.string(),
});

export const bugsSchema = z.object({
  findings: z.array(
    z.object({
      title: z.string(),
      severity: z.string(),
      line: z.number(),
      cause: z.string(),
      fix: z.string(),
    }),
  ),
});

export const improveSchema = z.object({
  suggestions: z.array(
    z.object({
      title: z.string(),
      rationale: z.string(),
      before: z.string(),
      after: z.string(),
    }),
  ),
});

export const bigoSchema = z.object({
  overallTime: z.string(),
  overallSpace: z.string(),
  verdict: z.string(),
  breakdown: z.array(
    z.object({
      name: z.string(),
      time: z.string(),
      space: z.string(),
      justification: z.string(),
    }),
  ),
});

export type ExplainResult = z.infer<typeof explainSchema>;
export type FlowchartResult = z.infer<typeof flowchartSchema>;
export type CommentsResult = z.infer<typeof commentsSchema>;
export type BugsResult = z.infer<typeof bugsSchema>;
export type ImproveResult = z.infer<typeof improveSchema>;
export type BigOResult = z.infer<typeof bigoSchema>;

export type AnalysisResult =
  | { kind: "explain"; data: ExplainResult }
  | { kind: "flowchart"; data: FlowchartResult }
  | { kind: "comments"; data: CommentsResult }
  | { kind: "bugs"; data: BugsResult }
  | { kind: "improve"; data: ImproveResult }
  | { kind: "bigo"; data: BigOResult };

export const analysisInputSchema = z.object({
  kind: z.enum(ANALYSIS_KINDS),
  code: z.string(),
});
