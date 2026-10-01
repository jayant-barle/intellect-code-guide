import { createServerFn } from "@tanstack/react-start";
import {
  analyzePerformanceInputSchema,
  runBenchmarkInputSchema,
  type PerformanceAnalysisResult,
  type BenchmarkResult,
} from "./optimizer-types";

/**
 * Analyzes Python code for performance bottlenecks, algorithmic complexity,
 * and generates optimized drop-in code.
 */
export const analyzePerformanceFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => analyzePerformanceInputSchema.parse(data))
  .handler(async ({ data }): Promise<PerformanceAnalysisResult> => {
    const { optimizePythonCode } = await import("./optimizer.server");
    return optimizePythonCode(data.code);
  });

/**
 * Runs precision benchmarking in an isolated sandbox measuring execution time,
 * memory usage with tracemalloc, and speedup percentage.
 */
export const runBenchmarkFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => runBenchmarkInputSchema.parse(data))
  .handler(async ({ data }): Promise<BenchmarkResult> => {
    const { runPerformanceBenchmark } = await import("./optimizer.server");
    return runPerformanceBenchmark(data.originalCode, data.optimizedCode);
  });
