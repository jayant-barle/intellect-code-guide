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

    try {
      const { data: cached } = await supabaseAdmin
        .from("analyses")
        .select("id, result, hit_count")
        .eq("code_hash", codeHash)
        .maybeSingle();

      if (cached?.result) {
        try {
          await supabaseAdmin
            .from("analyses")
            .update({
              hit_count: (cached.hit_count ?? 1) + 1,
              last_used_at: new Date().toISOString(),
            })
            .eq("id", cached.id);
        } catch {
          // ignore background hit_count increment error
        }
        return { result: cached.result as AnalyzeResponse, cached: true };
      }
    } catch (err) {
      console.warn("[Database] Supabase cache lookup skipped:", err);
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

    try {
      await supabaseAdmin
        .from("analyses")
        .upsert({ code_hash: codeHash, code: data.code, result }, { onConflict: "code_hash" });
    } catch (err) {
      console.warn("[Database] Supabase cache write skipped:", err);
    }

    return { result, cached: false };
  });

export type HistoryEntry = {
  id: string;
  code_hash: string;
  code: string;
  created_at: string;
  last_used_at: string;
  hit_count: number;
  result: AnalyzeResponse | null;
};

export const listAnalyses = createServerFn({ method: "GET" }).handler(
  async (): Promise<HistoryEntry[]> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { hashCode } = await import("@/lib/analyze-run.server");
      const { data } = await supabaseAdmin
        .from("analyses")
        .select("id, code_hash, code, created_at, last_used_at, hit_count, result")
        .order("last_used_at", { ascending: false })
        .limit(100);

      if (!data) return [];

      const entries = await Promise.all(
        data.map(async (row) => {
          let hash = row.code_hash;
          if (!hash) {
            hash = await hashCode(row.code);
          }
          return {
            ...row,
            code_hash: hash,
          } as HistoryEntry;
        }),
      );

      return entries;
    } catch (err) {
      console.warn("[Database] Failed to list analyses:", err);
      return [];
    }
  },
);

const retrySchema = z.object({
  code: z.string().min(1, "Python code is required").max(20000),
  id: z.string().optional(),
});

export type RetryResult = {
  result: AnalyzeResponse;
  codeHash: string;
  timestamp: string;
};

/**
 * Retries/refreshes an analysis run by re-running the analysis engine
 * directly and updating the database cache entry with a fresh timestamp.
 */
export const retryAnalysis = createServerFn({ method: "POST" })
  .validator((data: unknown) => retrySchema.parse(data))
  .handler(async ({ data }): Promise<RetryResult> => {
    const { hashCode, generateAnalysis } = await import("@/lib/analyze-run.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const codeHash = await hashCode(data.code);
    const timestamp = new Date().toISOString();

    let result: AnalyzeResponse;
    try {
      result = await generateAnalysis(data.code);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("429")) throw new Error("Rate limit reached. Try again shortly.");
      if (message.includes("402")) throw new Error("AI credits exhausted.");
      throw new Error("Analysis failed. Please try again.");
    }

    try {
      if (data.id) {
        await supabaseAdmin
          .from("analyses")
          .update({
            code_hash: codeHash,
            code: data.code,
            result,
            last_used_at: timestamp,
          })
          .eq("id", data.id);
      } else {
        await supabaseAdmin
          .from("analyses")
          .upsert(
            { code_hash: codeHash, code: data.code, result, last_used_at: timestamp },
            { onConflict: "code_hash" },
          );
      }
    } catch (err) {
      console.warn("[Database] Failed to update analysis on retry:", err);
    }

    return { result, codeHash, timestamp };
  });

const deleteSchema = z.object({
  id: z.string().min(1),
});

export const deleteAnalysis = createServerFn({ method: "POST" })
  .validator((data: unknown) => deleteSchema.parse(data))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("analyses").delete().eq("id", data.id);
      return { success: true };
    } catch (err) {
      console.warn("[Database] Failed to delete analysis:", err);
      return { success: false };
    }
  });
