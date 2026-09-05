/**
 * Code Fixer utilities for PyLens.
 * Intelligently applies code improvements and bug fixes while preserving Python indentation.
 * Supports multi-tier fuzzy matching:
 * - Line ending normalization (CRLF / LF)
 * - Markdown fence stripping (```python, ```, backticks)
 * - Indentation-tolerant matching
 * - Quote & whitespace normalization (" vs ')
 * - Core statement anchor matching
 */

export type ApplyResult = {
  success: boolean;
  newCode: string;
  originalMatched?: string;
  message?: string;
};

/**
 * Strips markdown fences, line numbers, and extraneous wrapping from code snippets.
 */
export function cleanSnippet(str: string): string {
  if (!str) return "";
  let s = str.replace(/\r\n/g, "\n").trim();

  // Strip ```python or ``` fences
  s = s.replace(/^```[a-zA-Z0-9_-]*\s*\n?/i, "");
  s = s.replace(/\n?```\s*$/i, "");

  // Strip single backticks if wrapping the whole text
  if (s.startsWith("`") && s.endsWith("`") && !s.slice(1, -1).includes("`")) {
    s = s.slice(1, -1);
  }

  // Strip line number prefixes like "1: ", "1. ", "Line 1: " if uniformly present
  const lines = s.split("\n");
  if (
    lines.length > 0 &&
    lines.every((l) => !l.trim() || /^\s*(?:line\s*)?\d+[:.]\s*/i.test(l))
  ) {
    s = lines.map((l) => l.replace(/^\s*(?:line\s*)?\d+[:.]\s*/i, "")).join("\n");
  }

  return s.trim();
}

/**
 * Normalizes tokens for resilient matching (quotes, operator spacing, whitespace).
 */
