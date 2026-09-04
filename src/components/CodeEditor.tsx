import { useMemo, useRef, useState } from "react";
import SimpleEditor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/themes/prism-tomorrow.css";
import type { Annotation } from "@/lib/annotations";

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
  annotations = [],
}: {
  value: string;
  onChange: (next: string) => void;
  highlightLine: number | null;
  annotations?: Annotation[];
}) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const lines = useMemo(() => value.split("\n").length, [value]);

  const byLine = useMemo(() => {
    const map = new Map<number, Annotation>();
    for (const a of annotations) {
      const existing = map.get(a.line);
      // bugs win over improvements on the same line
      if (!existing || (existing.type === "improve" && a.type === "bug")) {
        map.set(a.line, a);
      }
    }
    return map;
  }, [annotations]);

  return (
    <div className="relative flex h-full min-h-[320px] overflow-hidden rounded-lg border border-border bg-surface">
      <div
        ref={gutterRef}
        className="select-none overflow-hidden border-r border-border bg-surface-2/60 py-4 pl-2 pr-2 text-right font-mono text-[13px] leading-6 text-muted-foreground"
      >
        <div style={{ transform: `translateY(-${scrollTop}px)` }}>
          {Array.from({ length: lines }, (_, i) => {
            const n = i + 1;
            const note = byLine.get(n);
            return (
              <div
                key={i}
                title={note ? `${note.type === "bug" ? "Bug" : "Improvement"}: ${note.title}` : undefined}
                className={`flex items-center justify-end gap-1.5 ${
                  highlightLine === n ? "-mx-2 bg-neon/15 px-2 text-neon" : ""
                }`}
              >
                <span
                  aria-hidden
                  className={`size-1.5 shrink-0 rounded-full ${
                    note
                      ? note.type === "bug"
                        ? "bg-destructive"
                        : "bg-warn"
                      : "bg-transparent"
                  }`}
                />
                <span
                  className={
                    note
                      ? note.type === "bug"
                        ? "text-destructive"
                        : "text-warn"
                      : undefined
                  }
                >
                  {n}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative min-w-0 flex-1">
        {Array.from(byLine.values())
          .filter((a) => a.line <= lines)
          .map((a) => (
            <div
              key={`${a.type}-${a.line}`}
              aria-hidden
              className={`pointer-events-none absolute inset-x-0 h-6 border-l-2 ${
                a.type === "bug"
                  ? "border-destructive bg-destructive/10"
                  : "border-warn bg-warn/10"
              }`}
              style={{ top: `calc(1rem + ${(a.line - 1) * 1.5}rem - ${scrollTop}px)` }}
            />
          ))}
        {highlightLine !== null && highlightLine <= lines ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 z-10 h-6 bg-neon/10 ring-1 ring-inset ring-neon/40"
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
