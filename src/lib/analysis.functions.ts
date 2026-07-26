import { createServerFn } from "@tanstack/react-start";
import { analysisInputSchema } from "./analysis-types";
import type { AnalysisResult } from "./analysis-types";

export const analyzeCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => analysisInputSchema.parse(input))
  .handler(async ({ data }): Promise<AnalysisResult> => {
    const { runAnalysis } = await import("./analysis.server");
    return runAnalysis(data.kind, data.code);
  });
