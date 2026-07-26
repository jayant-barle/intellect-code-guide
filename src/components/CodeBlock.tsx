import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function CodeBlock({
  code,
  className,
  label,
}: {
  code: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-surface",
        className,
      )}
    >
      {label ? (
        <div className="border-b border-border px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
      ) : null}
      <button
        type="button"
        onClick={copy}
        aria-label="Copy code"
        className="absolute right-2 top-2 rounded-md border border-border bg-surface-2 p-2 text-muted-foreground opacity-0 transition hover:text-neon focus-visible:opacity-100 group-hover:opacity-100"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
      <pre className="scroll-slim overflow-x-auto p-4 font-mono text-[13px] leading-6 text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  );
}
