import { z } from "zod";

export type ProjectIngestMethod = "zip" | "folder" | "github" | "local_path";

export interface LanguageStat {
  name: string;
  filesCount: number;
  linesOfCode: number;
  percentage: number;
  color: string;
  analysisSupported: boolean;
}

export interface FrameworkDetected {
  name: string;
  category: "Backend" | "Frontend" | "Database/ORM" | "Testing" | "Build/Tooling" | "ML/AI" | "Other";
  evidence: string;
}

export interface FileIssueSummary {
  bugs: number;
  security: number;
  performance: number;
  quality: number;
  structure?: number;
  dependency?: number;
  testing?: number;
  documentation?: number;
}

export interface FileNode {
  path: string;
  name: string;
  type: "file" | "directory";
  size: number;
  lines: number;
  language?: string;
  category: "source" | "test" | "config" | "docs" | "asset" | "build" | "deployment" | "other";
  children?: FileNode[];
  functionsCount?: number;
  classesCount?: number;
  issuesSummary?: FileIssueSummary;
}

export type IssueCategory =
  | "structure"
  | "dependency"
  | "quality"
  | "bug"
  | "security"
  | "performance"
  | "testing"
  | "documentation";

export interface CodebaseIssue {
  id: string;
  category: IssueCategory;
  type: "confirmed" | "potential";
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  confidence: "high" | "medium" | "low";
  file: string;
  line: number;
  title: string;
  description: string;
  recommendation: string;
  snippet?: string;
  source?: string;
}

export interface DependencyInfo {
  ecosystem: "Python" | "JavaScript/Node" | "Java" | "Rust" | "C/C++" | "Other";
  manifestFile: string;
  name: string;
  version?: string;
  type: "direct" | "dev";
}

export interface TestingAnalysis {
  testFilesCount: number;
  testFunctionsCount: number;
  untestedFunctionsCount: number;
  testFrameworks: string[];
  coverageMeasured: boolean;
  coveragePercent?: number;
  statusMessage: string;
  testDirectories?: string[];
  testClassesCount?: number;
  testConfigFiles?: string[];
}

export interface DocumentationAnalysis {
  hasReadme: boolean;
  hasLicense: boolean;
  hasContributing: boolean;
  hasInstallationGuide: boolean;
  hasUsageGuide: boolean;
  hasApiDocs: boolean;
  missingDocstringsCount: number;
  totalFunctionsCount: number;
  docstringCoveragePercent: number;
  documentationGaps: string[];
}

export interface FunctionDetail {
  name: string;
  line: number;
  params: string[];
  docstring?: string;
  lines?: number;
  returns?: string;
}

export interface ClassDetail {
  name: string;
  line: number;
  methodsCount: number;
  methods?: string[];
}

export interface FileDetail {
  path: string;
  lines: number;
  size: number;
  language: string;
  category: string;
  contentSample?: string;
  functions: FunctionDetail[];
  classes: ClassDetail[];
  imports: string[];
  internalImports?: string[];
  externalImports?: string[];
  issues: CodebaseIssue[];
}

export interface ModuleDependencyNode {
  id: string;
  name: string;
  internalImports: string[];
  externalImports: string[];
  incomingDependenciesCount: number;
  outgoingDependenciesCount: number;
}

export interface ModuleDependencyAnalysis {
  nodes: ModuleDependencyNode[];
  edges: { source: string; target: string }[];
  highlyConnectedModules: {
    file: string;
    connectionsCount: number;
    type: "central_hub" | "high_consumer";
  }[];
  circularDependencies: {
    cycle: string[];
    description: string;
  }[];
  totalInternalDependencies: number;
  totalExternalDependencies: number;
}

export interface DependencyAnalysisDetails {
  manifestsFound: string[];
  dependencies: DependencyInfo[];
  unusedImports: { file: string; line: number; name: string }[];
  missingImports: { file: string; line: number; name: string; suggestion: string }[];
}

export interface StructureAnalysisDetails {
  entryPoints: string[];
  sourceDirectories: string[];
  testDirectories: string[];
  buildFiles: string[];
  deploymentFiles: string[];
  largestFiles: { path: string; lines: number }[];
  largestFunctions: { name: string; file: string; line: number; lines: number }[];
  averageFunctionSize: number;
}

export interface CodebaseAnalysisResult {
  id: string;
  projectName: string;
  ingestMethod: ProjectIngestMethod;
  timestamp: string;
  overview: {
    totalFiles: number;
    totalDirectories: number;
    sourceFiles: number;
    testFiles: number;
    configFiles: number;
    docFiles: number;
    buildFiles?: number;
    deploymentFiles?: number;
    entryPointsCount?: number;
    totalLinesOfCode: number;
  };
  ignoredSummary: {
    totalIgnoredFiles: number;
    categories: { name: string; count: number }[];
  };
  languages: LanguageStat[];
  frameworks: FrameworkDetected[];
  fileTree: FileNode;
  files: Record<string, FileDetail>;
  dependencies: DependencyInfo[];
  moduleDependencies: ModuleDependencyAnalysis;
  dependencyDetails: DependencyAnalysisDetails;
  structure: StructureAnalysisDetails;
  quality: {
    largeFunctionsCount: number;
    largeFilesCount: number;
    unusedImportsCount: number;
    highComplexityCount: number;
    issues: CodebaseIssue[];
  };
  bugs: {
    confirmedCount: number;
    potentialCount: number;
    issues: CodebaseIssue[];
  };
  security: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    issues: CodebaseIssue[];
  };
  performance: {
    totalOpportunities: number;
    issues: CodebaseIssue[];
  };
  testing: TestingAnalysis;
  documentation: DocumentationAnalysis;
  aiSummary: {
    overview: string;
    architecture: string;
    strengths: string[];
    keyConcerns: string[];
    recommendations: string[];
  };
}

export const analyzeLocalPathSchema = z.object({
  folderPath: z.string().min(1, "Folder path is required"),
});

export const analyzeGitHubSchema = z.object({
  repoUrl: z.string().url("Valid GitHub URL is required"),
});

export const analyzeZipSchema = z.object({
  base64Data: z.string().min(1, "ZIP data is required"),
  filename: z.string().min(1),
});
