import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AnalyzeResponse } from "@/lib/api-analysis";

const inputSchema = z.object({
  code: z.string().min(1, "Python code is required").max(20000),
});

export type AnalysisRun = {
  result: AnalyzeResponse;
  cached: boolean;
};

/**
 * Runs (or replays) an analysis fully server-side.
 * Identical code is served straight from the database cache, so repeat runs
 * are instant and results survive reloads and restarts.
 */
export const analyzeCode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<AnalysisRun> => {
    const { hashCode, generateAnalysis } = await import("@/lib/analyze-run.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const codeHash = await hashCode(data.code);

    const { data: cached } = await supabaseAdmin
      .from("analyses")
      .select("id, result, hit_count")
      .eq("code_hash", codeHash)
      .maybeSingle();

    if (cached?.result) {
      await supabaseAdmin
        .from("analyses")
        .update({
          hit_count: (cached.hit_count ?? 1) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", cached.id);
      return { result: cached.result as AnalyzeResponse, cached: true };
    }

    let result: AnalyzeResponse;
    try {
      result = await generateAnalysis(data.code);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("429")) throw new Error("Rate limit reached. Try again shortly.");
      if (message.includes("402")) throw new Error("AI credits exhausted.");
      throw new Error("Analysis failed. Please try again.");
    }

    await supabaseAdmin
      .from("analyses")
      .upsert({ code_hash: codeHash, code: data.code, result }, { onConflict: "code_hash" });

    return { result, cached: false };
  });

export type HistoryEntry = {
  id: string;
  code: string;
  created_at: string;
  last_used_at: string;
  hit_count: number;
  result: AnalyzeResponse | null;
};

export const listAnalyses = createServerFn({ method: "GET" }).handler(
  async (): Promise<HistoryEntry[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("analyses")
      .select("id, code, created_at, last_used_at, hit_count, result")
      .order("last_used_at", { ascending: false })
      .limit(50);
    return (data ?? []) as HistoryEntry[];
  },
);
