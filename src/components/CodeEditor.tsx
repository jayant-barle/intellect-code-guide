import { useMemo, useRef } from "react";

export function CodeEditor({
  value,
  onChange,
  highlightLine,
}: {
  value: string;
  onChange: (next: string) => void;
  highlightLine: number | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lines = useMemo(() => value.split("\n").length, [value]);

  return (
    <div className="relative flex h-full min-h-[320px] overflow-hidden rounded-lg border border-border bg-surface">
      <div
        ref={scrollRef}
        className="scroll-slim select-none overflow-hidden border-r border-border bg-surface-2/60 px-3 py-4 text-right font-mono text-[13px] leading-6 text-muted-foreground"
      >
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={
              highlightLine === i + 1
                ? "-mx-3 bg-neon/15 px-3 text-neon"
                : undefined
            }
          >
            {i + 1}
          </div>
        ))}
      </div>

      <div className="relative flex-1">
        {highlightLine !== null && highlightLine <= lines ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 h-6 bg-neon/10"
            style={{ top: `calc(1rem + ${(highlightLine - 1) * 1.5}rem)` }}
          />
        ) : null}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          aria-label="Python code"
          placeholder="# Paste your Python code here"
          className="scroll-slim h-full w-full resize-none bg-transparent px-4 py-4 font-mono text-[13px] leading-6 text-foreground outline-none placeholder:text-muted-foreground/60"
        />
      </div>
    </div>
  );
}
