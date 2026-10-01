import { createServerFn } from "@tanstack/react-start";
import {
  analyzeLocalPathSchema,
  analyzeGitHubSchema,
  analyzeZipSchema,
  type CodebaseAnalysisResult,
} from "./codebase-analyzer-types";

/**
 * Analyzes a local project folder directly from filesystem path.
 */
export const analyzeLocalPathFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => analyzeLocalPathSchema.parse(data))
  .handler(async ({ data }): Promise<CodebaseAnalysisResult> => {
    const { analyzeLocalPath } = await import("./codebase-analyzer.server");
    return analyzeLocalPath(data.folderPath);
  });

/**
 * Ingests and analyzes a public GitHub repository.
 */
export const analyzeGitHubFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => analyzeGitHubSchema.parse(data))
  .handler(async ({ data }): Promise<CodebaseAnalysisResult> => {
    const { ingestGitHubAndAnalyze } = await import("./codebase-analyzer.server");
    return ingestGitHubAndAnalyze(data.repoUrl);
  });

/**
 * Ingests an uploaded ZIP file and performs secure extraction and analysis.
 */
export const analyzeZipFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => analyzeZipSchema.parse(data))
  .handler(async ({ data }): Promise<CodebaseAnalysisResult> => {
    const { ingestZipAndAnalyze } = await import("./codebase-analyzer.server");
    return ingestZipAndAnalyze(data.base64Data, data.filename);
  });
