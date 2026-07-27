import { AlertTriangle, Bug, Clock, Database, GitBranch, Wand2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { AnalysisKind } from "@/lib/analysis-types";

const MOCK_EXPLANATION = [
  { line: 1, text: "Defines a function `two_sum` that takes a list of numbers and a target value." },
  { line: 2, text: "Creates an empty dictionary to remember numbers we've already seen." },
  { line: 3, text: "Loops over the list, giving both the index `i` and the value `n`." },
  { line: 4, text: "Calculates the missing partner needed to reach the target." },
  { line: 5, text: "Checks whether that partner was stored earlier in the dictionary." },
  { line: 6, text: "Returns both indices as soon as a matching pair is found." },
  { line: 7, text: "Stores the current number with its index for future lookups." },
  { line: 8, text: "Returns an empty list when no pair adds up to the target." },
];

const MOCK_BUGS = [
  {
    title: "Division by zero on empty input",
    severity: "high",
    line: 4,
    body: "If `nums` is an empty list, `len(nums)` is 0 and the division raises ZeroDivisionError. Guard the input before dividing.",
  },
  {
    title: "Mutable default argument",
    severity: "medium",
    line: 1,
    body: "Using `items=[]` as a default keeps the same list across calls. Use `None` and create a new list inside the function.",
  },
  {
    title: "Unhandled non-numeric values",
    severity: "low",
    line: 6,
    body: "Strings inside the list will raise a TypeError during addition. Validate or filter the input first.",
  },
];

const MOCK_IMPROVEMENTS = [
  {
    title: "Use a dictionary lookup instead of a nested loop",
    line: 3,
    body: "Replacing the inner scan with a hash map lookup reduces the runtime from quadratic to linear.",
  },
  {
    title: "Add a docstring and type hints",
    line: 1,
    body: "`def two_sum(nums: list[int], target: int) -> list[int]:` makes the contract obvious to readers and editors.",
  },
  {
    title: "Prefer `enumerate` over manual index tracking",
    line: 5,
    body: "`for i, n in enumerate(nums)` is idiomatic Python and avoids an off-by-one mistake.",
  },
];

const MOCK_COMMENTED_CODE = [
  { code: "def two_sum(nums, target):", comment: "# Find two indices that add up to target" },
  { code: "    seen = {}", comment: "# Maps value -> index of numbers already checked" },
  { code: "    for i, n in enumerate(nums):", comment: "# Walk the list once, tracking position" },
  { code: "        rest = target - n", comment: "# The partner value we still need" },
  { code: "        if rest in seen:", comment: "# Did we meet that partner earlier?" },
  { code: "            return [seen[rest], i]", comment: "# Found it - return both indices" },
  { code: "        seen[n] = i", comment: "# Remember this number for later lookups" },
  { code: "    return []", comment: "# No valid pair exists" },
];

const severityStyles: Record<string, string> = {
  high: "border-destructive/40 bg-destructive/10 text-destructive",
  medium: "border-warn/40 bg-warn/10 text-warn",
  low: "border-border bg-surface-2 text-muted-foreground",
};

function SectionHint({ children }: { children: string }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </p>
  );
}

function ExplanationMock() {
  return (
    <div className="flex flex-col gap-3">
      <SectionHint>line-by-line</SectionHint>
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {MOCK_EXPLANATION.map((row) => (
          <li key={row.line} className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 px-4 py-3">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border border-neon/30 bg-neon/10 font-mono text-[11px] text-neon">
              {row.line}
            </span>
            <p className="min-w-0 text-sm leading-relaxed text-foreground">{row.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

const MOCK_MERMAID = `flowchart TD
  A([start two_sum]) --> B[seen = {}]
  B --> C{more items?}
  C -- no --> D([return []])
  C -- yes --> E[need = target - n]
  E --> F{need in seen?}
  F -- yes --> G([return seen[need], i])
  F -- no --> H[seen[n] = i]
  H --> C`;

function FlowchartMock() {
  return (
    <div className="flex flex-col gap-3">
      <SectionHint>control flow</SectionHint>
      <div className="grid min-h-[380px] place-items-center rounded-lg border border-border bg-surface/60 p-8">
        <MermaidChart chart={MOCK_MERMAID} />
      </div>
      <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <GitBranch className="size-3.5 text-neon" />
        rendered with mermaid.js
      </p>
    </div>
  );
}



function BugsMock() {
  return (
    <div className="flex flex-col gap-3">
      <SectionHint>detected issues</SectionHint>
      {MOCK_BUGS.map((bug) => (
        <Alert key={bug.title} variant="destructive" className="bg-destructive/5">
          <Bug className="size-4" />
          <AlertTitle className="flex flex-wrap items-center gap-2">
            <span className="min-w-0">{bug.title}</span>
            <Badge
              variant="outline"
              className={`shrink-0 font-mono text-[10px] uppercase ${severityStyles[bug.severity]}`}
            >
              {bug.severity}
            </Badge>
            <span className="font-mono text-[11px] text-muted-foreground">line {bug.line}</span>
          </AlertTitle>
          <AlertDescription className="text-muted-foreground">{bug.body}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

function ImprovementsMock() {
  return (
    <div className="flex flex-col gap-3">
      <SectionHint>suggestions</SectionHint>
      {MOCK_IMPROVEMENTS.map((tip) => (
        <Alert key={tip.title} className="border-warn/40 bg-warn/5 text-warn [&>svg]:text-warn">
          <AlertTriangle className="size-4" />
          <AlertTitle className="flex flex-wrap items-center gap-2">
            <span className="min-w-0">{tip.title}</span>
            <span className="font-mono text-[11px] text-muted-foreground">line {tip.line}</span>
          </AlertTitle>
          <AlertDescription className="text-muted-foreground">{tip.body}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

function ComplexityMock() {
  const cards = [
    {
      label: "Time Complexity",
      value: "O(n)",
      icon: Clock,
      note: "One pass over the input list, with constant-time dictionary lookups.",
    },
    {
      label: "Space Complexity",
      value: "O(1)",
      icon: Database,
      note: "Only a fixed number of helper variables are kept in memory.",
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <SectionHint>big-o analysis</SectionHint>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.label}
            className="flex flex-col gap-3 rounded-xl border border-neon/25 bg-surface p-6"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <card.icon className="size-4 shrink-0 text-neon" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
                {card.label}
              </span>
            </div>
            <p className="font-mono text-4xl font-semibold text-neon">{card.value}</p>
            <p className="text-sm text-muted-foreground">{card.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommentsMock() {
  return (
    <div className="flex flex-col gap-3">
      <SectionHint>auto-commented source</SectionHint>
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <Wand2 className="size-3.5 text-neon" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            two_sum.py — read only
          </span>
        </div>
        <pre className="scroll-slim overflow-x-auto p-4 font-mono text-[13px] leading-7">
          <code>
            {MOCK_COMMENTED_CODE.map((row) => (
              <div key={row.code} className="whitespace-pre">
                <span className="text-foreground">{row.code}</span>
                <span className="text-neon">{"  " + row.comment}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

export function TabMockContent({ kind }: { kind: AnalysisKind }) {
  switch (kind) {
    case "explain":
      return <ExplanationMock />;
    case "flowchart":
      return <FlowchartMock />;
    case "comments":
      return <CommentsMock />;
    case "bugs":
      return <BugsMock />;
    case "improve":
      return <ImprovementsMock />;
    case "bigo":
      return <ComplexityMock />;
    default:
      return null;
  }
}
