import type { AnalyzeResponse } from "@/lib/api-analysis";

/**
 * Intelligent local Python code analyzer.
 * Used when running locally without an external AI Gateway API key,
 * or as a fast and resilient fallback.
 */
export function analyzePythonLocally(code: string): AnalyzeResponse {
  const lines = code.split("\n");

  // 1. Line-by-line explanations
  const explanation: AnalyzeResponse["explanation"] = [];
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const lineNum = idx + 1;
    let text = "Executes statement.";

    if (/^def\s+([a-zA-Z_]\w*)\s*\((.*?)\):/.test(trimmed)) {
      const match = trimmed.match(/^def\s+([a-zA-Z_]\w*)\s*\((.*?)\):/);
      text = `Defines function '${match?.[1] || ""}' accepting arguments (${match?.[2] || ""}).`;
    } else if (/^class\s+([a-zA-Z_]\w*)/.test(trimmed)) {
      text = `Declares class '${trimmed.match(/^class\s+([a-zA-Z_]\w*)/)?.[1] || ""}'.`;
    } else if (/^for\s+(\w+)\s+in\s+(.*?):/.test(trimmed)) {
      const match = trimmed.match(/^for\s+(\w+)\s+in\s+(.*?):/);
      text = `Iterates over collection '${match?.[2]}', assigning each item to '${match?.[1]}'.`;
    } else if (/^while\s+(.*?):/.test(trimmed)) {
      text = `Repeats loop while condition '${trimmed.match(/^while\s+(.*?):/)?.[1]}' evaluates to True.`;
    } else if (/^if\s+(.*?):/.test(trimmed)) {
      text = `Branches execution if '${trimmed.match(/^if\s+(.*?):/)?.[1]}' is True.`;
    } else if (/^elif\s+(.*?):/.test(trimmed)) {
      text = `Checks alternate condition '${trimmed.match(/^elif\s+(.*?):/)?.[1]}'.`;
    } else if (/^else\s*:/.test(trimmed)) {
      text = "Fallback branch when preceding conditions are False.";
    } else if (/^return\b/.test(trimmed)) {
      const retVal = trimmed.replace(/^return\s*/, "") || "None";
      text = `Returns '${retVal}' to the caller and terminates function execution.`;
    } else if (/^print\s*\(/.test(trimmed)) {
      text = `Prints formatted output to standard output.`;
    } else if (/^[a-zA-Z_]\w*\s*(=|\+=|-=|\*=|\/=)\s*(.+)/.test(trimmed)) {
      text = `Evaluates expression and assigns value to variable.`;
    }

    explanation.push({
      line: lineNum,
      code: trimmed,
      explanation: text,
    });
  });

  // 2. Control flow chart (Mermaid)
  const chartNodes: string[] = ["Start([Start])"];
  let prevNode = "Start";
  let nodeCount = 0;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    nodeCount++;
    const nodeId = `N${nodeCount}`;

    const cleanLabel = trimmed
      .replace(/"/g, "'")
      .replace(/[[\]{}()]/g, "")
      .slice(0, 32);

    if (trimmed.startsWith("def ")) {
      chartNodes.push(`  ${prevNode} --> ${nodeId}["${cleanLabel}"]`);
      prevNode = nodeId;
    } else if (trimmed.startsWith("if ") || trimmed.startsWith("elif ")) {
      chartNodes.push(`  ${prevNode} --> ${nodeId}{"${cleanLabel}?"}`);
      prevNode = nodeId;
    } else if (trimmed.startsWith("for ") || trimmed.startsWith("while ")) {
      chartNodes.push(`  ${prevNode} --> ${nodeId}{{"Loop: ${cleanLabel}"}}`);
      prevNode = nodeId;
    } else if (trimmed.startsWith("return ")) {
      chartNodes.push(`  ${prevNode} --> ${nodeId}["${cleanLabel}"]`);
      chartNodes.push(`  ${nodeId} --> End([Return / End])`);
      prevNode = nodeId;
    } else if (idx === lines.length - 1 || trimmed.startsWith("print(")) {
      chartNodes.push(`  ${prevNode} --> ${nodeId}["${cleanLabel}"]`);
      prevNode = nodeId;
    }
  });

  if (chartNodes.length === 1) {
    chartNodes.push("  Start --> End([Finish])");
  } else if (!chartNodes.some((n) => n.includes("End([Return / End])"))) {
    chartNodes.push(`  ${prevNode} --> End([End])`);
  }

  const mermaid_chart = `flowchart TD\n${chartNodes.join("\n")}`;

  // 3. Commented source code
  const commented_code = lines
    .map((l) => {
      const trimmed = l.trim();
      if (!trimmed || trimmed.startsWith("#")) return l;
      if (trimmed.startsWith("def ")) return `${l}  # Define function entry point`;
      if (trimmed.startsWith("for ")) return `${l}  # Iterate items in collection`;
      if (trimmed.startsWith("while ")) return `${l}  # Loop while condition holds`;
      if (trimmed.startsWith("if ")) return `${l}  # Check conditional predicate`;
      if (trimmed.startsWith("return ")) return `${l}  # Return computed result`;
      return l;
    })
    .join("\n");

  // 4. Bugs detection
  const bugs: AnalyzeResponse["bugs"] = [];

  // Bug rule 1: ZeroDivisionError with len() in denominator without guard
  lines.forEach((l, idx) => {
    const trimmed = l.trim();
    if (
      (trimmed.includes("/ len(") || trimmed.includes("/len(")) &&
      !code.includes("if not ") &&
      !code.includes("if len(") &&
      !code.includes("== 0")
    ) {
      bugs.push({
        title: "Potential ZeroDivisionError on empty collection",
        severity: "high",
        line: idx + 1,
        cause: "Dividing by len(collection) when the collection is empty produces ZeroDivisionError.",
        fix: "Check if collection is empty before division: `if not values: return 0`",
      });
    }
  });

  // Bug rule 2: Out of bounds access (e.g. data[j + 1] with range(len(data)))
  lines.forEach((l, idx) => {
    const trimmed = l.trim();
    if (
      trimmed.includes("[j + 1]") &&
      code.includes("for j in range(len(") &&
      !code.includes("len(") &&
      !code.includes("- 1")
    ) {
      bugs.push({
        title: "IndexError in loop indexing",
        severity: "high",
        line: idx + 1,
        cause: "Accessing index [j + 1] with an unadjusted range bounds can exceed list dimensions.",
        fix: "Adjust upper limit: `for j in range(len(data) - 1):`",
      });
    }
  });

  // Bug rule 3: Mutable default argument in function
  lines.forEach((l, idx) => {
    const trimmed = l.trim();
    if (/def\s+\w+\s*\(.*=\s*(\[\]|\{\})\s*\):/.test(trimmed)) {
      bugs.push({
        title: "Mutable default argument in function definition",
        severity: "medium",
        line: idx + 1,
        cause: "Default list or dictionary arguments are evaluated once at definition time and shared across all calls.",
        fix: "Use `None` as default: `def func(arg=None): if arg is None: arg = []`",
      });
    }
  });

  // 5. Improvements
  const improvements: AnalyzeResponse["improvements"] = [];

  // Suggestion rule 1: Loop accumulation -> sum()
  const accumMatch = code.match(
    /(?:total|count|s)\s*=\s*0\s*\n\s*for\s+(\w+)\s+in\s+(\w+):\s*\n\s*(?:total|count|s)\s*\+=\s*\1/,
  );
  if (accumMatch) {
    improvements.push({
      title: "Use built-in sum() instead of manual accumulator loop",
      rationale:
        "Python's built-in sum() is implemented in C and runs significantly faster than manual for-loop accumulation.",
      before: accumMatch[0],
      after: `total = sum(${accumMatch[2]})`,
    });
  }

  // Suggestion rule 2: Manual append loop -> list comprehension
  const compMatch = code.match(
    /(\w+)\s*=\s*\[\]\s*\n\s*for\s+(\w+)\s+in\s+(\w+):\s*\n\s*\1\.append\((.*?)\)/,
  );
  if (compMatch) {
    improvements.push({
      title: "Replace append loop with list comprehension",
      rationale:
        "List comprehensions are idiomatic, more readable, and avoid the overhead of repeated .append() method lookups.",
      before: compMatch[0],
      after: `${compMatch[1]} = [${compMatch[4]} for ${compMatch[2]} in ${compMatch[3]}]`,
    });
  }

  // Suggestion rule 3: Temporary variable swap -> tuple unpacking
  const swapMatch = code.match(
    /temp\s*=\s*(\w+\[\w+(?:\s*[+-]\s*\d+)?\])\s*\n\s*\1\s*=\s*(\w+\[\w+(?:\s*[+-]\s*\d+)?\])\s*\n\s*\2\s*=\s*temp/,
  );
  if (swapMatch) {
    improvements.push({
      title: "Use tuple unpacking for swap instead of temporary variable",
      rationale:
        "Python supports atomic tuple swapping `a, b = b, a` without needing an explicit temporary variable.",
      before: swapMatch[0],
      after: `${swapMatch[1]}, ${swapMatch[2]} = ${swapMatch[2]}, ${swapMatch[1]}`,
    });
  }

  // Fallback suggestion: Type annotations if none found
  if (!code.includes("->") && code.includes("def ")) {
    const defLine = lines.find((l) => l.trim().startsWith("def "))?.trim();
    if (defLine) {
      improvements.push({
        title: "Add Python type annotations to function signature",
        rationale:
          "Type annotations improve code readability, enable static type checking, and help IDE autocomplete.",
        before: defLine,
        after: defLine.replace("):", ") -> Any:"),
      });
    }
  }

  // 6. Complexity calculation
  let maxLoopDepth = 0;
  let currentDepth = 0;
  lines.forEach((l) => {
    const trimmed = l.trim();
    if (trimmed.startsWith("for ") || trimmed.startsWith("while ")) {
      currentDepth++;
      if (currentDepth > maxLoopDepth) maxLoopDepth = currentDepth;
    } else if (trimmed.startsWith("def ") || (!trimmed.startsWith(" ") && trimmed.length > 0)) {
      currentDepth = 0;
    }
  });

  let timeComplexity = "O(1)";
  let verdict = "Constant time operations with minimal algorithmic overhead.";
  if (maxLoopDepth === 1) {
    timeComplexity = "O(N)";
    verdict = "Linear time complexity proportional to the size of the input collection.";
  } else if (maxLoopDepth >= 2) {
    timeComplexity = "O(N²)";
    verdict = "Quadratic time complexity due to nested loop iterations over data elements.";
  }

  const spaceComplexity =
    code.includes("list(") || code.includes("[]") || code.includes("{}") ? "O(N)" : "O(1)";

  return {
    explanation,
    mermaid_chart,
    commented_code,
    bugs,
    improvements,
    complexity: {
      time: timeComplexity,
      space: spaceComplexity,
      verdict,
      breakdown: [
        {
          name: "Main Algorithm",
          time: timeComplexity,
          space: spaceComplexity,
          justification: `Analyzed ${maxLoopDepth} level(s) of loop nesting and allocation patterns.`,
        },
      ],
    },
  };
}