export function normalizeTokens(str: string): string {
  return str
    .replace(/\r\n/g, "\n")
    .replace(/["']/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*([=+\-*/(),:\[\]{}])\s*/g, "$1")
    .trim();
}

/**
 * Intelligently applies an improvement (before -> after) to Python code,
 * respecting surrounding scope indentation and handling whitespace, markdown fences,
 * and quote differences.
 */
export function applyImprovement(
  code: string,
  before: string,
  after: string,
  targetLine?: number | null,
): ApplyResult {
  const isCrlf = code.includes("\r\n");
  const normCode = code.replace(/\r\n/g, "\n");
  const cleanBefore = cleanSnippet(before);
  const cleanAfter = cleanSnippet(after);

  if (!cleanBefore) {
    return { success: false, newCode: code, message: "No target pattern provided." };
  }

  // 1. Direct exact match
  if (normCode.includes(cleanBefore)) {
    const replaced = normCode.replace(cleanBefore, cleanAfter);
    return {
      success: true,
      newCode: isCrlf ? replaced.replace(/\n/g, "\r\n") : replaced,
      originalMatched: cleanBefore,
      message: "Exact pattern matched.",
    };
  }

  const codeLines = normCode.split("\n");
  const beforeLines = cleanBefore.split("\n");
  const beforeCore = beforeLines
    .map((l) => ({ raw: l, trimmed: l.trim(), norm: normalizeTokens(l) }))
    .filter((l) => l.trimmed.length > 0 && !l.trimmed.startsWith("#"));

  if (beforeCore.length === 0) {
    return { success: false, newCode: code, message: "Target pattern has no code statements." };
  }

  // Helper to construct replacement preserving target indentation
  const buildReplacement = (startIdx: number, deleteCount: number) => {
    const targetSlice = codeLines.slice(startIdx, startIdx + deleteCount);
    const targetBaseIndent = targetSlice[0]?.match(/^(\s*)/)?.[1] ?? "";
    const afterLines = cleanAfter.split("\n");
    const afterFirstNonEmpty = afterLines.find((l) => l.trim().length > 0) ?? "";
    const afterBaseIndent = afterFirstNonEmpty.match(/^(\s*)/)?.[1] ?? "";

    const adjustedAfter = afterLines.map((line) => {
      if (!line.trim()) return "";
      const currentIndent = line.match(/^(\s*)/)?.[1] ?? "";
      const relIndent = Math.max(0, currentIndent.length - afterBaseIndent.length);
      return `${targetBaseIndent}${" ".repeat(relIndent)}${line.trim()}`;
    });

    const nextLines = [...codeLines];
    nextLines.splice(startIdx, deleteCount, ...adjustedAfter);
    const resultStr = nextLines.join("\n");
    return {
      success: true,
      newCode: isCrlf ? resultStr.replace(/\n/g, "\r\n") : resultStr,
      originalMatched: targetSlice.join("\n"),
      message: `Replaced lines ${startIdx + 1}–${startIdx + deleteCount} (indentation preserved).`,
    };
  };

  // 2. Exact line-by-line trimmed match (ignoring indentation differences)
  for (let i = 0; i <= codeLines.length - beforeCore.length; i++) {
    let codeOffset = 0;
    let match = true;

    for (let bIdx = 0; bIdx < beforeCore.length; bIdx++) {
      while (
        i + codeOffset < codeLines.length &&
        codeLines[i + codeOffset].trim().length === 0
      ) {
        codeOffset++;
      }

      if (i + codeOffset >= codeLines.length) {
        match = false;
        break;
      }

      const cLineTrimmed = codeLines[i + codeOffset].trim();
      if (cLineTrimmed !== beforeCore[bIdx].trimmed) {
        match = false;
        break;
      }
      codeOffset++;
    }

    if (match) {
      return buildReplacement(i, codeOffset);
    }
  }

  // 3. Token-normalized line matching (quotes & operators normalized)
  for (let i = 0; i <= codeLines.length - beforeCore.length; i++) {
    let codeOffset = 0;
    let match = true;

    for (let bIdx = 0; bIdx < beforeCore.length; bIdx++) {
      while (
        i + codeOffset < codeLines.length &&
        codeLines[i + codeOffset].trim().length === 0
      ) {
        codeOffset++;
      }

      if (i + codeOffset >= codeLines.length) {
        match = false;
        break;
      }

      const cLineNorm = normalizeTokens(codeLines[i + codeOffset]);
      if (cLineNorm !== beforeCore[bIdx].norm) {
        match = false;
        break;
      }
      codeOffset++;
    }

    if (match) {
      return buildReplacement(i, codeOffset);
    }
  }

  // 4. Anchor match using targetLine or first core line
  let anchorIdx = -1;
  if (typeof targetLine === "number" && targetLine >= 1 && targetLine <= codeLines.length) {
    anchorIdx = targetLine - 1;
  } else {
    const firstCore = beforeCore[0];
    anchorIdx = codeLines.findIndex(
      (l) => l.trim() === firstCore.trimmed || normalizeTokens(l) === firstCore.norm,
    );
    if (anchorIdx === -1) {
      anchorIdx = codeLines.findIndex(
        (l) => firstCore.trimmed.length > 3 && l.includes(firstCore.trimmed),
      );
    }
  }

  if (anchorIdx !== -1) {
    let count = 1;
    let matchedCore = 1;
    for (let j = anchorIdx + 1; j < codeLines.length && matchedCore < beforeCore.length; j++) {
      if (codeLines[j].trim().length === 0) {
        count++;
        continue;
      }
      if (
        codeLines[j].trim() === beforeCore[matchedCore].trimmed ||
        normalizeTokens(codeLines[j]) === beforeCore[matchedCore].norm
      ) {
        matchedCore++;
        count = j - anchorIdx + 1;
      } else {
        break;
      }
    }

    if (matchedCore >= Math.min(beforeCore.length, 1)) {
      return buildReplacement(anchorIdx, Math.max(count, beforeCore.length));
    }
  }

  return {
    success: false,
    newCode: code,
    message: "Could not match improvement patterns in current code.",
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
 * - If codeSnippet provided: inserts clean code snippet at line
 * - Otherwise: inserts a `# FIX: ...` comment above the line
 */
export function applyBugFix(
  code: string,
  lineNumber: number,
  fixText: string,
  codeSnippet?: string,
): ApplyResult {
  const isCrlf = code.includes("\r\n");
  const normCode = code.replace(/\r\n/g, "\n");
  const lines = normCode.split("\n");
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
  const cleanSnippetText = codeSnippet ? cleanSnippet(codeSnippet) : "";

  if (cleanSnippetText) {
    const snippetLines = cleanSnippetText.split("\n").map((l) => `${indent}${l.trim()}`);
    lines.splice(idx, 0, ...snippetLines);
    const resultStr = lines.join("\n");
    return {
      success: true,
      newCode: isCrlf ? resultStr.replace(/\n/g, "\r\n") : resultStr,
      message: `Inserted code snippet at line ${lineNumber}.`,
    };
  }

  // Insert fix comment right above the buggy line
  const cleanFix = fixText.replace(/\r\n/g, " ").replace(/\n/g, " ").trim();
  lines.splice(idx, 0, `${indent}# FIX: ${cleanFix}`);
  const resultStr = lines.join("\n");
  return {
    success: true,
    newCode: isCrlf ? resultStr.replace(/\n/g, "\r\n") : resultStr,
    message: `Added fix annotation above line ${lineNumber}.`,
  };
}
