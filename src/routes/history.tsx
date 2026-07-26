import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — PyLens Python Code Analyses" },
      {
        name: "description",
        content: "Revisit your recent PyLens Python code analyses, explanations and flowcharts.",
      },
      { property: "og:title", content: "History — PyLens" },
      {
        property: "og:description",
        content: "Revisit your recent PyLens Python code analyses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-mono text-xl font-semibold text-foreground">History</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your past analyses will show up here.
      </p>
    </div>
  );
}
