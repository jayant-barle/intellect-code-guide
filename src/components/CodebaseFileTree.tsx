import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileCode,
  FileText,
  Folder,
  FolderOpen,
  ShieldAlert,
  Zap,
} from "lucide-react";
import type { FileNode, FileDetail } from "@/lib/codebase-analyzer-types";

interface CodebaseFileTreeProps {
  node: FileNode;
  filesMap: Record<string, FileDetail>;
  selectedPath: string | null;
  onSelectFile: (file: FileDetail) => void;
}

export function CodebaseFileTree({
  node,
  filesMap,
  selectedPath,
  onSelectFile,
}: CodebaseFileTreeProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (node.type === "file") {
    const isSelected = selectedPath === node.path;
    const fileDetail = filesMap[node.path];
    const issues = node.issuesSummary;
    const totalIssues = (issues?.bugs || 0) + (issues?.security || 0) + (issues?.performance || 0) + (issues?.quality || 0);

    return (
      <div
        onClick={() => fileDetail && onSelectFile(fileDetail)}
        className={`group flex items-center justify-between py-1 px-2 rounded-md font-mono text-xs cursor-pointer select-none transition-colors ${
          isSelected
            ? "bg-neon/15 text-neon font-semibold border border-neon/30"
            : "hover:bg-surface-2 text-foreground/80 hover:text-foreground"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <FileCode className={`size-3.5 shrink-0 ${isSelected ? "text-neon" : "text-muted-foreground"}`} />
          <span className="truncate">{node.name}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-muted-foreground">
          <span>{node.lines}L</span>
          {totalIssues > 0 && (
            <div className="flex items-center gap-0.5">
              {(issues?.security || 0) > 0 && (
                <span className="size-2 rounded-full bg-destructive inline-block" title={`${issues?.security} security issue(s)`} />
              )}
              {(issues?.bugs || 0) > 0 && (
                <span className="size-2 rounded-full bg-amber-500 inline-block" title={`${issues?.bugs} bug(s)`} />
              )}
              {(issues?.performance || 0) > 0 && (
                <span className="size-2 rounded-full bg-cyan-400 inline-block" title={`${issues?.performance} performance opportunity(s)`} />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Directory node
  return (
    <div className="space-y-0.5">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 py-1 px-1.5 rounded-md font-mono text-xs text-muted-foreground hover:text-foreground hover:bg-surface-2 cursor-pointer select-none"
      >
        {isOpen ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        {isOpen ? (
          <FolderOpen className="size-3.5 shrink-0 text-neon/80" />
        ) : (
          <Folder className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="font-semibold text-foreground/90">{node.name}</span>
        <span className="text-[10px] text-muted-foreground/60 ml-auto">
          {node.children?.length || 0}
        </span>
      </div>

      {isOpen && node.children && (
        <div className="pl-3.5 border-l border-border/40 ml-2 space-y-0.5">
          {node.children.map((child) => (
            <CodebaseFileTree
              key={child.path}
              node={child}
              filesMap={filesMap}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
