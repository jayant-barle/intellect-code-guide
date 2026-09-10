import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Activity,
  Code2,
  Cpu,
  Database,
  Flame,
  Moon,
  Play,
  Server,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  Sun,
} from "lucide-react";

import { SettingsStatusView } from "@/components/SettingsStatusView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { applyTheme, getStoredTheme, saveTheme, type AppTheme } from "@/lib/theme";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Status — PyLens Analysis Cache & Runs" },
      {
        name: "description",
        content:
          "Monitor PyLens analysis runs, track stale cache entries by SHA-256 code hash and timestamp, and execute quick re-runs.",
      },
      { property: "og:title", content: "Settings & Status — PyLens" },
      {
        property: "og:description",
        content:
          "Track analysis run status, SHA-256 code hashes, timestamps, and quick retry stale runs in PyLens.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"status" | "preferences">("status");
  const [theme, setTheme] = useState<AppTheme>("dark");

  useEffect(() => {
    const storedTheme = getStoredTheme();
    setTheme(storedTheme);
    applyTheme(storedTheme);
  }, []);

  const handleThemeChange = (nextTheme: AppTheme) => {
    setTheme(nextTheme);
    saveTheme(nextTheme);
  };

  const isDark = theme === "dark";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground">
              Settings & Status
            </h1>
            <Badge
              variant="outline"
              className="border-neon/40 bg-neon/10 font-mono text-xs text-neon gap-1.5"
            >
              <Activity className="size-3 animate-pulse" />
              Live Telemetry
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Audit analysis run health, monitor SHA-256 code hashes, identify stale runs, and perform
            quick retries.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Theme Toggle Pill */}
          <div className="flex items-center gap-2 rounded-md border border-neon/25 bg-neon/10 px-3 py-1.5 font-mono text-[11px] text-neon">
            {isDark ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
            <span className="hidden sm:inline">{isDark ? "Dark" : "Light"}</span>
            <Switch
              id="header-theme-toggle"
              checked={isDark}
              onCheckedChange={(checked) => handleThemeChange(checked ? "dark" : "light")}
              aria-label="Toggle light and dark theme"
              className="scale-75"
            />
          </div>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 font-mono text-xs border-border bg-surface"
          >
            <Link to="/review">
              <Flame className="size-3 text-neon" />
              <span>Review Analytics</span>
            </Link>
          </Button>

          <Button
            asChild
            size="sm"
            className="gap-1.5 font-mono text-xs bg-neon text-background hover:bg-neon/90 font-semibold"
          >
            <Link to="/">
              <Play className="size-3" />
              <span>Workspace</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "status" | "preferences")}
        className="space-y-6"
      >
        <TabsList className="bg-surface border border-border p-1">
          <TabsTrigger
            value="status"
            className="gap-2 font-mono text-xs data-[state=active]:bg-background data-[state=active]:text-neon"
          >
            <Database className="size-3.5" />
            <span>Analysis Runs & Status</span>
          </TabsTrigger>
          <TabsTrigger
            value="preferences"
            className="gap-2 font-mono text-xs data-[state=active]:bg-background data-[state=active]:text-foreground"
          >
            <Sliders className="size-3.5" />
            <span>Workspace & Preferences</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Analysis Runs & Status View */}
        <TabsContent value="status" className="outline-none">
          <SettingsStatusView />
        </TabsContent>

        {/* Tab 2: Preferences */}
        <TabsContent value="preferences" className="outline-none space-y-6">
          <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[0_18px_50px_-32px_color-mix(in_oklab,var(--neon)_35%,transparent)]">
            {/* Appearance Section */}
            <section className="p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-md border border-neon/25 bg-neon/10 text-neon">
                  {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
                </div>
                <div>
                  <h2 className="font-mono text-sm font-semibold text-foreground">Appearance</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Choose the canvas that feels best for your code review sessions.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between gap-4 rounded-md border border-neon/20 bg-background/60 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-8 place-items-center rounded border border-border bg-surface-2 text-neon">
                    {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
                  </div>
                  <div>
                    <p className="font-mono text-xs font-medium text-foreground">
                      {isDark ? "Dark mode" : "Light mode"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isDark
                        ? "Dim surfaces and neon accents"
                        : "Bright surfaces and clear contrast"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">
                    {isDark ? "Dark" : "Light"}
                  </span>
                  <Switch
                    id="theme-toggle"
                    checked={isDark}
                    onCheckedChange={(checked) => handleThemeChange(checked ? "dark" : "light")}
                    aria-label="Toggle light and dark theme"
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* Analysis Engine Section */}
            <section className="p-5 sm:p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-md border border-neon/25 bg-neon/10 text-neon">
                  <Cpu className="size-4" />
                </div>
                <div>
                  <h2 className="font-mono text-sm font-semibold text-foreground">
                    Analysis Engine & Pipeline
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    PyLens operates a hybrid dual-engine pipeline combining cloud LLM intelligence
                    with deterministic local Python AST analysis.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 mt-4">
                <div className="rounded-lg border border-border/80 bg-background/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      Cloud AI Gateway
                    </span>
                    <Badge
                      variant="outline"
                      className="border-neon/40 bg-neon/10 font-mono text-[10px] text-neon"
                    >
                      Enabled
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Deep code reasoning powered by Lovable AI Gateway, OpenAI, or Gemini for Mermaid
                    flowcharts, algorithmic bug detection, and line-by-line tutorials.
                  </p>
                </div>

                <div className="rounded-lg border border-border/80 bg-background/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      Deterministic AST Fallback
                    </span>
                    <Badge
                      variant="outline"
                      className="border-border bg-surface font-mono text-[10px] text-muted-foreground"
                    >
                      Automatic Fallback
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Fast, zero-network rule-based analyzer detecting 2D list aliasing, recursion
                    stack depth, mutable defaults, and Big-O complexity.
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            {/* Cache Invalidation & Telemetry Section */}
            <section className="p-5 sm:p-6 space-y-3">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-surface-2 text-info">
                  <Server className="size-4 text-info" />
                </div>
                <div>
                  <h2 className="font-mono text-sm font-semibold text-foreground">
                    Cache Invalidation & Staleness Guidelines
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    How PyLens guarantees fast replays while allowing fresh re-analysis.
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground leading-relaxed pl-12">
                <p>
                  • <strong>SHA-256 Code Hashing:</strong> Each Python code snippet is digested into
                  a cryptographic 256-bit hash. Repeat runs with verbatim identical code are
                  instantly replayed from the database.
                </p>
                <p>
                  • <strong>Staleness Marking:</strong> Analysis runs that haven&apos;t been
                  re-verified within your configured staleness window (e.g. 24 hours) are flagged
                  with an amber badge on the Status page.
                </p>
                <p>
                  • <strong>Quick Retry:</strong> Clicking &quot;Quick Retry&quot; forces an
                  end-to-end re-analysis bypassing cached records, updating the timestamp, and
                  re-validating quality scores.
                </p>
              </div>
            </section>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-md border border-border/70 bg-surface/50 px-4 py-3">
            <p className="font-mono text-[11px] text-muted-foreground">
              PyLens workspace · preferences synced locally
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
