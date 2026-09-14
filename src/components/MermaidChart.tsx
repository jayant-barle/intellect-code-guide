import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "@/lib/theme";

export function MermaidChart({ chart }: { chart: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const { isDark, theme } = useTheme();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? "dark" : "neutral",
        securityLevel: "strict",
        flowchart: { htmlLabels: false, useMaxWidth: true },
        fontFamily: "JetBrains Mono, monospace",

        themeVariables: isDark
          ? {
              background: "transparent",
              primaryColor: "#232a2c",
              primaryTextColor: "#e6ebe8",
              primaryBorderColor: "#6ee7a8",
              lineColor: "#7c8a85",
              secondaryColor: "#20262b",
              tertiaryColor: "#1a1f23",
            }
          : {
              background: "transparent",
              primaryColor: "#f0fdf4",
              primaryTextColor: "#0f172a",
              primaryBorderColor: "#059669",
              lineColor: "#64748b",
              secondaryColor: "#f1f5f9",
              tertiaryColor: "#e2e8f0",
            },
      });

      try {
        const source = chart.replace(/```(?:mermaid)?/g, "").trim();
        const renderId = `m-${id}-${theme}`;
        const { svg } = await mermaid.render(renderId, source);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setError(null);
        }
      } catch {
        if (!cancelled) setError("This diagram couldn't be rendered.");
      }
    })();

    return () => {
      cancelled = true;
      document.querySelectorAll(`[id^="dm-${id}"], [id^="m-${id}"]`).forEach((el) => el.remove());
    };
  }, [chart, id, isDark, theme]);

  if (error) {
    return <p className="font-mono text-sm text-destructive">{error}</p>;
  }

  return <div ref={ref} className="flex w-full justify-center overflow-x-auto" />;
}
