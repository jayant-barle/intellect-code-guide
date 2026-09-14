export type DiffLineType = "added" | "removed" | "unchanged";

export interface DiffLine {
  type: DiffLineType;
  lineA?: number;
  lineB?: number;
  content: string;
}

export interface SplitDiffRow {
  left?: { lineNum: number; content: string; type: "removed" | "unchanged" };
  right?: { lineNum: number; content: string; type: "added" | "unchanged" };
}

/**
 * Computes line-by-line diff between textA and textB using Longest Common Subsequence (LCS).
 */
export function computeLineDiff(textA: string, textB: string): DiffLine[] {
  const linesA = textA.split("\n");
  const linesB = textB.split("\n");
  const m = linesA.length;
  const n = linesB.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (linesA[i - 1] === linesB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
      result.unshift({
        type: "unchanged",
        lineA: i,
        lineB: j,
        content: linesA[i - 1],
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({
        type: "added",
        lineB: j,
        content: linesB[j - 1],
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.unshift({
        type: "removed",
        lineA: i,
        content: linesA[i - 1],
      });
      i--;
    }
  }

  return result;
}

/**
 * Aligns unified diff lines into paired split (side-by-side) rows.
 */
export function computeSplitDiff(diff: DiffLine[]): SplitDiffRow[] {
  const rows: SplitDiffRow[] = [];
  let i = 0;

  while (i < diff.length) {
    const item = diff[i];
    if (item.type === "unchanged") {
      rows.push({
        left: { lineNum: item.lineA!, content: item.content, type: "unchanged" },
        right: { lineNum: item.lineB!, content: item.content, type: "unchanged" },
      });
      i++;
    } else if (item.type === "removed") {
      const next = diff[i + 1];
      if (next && next.type === "added") {
        rows.push({
          left: { lineNum: item.lineA!, content: item.content, type: "removed" },
          right: { lineNum: next.lineB!, content: next.content, type: "added" },
        });
        i += 2;
      } else {
        rows.push({
          left: { lineNum: item.lineA!, content: item.content, type: "removed" },
        });
        i++;
      }
    } else if (item.type === "added") {
      rows.push({
        right: { lineNum: item.lineB!, content: item.content, type: "added" },
      });
      i++;
    }
  }

  return rows;
}
