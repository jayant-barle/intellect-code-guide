import { useState, useMemo } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Boxes,
  Bug,
  CheckCircle2,
  Code2,
  Copy,
  Cpu,
  Download,
  EyeOff,
  FileCode,
  FileText,
  Filter,
  Flame,
  FlaskConical,
  FolderGit2,
  FolderSearch,
  FolderTree,
  GitBranch,
  GitCompare,
  HardDrive,
  Info,
  Layers,
  Link2,
  ListTree,
  Network,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Terminal,
  Workflow,
  XCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodebaseFileTree } from "@/components/CodebaseFileTree";
import { CodebaseFileDetailDrawer } from "@/components/CodebaseFileDetailDrawer";
import type {
  CodebaseAnalysisResult,
  CodebaseIssue,
  FileDetail,
} from "@/lib/codebase-analyzer-types";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

interface CodebaseDashboardProps {
  result: CodebaseAnalysisResult;
  onReset: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function CodebaseDashboard({
  result,
  onReset,
  onRefresh,
  isRefreshing = false,
}: CodebaseDashboardProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(() => {
    const fileKeys = Object.keys(result.files);
    return fileKeys.length > 0 ? fileKeys[0] : null;
  });

  const selectedFile = selectedFilePath ? result.files[selectedFilePath] || null : null;

  const [issueFilter, setIssueFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Download complete JSON analysis report
  const downloadReport = () => {
    try {
      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(result, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute(
        "download",
        `${result.projectName}-codebase-analysis.json`,
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Analysis report downloaded");
    } catch {
      toast.error("Failed to generate report download");
    }
  };

  // Quick navigation to modules
  const openInCodeReviewer = (file: FileDetail) => {
    if (file.contentSample) {
      sessionStorage.setItem("pylens_code_transfer", file.contentSample);
      sessionStorage.setItem("pylens_load_code", file.contentSample);
    }
    navigate({ to: "/" });
  };

  const openInDebugger = (file: FileDetail) => {
    if (file.contentSample) {
      sessionStorage.setItem("pylens_code_transfer", file.contentSample);
      sessionStorage.setItem("pylens_load_code", file.contentSample);
      sessionStorage.setItem("pylens_initial_tab", "bugs");
    }
    navigate({ to: "/" });
  };

  const openInOptimizer = (file: FileDetail) => {
    if (file.contentSample) {
      sessionStorage.setItem("pylens_code_transfer", file.contentSample);
      sessionStorage.setItem("pylens_load_code", file.contentSample);
    }
    navigate({ to: "/optimizer" });
  };

  const openInTestGen = (file: FileDetail) => {
    if (file.contentSample) {
      sessionStorage.setItem("pylens_code_transfer", file.contentSample);
      sessionStorage.setItem("pylens_load_code", file.contentSample);
    }
    navigate({ to: "/test-generator" });
  };

  // Combine all issues
  const allIssues = useMemo(() => {
    return [
      ...result.bugs.issues,
      ...result.security.issues,
      ...result.performance.issues,
      ...result.quality.issues,
    ];
  }, [result]);

  const filteredIssues = useMemo(() => {
    let list = allIssues;
    if (issueFilter !== "all") {
      list = list.filter(
        (i) =>
          i.severity.toLowerCase() === issueFilter.toLowerCase() ||
          i.category.toLowerCase() === issueFilter.toLowerCase() ||
          i.type.toLowerCase() === issueFilter.toLowerCase(),
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.file.toLowerCase().includes(q),
      );
    }
    return list;
  }, [allIssues, issueFilter, searchQuery]);

  // Total parsed functions and classes
  const totalFunctions = useMemo(() => {
    return Object.values(result.files).reduce(
      (sum, f) => sum + (f.functions?.length || 0),
      0,
    );
  }, [result.files]);

  const totalClasses = useMemo(() => {
    return Object.values(result.files).reduce(
      (sum, f) => sum + (f.classes?.length || 0),
      0,
    );
  }, [result.files]);

  // List of functions without tests
  const untestedFunctionsList = useMemo(() => {
    const list: Array<{ file: string; functionName: string; line: number }> = [];
    for (const [filePath, file] of Object.entries(result.files)) {
      if (file.category === "test") continue;
      for (const fn of file.functions || []) {
        if (!fn.name.startsWith("test_")) {
          list.push({
            file: filePath,
            functionName: fn.name,
            line: fn.line,
          });
        }
      }
    }
    return list.slice(0, 50);
  }, [result.files]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-7 px-2 font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5 mr-1" />
              Change Project
            </Button>
            <span className="text-muted-foreground/40">•</span>
            <Badge
              variant="outline"
              className="border-neon/40 text-neon bg-neon/5 uppercase font-mono text-[10px]"
            >
              {result.ingestMethod.toUpperCase()}
            </Badge>
            <span className="text-muted-foreground/40">•</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              Analyzed {new Date(result.timestamp).toLocaleTimeString()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono">
              {result.projectName}
            </h1>
            <Badge variant="secondary" className="font-mono text-[11px]">
              {result.overview.totalFiles} files
            </Badge>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {result.overview.totalLinesOfCode.toLocaleString()} lines of code analyzed across {result.overview.totalDirectories} directories
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-8 gap-1.5 font-mono text-xs"
            >
              <RefreshCw
                className={`size-3.5 ${isRefreshing ? "animate-spin text-neon" : ""}`}
              />
              {isRefreshing ? "Refreshing..." : "Re-analyze"}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={downloadReport}
            className="h-8 gap-1.5 font-mono text-xs"
          >
            <Download className="size-3.5" />
            Export JSON
          </Button>

          <Button
            size="sm"
            onClick={() => setActiveTab("files")}
            className="h-8 gap-1.5 font-mono text-xs bg-neon text-background hover:bg-neon/90"
          >
            <FolderTree className="size-3.5" />
            Explore Files
          </Button>
        </div>
      </div>

      {/* Codebase Health Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs transition-colors hover:border-border/80">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="font-mono text-[11px] uppercase tracking-wider">
              Total Files
            </span>
            <FileCode className="size-3.5 text-neon" />
          </div>
          <div className="font-mono text-2xl font-bold text-foreground">
            {result.overview.totalFiles}
          </div>
          <div className="mt-1 font-mono text-[10px] text-muted-foreground">
            {result.overview.sourceFiles} code • {result.overview.testFiles} tests
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs transition-colors hover:border-border/80">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="font-mono text-[11px] uppercase tracking-wider">
              Languages
            </span>
            <Code2 className="size-3.5 text-blue-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-foreground">
            {result.languages.length}
          </div>
          <div className="mt-1 font-mono text-[10px] text-muted-foreground truncate">
            Primary: {result.languages[0]?.name || "None"}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs transition-colors hover:border-border/80">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="font-mono text-[11px] uppercase tracking-wider">
              Functions
            </span>
            <Terminal className="size-3.5 text-emerald-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-foreground">
            {totalFunctions}
          </div>
          <div className="mt-1 font-mono text-[10px] text-muted-foreground">
            {totalClasses} classes parsed
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs transition-colors hover:border-border/80">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="font-mono text-[11px] uppercase tracking-wider">
              Dependencies
            </span>
            <Package className="size-3.5 text-purple-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-foreground">
            {result.dependencies.length}
          </div>
          <div className="mt-1 font-mono text-[10px] text-muted-foreground">
            {result.frameworks.length} frameworks
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs transition-colors hover:border-border/80">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="font-mono text-[11px] uppercase tracking-wider">
              Tests
            </span>
            <FlaskConical className="size-3.5 text-amber-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-foreground">
            {result.testing.testFunctionsCount}
          </div>
          <div className="mt-1 font-mono text-[10px] text-muted-foreground">
            {result.testing.testFilesCount} test files
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs transition-colors hover:border-border/80">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="font-mono text-[11px] uppercase tracking-wider">
              Total Issues
            </span>
            <AlertTriangle className="size-3.5 text-red-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-foreground">
            {allIssues.length}
          </div>
          <div className="mt-1 font-mono text-[10px] text-muted-foreground">
            {result.security.issues.length} sec • {result.bugs.issues.length} bugs
          </div>
        </div>
      </div>

      {/* Main Analysis Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full space-y-4"
      >
        <div className="overflow-x-auto pb-1">
          <TabsList className="bg-surface border border-border p-1 h-auto flex flex-nowrap min-w-max">
            <TabsTrigger
              value="overview"
              className="gap-2 font-mono text-xs px-3 py-1.5 data-[state=active]:bg-neon/15 data-[state=active]:text-neon"
            >
              <Activity className="size-3.5" />
              Overview
            </TabsTrigger>

            <TabsTrigger
              value="structure"
              className="gap-2 font-mono text-xs px-3 py-1.5 data-[state=active]:bg-neon/15 data-[state=active]:text-neon"
            >
              <Layers className="size-3.5 text-cyan-400" />
              Structure
              <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                {result.structure.entryPoints.length} entries
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="dependencies"
              className="gap-2 font-mono text-xs px-3 py-1.5 data-[state=active]:bg-neon/15 data-[state=active]:text-neon"
            >
              <Network className="size-3.5 text-purple-400" />
              Dependencies
              {result.moduleDependencies.circularDependencies.length > 0 && (
                <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 border-red-500/30 text-red-400 bg-red-500/10">
                  {result.moduleDependencies.circularDependencies.length} cycles
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="files"
              className="gap-2 font-mono text-xs px-3 py-1.5 data-[state=active]:bg-neon/15 data-[state=active]:text-neon"
            >
              <FolderTree className="size-3.5" />
              File Explorer
              <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                {result.overview.totalFiles}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="quality"
              className="gap-2 font-mono text-xs px-3 py-1.5 data-[state=active]:bg-neon/15 data-[state=active]:text-neon"
            >
              <Sparkles className="size-3.5 text-blue-400" />
              Code Quality
              {result.quality.issues.length > 0 && (
                <Badge
                  variant="outline"
                  className="ml-1 text-[10px] px-1 py-0 border-blue-500/30 text-blue-400 bg-blue-500/10"
                >
                  {result.quality.issues.length}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="bugs"
              className="gap-2 font-mono text-xs px-3 py-1.5 data-[state=active]:bg-neon/15 data-[state=active]:text-neon"
            >
              <Bug className="size-3.5 text-red-400" />
              Bugs
              {result.bugs.issues.length > 0 && (
                <Badge
                  variant="outline"
                  className="ml-1 text-[10px] px-1 py-0 border-red-500/30 text-red-400 bg-red-500/10"
                >
                  {result.bugs.issues.length}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="security"
              className="gap-2 font-mono text-xs px-3 py-1.5 data-[state=active]:bg-neon/15 data-[state=active]:text-neon"
            >
              <ShieldAlert className="size-3.5 text-amber-400" />
              Security
              {result.security.issues.length > 0 && (
                <Badge
                  variant="outline"
                  className="ml-1 text-[10px] px-1 py-0 border-amber-500/30 text-amber-400 bg-amber-500/10"
                >
                  {result.security.issues.length}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="performance"
              className="gap-2 font-mono text-xs px-3 py-1.5 data-[state=active]:bg-neon/15 data-[state=active]:text-neon"
            >
              <Zap className="size-3.5 text-yellow-400" />
              Performance
              {result.performance.issues.length > 0 && (
                <Badge
                  variant="outline"
                  className="ml-1 text-[10px] px-1 py-0 border-yellow-500/30 text-yellow-400 bg-yellow-500/10"
                >
                  {result.performance.issues.length}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="testing"
              className="gap-2 font-mono text-xs px-3 py-1.5 data-[state=active]:bg-neon/15 data-[state=active]:text-neon"
            >
              <FlaskConical className="size-3.5 text-emerald-400" />
              Testing
            </TabsTrigger>

            <TabsTrigger
              value="documentation"
              className="gap-2 font-mono text-xs px-3 py-1.5 data-[state=active]:bg-neon/15 data-[state=active]:text-neon"
            >
              <BookOpen className="size-3.5 text-purple-400" />
              Documentation
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-5 m-0">
          {/* AI Project Summary & High-Level Interpretation */}
          {result.aiSummary && (
            <div className="rounded-xl border border-neon/30 bg-surface p-5 space-y-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-neon/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-neon" />
                  <h3 className="font-mono text-sm font-bold text-foreground uppercase tracking-wider">
                    AI Architectural Interpretation
                  </h3>
                </div>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] border-neon/40 text-neon bg-neon/5"
                >
                  Static Evidence Grounded
                </Badge>
              </div>

              <p className="text-sm text-foreground/90 leading-relaxed font-sans">
                {result.aiSummary.overview}
              </p>

              {result.aiSummary.architecture && (
                <div className="p-3.5 rounded-lg border border-border/70 bg-surface-2/40">
                  <h4 className="font-mono text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Layers className="size-3.5 text-blue-400" /> Architecture Overview
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {result.aiSummary.architecture}
                  </p>
                </div>
              )}

              {result.aiSummary.keyConcerns && result.aiSummary.keyConcerns.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-mono text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5 text-amber-400" /> Key Areas Requiring Attention:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {result.aiSummary.keyConcerns.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2.5 rounded-md border border-border/60 bg-surface text-xs text-muted-foreground"
                      >
                        <span className="text-neon font-mono font-bold">•</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.aiSummary.recommendations && result.aiSummary.recommendations.length > 0 && (
                <div className="space-y-2 pt-1">
                  <h4 className="font-mono text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-neon" /> Recommendations:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {result.aiSummary.recommendations.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2.5 rounded-md border border-neon/20 bg-neon/5 text-xs text-foreground/90"
                      >
                        <span className="text-neon font-mono font-bold">✓</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Languages & Frameworks Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Language Breakdown */}
            <div className="rounded-xl border border-border bg-surface p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Code2 className="size-4 text-blue-400" /> Languages Detected
                </h3>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {result.languages.length} total
                </span>
              </div>

              {/* Progress bar */}
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2">
                {result.languages.map((lang) => (
                  <div
                    key={lang.name}
                    style={{
                      width: `${Math.max(lang.percentage, 2)}%`,
                      backgroundColor: lang.color || "#10b981",
                    }}
                    title={`${lang.name}: ${lang.percentage}% (${lang.filesCount} files)`}
                    className="h-full transition-all duration-300 hover:opacity-80"
                  />
                ))}
              </div>

              <div className="space-y-2 pt-1">
                {result.languages.map((lang) => (
                  <div
                    key={lang.name}
                    className="flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: lang.color || "#10b981" }}
                      />
                      <span className="text-foreground font-medium">
                        {lang.name}
                      </span>
                      {!lang.analysisSupported && (
                        <span className="text-[10px] text-muted-foreground/80 italic">
                          (limited deep analysis)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>{lang.filesCount} files</span>
                      <span className="font-semibold text-foreground w-12 text-right">
                        {lang.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Frameworks & Tech Stack */}
            <div className="rounded-xl border border-border bg-surface p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Boxes className="size-4 text-purple-400" /> Technology Stack
                </h3>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {result.frameworks.length} verified
                </span>
              </div>

              {result.frameworks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs font-mono">
                  No standard framework signatures detected in imports or package files.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {result.frameworks.map((fw) => (
                    <div
                      key={fw.name}
                      className="p-3 rounded-lg border border-border/80 bg-surface-2/40 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {fw.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="font-mono text-[9px] uppercase border-border/60"
                        >
                          {fw.category}
                        </Badge>
                      </div>
                      <p className="font-mono text-[10px] text-muted-foreground truncate" title={fw.evidence}>
                        Evidence: {fw.evidence}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ignored / Filtered Files Breakdown */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <EyeOff className="size-4 text-muted-foreground" /> Ignored & Filtered Files
              </h3>
              <Badge variant="outline" className="font-mono text-[10px]">
                Safe Sanitation
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
              Heavy build artifacts, binary vendor directories, and secrets (.env) were automatically filtered to protect security and token budgets.
            </p>

            {result.ignoredSummary.categories.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-xs font-mono">
                No extraneous build directories ignored.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {result.ignoredSummary.categories.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-2 rounded-md bg-surface-2/40 border border-border/50 text-xs font-mono"
                  >
                    <span className="font-bold text-foreground">
                      {item.name}/
                    </span>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {item.count} items filtered
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: STRUCTURE ANALYSIS */}
        <TabsContent value="structure" className="space-y-4 m-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
              <span className="font-mono text-[11px] text-muted-foreground">Entry Points</span>
              <div className="font-mono text-xl font-bold text-cyan-400">
                {result.structure.entryPoints.length}
              </div>
              <p className="font-mono text-[10px] text-muted-foreground truncate">
                {result.structure.entryPoints[0] || "None detected"}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
              <span className="font-mono text-[11px] text-muted-foreground">Source Directories</span>
              <div className="font-mono text-xl font-bold text-foreground">
                {result.structure.sourceDirectories.length}
              </div>
              <p className="font-mono text-[10px] text-muted-foreground truncate">
                {result.structure.sourceDirectories.join(", ") || "Root"}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
              <span className="font-mono text-[11px] text-muted-foreground">Build & Deploy Files</span>
              <div className="font-mono text-xl font-bold text-foreground">
                {result.structure.buildFiles.length + result.structure.deploymentFiles.length}
              </div>
              <p className="font-mono text-[10px] text-muted-foreground">
                {result.structure.buildFiles.length} build • {result.structure.deploymentFiles.length} deploy
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
              <span className="font-mono text-[11px] text-muted-foreground">Avg Function Size</span>
              <div className="font-mono text-xl font-bold text-foreground">
                {result.structure.averageFunctionSize} lines
              </div>
              <p className="font-mono text-[10px] text-muted-foreground">
                Across {totalFunctions} functions
              </p>
            </div>
          </div>

          {/* Entry points & Deployment list */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-mono text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="size-4 text-cyan-400" /> Entry Points Detected
                </h4>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {result.structure.entryPoints.length} files
                </Badge>
              </div>
              <div className="space-y-1.5">
                {result.structure.entryPoints.map((ep) => (
                  <div
                    key={ep}
                    onClick={() => {
                      setSelectedFilePath(ep);
                      setActiveTab("files");
                    }}
                    className="flex items-center justify-between p-2 rounded-md bg-surface-2/30 border border-border/50 text-xs font-mono cursor-pointer hover:border-cyan-400/50"
                  >
                    <span className="text-foreground font-medium">{ep}</span>
                    <span className="text-[10px] text-cyan-400">Inspect ➔</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-mono text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Workflow className="size-4 text-purple-400" /> Build & CI/CD Pipelines
                </h4>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {result.structure.buildFiles.length + result.structure.deploymentFiles.length} files
                </Badge>
              </div>
              <div className="space-y-1.5">
                {[...result.structure.buildFiles, ...result.structure.deploymentFiles].map((bp) => (
                  <div
                    key={bp}
                    className="flex items-center justify-between p-2 rounded-md bg-surface-2/30 border border-border/50 text-xs font-mono"
                  >
                    <span className="text-foreground font-medium">{bp}</span>
                    <Badge variant="outline" className="text-[9px] uppercase">
                      {bp.includes("workflow") || bp.includes("compose") ? "Deploy" : "Build"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Largest Files and Largest Functions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
              <h4 className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
                Largest Source Files
              </h4>
              <div className="space-y-2">
                {result.structure.largestFiles.map((f) => (
                  <div
                    key={f.path}
                    onClick={() => {
                      setSelectedFilePath(f.path);
                      setActiveTab("files");
                    }}
                    className="flex items-center justify-between p-2 rounded-md bg-surface-2/30 border border-border/50 text-xs font-mono cursor-pointer hover:border-border"
                  >
                    <span className="truncate text-foreground">{f.path}</span>
                    <span className="font-bold text-foreground">{f.lines} lines</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
              <h4 className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
                Largest Functions
              </h4>
              <div className="space-y-2">
                {result.structure.largestFunctions.map((fn, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-md bg-surface-2/30 border border-border/50 text-xs font-mono"
                  >
                    <div className="truncate">
                      <span className="font-bold text-foreground">{fn.name}()</span>
                      <span className="text-muted-foreground text-[10px] ml-1.5">in {fn.file}:{fn.line}</span>
                    </div>
                    <span className="font-bold text-foreground">{fn.lines} lines</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: DEPENDENCIES & MODULE RELATIONSHIPS */}
        <TabsContent value="dependencies" className="space-y-4 m-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
              <span className="font-mono text-[11px] text-muted-foreground">Internal Relationships</span>
              <div className="font-mono text-xl font-bold text-foreground">
                {result.moduleDependencies.totalInternalDependencies}
              </div>
              <p className="font-mono text-[10px] text-muted-foreground">
                Direct module-to-module imports
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
              <span className="font-mono text-[11px] text-muted-foreground">External Dependencies</span>
              <div className="font-mono text-xl font-bold text-purple-400">
                {result.dependencies.length}
              </div>
              <p className="font-mono text-[10px] text-muted-foreground">
                From {result.dependencyDetails.manifestsFound.join(", ") || "manifests"}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
              <span className="font-mono text-[11px] text-muted-foreground">Circular Dependencies</span>
              <div className="font-mono text-xl font-bold">
                {result.moduleDependencies.circularDependencies.length === 0 ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="size-4" /> 0 cycles
                  </span>
                ) : (
                  <span className="text-red-400">
                    {result.moduleDependencies.circularDependencies.length} cycles
                  </span>
                )}
              </div>
              <p className="font-mono text-[10px] text-muted-foreground">
                Graph cycle analysis
              </p>
            </div>
          </div>

          {/* Circular Dependencies Alert if any */}
          {result.moduleDependencies.circularDependencies.length > 0 && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-4 space-y-2">
              <h4 className="font-mono text-xs font-bold text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="size-4" /> Circular Dependency Chains Detected
              </h4>
              <div className="space-y-1.5">
                {result.moduleDependencies.circularDependencies.map((cd, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-background/80 border border-red-500/20 font-mono text-xs text-foreground"
                  >
                    {cd.description}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Highly connected modules (Central Hubs & High Consumers) */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
            <h4 className="font-mono text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Network className="size-4 text-neon" /> Highly Connected Modules
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {result.moduleDependencies.highlyConnectedModules.length === 0 ? (
                <div className="text-xs text-muted-foreground font-mono col-span-2 py-2">
                  No tightly coupled central hubs found. Clean modular decoupling.
                </div>
              ) : (
                result.moduleDependencies.highlyConnectedModules.map((mod, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedFilePath(mod.file);
                      setActiveTab("files");
                    }}
                    className="flex items-center justify-between p-2 rounded-md bg-surface-2/40 border border-border/60 text-xs font-mono cursor-pointer hover:border-neon/50"
                  >
                    <span className="truncate text-foreground font-medium">{mod.file}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {mod.connectionsCount} {mod.type === "central_hub" ? "importers" : "imports"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Undeclared / Missing Imports Alert */}
          {result.dependencyDetails.missingImports.length > 0 && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-mono text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="size-4" /> Undeclared External Dependencies ({result.dependencyDetails.missingImports.length})
                </h4>
                <span className="text-[10px] font-mono text-muted-foreground">Not found in manifest</span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {result.dependencyDetails.missingImports.map((mi, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-background/80 border border-amber-500/20 font-mono text-xs"
                  >
                    <div>
                      <span className="font-bold text-foreground">{mi.name}</span>
                      <span className="text-muted-foreground text-[10px] ml-1.5">in {mi.file}</span>
                    </div>
                    <span className="text-[10px] text-amber-400">{mi.suggestion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dependencies manifest list */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
                Manifest Dependencies ({result.dependencies.length})
              </h4>
              <span className="text-[10px] font-mono text-muted-foreground">
                Manifests: {result.dependencyDetails.manifestsFound.join(", ") || "None"}
              </span>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {result.dependencies.map((dep, idx) => (
                <div
                  key={`${dep.name}-${idx}`}
                  className="flex items-center justify-between p-2 rounded-md bg-surface-2/30 border border-border/40 text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-medium">{dep.name}</span>
                    {dep.version && (
                      <span className="text-[10px] text-neon font-semibold">{dep.version}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{dep.ecosystem}</span>
                    <span className="text-muted-foreground/40">•</span>
                    <span>{dep.manifestFile}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: FILE EXPLORER */}
        <TabsContent value="files" className="space-y-4 m-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div className="lg:col-span-5 h-[620px] rounded-xl border border-border bg-surface p-3 overflow-hidden flex flex-col">
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold px-2 py-1 mb-2 border-b border-border/60 flex items-center justify-between">
                <span>Project Structure</span>
                <span className="text-[10px] text-neon">{result.overview.totalFiles} files</span>
              </div>
              <div className="flex-1 overflow-y-auto pr-1">
                <CodebaseFileTree
                  node={result.fileTree}
                  filesMap={result.files}
                  selectedPath={selectedFilePath}
                  onSelectFile={(f) => setSelectedFilePath(f.path)}
                />
              </div>
            </div>
            <div className="lg:col-span-7">
              <CodebaseFileDetailDrawer
                file={selectedFile}
                onClose={() => setSelectedFilePath(null)}
              />
            </div>
          </div>
        </TabsContent>

        {/* TAB 5: CODE QUALITY */}
        <TabsContent value="quality" className="space-y-4 m-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-surface">
            <div>
              <h3 className="font-mono text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="size-4 text-blue-400" /> Measurable Code Quality
              </h3>
              <p className="font-mono text-xs text-muted-foreground">
                Flags high complexity, large files, oversized functions, excessive parameters, unused imports, and naming issues.
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-blue-500/40 text-blue-400 bg-blue-500/10 font-mono text-xs"
            >
              {result.quality.issues.length} warnings
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
              <span className="font-mono text-[11px] text-muted-foreground">Large Functions</span>
              <div className="font-mono text-xl font-bold text-foreground">
                {result.quality.largeFunctionsCount}
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
              <span className="font-mono text-[11px] text-muted-foreground">Large Files</span>
              <div className="font-mono text-xl font-bold text-foreground">
                {result.quality.largeFilesCount}
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
              <span className="font-mono text-[11px] text-muted-foreground">Unused Imports</span>
              <div className="font-mono text-xl font-bold text-foreground">
                {result.quality.unusedImportsCount}
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
              <span className="font-mono text-[11px] text-muted-foreground">High Complexity</span>
              <div className="font-mono text-xl font-bold text-foreground">
                {result.quality.highComplexityCount}
              </div>
            </div>
          </div>

          {result.quality.issues.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border bg-surface/30">
              <CheckCircle2 className="size-10 text-emerald-400 mb-2" />
              <p className="font-mono text-sm font-semibold text-foreground">
                Clean codebase metrics!
              </p>
              <p className="font-mono text-xs text-muted-foreground mt-1">
                All source files adhere to manageable size, depth, and parameter thresholds.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {result.quality.issues.map((q) => (
                <div
                  key={q.id}
                  className="rounded-xl border border-border bg-surface p-4 space-y-2 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-mono text-xs sm:text-sm font-bold text-foreground">
                      {q.title}
                    </h4>
                    <span className="font-mono text-xs text-muted-foreground">
                      Line {q.line}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">{q.description}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50 font-mono text-xs text-muted-foreground">
                    <span className="text-foreground">{q.file}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {q.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 6: BUGS */}
        <TabsContent value="bugs" className="space-y-4 m-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-surface">
            <div>
              <h3 className="font-mono text-sm font-bold text-foreground flex items-center gap-2">
                <Bug className="size-4 text-red-400" /> Potential Bugs Detected
              </h3>
              <p className="font-mono text-xs text-muted-foreground">
                Distinguishes confirmed logic defects from potential bugs with explicit confidence indicators.
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-red-500/40 text-red-400 bg-red-500/10 font-mono text-xs"
            >
              {result.bugs.issues.length} issues
            </Badge>
          </div>

          {result.bugs.issues.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border bg-surface/30">
              <CheckCircle2 className="size-10 text-emerald-400 mb-2" />
              <p className="font-mono text-sm font-semibold text-foreground">
                No potential bugs detected!
              </p>
              <p className="font-mono text-xs text-muted-foreground mt-1">
                Static logic and exception checks passed for analyzed files.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {result.bugs.issues.map((issue) => {
                const targetFile = result.files[issue.file];
                return (
                  <div
                    key={issue.id}
                    className="rounded-xl border border-border bg-surface p-4 space-y-3 shadow-xs transition-colors hover:border-border/80"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            issue.type === "confirmed"
                              ? "border-red-500/50 text-red-400 bg-red-500/10"
                              : "border-amber-500/50 text-amber-400 bg-amber-500/10"
                          }
                        >
                          {issue.type === "confirmed" ? "Confirmed Bug" : "Potential Bug"}
                        </Badge>
                        <h4 className="font-mono text-xs sm:text-sm font-bold text-foreground">
                          {issue.title}
                        </h4>
                      </div>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        Line {issue.line}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {issue.description}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 font-mono text-xs text-muted-foreground">
                      <span className="text-foreground font-semibold">{issue.file}</span>
                      <div className="flex items-center gap-2">
                        {issue.snippet && (
                          <code className="text-[11px] bg-surface-2 px-2 py-0.5 rounded text-neon">
                            {issue.snippet}
                          </code>
                        )}
                        {targetFile && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openInDebugger(targetFile)}
                            className="h-6 px-2 text-[10px] text-amber-400 hover:bg-amber-500/10"
                          >
                            Debug in Studio ➔
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 7: SECURITY */}
        <TabsContent value="security" className="space-y-4 m-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-surface">
            <div>
              <h3 className="font-mono text-sm font-bold text-foreground flex items-center gap-2">
                <ShieldAlert className="size-4 text-amber-400" /> Static Security Analysis
              </h3>
              <p className="font-mono text-xs text-muted-foreground">
                Detects hardcoded credentials, unsafe eval/exec, SQL injection, and path traversal. Secrets are strictly masked with [REDACTED].
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-amber-500/40 text-amber-400 bg-amber-500/10 font-mono text-xs"
            >
              {result.security.issues.length} findings
            </Badge>
          </div>

          {result.security.issues.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border bg-surface/30">
              <CheckCircle2 className="size-10 text-emerald-400 mb-2" />
              <p className="font-mono text-sm font-semibold text-foreground">
                No high-risk static security issues detected!
              </p>
              <p className="font-mono text-xs text-muted-foreground mt-1">
                Zero hardcoded API keys, passwords, or dangerous eval/exec invocations detected.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {result.security.issues.map((sec) => (
                <div
                  key={sec.id}
                  className="rounded-xl border border-amber-500/30 bg-surface p-4 space-y-3 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-red-500/50 text-red-400 bg-red-500/10 uppercase font-mono text-[10px]"
                      >
                        {sec.severity}
                      </Badge>
                      <h4 className="font-mono text-xs sm:text-sm font-bold text-foreground">
                        {sec.title}
                      </h4>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      Line {sec.line}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {sec.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 font-mono text-xs">
                    <span className="text-foreground">{sec.file}</span>
                    <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">
                      Value: [REDACTED]
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 8: PERFORMANCE */}
        <TabsContent value="performance" className="space-y-4 m-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-surface">
            <div>
              <h3 className="font-mono text-sm font-bold text-foreground flex items-center gap-2">
                <Zap className="size-4 text-yellow-400" /> Performance Opportunities
              </h3>
              <p className="font-mono text-xs text-muted-foreground">
                Identifies nested loops, repeated computations, inefficient lookups, and O(n²) bottlenecks.
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-yellow-500/40 text-yellow-400 bg-yellow-500/10 font-mono text-xs"
            >
              {result.performance.issues.length} opportunities
            </Badge>
          </div>

          {result.performance.issues.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border bg-surface/30">
              <CheckCircle2 className="size-10 text-emerald-400 mb-2" />
              <p className="font-mono text-sm font-semibold text-foreground">
                No major algorithmic bottlenecks found!
              </p>
              <p className="font-mono text-xs text-muted-foreground mt-1">
                No deep nested loops or obvious quadratic time complexities detected.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {result.performance.issues.map((perf) => {
                const targetFile = result.files[perf.file];
                return (
                  <div
                    key={perf.id}
                    className="rounded-xl border border-border bg-surface p-4 space-y-3 shadow-xs transition-colors hover:border-border/80"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-yellow-500/50 text-yellow-400 bg-yellow-500/10 font-mono text-[10px]"
                        >
                          Complexity Bottleneck
                        </Badge>
                        <h4 className="font-mono text-xs sm:text-sm font-bold text-foreground">
                          {perf.title}
                        </h4>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        Line {perf.line}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {perf.description}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 font-mono text-xs">
                      <span className="text-foreground">{perf.file}</span>
                      {targetFile && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openInOptimizer(targetFile)}
                          className="h-7 text-xs text-neon hover:text-neon hover:bg-neon/10 gap-1"
                        >
                          <Zap className="size-3" />
                          Optimize in Performance Studio
                          <ArrowRight className="size-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 9: TESTING */}
        <TabsContent value="testing" className="space-y-4 m-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-border bg-surface space-y-1">
              <span className="font-mono text-xs text-muted-foreground">Test Suites</span>
              <div className="font-mono text-2xl font-bold text-foreground">
                {result.testing.testFilesCount}
              </div>
              <p className="font-mono text-[10px] text-muted-foreground">
                Frameworks: {result.testing.testFrameworks.join(", ") || "None detected"}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-surface space-y-1">
              <span className="font-mono text-xs text-muted-foreground">Test Cases</span>
              <div className="font-mono text-2xl font-bold text-foreground">
                {result.testing.testFunctionsCount}
              </div>
              <p className="font-mono text-[10px] text-muted-foreground">
                pytest / unittest functions
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-surface space-y-1">
              <span className="font-mono text-xs text-muted-foreground">Untested Functions</span>
              <div className="font-mono text-2xl font-bold text-amber-400">
                {result.testing.untestedFunctionsCount}
              </div>
              <p className="font-mono text-[10px] text-muted-foreground">
                Functions without obvious test counterparts
              </p>
            </div>
          </div>

          {/* Mandatory transparent coverage notice */}
          <div className="p-4 rounded-xl border border-border/80 bg-surface-2/40 space-y-2">
            <div className="flex items-center gap-2">
              <Info className="size-4 text-neon" />
              <h4 className="font-mono text-xs font-bold text-foreground">
                Code Coverage Status
              </h4>
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              {result.testing.statusMessage}
            </p>
          </div>

          {/* Untested Functions List */}
          {untestedFunctionsList.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
                  Functions Lacking Tests ({untestedFunctionsList.length})
                </h4>
                <span className="font-mono text-[11px] text-muted-foreground">
                  Generate pytest suites with 1-click
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {untestedFunctionsList.map((item, idx) => {
                  const targetFile = result.files[item.file];
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-surface-2/30 text-xs font-mono"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-foreground truncate">
                          {item.functionName}()
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          in {item.file}:{item.line}
                        </span>
                      </div>
                      {targetFile && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openInTestGen(targetFile)}
                          className="h-6 px-2 text-[11px] text-neon hover:text-neon hover:bg-neon/10"
                        >
                          Generate Tests
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 10: DOCUMENTATION */}
        <TabsContent value="documentation" className="space-y-4 m-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-border bg-surface space-y-1">
              <span className="font-mono text-xs text-muted-foreground">README</span>
              <div className="flex items-center gap-1.5 font-mono text-base font-bold">
                {result.documentation.hasReadme ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="size-4" /> Present
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center gap-1">
                    <XCircle className="size-4" /> Missing
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-surface space-y-1">
              <span className="font-mono text-xs text-muted-foreground">Install Guide</span>
              <div className="flex items-center gap-1.5 font-mono text-base font-bold">
                {result.documentation.hasInstallationGuide ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="size-4" /> Present
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertCircle className="size-4" /> Incomplete
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-surface space-y-1">
              <span className="font-mono text-xs text-muted-foreground">API Docs</span>
              <div className="flex items-center gap-1.5 font-mono text-base font-bold">
                {result.documentation.hasApiDocs ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="size-4" /> Present
                  </span>
                ) : (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Info className="size-4" /> None
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-surface space-y-1">
              <span className="font-mono text-xs text-muted-foreground">Docstring Coverage</span>
              <div className="font-mono text-2xl font-bold text-foreground">
                {result.documentation.docstringCoveragePercent}%
              </div>
              <p className="font-mono text-[10px] text-muted-foreground">
                {result.documentation.missingDocstringsCount} functions missing docstrings
              </p>
            </div>
          </div>

          {/* Documentation Gaps */}
          {result.documentation.documentationGaps && result.documentation.documentationGaps.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
              <h4 className="font-mono text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="size-4 text-amber-400" /> Documentation Gaps Identified
              </h4>
              <div className="space-y-1.5">
                {result.documentation.documentationGaps.map((gap, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-surface-2/40 border border-border/50 text-xs font-mono text-muted-foreground flex items-center gap-2"
                  >
                    <span className="text-amber-400">•</span>
                    <span>{gap}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
