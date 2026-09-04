import type { AnalyzeResponse } from "@/lib/api-analysis";

export type Annotation = {
  line: number;
  type: "bug" | "improve";
  severity?: string;
  title: string;
};

/** Locate the 1-based line in `code` that a snippet refers to. */
export function findSnippetLine(code: string, snippet?: string): number | null {
  if (!snippet) return null;
  const needle = snippet
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!needle) return null;
  const lines = code.split("\n");
  const idx = lines.findIndex((l) => l.trim() === needle);
  if (idx >= 0) return idx + 1;
  const loose = lines.findIndex((l) => needle.length > 3 && l.includes(needle));
  return loose >= 0 ? loose + 1 : null;
}

/** Line numbers for each improvement, aligned with data.improvements order. */
export function improvementLines(
  code: string,
  data: AnalyzeResponse | null,
): (number | null)[] {
  if (!data?.improvements) return [];
  return data.improvements.map((tip) => findSnippetLine(code, tip.before));
}

export function buildAnnotations(
  code: string,
  data: AnalyzeResponse | null,
): Annotation[] {
  if (!data) return [];
  const out: Annotation[] = [];

  for (const bug of data.bugs ?? []) {
    if (typeof bug.line === "number" && bug.line > 0) {
      out.push({
        line: bug.line,
        type: "bug",
        severity: bug.severity,
        title: bug.title,
      });
    }
  }

  const lines = improvementLines(code, data);
  (data.improvements ?? []).forEach((tip, i) => {
    const line = lines[i];
    if (line) out.push({ line, type: "improve", title: tip.title });
  });

  return out;
}
