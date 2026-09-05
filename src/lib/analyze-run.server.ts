import type { AnalyzeResponse } from "@/lib/api-analysis";

export function buildAnalysisPrompt(pythonCode: string) {
  return `Analyse the following Python code and respond with STRICT JSON only (no markdown fences) using exactly these six keys:

{
  "explanation": [{ "line": number, "code": string, "explanation": string }],
  "mermaid_chart": string,            // starts with "flowchart TD", quoted labels, no fences
  "commented_code": string,           // same code with inline comments/docstrings, no fences
  "bugs": [{ "title": string, "severity": "high"|"medium"|"low", "line": number, "cause": string, "fix": string }],
  "improvements": [{ "title": string, "rationale": string, "before": string, "after": string }],
  "complexity": { "time": string, "space": string, "verdict": string, "breakdown": [{ "name": string, "time": string, "space": string, "justification": string }] }
}

Never invent code that is not in the input. Return empty arrays when there is nothing to report.

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
