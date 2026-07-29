import { useMemo, useRef, useState } from "react";
import SimpleEditor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/themes/prism-tomorrow.css";

function resolveEditor(mod: unknown): typeof SimpleEditor {
  let candidate: any = mod;
  while (candidate && typeof candidate === "object" && candidate.default) {
    candidate = candidate.default;
  }
  return candidate as typeof SimpleEditor;
}

const Editor = resolveEditor(SimpleEditor);

export function CodeEditor({
  value,
  onChange,
  highlightLine,
}: {
  value: string;
  onChange: (next: string) => void;
  highlightLine: number | null;
}) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const lines = useMemo(() => value.split("\n").length, [value]);

  return (
    <div className="relative flex h-full min-h-[320px] overflow-hidden rounded-lg border border-border bg-surface">
      <div
        ref={gutterRef}
        className="select-none overflow-hidden border-r border-border bg-surface-2/60 px-3 py-4 text-right font-mono text-[13px] leading-6 text-muted-foreground"
      >
        <div style={{ transform: `translateY(-${scrollTop}px)` }}>
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
      </div>

      <div className="relative min-w-0 flex-1">
        {highlightLine !== null && highlightLine <= lines ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 z-10 h-6 bg-neon/10"
            style={{ top: `calc(1rem + ${(highlightLine - 1) * 1.5}rem - ${scrollTop}px)` }}
          />
        ) : null}
        <Editor
          value={value}
          onValueChange={onChange}
          onScroll={(e) => setScrollTop((e.target as HTMLElement).scrollTop)}
          highlight={(code) =>
            Prism.highlight(code, Prism.languages.python, "python")
          }
          padding={16}
          textareaId="python-code"
          textareaClassName="outline-none"
          preClassName="!bg-transparent"
          insertSpaces
          tabSize={4}
          placeholder="# Paste your Python code here"
          className="scroll-slim code-editor h-full min-h-[320px] w-full overflow-auto bg-transparent font-mono text-[13px] leading-6 text-foreground"
        />
      </div>
    </div>
  );
}
