import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlignLeft,
  Check,
  ChevronDown,
  Clock,
  Code2,
  Copy,
  Download,
  FileCode2,
  FlaskConical,
  Layers,
  ListCheck,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  Trash2,
  Wand2,
  Zap,
} from "lucide-react";

import { CodeEditor } from "@/components/CodeEditor";
import { TestAnalysisSummary } from "@/components/TestAnalysisSummary";
import { TestCaseCard } from "@/components/TestCaseCard";
import { TestResultsView } from "@/components/TestResultsView";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  analyzePythonCode,
  generateUnitTestsFn,
  runPytestsFn,
  formatPythonFn,
} from "@/lib/test-generator.functions";
import type {
  CodeAnalysisResult,
  TestGenerationResult,
  TestRunResult,
  TestCategory,
} from "@/lib/test-generator-types";
import { TEST_SAMPLES } from "@/lib/test-samples";

export const Route = createFileRoute("/test-generator")({
  head: () => ({
    meta: [
      { title: "AI Unit Test Generator — PyLens" },
      {
        name: "description",
        content:
          "Generate, review, and execute pytest unit test suites with edge cases, expected outputs, and automatic bug fixes.",
      },
      { property: "og:title", content: "AI Unit Test Generator — PyLens" },
      {
        property: "og:description",
        content:
          "Automatic pytest suite generation, edge case detection, and isolated test execution.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: TestGeneratorPage,
});

const DEFAULT_CODE = `def add(a: float, b: float) -> float:
    """Adds two numbers together."""
    return a + b
`;

function TestGeneratorPage() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [activeTab, setActiveTab] = useState<"cases" | "code" | "results">("cases");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [analysis, setAnalysis] = useState<CodeAnalysisResult | null>(null);
  const [generatedTests, setGeneratedTests] = useState<TestGenerationResult | null>(null);
  const [testResults, setTestResults] = useState<TestRunResult | null>(null);
  const [copiedPytest, setCopiedPytest] = useState(false);

  useEffect(() => {
    try {
      const pendingCode =
        sessionStorage.getItem("pylens_code_transfer") ||
        sessionStorage.getItem("pylens_load_code");
      if (pendingCode) {
        sessionStorage.removeItem("pylens_code_transfer");
        sessionStorage.removeItem("pylens_load_code");
        setCode(pendingCode);
        setAnalysis(null);
        setGeneratedTests(null);
        setTestResults(null);
        toast.info("Loaded file code into Unit Test Generator");
      }
    } catch {
      // ignore
    }
  }, []);

  // Server functions
  const analyzeServerFn = useServerFn(analyzePythonCode);
  const generateServerFn = useServerFn(generateUnitTestsFn);
  const runTestsServerFn = useServerFn(runPytestsFn);
  const formatServerFn = useServerFn(formatPythonFn);

  // 1. Analyze Mutation
  const analyzeMutation = useMutation({
    mutationFn: async (pythonCode: string) => {
      return analyzeServerFn({ data: { code: pythonCode } });
    },
    onSuccess: (data) => {
      setAnalysis(data);
      if (!data.valid && data.syntaxError) {
        toast.error(`Syntax Error on line ${data.syntaxError.line}: ${data.syntaxError.message}`);
      }
    },
    onError: (err) => {
      toast.error(`Analysis failed: ${err instanceof Error ? err.message : String(err)}`);
    },
  });

  // 2. Generate Tests Mutation
  const generateMutation = useMutation({
    mutationFn: async (pythonCode: string) => {
      return generateServerFn({ data: { code: pythonCode } });
    },
    onSuccess: (data) => {
      setGeneratedTests(data);
      setAnalysis(data.analysis);
      setTestResults(null); // Reset past results for fresh suite
      setActiveTab("cases");
      toast.success(
        `Generated ${data.summary.totalTests} pytest test cases across ${data.analysis.metrics.functions} functions!`,
      );
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate tests. Please check Python syntax.",
      );
    },
  });

  // 3. Run Pytests Mutation
  const runTestsMutation = useMutation({
    mutationFn: async ({
      pythonCode,
      pytestCode,
    }: {
      pythonCode: string;
      pytestCode: string;
    }) => {
      return runTestsServerFn({
        data: {
          code: pythonCode,
          pytestCode,
        },
      });
    },
    onSuccess: (data) => {
      setTestResults(data);
      setActiveTab("results");
      if (data.summary.failed === 0 && data.summary.errors === 0) {
        toast.success(`All ${data.summary.passed} tests passed! (${data.duration.toFixed(3)}s)`);
      } else {
        toast.error(
          `${data.summary.failed} tests failed. Review failure diagnosis & suggested fixes below.`,
        );
      }
    },
    onError: (err) => {
      toast.error(
        `Test execution error: ${err instanceof Error ? err.message : String(err)}`,
      );
    },
  });

  // 4. Format Python Code Mutation
  const formatMutation = useMutation({
    mutationFn: async (pythonCode: string) => {
      return formatServerFn({ data: { code: pythonCode } });
    },
    onSuccess: (data) => {
      setCode(data.formatted);
      toast.success("Python code formatted (PEP 8 standard)");
      // Re-analyze formatted code
      analyzeMutation.mutate(data.formatted);
    },
    onError: () => {
      toast.error("Could not format code. Verify syntax first.");
    },
  });

  // Trigger analysis when code changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (code.trim()) {
        analyzeMutation.mutate(code);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [code]);

  const handleGenerate = () => {
    if (!code.trim()) {
      toast.error("Please enter or paste Python code first");
      return;
    }
    generateMutation.mutate(code);
  };

  const handleRunTests = () => {
    if (!generatedTests?.pytestCode) {
      toast.error("Please generate unit tests first before running.");
      return;
    }
    runTestsMutation.mutate({
      pythonCode: code,
      pytestCode: generatedTests.pytestCode,
    });
  };

  const handleApplyFix = (fixedCode: string) => {
    setCode(fixedCode);
    toast.success("Fix applied to editor! Running tests again to verify...");
    // Auto re-run tests with the fixed code!
    if (generatedTests?.pytestCode) {
      runTestsMutation.mutate({
        pythonCode: fixedCode,
        pytestCode: generatedTests.pytestCode,
      });
    }
  };

  const handleLoadSample = (sampleCode: string) => {
    setCode(sampleCode);
    setGeneratedTests(null);
    setTestResults(null);
    toast.info("Sample loaded into editor");
  };

  const handleClear = () => {
    setCode("");
    setAnalysis(null);
    setGeneratedTests(null);
    setTestResults(null);
    toast.info("Editor cleared");
  };

  const handleCopyPytest = async () => {
    if (!generatedTests?.pytestCode) return;
    try {
      await navigator.clipboard.writeText(generatedTests.pytestCode);
      setCopiedPytest(true);
      toast.success("Pytest code copied to clipboard");
      setTimeout(() => setCopiedPytest(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownloadPytest = () => {
    if (!generatedTests?.pytestCode) return;
    const blob = new Blob([generatedTests.pytestCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "test_solution.py";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Downloaded test_solution.py");
  };

  // Keyboard shortcut Ctrl+Enter or Cmd+Enter to generate tests
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleGenerate();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [code]);

  // Filtered test cases
  const filteredTestCases = useMemo(() => {
    if (!generatedTests) return [];
    if (categoryFilter === "all") return generatedTests.testCases;
    return generatedTests.testCases.filter((tc) => tc.category === categoryFilter);
  }, [generatedTests, categoryFilter]);

  // Highlight line for syntax error
  const syntaxHighlightLine =
    analysis && !analysis.valid && analysis.syntaxError
      ? analysis.syntaxError.line
      : null;

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neon">
              <FlaskConical className="size-3.5" />
              Test Automation Suite
            </div>
            <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
              AI Unit Test Generator
              <span className="font-mono text-xs font-normal text-muted-foreground border border-border/80 px-2 py-0.5 rounded bg-surface">
                pytest
              </span>
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs text-muted-foreground leading-relaxed">
              Submit Python code to automatically detect functions, generate edge cases and exception tests,
              execute in an isolated sandbox, and receive automated bug fixes.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Samples Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 font-mono text-xs border-border bg-surface hover:bg-surface-2"
                >
                  <Code2 className="size-3.5 text-neon" />
                  Load Sample
                  <ChevronDown className="size-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 font-mono text-xs">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Select Code Pattern
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {TEST_SAMPLES.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onClick={() => handleLoadSample(s.code)}
                    className="flex flex-col items-start py-1.5 cursor-pointer"
                  >
                    <div className="font-semibold text-foreground">{s.name}</div>
                    <div className="text-[10px] text-muted-foreground line-clamp-1">
                      {s.description}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* PEP 8 Format Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => formatMutation.mutate(code)}
              disabled={formatMutation.isPending || !code.trim()}
              className="gap-1.5 font-mono text-xs border-border bg-surface hover:bg-surface-2"
              title="Auto-format code to PEP 8 standard"
            >
              <AlignLeft className="size-3.5" />
              Format
            </Button>

            {/* Clear Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={!code}
              className="gap-1.5 font-mono text-xs border-border bg-surface hover:bg-surface-2 text-muted-foreground hover:text-destructive"
              title="Clear editor"
            >
              <Trash2 className="size-3.5" />
              Clear
            </Button>
          </div>
        </div>

        {/* Main Two-Column Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Python Code Input (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-sm">
              <div className="flex items-center justify-between border-b border-border bg-surface-2/60 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-neon animate-pulse" />
                    solution.py
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    ({code.split("\n").length} lines)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground">Python 3.14</span>
                </div>
              </div>

              {/* Code Editor */}
              <div className="min-h-[380px] max-h-[540px] overflow-hidden">
                <CodeEditor
                  value={code}
                  onChange={setCode}
                  highlightLine={syntaxHighlightLine}
                />
              </div>

              {/* Editor Bottom Bar with Generate Button */}
              <div className="flex items-center justify-between border-t border-border bg-surface-2/40 p-3">
                <span className="text-[11px] text-muted-foreground font-mono">
                  Press <kbd className="rounded border bg-surface px-1 text-[10px]">Ctrl+Enter</kbd> to generate
                </span>
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || !code.trim() || (analysis !== null && !analysis.valid)}
                  className="gap-2 font-mono text-xs bg-neon text-background hover:bg-neon/90 font-semibold shadow-md shadow-neon/20 px-4"
                >
                  {generateMutation.isPending ? (
                    <>
                      <RotateCcw className="size-3.5 animate-spin" />
                      Generating Tests...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5 fill-current" />
                      Generate Unit Tests
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* AST Code Analysis Summary Card */}
            <TestAnalysisSummary
              analysis={analysis}
              isAnalyzing={analyzeMutation.isPending}
            />
          </div>

          {/* Right Column: Generated Tests & Runner (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {generatedTests ? (
              <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-sm">
                {/* Header with Run Button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border bg-surface-2/60 p-3.5 gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-8 place-items-center rounded bg-neon/15 text-neon">
                      <ListCheck className="size-4" />
                    </div>
                    <div>
                      <div className="font-mono text-xs font-semibold text-foreground">
                        Generated Test Suite ({generatedTests.summary.totalTests} tests)
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {generatedTests.summary.normalCount} normal • {generatedTests.summary.edgeCount} edge •{" "}
                        {generatedTests.summary.boundaryCount} boundary • {generatedTests.summary.exceptionCount} exception
                      </div>
                    </div>
                  </div>

                  {/* Primary Run Tests Button */}
                  <Button
                    onClick={handleRunTests}
                    disabled={runTestsMutation.isPending}
                    className="gap-2 font-mono text-xs bg-neon text-background hover:bg-neon/90 font-semibold shadow-md shadow-neon/25 px-5"
                  >
                    {runTestsMutation.isPending ? (
                      <>
                        <RotateCcw className="size-3.5 animate-spin" />
                        Executing Pytest...
                      </>
                    ) : (
                      <>
                        <Play className="size-3.5 fill-current" />
                        ▶ Run Tests
                      </>
                    )}
                  </Button>
                </div>

                {/* Workspace Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                  <div className="border-b border-border px-3.5 flex items-center justify-between">
                    <TabsList className="bg-transparent h-10 p-0 gap-4">
                      <TabsTrigger
                        value="cases"
                        className="font-mono text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-neon rounded-none px-1 h-10 text-muted-foreground data-[state=active]:text-foreground"
                      >
                        Test Cases ({generatedTests.testCases.length})
                      </TabsTrigger>
                      <TabsTrigger
                        value="code"
                        className="font-mono text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-neon rounded-none px-1 h-10 text-muted-foreground data-[state=active]:text-foreground"
                      >
                        test_solution.py
                      </TabsTrigger>
                      <TabsTrigger
                        value="results"
                        className="font-mono text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-neon rounded-none px-1 h-10 text-muted-foreground data-[state=active]:text-foreground relative"
                      >
                        Execution Results
                        {testResults && (
                          <span
                            className={`ml-1.5 size-2 rounded-full inline-block ${
                              testResults.summary.failed === 0 ? "bg-emerald-400" : "bg-destructive"
                            }`}
                          />
                        )}
                      </TabsTrigger>
                    </TabsList>

                    {/* Secondary Actions for Pytest code */}
                    {activeTab === "code" && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyPytest}
                          className="h-7 gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          {copiedPytest ? (
                            <Check className="size-3 text-neon" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                          {copiedPytest ? "Copied" : "Copy"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDownloadPytest}
                          className="h-7 gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          <Download className="size-3" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* 1. Test Cases View */}
                  <TabsContent value="cases" className="p-4 space-y-3.5 m-0 focus-visible:outline-none">
                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scroll-slim">
                      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mr-1">
                        Filter:
                      </span>
                      {["all", "Normal", "Edge Case", "Boundary", "Invalid Input", "Exception"].map(
                        (cat) => (
                          <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                              categoryFilter === cat
                                ? "bg-neon/15 text-neon font-medium border border-neon/30"
                                : "bg-surface-2 text-muted-foreground hover:text-foreground border border-border/50"
                            }`}
                          >
                            {cat === "all" ? "All Categories" : cat}
                          </button>
                        ),
                      )}
                    </div>

                    {/* Test Cards List */}
                    <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1 scroll-slim">
                      {filteredTestCases.map((tc) => {
                        const matchingRun = testResults?.tests.find((t) => t.name === tc.name);
                        return (
                          <TestCaseCard
                            key={tc.id}
                            testCase={tc}
                            status={matchingRun?.outcome}
                            duration={matchingRun?.duration}
                          />
                        );
                      })}
                    </div>
                  </TabsContent>

                  {/* 2. Pytest Code Tab */}
                  <TabsContent value="code" className="p-0 m-0 focus-visible:outline-none">
                    <div className="min-h-[460px] max-h-[600px] overflow-hidden">
                      <CodeEditor
                        value={generatedTests.pytestCode}
                        onChange={(newCode) => {
                          setGeneratedTests({
                            ...generatedTests,
                            pytestCode: newCode,
                          });
                        }}
                        highlightLine={null}
                      />
                    </div>
                  </TabsContent>

                  {/* 3. Test Run Results Tab */}
                  <TabsContent value="results" className="p-4 m-0 focus-visible:outline-none">
                    <TestResultsView
                      results={testResults}
                      isRunning={runTestsMutation.isPending}
                      onRunTests={handleRunTests}
                      onApplyFix={handleApplyFix}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              /* Empty state before generation */
              <div className="flex flex-col items-center justify-center p-12 rounded-lg border border-dashed border-border/80 bg-surface/40 text-center space-y-4 min-h-[420px]">
                <div className="grid size-14 place-items-center rounded-2xl bg-neon/10 text-neon border border-neon/30 shadow-inner">
                  <FlaskConical className="size-7" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h3 className="font-mono text-base font-semibold text-foreground">
                    No Unit Tests Generated Yet
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Paste your Python functions or classes on the left, then click{" "}
                    <strong className="text-foreground">Generate Unit Tests</strong>. PyLens will
                    analyze the code AST, synthesize normal and edge cases, display expected outputs,
                    and run tests in a secure sandbox.
                  </p>
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || !code.trim()}
                  className="gap-2 font-mono text-xs bg-neon text-background hover:bg-neon/90 font-semibold shadow-md shadow-neon/20 px-5"
                >
                  <Sparkles className="size-3.5 fill-current" />
                  Generate Unit Tests Now
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
