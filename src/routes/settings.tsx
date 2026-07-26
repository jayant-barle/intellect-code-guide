import { createFileRoute } from "@tanstack/react-router";

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
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-mono text-xl font-semibold text-foreground">Settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Preferences for how PyLens analyses your code will live here.
      </p>
    </div>
  );
}
