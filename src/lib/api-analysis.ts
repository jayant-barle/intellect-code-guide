export type ApiExplanationRow = { line: number; code?: string; explanation: string };
export type ApiBug = {
  title: string;
  severity: "high" | "medium" | "low" | string;
  line?: number;
  cause: string;
  fix?: string;
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

export async function requestAnalysis(pythonCode: string): Promise<AnalyzeResponse> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ python_code: pythonCode }),
  });

  if (!res.ok) {
    throw new Error(`Analysis request failed with status ${res.status}`);
  }

  return (await res.json()) as AnalyzeResponse;
}
