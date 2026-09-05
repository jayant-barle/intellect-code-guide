/**
 * Code Fixer utilities for PyLens.
 * Intelligently applies code improvements and bug fixes while preserving Python indentation.
 */

export type ApplyResult = {
  success: boolean;
  newCode: string;
  originalMatched?: string;
  message?: string;
};

/**
 * Intelligently applies an improvement (before -> after) to Python code,
 * respecting surrounding scope indentation and handling whitespace discrepancies.
 */
export function applyImprovement(
  code: string,
  before: string,
  after: string,
): ApplyResult {
  const cleanBefore = before.trim();
  const cleanAfter = after.trim();

  if (!cleanBefore) {
    return { success: false, newCode: code, message: "No target pattern provided." };
  }

  // 1. Direct exact substring match
  if (code.includes(before)) {
    return {
      success: true,
      newCode: code.replace(before, after),
      originalMatched: before,
      message: "Direct match applied.",
    };
  }

  // 2. Direct trimmed match
  if (code.includes(cleanBefore)) {
    return {
      success: true,
      newCode: code.replace(cleanBefore, cleanAfter),
      originalMatched: cleanBefore,
      message: "Trimmed match applied.",
    };
  }

  // 3. Line-by-line whitespace-tolerant match with indentation preservation
  const beforeLines = cleanBefore.split("\n").map((l) => l.trimEnd());
  const beforeLinesTrimmed = beforeLines.map((l) => l.trim());
  const codeLines = code.split("\n");

  if (beforeLinesTrimmed.length === 0) {
    return { success: false, newCode: code, message: "Empty target pattern." };
  }

  for (let i = 0; i <= codeLines.length - beforeLinesTrimmed.length; i++) {
    const candidateSlice = codeLines.slice(i, i + beforeLinesTrimmed.length);
    const matches = candidateSlice.every((cLine, idx) => {
      if (beforeLinesTrimmed[idx] === "" && cLine.trim() === "") return true;
      return cLine.trim() === beforeLinesTrimmed[idx];
    });

    if (matches) {
      // Matched sequence found at index i
      const targetBaseIndent = candidateSlice[0].match(/^(\s*)/)?.[1] ?? "";
      const beforeBaseIndent = beforeLines[0].match(/^(\s*)/)?.[1] ?? "";

      const afterLines = cleanAfter.split("\n");
      const afterBaseIndent = afterLines[0].match(/^(\s*)/)?.[1] ?? "";

      const adjustedAfter = afterLines.map((line, idx) => {
        if (!line.trim()) return "";
        if (idx === 0) return `${targetBaseIndent}${line.trim()}`;
        const currentIndent = line.match(/^(\s*)/)?.[1] ?? "";
        const relIndent = Math.max(0, currentIndent.length - afterBaseIndent.length);
        return `${targetBaseIndent}${" ".repeat(relIndent)}${line.trim()}`;
      });

      const matchedCode = candidateSlice.join("\n");
      const nextLines = [...codeLines];
      nextLines.splice(i, beforeLinesTrimmed.length, ...adjustedAfter);
      return {
        success: true,
        newCode: nextLines.join("\n"),
        originalMatched: matchedCode,
        message: `Preserved scope indentation (${targetBaseIndent.length} spaces).`,
      };
    }
  }

  return {
    success: false,
    newCode: code,
    message: "Could not locate matching code block in editor.",
  };
}

/**
 * Extracts candidate code snippets from bug fix descriptions (e.g. `code here`).
 */
export function extractCodeFromFix(fixText: string): string | null {
  if (!fixText) return null;
  const backtickMatch = fixText.match(/`([^`]+)`/);
  if (backtickMatch && backtickMatch[1].trim()) {
    const candidate = backtickMatch[1].trim();
    // Validate if candidate resembles Python code
    if (
      candidate.includes("=") ||
      candidate.includes("(") ||
      candidate.includes(":") ||
      candidate.startsWith("if ") ||
      candidate.startsWith("return ") ||
      candidate.startsWith("import ") ||
      candidate.startsWith("def ") ||
      candidate.startsWith("for ") ||
      candidate.startsWith("while ") ||
      candidate.startsWith("try:") ||
      candidate.startsWith("with ")
    ) {
      return candidate;
    }
  }
  return null;
}

/**
 * Applies a bug fix to code:
 * - If codeSnippet provided: inserts or replaces at line
 * - Otherwise: inserts a `# FIX (Line X): ...` comment above the line
 */
export function applyBugFix(
  code: string,
  lineNumber: number,
  fixText: string,
  codeSnippet?: string,
): ApplyResult {
  const lines = code.split("\n");
  const idx = lineNumber - 1;

  if (idx < 0 || idx >= lines.length) {
    return {
      success: false,
      newCode: code,
      message: `Line ${lineNumber} is out of range.`,
    };
  }

  const targetLine = lines[idx];
  const indent = targetLine.match(/^(\s*)/)?.[1] ?? "";

  if (codeSnippet && codeSnippet.trim()) {
    // Insert code snippet directly before the buggy line or replace if appropriate
    const snippetLines = codeSnippet.trim().split("\n").map((l) => `${indent}${l.trim()}`);
    // Insert code snippet before the target line
    lines.splice(idx, 0, ...snippetLines);
    return {
      success: true,
      newCode: lines.join("\n"),
      message: `Inserted code snippet at line ${lineNumber}.`,
    };
  }

  // Insert fix comment right above the buggy line
  lines.splice(idx, 0, `${indent}# FIX: ${fixText.trim()}`);
  return {
    success: true,
    newCode: lines.join("\n"),
    message: `Added fix annotation above line ${lineNumber}.`,
  };
}
