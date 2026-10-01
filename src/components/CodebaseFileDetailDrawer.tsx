import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Bug,
  Check,
  Code2,
  Copy,
  ExternalLink,
  FileCode,
  FlaskConical,
  GitCompare,
  Layers,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { FileDetail } from "@/lib/codebase-analyzer-types";

interface CodebaseFileDetailDrawerProps {
  file: FileDetail | null;
  onClose?: () => void;
}

export function CodebaseFileDetailDrawer({ file, onClose }: CodebaseFileDetailDrawerProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  if (!file) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center p-8 text-center text-muted-foreground border border-dashed border-border/80 rounded-xl bg-surface/30">
        <FileCode className="size-8 text-muted-foreground/60 mb-2" />
        <p className="font-mono text-xs">Select any file in the tree to inspect structure, issues, and actions.</p>
      </div>
    );
  }

  const handleCopy = async () => {
    if (!file.contentSample) return;
    try {
      await navigator.clipboard.writeText(file.contentSample);
      setCopied(true);
      toast.success("File content copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // Cross-module navigations passing the file code via sessionStorage
  const openInCodeReviewer = () => {
    if (file.contentSample) {
      sessionStorage.setItem("pylens_code_transfer", file.contentSample);
      sessionStorage.setItem("pylens_load_code", file.contentSample);
    }
    navigate({ to: "/" });
  };

  const openInDebugger = () => {
    if (file.contentSample) {
      sessionStorage.setItem("pylens_code_transfer", file.contentSample);
      sessionStorage.setItem("pylens_load_code", file.contentSample);
      sessionStorage.setItem("pylens_initial_tab", "bugs");
    }
    navigate({ to: "/" });
  };

  const openInOptimizer = () => {
    if (file.contentSample) {
      sessionStorage.setItem("pylens_code_transfer", file.contentSample);
      sessionStorage.setItem("pylens_load_code", file.contentSample);
    }
    navigate({ to: "/optimizer" });
  };

  const openInTestGenerator = () => {
    if (file.contentSample) {
      sessionStorage.setItem("pylens_code_transfer", file.contentSample);
      sessionStorage.setItem("pylens_load_code", file.contentSample);
    }
    navigate({ to: "/test-generator" });
  };

  const securityIssuesCount = file.issues.filter((i) => i.category === "security").length;
  const bugIssuesCount = file.issues.filter((i) => i.category === "bug").length;
  const qualityIssuesCount = file.issues.filter((i) => i.category === "quality").length;
  const perfIssuesCount = file.issues.filter((i) => i.category === "performance").length;
  const testingIssuesCount = file.functions.filter((f) => !f.name.startsWith("test_")).length;

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-5 shadow-sm">
      {/* File Header */}
      <div className="space-y-3 border-b border-border/60 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileCode className="size-4 shrink-0 text-neon" />
            <h3 className="font-mono text-xs sm:text-sm font-bold text-foreground truncate">
              {file.path}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <Badge variant="outline" className="border-neon/40 text-neon bg-neon/5">
              {file.language}
            </Badge>
            <Badge variant="outline" className="text-muted-foreground">
              {file.lines} lines
            </Badge>
            <Badge variant="outline" className="text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
            </Badge>
          </div>
        </div>

        {/* File Structure Overview */}
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-surface-2/40 border border-border/50 text-center font-mono">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Lines</div>
            <div className="text-sm font-bold text-foreground">{file.lines}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Functions</div>
            <div className="text-sm font-bold text-foreground">{file.functions.length}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Classes</div>
            <div className="text-sm font-bold text-foreground">{file.classes.length}</div>
          </div>
        </div>

        {/* Categorized Issues Pill Breakdown */}
        <div className="space-y-1.5 font-mono text-xs">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
            Issues Breakdown:
          </span>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-red-500/30 bg-red-500/10 text-red-400">
              <ShieldAlert className="size-3" /> Security: {securityIssuesCount}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Bug className="size-3" /> Bugs: {bugIssuesCount}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-blue-500/30 bg-blue-500/10 text-blue-400">
              <Sparkles className="size-3" /> Quality: {qualityIssuesCount}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-yellow-500/30 bg-yellow-500/10 text-yellow-400">
              <Zap className="size-3" /> Performance: {perfIssuesCount}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <FlaskConical className="size-3" /> Untested: {testingIssuesCount}
            </span>
          </div>
        </div>

        {/* 4 Cross-Module Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={openInCodeReviewer}
            className="h-7 gap-1.5 font-mono text-xs bg-neon text-background hover:bg-neon/90 font-medium"
            title="Inspect in Code Reviewer"
          >
            <GitCompare className="size-3.5" />
            Review Code
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={openInDebugger}
            className="h-7 gap-1.5 font-mono text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
            title="Debug potential logic issues"
          >
            <Bug className="size-3.5 text-amber-400" />
            Debug
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={openInTestGenerator}
            className="h-7 gap-1.5 font-mono text-xs border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
            title="Generate pytest unit tests"
          >
            <FlaskConical className="size-3.5 text-cyan-400" />
            Generate Tests
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={openInOptimizer}
            className="h-7 gap-1.5 font-mono text-xs border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10"
            title="Optimize performance in studio"
          >
            <Zap className="size-3.5 text-yellow-400" />
            Optimize
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="h-7 gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check className="size-3 text-neon" /> : <Copy className="size-3" />}
            {copied ? "Copied" : "Copy Code"}
          </Button>
        </div>
      </div>

      {/* Functions in file */}
      {file.functions.length > 0 && (
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Functions ({file.functions.length})
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {file.functions.map((f) => (
              <span
                key={f.name}
                className="font-mono text-[10px] px-2 py-0.5 rounded border border-border/50 bg-surface-2 text-foreground/90"
                title={f.docstring ? `Docstring: ${f.docstring}` : undefined}
              >
                {f.name}({f.params.slice(0, 3).join(", ")}{f.params.length > 3 ? "..." : ""})
                {f.returns ? ` -> ${f.returns}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Classes in file */}
      {file.classes.length > 0 && (
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Classes ({file.classes.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {file.classes.map((c) => (
              <span
                key={c.name}
                className="font-mono text-[10px] px-2 py-0.5 rounded border border-border/50 bg-surface-2 text-foreground/90"
              >
                class {c.name} ({c.methodsCount} methods)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Internal & External Imports */}
      {file.imports.length > 0 && (
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center justify-between">
            <span>Dependencies & Imports ({file.imports.length})</span>
            <span className="text-[9px] text-muted-foreground/80">
              {file.internalImports?.length || 0} local • {file.externalImports?.length || 0} external
            </span>
          </div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
            {file.imports.map((imp, idx) => (
              <Badge key={idx} variant="secondary" className="font-mono text-[9px] py-0 px-1.5">
                {imp}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* File Issues */}
      <div className="space-y-2">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Issues in this file ({file.issues.length})
        </div>

        {file.issues.length === 0 ? (
          <p className="font-mono text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg">
            ✓ No security vulnerabilities, potential bugs, or performance issues detected in this file.
          </p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scroll-slim">
            {file.issues.map((issue) => (
              <div
                key={issue.id}
                className={`rounded-lg border p-2.5 text-xs font-mono space-y-1 ${
                  issue.category === "security"
                    ? "border-destructive/30 bg-destructive/5"
                    : issue.category === "bug"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-border/60 bg-surface-2/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    {issue.category === "security" ? (
                      <ShieldAlert className="size-3 text-destructive" />
                    ) : issue.category === "bug" ? (
                      <AlertTriangle className="size-3 text-amber-400" />
                    ) : (
                      <Zap className="size-3 text-cyan-400" />
                    )}
                    {issue.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Line {issue.line}</span>
                </div>

                <p className="text-[11px] text-muted-foreground">{issue.description}</p>

                {issue.snippet && (
                  <pre className="text-[10px] bg-background/80 p-1.5 rounded overflow-x-auto text-foreground/90 border border-border/40">
                    <code>{issue.snippet}</code>
                  </pre>
                )}

                <div className="text-[10px] text-neon/90 pt-1">
                  💡 {issue.recommendation}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Code Sample Preview */}
      {file.contentSample && (
        <div className="space-y-1.5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            File Preview
          </div>
          <div className="rounded-lg border border-border/60 bg-background/80 p-3 max-h-48 overflow-y-auto">
            <pre className="font-mono text-[11px] text-muted-foreground leading-relaxed">
              <code>{file.contentSample}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
