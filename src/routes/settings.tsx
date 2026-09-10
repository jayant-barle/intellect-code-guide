import { createFileRoute } from "@tanstack/react-router";
import { Code2, Moon, SlidersHorizontal, Sparkles, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { applyTheme, getStoredTheme, saveTheme, type AppTheme } from "@/lib/theme";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — PyLens Analysis Preferences" },
      {
        name: "description",
        content: "Configure PyLens preferences for Python code analysis, theme and output detail.",
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
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="mb-8 flex flex-col gap-4 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
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

        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[0_18px_50px_-32px_color-mix(in_oklab,var(--neon)_35%,transparent)]">
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
                  <p className="font-mono text-xs font-medium text-foreground">{isDark ? "Dark mode" : "Light mode"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{isDark ? "Dim surfaces and neon accents" : "Bright surfaces and clear contrast"}</p>
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
                  Detailed output
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
                  Python syntax highlighting and line-level review markers are ready.
                </p>
                <div className="mt-4 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <Code2 className="size-3.5 text-warn" />
                  Python workspace
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 rounded-md border border-border/70 bg-surface/50 px-4 py-3">
          <p className="font-mono text-[11px] text-muted-foreground">PyLens workspace · preferences synced locally</p>
          <Button type="button" variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground">
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
