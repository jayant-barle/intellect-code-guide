import type { AnalyzeResponse } from "./api-analysis";

export type SubScoreStatus = "excellent" | "good" | "warning" | "danger";

export type SubScore = {
  score: number; // 0-100
  weight: number; // 0-1
  label: string;
  status: SubScoreStatus;
  summary: string;
  details: string[];
};

export type QualityReport = {
  overallScore: number;
  letterGrade: "A+" | "A" | "B" | "C" | "D" | "F";
  badgeText: string;
  badgeTone: "neon" | "warn" | "destructive" | "info";
  summary: string;
  bugsSubScore: SubScore;
  complexitySubScore: SubScore;
  readabilitySubScore: SubScore;
  recommendations: string[];
  strengths: string[];
};

function getStatus(score: number): SubScoreStatus {
  if (score >= 88) return "excellent";
  if (score >= 75) return "good";
  if (score >= 55) return "warning";
  return "danger";
}

function parseComplexityScore(complexityStr?: string): number {
  if (!complexityStr) return 75;
  const s = complexityStr.toLowerCase().replace(/\s+/g, "");
  if (s.includes("o(1)") || s.includes("constant")) return 100;
  if (s.includes("o(logn)") || s.includes("o(log(n))")) return 95;
  if (s.includes("o(nlogn)") || s.includes("o(n*logn)")) return 82;
  if (s.includes("o(n)") && !s.includes("n^") && !s.includes("n2")) return 90;
  if (s.includes("o(n^2)") || s.includes("o(n2)") || s.includes("quadratic")) return 55;
  if (s.includes("o(n^3)") || s.includes("cubic")) return 38;
  if (s.includes("o(2^n)") || s.includes("exponential")) return 20;
  if (s.includes("o(n!)") || s.includes("factorial")) return 10;
  return 75;
}

