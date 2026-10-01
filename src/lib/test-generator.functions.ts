import { createServerFn } from "@tanstack/react-start";
import {
  analyzeInputSchema,
  generateTestsInputSchema,
  runTestsInputSchema,
  formatInputSchema,
  explainFixInputSchema,
  type CodeAnalysisResult,
  type TestGenerationResult,
  type TestRunResult,
  type SuggestedFix,
} from "./test-generator-types";

/**
 * Analyzes Python code using Python AST.
 * Detects functions, classes, methods, parameters, branches, loops, exceptions, boundaries.
 */
export const analyzePythonCode = createServerFn({ method: "POST" })
  .validator((data: unknown) => analyzeInputSchema.parse(data))
  .handler(async ({ data }): Promise<CodeAnalysisResult> => {
    const { analyzePythonAst } = await import("./test-generator.server");
    return analyzePythonAst(data.code);
  });

/**
 * Generates pytest test cases with normal, edge, invalid, and exception cases.
 */
export const generateUnitTestsFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => generateTestsInputSchema.parse(data))
  .handler(async ({ data }): Promise<TestGenerationResult> => {
    const { generateUnitTests, analyzePythonAst } = await import("./test-generator.server");
    const analysis = await analyzePythonAst(data.code);
    return generateUnitTests(data.code, analysis);
  });

/**
 * Executes generated pytest tests in a secure temporary sandbox environment.
 */
export const runPytestsFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => runTestsInputSchema.parse(data))
  .handler(async ({ data }): Promise<TestRunResult> => {
    const { executePytests } = await import("./test-generator.server");
    return executePytests(data.code, data.pytestCode);
  });

/**
 * Formats Python source code adhering to PEP 8 standards.
 */
export const formatPythonFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => formatInputSchema.parse(data))
  .handler(async ({ data }): Promise<{ formatted: string }> => {
    const { formatPythonCode } = await import("./test-generator.server");
    const formatted = await formatPythonCode(data.code);
    return { formatted };
  });

/**
 * Explains a test failure and produces a suggested code fix.
 */
export const explainFailureFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => explainFixInputSchema.parse(data))
  .handler(async ({ data }): Promise<SuggestedFix> => {
    const { analyzeFailureAndSuggestFix } = await import("./test-generator.server");
    return analyzeFailureAndSuggestFix(
      data.code,
      data.testCode,
      data.testName,
      data.errorMessage,
    );
  });
