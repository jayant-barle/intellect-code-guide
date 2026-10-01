import { z } from "zod";

export type TestCategory =
  | "Normal"
  | "Edge Case"
  | "Invalid Input"
  | "Exception"
  | "Boundary";

export interface AstFunctionParam {
  name: string;
  defaultVal?: string;
  typeAnnotation?: string;
}

export interface AstFunctionInfo {
  name: string;
  params: AstFunctionParam[];
  returns?: string;
  docstring?: string;
  isAsync: boolean;
  isMethod: boolean;
  className?: string;
  line: number;
  raises?: string[];
}

export interface AstClassInfo {
  name: string;
  methods: AstFunctionInfo[];
  docstring?: string;
  line: number;
}

export interface SyntaxErrorInfo {
  message: string;
  line: number;
  offset: number;
  text: string;
}

export interface CodeAnalysisResult {
  valid: boolean;
  syntaxError?: SyntaxErrorInfo;
  functions: AstFunctionInfo[];
  classes: AstClassInfo[];
  allFunctionNames: string[];
  branchesCount: number;
  loopsCount: number;
  exceptionsCount: number;
  raisedExceptions: string[];
  imports: string[];
  boundaryConditions: string[];
  metrics: {
    functions: number;
    classes: number;
    methods: number;
    branches: number;
    loops: number;
    exceptions: number;
  };
}

export interface TestCaseItem {
  id: string;
  name: string;
  targetFunction: string;
  category: TestCategory;
  input: string;
  expectedOutput: string;
  reason: string;
  code: string;
}

export interface TestGenerationResult {
  analysis: CodeAnalysisResult;
  pytestCode: string;
  testCases: TestCaseItem[];
  summary: {
    totalTests: number;
    normalCount: number;
    edgeCount: number;
    invalidCount: number;
    exceptionCount: number;
    boundaryCount: number;
  };
}

export interface SuggestedFix {
  explanation: string;
  beforeCode: string;
  afterCode: string;
  fixedFullCode: string;
}

export interface IndividualTestResult {
  name: string;
  nodeid: string;
  outcome: "passed" | "failed" | "error" | "skipped";
  duration: number;
  error: string | null;
  failureExplanation?: string;
  suggestedFix?: SuggestedFix;
}

export interface TestRunResult {
  exitCode: number;
  duration: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    errors: number;
    skipped: number;
  };
  tests: IndividualTestResult[];
  stdout: string;
  stderr: string;
  securityAudit: {
    safe: boolean;
    reason?: string;
  };
}

export const analyzeInputSchema = z.object({
  code: z.string().min(1, "Python code is required").max(30000),
});

export const generateTestsInputSchema = z.object({
  code: z.string().min(1, "Python code is required").max(30000),
});

export const runTestsInputSchema = z.object({
  code: z.string().min(1, "Python code is required").max(30000),
  pytestCode: z.string().min(1, "Pytest code is required").max(50000),
});

export const formatInputSchema = z.object({
  code: z.string().min(1, "Python code is required").max(30000),
});

export const explainFixInputSchema = z.object({
  code: z.string().min(1).max(30000),
  testCode: z.string().min(1).max(50000),
  testName: z.string().min(1),
  errorMessage: z.string().min(1),
});
