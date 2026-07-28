import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * POST /api/analyze
 * Body: { "python_code": "..." }
 *
 * Returns the full analysis payload in one shot:
 *   explanation     -> array of { line, code, explanation }
 *   mermaid_chart   -> string (mermaid flowchart source)
 *   commented_code  -> string (python source with comments)
 *   bugs            -> array of { title, severity, line, cause, fix }
 *   improvements    -> array of { title, rationale, before, after }
 *   complexity      -> { time, space, verdict, breakdown[] }
 *
 * NOTE: currently returns a mock payload. The LLM call scaffolding lives in
 * `buildAnalysisPrompt` + the commented block below; flip USE_MOCK to false
 * once the live path is wired up.
 */

const USE_MOCK = true;

const requestSchema = z.object({
  python_code: z.string().min(1, "python_code is required").max(20000),
});

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

function mockAnalysis(pythonCode: string) {
  const firstLine = pythonCode.split("\n")[0] ?? "";
  return {
    explanation: [
      {
        line: 1,
        code: firstLine,
        explanation:
          "Entry point of the snippet — defines the first symbol used by the rest of the program.",
      },
      {
        line: 2,
        code: "    total = 0",
        explanation: "Initialises an accumulator that will hold the running sum.",
      },
      {
        line: 3,
        code: "    for item in items:",
        explanation: "Iterates over every element of the input sequence exactly once.",
      },
      {
        line: 4,
        code: "    return total",
        explanation: "Returns the accumulated result to the caller.",
      },
    ],
    mermaid_chart: [
      "flowchart TD",
      '  A["Start"] --> B["Initialise total = 0"]',
      '  B --> C{"More items?"}',
      '  C -- "yes" --> D["total += item"]',
      "  D --> C",
      '  C -- "no" --> E["Return total"]',
    ].join("\n"),
    commented_code: `# Mock commented output — replace once the LLM call is live.\n${pythonCode
      .split("\n")
      .map((l) => l)
      .join("\n")}\n`,
    bugs: [
      {
        title: "Unvalidated input sequence",
        severity: "medium",
        line: 3,
        cause: "The function assumes `items` is iterable and will raise TypeError on None.",
        fix: "Guard with `if not items: return 0` or validate the argument type up front.",
      },
    ],
    improvements: [
      {
        title: "Use a built-in aggregate",
        rationale: "`sum()` is implemented in C and is both shorter and faster than a manual loop.",
        before: "total = 0\nfor item in items:\n    total += item",
        after: "total = sum(items)",
      },
    ],
    complexity: {
      time: "O(n)",
      space: "O(1)",
      verdict:
        "The snippet performs a single pass over the input and keeps only a constant number of variables.",
      breakdown: [
        {
          name: "main loop",
          time: "O(n)",
          space: "O(1)",
          justification: "One iteration per element, with a single accumulator held in memory.",
        },
      ],
    },
  };
}

export const Route = createFileRoute("/api/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const parsed = requestSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
            { status: 400 },
          );
        }

        if (USE_MOCK) {
          return Response.json(mockAnalysis(parsed.data.python_code));
        }

        // --- Live LLM scaffolding (Lovable AI Gateway, OpenAI-compatible) ---
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "AI is not configured." }, { status: 500 });
        }

        const { generateText } = await import("ai");
        const { createLovableAiGatewayProvider, ANALYSIS_MODEL } = await import(
          "@/lib/ai-gateway.server"
        );

        try {
          const gateway = createLovableAiGatewayProvider(apiKey);
          const { text } = await generateText({
            model: gateway(ANALYSIS_MODEL),
            system:
              "You are a precise Python code analysis assistant. Respond with strict JSON only.",
            prompt: buildAnalysisPrompt(parsed.data.python_code),
          });
          return Response.json(JSON.parse(text.replace(/^```(?:json)?|```$/g, "").trim()));
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (message.includes("429")) {
            return Response.json({ error: "Rate limit reached." }, { status: 429 });
          }
          if (message.includes("402")) {
            return Response.json({ error: "AI credits exhausted." }, { status: 402 });
          }
          return Response.json({ error: "Analysis failed." }, { status: 500 });
        }
      },
    },
  },
});