export function computeQualityScore(code: string, data: AnalyzeResponse | null): QualityReport {
  if (!data) {
    return {
      overallScore: 0,
      letterGrade: "F",
      badgeText: "Unanalyzed",
      badgeTone: "info",
      summary: "Analyze your code to calculate quality score.",
      bugsSubScore: {
        score: 0,
        weight: 0.4,
        label: "Bugs & Correctness",
        status: "danger",
        summary: "No analysis available",
        details: [],
      },
      complexitySubScore: {
        score: 0,
        weight: 0.3,
        label: "Big-O & Scalability",
        status: "danger",
        summary: "No complexity data available",
        details: [],
      },
      readabilitySubScore: {
        score: 0,
        weight: 0.3,
        label: "Readability & Clean Code",
        status: "danger",
        summary: "No readability data available",
        details: [],
      },
      recommendations: ["Run analysis to get personalized feedback."],
      strengths: [],
    };
  }

  const recommendations: string[] = [];
  const strengths: string[] = [];

  // --- 1. Bugs Sub-Score (Weight: 40%) ---
  let bugPenalty = 0;
  const highBugs = data.bugs.filter((b) => b.severity?.toLowerCase() === "high");
  const medBugs = data.bugs.filter((b) => b.severity?.toLowerCase() === "medium");
  const lowBugs = data.bugs.filter(
    (b) => b.severity?.toLowerCase() !== "high" && b.severity?.toLowerCase() !== "medium",
  );

  bugPenalty += highBugs.length * 35;
  bugPenalty += medBugs.length * 18;
  bugPenalty += lowBugs.length * 8;

  const bugsScore = Math.max(0, Math.min(100, 100 - bugPenalty));
  const bugsDetails: string[] = [];

  if (data.bugs.length === 0) {
    strengths.push("Bug-free: No runtime bugs or syntax anomalies detected.");
    bugsDetails.push("Zero detected bugs or unhandled edge-cases.");
  } else {
    if (highBugs.length > 0) {
      bugsDetails.push(
        `${highBugs.length} high-severity bug${highBugs.length === 1 ? "" : "s"} found.`,
      );
      recommendations.push(
        `Resolve critical bug: "${highBugs[0].title}" (line ${highBugs[0].line ?? "?"})`,
      );
    }
    if (medBugs.length > 0) {
      bugsDetails.push(
        `${medBugs.length} medium-severity issue${medBugs.length === 1 ? "" : "s"}.`,
      );
      recommendations.push(`Fix edge case: "${medBugs[0].title}"`);
    }
    if (lowBugs.length > 0) {
      bugsDetails.push(`${lowBugs.length} low-severity warning${lowBugs.length === 1 ? "" : "s"}.`);
    }
  }

  // --- 2. Big-O Complexity Sub-Score (Weight: 30%) ---
  const timeScore = parseComplexityScore(data.complexity?.time);
  let spacePenalty = 0;
  const spaceScore = parseComplexityScore(data.complexity?.space);

  if (spaceScore <= 55) {
    spacePenalty = 15;
  } else if (spaceScore <= 80) {
    spacePenalty = 5;
  }

  const complexityScore = Math.max(0, Math.min(100, timeScore - spacePenalty));
  const complexityDetails: string[] = [];
  const timeVal = data.complexity?.time ?? "Unknown";
  const spaceVal = data.complexity?.space ?? "Unknown";

  complexityDetails.push(`Time Complexity: ${timeVal}`);
  complexityDetails.push(`Space Complexity: ${spaceVal}`);

  if (complexityScore >= 88) {
    strengths.push(`High algorithmic efficiency: scales well with ${timeVal} time.`);
  } else if (complexityScore < 60) {
    recommendations.push(
      `Optimize asymptotic complexity (${timeVal}): consider using hash maps, binary search, or generators to reduce passes.`,
    );
  }

  // --- 3. Readability & Cleanliness Sub-Score (Weight: 30%) ---
  let readabilityScore = 100;
  const readabilityDetails: string[] = [];

  // Improvements penalty
  const improvementCount = data.improvements?.length ?? 0;
  const impPenalty = Math.min(35, improvementCount * 9);
  readabilityScore -= impPenalty;

  if (improvementCount === 0) {
    strengths.push("Idiomatic Python: clean code style adhering to PEP 8 standards.");
    readabilityDetails.push("No style or structural refactorings suggested.");
  } else {
    readabilityDetails.push(
      `${improvementCount} improvement suggestion${improvementCount === 1 ? "" : "s"}.`,
    );
    if (data.improvements?.[0]?.title) {
      recommendations.push(`Refactor: ${data.improvements[0].title}`);
    }
  }

  // Code inspection heuristics
  const lines = code.split("\n");
  const nonEmptyLines = lines.filter((l) => l.trim().length > 0);
  const commentLines = lines.filter((l) => l.trim().startsWith("#") || l.trim().startsWith('"""'));

  if (commentLines.length > 0 || code.includes('"""')) {
    readabilityDetails.push("Includes inline comments or docstrings.");
    strengths.push("Documented: good use of descriptive comments/docstrings.");
  } else if (nonEmptyLines.length > 8) {
    readabilityScore -= 8;
    readabilityDetails.push("Missing comments/docstrings for clarity.");
    recommendations.push("Add docstrings to functions and brief comments on complex logic.");
  }

  // Check nesting depth
  let maxIndentation = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    const match = line.match(/^( +|\t+)/);
    if (match) {
      const indent = match[1].startsWith("\t") ? match[1].length * 4 : match[1].length;
      const depth = Math.floor(indent / 4);
      if (depth > maxIndentation) maxIndentation = depth;
    }
  }

  if (maxIndentation >= 4) {
    readabilityScore -= 12;
    readabilityDetails.push(`Deep nesting detected (${maxIndentation} levels).`);
    recommendations.push(
      "Extract deeply nested blocks into helper functions to flatten control flow.",
    );
  } else {
    readabilityDetails.push("Good control flow with balanced nesting.");
  }

  readabilityScore = Math.max(0, Math.min(100, readabilityScore));

  // --- Final Composite Score ---
  const overallScore = Math.round(bugsScore * 0.4 + complexityScore * 0.3 + readabilityScore * 0.3);

  let letterGrade: QualityReport["letterGrade"] = "F";
  let badgeText = "Critical Issues";
  let badgeTone: QualityReport["badgeTone"] = "destructive";
  let summary = "Code has critical bugs and performance bottlenecks that need immediate attention.";

  if (overallScore >= 93) {
    letterGrade = "A+";
    badgeText = "Pristine";
    badgeTone = "neon";
    summary = "Outstanding code quality! Bug-free, highly efficient, and readable.";
  } else if (overallScore >= 85) {
    letterGrade = "A";
    badgeText = "Clean Code";
    badgeTone = "neon";
    summary = "Excellent quality with safe execution and solid algorithmic efficiency.";
  } else if (overallScore >= 75) {
    letterGrade = "B";
    badgeText = "Good";
    badgeTone = "info";
    summary = "Solid functional code, with minor opportunities for optimization or cleanup.";
  } else if (overallScore >= 60) {
    letterGrade = "C";
    badgeText = "Needs Work";
    badgeTone = "warn";
    summary = "Functional but contains notable inefficiencies or edge-case bugs.";
  } else if (overallScore >= 45) {
    letterGrade = "D";
    badgeText = "Warning";
    badgeTone = "destructive";
    summary = "Multiple issues identified across correctness, complexity, or readability.";
  }

  return {
    overallScore,
    letterGrade,
    badgeText,
    badgeTone,
    summary,
    bugsSubScore: {
      score: bugsScore,
      weight: 0.4,
      label: "Bugs & Correctness",
      status: getStatus(bugsScore),
      summary:
        bugsScore === 100
          ? "No bugs detected. Safe to run."
          : bugsScore >= 75
            ? "Minor edge cases to verify."
            : "Requires bug fixes before production.",
      details: bugsDetails,
    },
    complexitySubScore: {
      score: complexityScore,
      weight: 0.3,
      label: "Big-O & Efficiency",
      status: getStatus(complexityScore),
      summary:
        complexityScore >= 85
          ? `Optimal scaling (${timeVal}).`
          : complexityScore >= 65
            ? `Acceptable scaling (${timeVal}).`
            : `Inefficient complexity (${timeVal}).`,
      details: complexityDetails,
    },
    readabilitySubScore: {
      score: readabilityScore,
      weight: 0.3,
      label: "Readability & Clean Code",
      status: getStatus(readabilityScore),
      summary:
        readabilityScore >= 85
          ? "Clean, idiomatic Python structure."
          : readabilityScore >= 65
            ? "Readable with minor style improvements."
            : "High complexity or lacks documentation.",
      details: readabilityDetails,
    },
    recommendations: recommendations.slice(0, 3),
    strengths: strengths.slice(0, 3),
  };
}
