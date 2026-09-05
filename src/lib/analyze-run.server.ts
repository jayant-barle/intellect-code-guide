import type { AnalyzeResponse } from "@/lib/api-analysis";

export function buildAnalysisPrompt(pythonCode: string) {
  return `Analyse the following Python code and respond with STRICT JSON only (no markdown fences) using exactly these six keys:

{
  "explanation": [{ "line": number, "code": string, "explanation": string }],
  "mermaid_chart": string,            // starts with "flowchart TD", quoted labels, no fences
  "commented_code": string,           // same code with inline comments/docstrings, no fences
  "bugs": [{
    "title": string,
    "severity": "high"|"medium"|"low",
    "category": "logic"|"runtime"|"complexity"|"resource"|"security"|"syntax",
    "line": number,
    "cause": string,
    "fix": string,
    "before": string,                 // exact verbatim line/block from code to replace (or empty if insertion)
    "after": string                   // exact drop-in replacement with matching indentation
  }],
  "improvements": [{
    "title": string,
    "rationale": string,
    "before": string,                 // exact verbatim line/block from code to replace
    "after": string                   // exact drop-in replacement with matching indentation
  }],
  "complexity": {
    "time": string,
    "space": string,
    "verdict": string,
    "breakdown": [{ "name": string, "time": string, "space": string, "justification": string }]
  }
}

ANALYSIS GUIDELINES:
1. Deep Algorithmic & Logic Bugs:
   - Check recursion base cases, infinite loops, and stack overflow risks.
   - Detect off-by-one errors (e.g. range bounds, two-pointer boundaries, binary search upper/lower bounds).
   - Detect 2D list reference aliasing (e.g. [[0]*cols]*rows where mutating one row alters all).
   - Detect mutating collections while iterating over them (e.g. removing/appending during for-loop).
   - Detect unhandled division by zero, float precision equality checks (== on floats), and mutable default arguments.
   - Detect unclosed file handles/sockets, bare except clauses, and shadowing of Python built-in names (sum, list, dict, id, etc.).
2. Code Fixes (before & after):
   - For every bug where a localized code patch is possible, provide exact "before" (verbatim text from input code) and "after" (drop-in replacement preserving Python indentation).
   - For improvements, provide exact verbatim "before" and "after" snippets for clean 1-click refactoring.
3. Output strict valid JSON only without markdown fences or extraneous explanations. Never invent code outside the input.

\`\`\`python
${pythonCode}
\`\`\``;
}

export function parseJsonResponse(text: string) {
  const cleaned = text
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("Model returned non-JSON output");
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

export async function hashCode(code: string) {
  const bytes = new TextEncoder().encode(code);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Calls the AI gateway and returns the parsed analysis payload, or falls back to local analyzer. */
export async function generateAnalysis(pythonCode: string): Promise<AnalyzeResponse> {
  const apiKey =
    process.env["LOVABLE_API_KEY"] ||
    process.env["OPENAI_API_KEY"] ||
    process.env["GEMINI_API_KEY"];

  if (!apiKey) {
    const { analyzePythonLocally } = await import("@/lib/local-analyzer.server");
    return analyzePythonLocally(pythonCode);
  }

  try {
    const { generateText } = await import("ai");
    const { createLovableAiGatewayProvider, ANALYSIS_MODEL } =
      await import("@/lib/ai-gateway.server");

    const gateway = createLovableAiGatewayProvider(apiKey);
    const { text } = await generateText({
      model: gateway(ANALYSIS_MODEL),
      system: "You are a precise Python code analysis assistant. Respond with strict JSON only.",
      prompt: buildAnalysisPrompt(pythonCode),
    });

    return parseJsonResponse(text) as AnalyzeResponse;
  } catch (err) {
    console.warn("[AI Gateway] Cloud analysis failed or unconfigured, using local analyzer:", err);
    const { analyzePythonLocally } = await import("@/lib/local-analyzer.server");
    return analyzePythonLocally(pythonCode);
  }
}
