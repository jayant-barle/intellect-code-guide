import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider, ANALYSIS_MODEL } from "./ai-gateway.server";
import {
  type AnalysisKind,
  type AnalysisResult,
  explainSchema,
  flowchartSchema,
  commentsSchema,
  bugsSchema,
  improveSchema,
  bigoSchema,
} from "./analysis-types";

const SYSTEM =
  "You are a precise Python code analysis assistant helping students and junior developers. " +
  "Be accurate, concrete and concise. Never invent code that is not in the input.";

type Spec = { schema: z.ZodTypeAny; prompt: (code: string) => string };

const SPECS: Record<AnalysisKind, Spec> = {
  explain: {
    schema: explainSchema,
    prompt: (code) =>
      `Explain this Python code line by line. Give a one-paragraph summary, then one entry per meaningful line with its 1-based line number, the exact source text of that line, and a plain-English explanation. Skip blank lines.\n\n\`\`\`python\n${code}\n\`\`\``,
  },
  flowchart: {
    schema: flowchartSchema,
    prompt: (code) =>
      `Produce a Mermaid \`flowchart TD\` describing this Python code's control flow. Return ONLY valid Mermaid source in the mermaid field (starting with "flowchart TD"), with quoted node labels and no markdown fences. Keep it under 25 nodes. Add a one-sentence note about what the flow does.\n\n\`\`\`python\n${code}\n\`\`\``,
  },
  comments: {
    schema: commentsSchema,
    prompt: (code) =>
      `Return the same Python code with helpful inline comments and docstrings added. Do not change behaviour or restructure the code. The code field must contain only Python source, no markdown fences. Add a short note describing what you documented.\n\n\`\`\`python\n${code}\n\`\`\``,
  },
  bugs: {
    schema: bugsSchema,
    prompt: (code) =>
      `Find real bugs and risky patterns in this Python code. For each finding give a short title, a severity of exactly "high", "medium" or "low", the 1-based line number, the cause, and a concrete fix. Return an empty list if the code is sound.\n\n\`\`\`python\n${code}\n\`\`\``,
  },
  improve: {
    schema: improveSchema,
    prompt: (code) =>
      `Suggest concrete improvements to this Python code (readability, idioms, performance, safety). For each: a short title, the rationale, the current snippet in "before", and the improved snippet in "after". Snippets are plain Python, no markdown fences. At most 6 suggestions.\n\n\`\`\`python\n${code}\n\`\`\``,
  },
  bigo: {
    schema: bigoSchema,
    prompt: (code) =>
      `Analyse the time and space complexity of this Python code. Give the overall worst-case time and space in Big-O notation, a two-sentence verdict, and a per-function or per-block breakdown with justifications.\n\n\`\`\`python\n${code}\n\`\`\``,
  },
};

export async function runAnalysis(
  kind: AnalysisKind,
  code: string,
): Promise<AnalysisResult> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured.");

  const spec = SPECS[kind];
  const gateway = createLovableAiGatewayProvider(apiKey);

  try {
    const { output } = await generateText({
      model: gateway(ANALYSIS_MODEL),
      system: SYSTEM,
      prompt: spec.prompt(code),
      output: Output.object({ schema: spec.schema }),
    });
    return { kind, data: output } as AnalysisResult;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error) && error.text) {
      try {
        const parsed = spec.schema.parse(
          JSON.parse(error.text.replace(/^```(?:json)?|```$/g, "").trim()),
        );
        return { kind, data: parsed } as AnalysisResult;
      } catch {
        /* fall through */
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("429"))
      throw new Error("Rate limit reached. Wait a moment and try again.");
    if (message.includes("402"))
      throw new Error("AI credits exhausted. Add credits to keep analysing.");
    throw new Error("The analysis failed. Try again with a smaller snippet.");
  }
}
