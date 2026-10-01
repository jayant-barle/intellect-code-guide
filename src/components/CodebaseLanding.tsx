import { useState, useRef } from "react";
import {
  ArrowRight,
  Code2,
  FileArchive,
  FolderOpen,
  FolderSearch,
  Github,
  HardDrive,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  UploadCloud,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface CodebaseLandingProps {
  onAnalyzeZip: (base64: string, filename: string) => void;
  onAnalyzeGitHub: (url: string) => void;
  onAnalyzeLocalPath: (path: string) => void;
  isLoading?: boolean;
  progressStep?: string;
}

export function CodebaseLanding({
  onAnalyzeZip,
  onAnalyzeGitHub,
  onAnalyzeLocalPath,
  isLoading,
  progressStep,
}: CodebaseLandingProps) {
  const [gitHubUrl, setGitHubUrl] = useState("https://github.com/pallets/click");
  const [localPath, setLocalPath] = useState("E:\\Code Tresure\\intellect-code-guide-main\\intellect-code-guide-main");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processZipFile(file);
  };

  const processZipFile = (file: File) => {
    if (!file.name.endsWith(".zip")) {
      toast.error("Please upload a .zip archive");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File exceeds maximum 50MB limit");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      onAnalyzeZip(base64, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processZipFile(file);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-4">
      {/* Hero Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-neon/30 bg-neon/10 px-3.5 py-1 font-mono text-xs text-neon">
          <FolderSearch className="size-3.5" />
          Full Repository Intelligence V1
        </div>
        <h1 className="font-mono text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          AI Codebase Analyzer
        </h1>
        <p className="mx-auto max-w-2xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Ingest an entire project from a ZIP archive, local folder, or GitHub repository.
          Performs static AST analysis, framework & dependency mapping, security scanning, and architectural synthesis.
        </p>
      </div>

      {isLoading ? (
        /* Progress UI */
        <div className="rounded-xl border border-neon/40 bg-surface p-8 text-center space-y-5 shadow-lg shadow-neon/5 animate-in fade-in">
          <div className="grid size-14 place-items-center rounded-2xl bg-neon/15 text-neon border border-neon/40 mx-auto animate-pulse">
            <Loader2 className="size-7 animate-spin" />
          </div>
          <div className="space-y-2">
            <h3 className="font-mono text-base font-bold text-foreground">
              Analyzing Codebase...
            </h3>
            <p className="font-mono text-xs text-neon font-medium">
              {progressStep || "Ingesting project files & mapping AST structure..."}
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-2 text-left font-mono text-xs text-muted-foreground pt-4 border-t border-border/60">
            <div className="flex items-center gap-2 text-foreground">
              <span className="size-1.5 rounded-full bg-neon animate-pulse" />
              <span>Scanning project hierarchy & filtering binaries</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <span className="size-1.5 rounded-full bg-neon animate-pulse" />
              <span>Parsing imports, functions, classes, and dependencies</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <span className="size-1.5 rounded-full bg-neon animate-pulse" />
              <span>Scanning for security leaks (redacting values)</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <span className="size-1.5 rounded-full bg-neon animate-pulse" />
              <span>Synthesizing architectural interpretation</span>
            </div>
          </div>
        </div>
      ) : (
        /* Input Cards Tabs */
        <div className="rounded-xl border border-border bg-surface shadow-md overflow-hidden">
          <Tabs defaultValue="github" className="w-full">
            <div className="border-b border-border bg-surface-2/60 px-4">
              <TabsList className="bg-transparent h-12 gap-6 p-0">
                <TabsTrigger
                  value="github"
                  className="font-mono text-xs data-[state=active]:border-b-2 data-[state=active]:border-neon rounded-none px-1 h-12 data-[state=active]:bg-transparent gap-2 text-muted-foreground data-[state=active]:text-foreground"
                >
                  <Github className="size-4" />
                  GitHub Repository
                </TabsTrigger>
                <TabsTrigger
                  value="zip"
                  className="font-mono text-xs data-[state=active]:border-b-2 data-[state=active]:border-neon rounded-none px-1 h-12 data-[state=active]:bg-transparent gap-2 text-muted-foreground data-[state=active]:text-foreground"
                >
                  <FileArchive className="size-4" />
                  Upload ZIP
                </TabsTrigger>
                <TabsTrigger
                  value="local"
                  className="font-mono text-xs data-[state=active]:border-b-2 data-[state=active]:border-neon rounded-none px-1 h-12 data-[state=active]:bg-transparent gap-2 text-muted-foreground data-[state=active]:text-foreground"
                >
                  <HardDrive className="size-4" />
                  Local Project Folder
                </TabsTrigger>
              </TabsList>
            </div>

            {/* 1. GitHub Tab */}
            <TabsContent value="github" className="p-6 space-y-4 m-0">
              <div className="space-y-1.5">
                <label className="font-mono text-xs font-semibold text-foreground flex items-center gap-2">
                  <Github className="size-3.5 text-neon" />
                  Public GitHub Repository URL
                </label>
                <div className="flex gap-2">
                  <Input
                    value={gitHubUrl}
                    onChange={(e) => setGitHubUrl(e.target.value)}
                    placeholder="https://github.com/username/repository"
                    className="font-mono text-xs bg-surface-2 border-border"
                  />
                  <Button
                    onClick={() => onAnalyzeGitHub(gitHubUrl)}
                    disabled={!gitHubUrl.trim()}
                    className="gap-2 font-mono text-xs bg-neon text-background hover:bg-neon/90 font-semibold px-5 shrink-0"
                  >
                    <FolderSearch className="size-3.5" />
                    Analyze Repo
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Analyzes public GitHub repositories directly. Clones shallow repository tree without credentials.
                </p>
              </div>

              {/* Preset Sample Repos */}
              <div className="pt-3 border-t border-border/40 space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Try Sample Repositories:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: "pallets/click", url: "https://github.com/pallets/click", desc: "Python CLI Library" },
                    { name: "encode/starlette", url: "https://github.com/encode/starlette", desc: "ASGI Web Framework" },
                    { name: "tiangolo/fastapi", url: "https://github.com/fastapi/fastapi", desc: "FastAPI Backend" },
                  ].map((s) => (
                    <button
                      key={s.name}
                      onClick={() => {
                        setGitHubUrl(s.url);
                        onAnalyzeGitHub(s.url);
                      }}
                      className="px-2.5 py-1 rounded border border-border/70 bg-surface-2 hover:border-neon/40 hover:bg-neon/5 text-xs font-mono text-foreground/80 hover:text-neon transition-colors"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* 2. ZIP Upload Tab */}
            <TabsContent value="zip" className="p-6 space-y-4 m-0">
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all ${
                  isDragging
                    ? "border-neon bg-neon/10"
                    : "border-border hover:border-neon/50 bg-surface-2/40 hover:bg-surface-2/60"
                }`}
              >
                <div className="grid size-12 place-items-center rounded-xl bg-neon/15 text-neon mx-auto mb-3">
                  <UploadCloud className="size-6" />
                </div>
                <h4 className="font-mono text-sm font-semibold text-foreground">
                  Click to select or drag and drop a project ZIP archive
                </h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Supports up to 50MB. Safely inspects files with path-traversal prevention.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 font-mono text-xs border-border bg-surface"
                >
                  <FileArchive className="size-3.5 mr-1 text-neon" />
                  Browse Files
                </Button>
              </div>
            </TabsContent>

            {/* 3. Local Folder Tab */}
            <TabsContent value="local" className="p-6 space-y-4 m-0">
              <div className="space-y-1.5">
                <label className="font-mono text-xs font-semibold text-foreground flex items-center gap-2">
                  <HardDrive className="size-3.5 text-neon" />
                  Local Workspace Directory Path
                </label>
                <div className="flex gap-2">
                  <Input
                    value={localPath}
                    onChange={(e) => setLocalPath(e.target.value)}
                    placeholder="E:\Projects\my-codebase"
                    className="font-mono text-xs bg-surface-2 border-border"
                  />
                  <Button
                    onClick={() => onAnalyzeLocalPath(localPath)}
                    disabled={!localPath.trim()}
                    className="gap-2 font-mono text-xs bg-neon text-background hover:bg-neon/90 font-semibold px-5 shrink-0"
                  >
                    <FolderOpen className="size-3.5" />
                    Analyze Folder
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Reads direct local directories on the host without network transmission.
                </p>
              </div>

              {/* Quick Analyze Current Workspace Button */}
              <div className="rounded-lg border border-neon/30 bg-neon/5 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-md bg-neon/15 text-neon border border-neon/30 shrink-0">
                    <Zap className="size-4" />
                  </div>
                  <div>
                    <div className="font-mono text-xs font-semibold text-foreground">
                      Analyze Current PyLens Workspace
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Run deep codebase audit on the active project directory directly.
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => onAnalyzeLocalPath(localPath)}
                  className="font-mono text-xs bg-neon text-background hover:bg-neon/90 font-medium shrink-0"
                >
                  Analyze PyLens
                  <ArrowRight className="size-3 ml-1" />
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
