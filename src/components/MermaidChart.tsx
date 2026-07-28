import { useEffect, useId, useRef, useState } from "react";

export function MermaidChart({ chart }: { chart: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        securityLevel: "strict",
        flowchart: { htmlLabels: false, useMaxWidth: true },
        fontFamily: "JetBrains Mono, monospace",

        themeVariables: {
          background: "transparent",
          primaryColor: "#232a2c",
          primaryTextColor: "#e6ebe8",
          primaryBorderColor: "#6ee7a8",
          lineColor: "#7c8a85",
          secondaryColor: "#20262b",
          tertiaryColor: "#1a1f23",
        },
      });

      try {
        const source = chart.replace(/```(?:mermaid)?/g, "").trim();
        const { svg } = await mermaid.render(`m-${id}`, source);
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
      document.querySelectorAll(`#dm-${id}, #dm-m-${id}, #m-${id}`).forEach((el) => el.remove());
    };
  }, [chart, id]);


  if (error) {
    return <p className="font-mono text-sm text-destructive">{error}</p>;
  }

  return <div ref={ref} className="flex w-full justify-center overflow-x-auto" />;
}
