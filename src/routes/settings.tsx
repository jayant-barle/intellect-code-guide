import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Code2,
  Cpu,
  Database,
  Moon,
  Server,
  SlidersHorizontal,
  Sparkles,
  Sun,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTheme, type AppTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — PyLens Workspace Preferences" },
      {
        name: "description",
        content:
          "Configure PyLens preferences for Python code analysis, theme, and workspace options.",
      },
      { property: "og:title", content: "Settings — PyLens" },
      {
        property: "og:description",
        content: "Configure PyLens preferences for Python code analysis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme, isDark } = useTheme();

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neon">
              <span className="size-1.5 rounded-full bg-neon" />
              Workspace preferences
            </div>
            <h1 className="font-mono text-2xl font-semibold tracking-tight text-foreground">
              Settings
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Tune the PyLens workspace for focused, comfortable code reviews.
            </p>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-md border border-neon/25 bg-neon/10 px-3 py-2 font-mono text-[11px] text-neon">
            {isDark ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
            {isDark ? "Dark workspace active" : "Light workspace active"}
          </div>
        </div>

        {/* Link to Review Status */}
        <div className="flex items-center justify-between rounded-xl border border-neon/30 bg-neon/5 p-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-md border border-neon/40 bg-neon/10 text-neon">
              <Database className="size-4" />
            </div>
            <div>
              <p className="font-mono text-xs font-semibold text-foreground">
                Looking for Analysis Runs & Status Telemetry?
              </p>
              <p className="text-xs text-muted-foreground">
                Audit run staleness, SHA-256 code hashes, and execute quick retries in Code Review.
              </p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            className="gap-1.5 font-mono text-xs bg-neon text-background hover:bg-neon/90"
          >
            <Link to="/review">
              <span>View in Review</span>
              <ArrowRight className="size-3" />
            </Link>
          </Button>
        </div>

        {/* Settings Card */}
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[0_18px_50px_-32px_color-mix(in_oklab,var(--neon)_35%,transparent)]">
          {/* Appearance Section */}
          <section className="p-5 sm:p-6 space-y-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-md border border-neon/25 bg-neon/10 text-neon">
                  {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
                </div>
                <div>
                  <h2 className="font-mono text-sm font-semibold text-foreground">
                    Workspace Theme
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Persistent theme applied across every page, code editor, and flowchart diagram.
                  </p>
                </div>
              </div>
              <div className="font-mono text-[11px] text-muted-foreground self-start sm:self-auto">
                Current: <span className="font-semibold text-neon capitalize">{theme}</span>
              </div>
            </div>

            {/* Interactive Theme Selection Cards */}
            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              {/* Dark Theme Card */}
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={cn(
                  "group relative flex flex-col justify-between rounded-lg border p-4 text-left transition-all cursor-pointer",
                  isDark
                    ? "border-neon bg-neon/5 ring-1 ring-neon/40 shadow-xs"
                    : "border-border bg-background/50 hover:border-border/90 hover:bg-background/80",
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="grid size-7 place-items-center rounded border border-border bg-surface-2 text-neon">
                        <Moon className="size-3.5" />
                      </div>
                      <span className="font-mono text-xs font-semibold text-foreground">
                        Dark Canvas
                      </span>
                    </div>
                    {isDark ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-neon/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-neon border border-neon/30">
                        <Check className="size-3" /> Active
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-muted-foreground group-hover:text-foreground">
                        Select
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Low-glare dark surfaces with neon lime highlights. Ideal for extended coding
                    sessions and deep focus.
                  </p>

                  {/* Visual Preview Swatch */}
                  <div className="rounded border border-border/80 bg-[#161b22] p-2.5 space-y-1.5 font-mono text-[10px]">
                    <div className="flex items-center gap-1.5 text-[#6ee7a8]">
                      <span className="size-1.5 rounded-full bg-[#6ee7a8]" />
                      <span>def analyze(python_code):</span>
                    </div>
                    <div className="pl-3 text-[#94a3b8]">
                      return {"{"} score: 98 {"}"}
                    </div>
                  </div>
                </div>
              </button>

              {/* Light Theme Card */}
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={cn(
                  "group relative flex flex-col justify-between rounded-lg border p-4 text-left transition-all cursor-pointer",
                  !isDark
                    ? "border-neon bg-neon/5 ring-1 ring-neon/40 shadow-xs"
                    : "border-border bg-background/50 hover:border-border/90 hover:bg-background/80",
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="grid size-7 place-items-center rounded border border-border bg-surface-2 text-amber-500">
                        <Sun className="size-3.5" />
                      </div>
                      <span className="font-mono text-xs font-semibold text-foreground">
                        Light Canvas
                      </span>
                    </div>
                    {!isDark ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-neon/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-neon border border-neon/30">
                        <Check className="size-3" /> Active
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-muted-foreground group-hover:text-foreground">
                        Select
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Clean, bright surfaces with crisp high-contrast text. Great for well-lit
                    environments and readability.
                  </p>

                  {/* Visual Preview Swatch */}
                  <div className="rounded border border-border/80 bg-[#f8fafc] p-2.5 space-y-1.5 font-mono text-[10px]">
                    <div className="flex items-center gap-1.5 text-[#059669]">
                      <span className="size-1.5 rounded-full bg-[#059669]" />
                      <span>def analyze(python_code):</span>
                    </div>
                    <div className="pl-3 text-[#475569]">
                      return {"{"} score: 98 {"}"}
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </section>

          <Separator />

          {/* Analysis Engine & Style */}
          <section className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-surface-2 text-info">
                <SlidersHorizontal className="size-4" />
              </div>
              <div>
                <h2 className="font-mono text-sm font-semibold text-foreground">Analysis style</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Keep results structured and easy to scan while reviewing code.
                </p>
                <div className="mt-4 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-info" />
                  Detailed output enabled
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-surface-2 text-warn">
                <Sparkles className="size-4" />
              </div>
              <div>
                <h2 className="font-mono text-sm font-semibold text-foreground">Editor</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Python syntax highlighting and line-level review markers are active.
                </p>
                <div className="mt-4 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <Code2 className="size-3.5 text-warn" />
                  Python workspace
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Engine Pipeline overview */}
          <section className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-surface-2 text-neon">
                <Cpu className="size-4" />
              </div>
              <div>
                <h2 className="font-mono text-sm font-semibold text-foreground">
                  Dual-Engine Architecture
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  PyLens pairs cloud LLM reasoning with an offline AST rule-based engine.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border/80 bg-background/50 p-3 text-xs text-muted-foreground">
                <span className="font-mono font-semibold text-foreground">Cloud AI Gateway:</span>{" "}
                Used for explanation tutorials, Mermaid flowcharts, and complex bug detection.
              </div>
              <div className="rounded-md border border-border/80 bg-background/50 p-3 text-xs text-muted-foreground">
                <span className="font-mono font-semibold text-foreground">AST Fallback:</span>{" "}
                Deterministic offline rule checking for aliasing, recursion, and Big-O complexity.
              </div>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-md border border-border/70 bg-surface/50 px-4 py-3">
          <p className="font-mono text-[11px] text-muted-foreground">
            PyLens workspace · preferences synced locally
          </p>
        </div>
      </div>
    </div>
  );
}
