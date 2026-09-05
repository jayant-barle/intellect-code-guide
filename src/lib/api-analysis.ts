export type ApiExplanationRow = { line: number; code?: string; explanation: string };

export type BugCategory =
  | "logic"
  | "runtime"
  | "complexity"
  | "resource"
  | "security"
  | "syntax";

export type ApiBug = {
  title: string;
  severity: "high" | "medium" | "low" | string;
  category?: BugCategory;
  line?: number;
  cause: string;
  fix?: string;
  before?: string;
  after?: string;
};

export type ApiImprovement = {
  title: string;
  rationale: string;
  before?: string;
  after?: string;
};

export type ApiComplexity = {
  time: string;
  space: string;
  verdict?: string;
  breakdown?: { name: string; time: string; space: string; justification: string }[];
};

export type AnalyzeResponse = {
  explanation: ApiExplanationRow[];
  mermaid_chart: string;
  commented_code: string;
  bugs: ApiBug[];
  improvements: ApiImprovement[];
  complexity: ApiComplexity;
};
