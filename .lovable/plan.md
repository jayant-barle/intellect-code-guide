## PyLens — AI Python code analysis

A single-page dev tool: paste Python code, pick an analysis, get AI-generated results.

### Layout

```text
┌────────────────────────────────────────────────────────┐
│ topbar: logo · tagline · run button                    │
├──────────────────────┬─────────────────────────────────┤
│ editor pane          │ results pane (tabbed)           │
│ monospace textarea   │ Explain | Flowchart | Comments  │
│ w/ line gutter       │ Bugs | Improve | Big-O          │
│ sample-code chips    │ streamed markdown / mermaid     │
└──────────────────────┴─────────────────────────────────┘
```

Resizable split on desktop, stacked on mobile.

### Features

- **Line-by-line explanation** — numbered list mapped to source lines, hovering a row highlights the line in the editor.
- **Flowchart** — model returns Mermaid `flowchart TD`; rendered client-side with mermaid, dark theme, plus a "view source" toggle.
- **Auto-commenting** — returns the same code with inline comments, in a read-only code block with copy button.
- **Bug detection** — list of findings with severity chip, line ref, cause, fix.
- **Improvements** — suggestions with before/after snippets.
- **Big-O** — overall time/space verdict card plus per-function breakdown and a short justification.

### Design

Dark by default: near-black background (#0b0c0e-ish), layered gray surfaces, one neon accent (electric green/cyan) used sparingly for active tab, run button, focus rings. JetBrains Mono for all code and small labels; clean sans for prose. Generous padding, subtle borders, no gradients. All colors as semantic tokens in `src/styles.css`.

### Technical

- Lovable Cloud enabled for the AI backend (no accounts/keys needed from you).
- Analysis runs through a TanStack `createServerFn` per analysis type, calling Lovable AI via the AI SDK with structured output (Gemini Flash-class model for speed). Prompts and model stay server-side.
- Client uses TanStack Query per tab, so each analysis is cached and re-runs only when the code changes.
- Mermaid rendered lazily on the client only (SSR-safe).
- Rate-limit (429) and credit (402) errors surfaced inline in the results pane.
- No login or persistence in v1 — code lives in local component state only.

### Out of scope for v1

Accounts, saved history, multi-language support, file upload, GitHub import.
