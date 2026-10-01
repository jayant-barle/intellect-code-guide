import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { spawn } from "node:child_process";
import type {
  CodebaseAnalysisResult,
  CodebaseIssue,
  DependencyInfo,
  FileDetail,
  FileNode,
  FrameworkDetected,
  LanguageStat,
  ModuleDependencyAnalysis,
  ModuleDependencyNode,
  ProjectIngestMethod,
  StructureAnalysisDetails,
  DependencyAnalysisDetails,
  TestingAnalysis,
  DocumentationAnalysis,
} from "./codebase-analyzer-types";

// Maximum limits for safe processing
const MAX_TOTAL_FILES = 2000;
const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1MB per source file for analysis
const MAX_EXTRACT_SIZE_BYTES = 50 * 1024 * 1024; // 50MB total extraction limit

const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "__pycache__",
  ".venv",
  "venv",
  "env",
  ".env",
  "dist",
  "build",
  ".output",
  ".tanstack",
  ".cache",
  ".vscode",
  ".idea",
  "coverage",
  ".pytest_cache",
  ".turbo",
  ".next",
  ".wrangler",
  "target",
  "bin",
  "obj",
]);

const IGNORED_EXTENSIONS = new Set([
  ".pyc",
  ".pyo",
  ".pyd",
  ".min.js",
  ".min.css",
  ".map",
  ".lock",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".svg",
  ".mp4",
  ".webm",
  ".zip",
  ".tar",
  ".gz",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".pdf",
]);

const LANGUAGE_EXTENSIONS: Record<string, { name: string; color: string; supported: boolean }> = {
  ".py": { name: "Python", color: "#3572A5", supported: true },
  ".ts": { name: "TypeScript", color: "#3178C6", supported: true },
  ".tsx": { name: "TypeScript (React)", color: "#3178C6", supported: true },
  ".js": { name: "JavaScript", color: "#F7DF1E", supported: true },
  ".jsx": { name: "JavaScript (React)", color: "#F7DF1E", supported: true },
  ".java": { name: "Java", color: "#B07219", supported: true },
  ".c": { name: "C", color: "#555555", supported: true },
  ".cpp": { name: "C++", color: "#F34B7D", supported: true },
  ".cc": { name: "C++", color: "#F34B7D", supported: true },
  ".cxx": { name: "C++", color: "#F34B7D", supported: true },
  ".h": { name: "C/C++ Header", color: "#F34B7D", supported: true },
  ".hpp": { name: "C/C++ Header", color: "#F34B7D", supported: true },
  ".go": { name: "Go", color: "#00ADD8", supported: true },
  ".rs": { name: "Rust", color: "#DEA584", supported: true },
  ".html": { name: "HTML", color: "#E34C26", supported: false },
  ".css": { name: "CSS", color: "#563D7C", supported: false },
  ".json": { name: "JSON", color: "#292929", supported: false },
  ".yaml": { name: "YAML", color: "#CB171E", supported: false },
  ".yml": { name: "YAML", color: "#CB171E", supported: false },
  ".sql": { name: "SQL", color: "#E38C00", supported: false },
  ".sh": { name: "Shell", color: "#89E051", supported: false },
};

const PYTHON_STDLIB = new Set([
  "os", "sys", "re", "json", "math", "time", "datetime", "random", "pathlib", "collections",
  "itertools", "functools", "typing", "subprocess", "threading", "multiprocessing", "asyncio",
  "unittest", "logging", "shutil", "tempfile", "hashlib", "base64", "urllib", "http", "io",
  "copy", "uuid", "socket", "struct", "sqlite3", "csv", "xml", "html", "pickle", "traceback",
  "inspect", "ast", "builtins", "contextlib", "dataclasses", "enum", "typing_extensions",
  "glob", "operator", "queue", "signal", "platform", "argparse", "secrets", "string", "warnings"
]);

const NODE_STDLIB = new Set([
  "fs", "path", "os", "http", "https", "child_process", "crypto", "events", "stream", "util",
  "url", "buffer", "process", "readline", "assert", "zlib", "net", "tls", "dns", "cluster",
  "perf_hooks", "v8", "vm", "worker_threads", "node:fs", "node:path", "node:os", "node:buffer",
  "node:child_process", "node:crypto", "node:events", "node:stream", "node:util", "node:url"
]);

/**
 * Runs a command with timeout and optional stdin piping.
 */
async function runCommand(
  cmd: string,
  args: string[],
  cwd?: string,
  timeoutMs = 15000,
  stdin?: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, windowsHide: true });
    let stdout = "";
    let stderr = "";
    let killed = false;

    if (stdin !== undefined && child.stdin) {
      try {
        child.stdin.write(stdin);
        child.stdin.end();
      } catch {
        // ignore
      }
    }

    const timer = setTimeout(() => {
      killed = true;
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
      reject(new Error(`Command ${cmd} timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    child.stdout?.on("data", (d) => (stdout += d.toString("utf8")));
    child.stderr?.on("data", (d) => (stderr += d.toString("utf8")));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (!killed) resolve({ stdout, stderr, exitCode: code ?? 0 });
    });
  });
}

/**
 * Analyzes a Python source file using AST via a Python subprocess.
 */
async function analyzePythonFileAst(filePath: string, content: string) {
  const pyScript = `
import ast, json, sys

code = sys.stdin.read()
try:
    tree = ast.parse(code)
except Exception:
    sys.exit(0)

functions = []
classes = []
imports = []
internal_imports = []
external_imports = []
docstrings = 0
complexity = 0

for node in ast.walk(tree):
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        doc = ast.get_docstring(node)
        if doc: docstrings += 1
        params = [a.arg for a in node.args.args if a.arg != "self"]
        ret = None
        if node.returns:
            if isinstance(node.returns, ast.Name): ret = node.returns.id
            elif isinstance(node.returns, ast.Constant): ret = str(node.returns.value)
        fn_lines = getattr(node, "end_lineno", node.lineno) - node.lineno + 1
        functions.append({
            "name": node.name,
            "line": node.lineno,
            "params": params,
            "docstring": doc[:100] if doc else None,
            "lines": fn_lines,
            "returns": ret
        })
    elif isinstance(node, ast.ClassDef):
        methods = [m.name for m in node.body if isinstance(m, (ast.FunctionDef, ast.AsyncFunctionDef))]
        classes.append({
            "name": node.name,
            "line": node.lineno,
            "methodsCount": len(methods),
            "methods": methods
        })
    elif isinstance(node, ast.Import):
        for n in node.names:
            imports.append(n.name)
            external_imports.append(n.name.split(".")[0])
    elif isinstance(node, ast.ImportFrom):
        mod = node.module or ""
        level = getattr(node, "level", 0)
        for n in node.names:
            fullName = f"{mod}.{n.name}" if mod else n.name
            imports.append(fullName)
            if level > 0 or mod.startswith("."):
                internal_imports.append(mod.lstrip("."))
            else:
                external_imports.append(mod.split(".")[0] if mod else n.name)
    elif isinstance(node, (ast.If, ast.For, ast.While, ast.Try)):
        complexity += 1

print(json.dumps({
    "functions": functions,
    "classes": classes,
    "imports": list(set(imports)),
    "internalImports": list(set(internal_imports)),
    "externalImports": list(set(external_imports)),
    "complexity": complexity
}))
`;
  try {
    const { stdout, exitCode } = await runCommand("python", ["-c", pyScript], undefined, 3000, content);
    if (exitCode === 0 && stdout.trim()) {
      return JSON.parse(stdout.trim());
    }
  } catch {
    // Fall back to regex parsing if python subprocess fails
  }

  // Fallback regex parsing
  const functions: { name: string; line: number; params: string[]; docstring?: string; lines?: number; returns?: string }[] = [];
  const classes: { name: string; line: number; methodsCount: number; methods?: string[] }[] = [];
  const imports: string[] = [];
  const internalImports: string[] = [];
  const externalImports: string[] = [];
  const lines = content.split("\n");

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const fnMatch = trimmed.match(/^def\s+([a-zA-Z_]\w*)\s*\((.*?)\)/);
    if (fnMatch) {
      functions.push({
        name: fnMatch[1],
        line: idx + 1,
        params: fnMatch[2].split(",").map((s) => s.trim().split(":")[0]).filter(Boolean),
        lines: 1,
      });
    }
    const clsMatch = trimmed.match(/^class\s+([a-zA-Z_]\w*)/);
    if (clsMatch) {
      classes.push({ name: clsMatch[1], line: idx + 1, methodsCount: 0 });
    }
    if (trimmed.startsWith("import ")) {
      const imp = trimmed.replace(/^import\s+/, "").split(" ")[0].split(".")[0];
      imports.push(imp);
      externalImports.push(imp);
    } else if (trimmed.startsWith("from ")) {
      const parts = trimmed.split(" ");
      if (parts[1]) {
        imports.push(parts[1]);
        if (parts[1].startsWith(".")) {
          internalImports.push(parts[1].replace(/^\.+/, ""));
        } else {
          externalImports.push(parts[1].split(".")[0]);
        }
      }
    }
  });

  return { functions, classes, imports, internalImports, externalImports, complexity: 1 };
}

/**
 * Scans a file for security, bugs, performance, code quality, and documentation issues.
 */
function scanFileForIssues(
  relativePath: string,
  content: string,
  language: string,
): CodebaseIssue[] {
  const issues: CodebaseIssue[] = [];
  const lines = content.split("\n");
  let issueId = 1;

  // 1. SECURITY CHECKS (Values are ALWAYS REDACTED)
  const secretPatterns = [
    {
      pattern: /(['"])(?:sk[-_][a-zA-Z0-9_\-]{16,}|AKIA[0-9A-Z]{16}|ghp_[0-9a-zA-Z]{36}|AIza[0-9A-Za-z-_]{35}|xoxb-[0-9a-zA-Z-_]{24,})\1/i,
      name: "Hardcoded API Key / Token",
    },
    {
      pattern: /(?:api[_-]?key|secret[_-]?key|private[_-]?key|auth[_-]?token|access[_-]?token)\s*[:=]\s*['"][a-zA-Z0-9_\-.~]{8,}['"]/i,
      name: "Hardcoded Secret Variable",
    },
    {
      pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{6,}['"]/i,
      name: "Hardcoded Password",
    },
    {
      pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/,
      name: "Private Cryptographic Key",
    },
  ];

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    // Secrets check
    for (const { pattern, name } of secretPatterns) {
      if (pattern.test(line) && !trimmed.startsWith("#") && !trimmed.startsWith("//")) {
        issues.push({
          id: `sec_${relativePath}_${issueId++}`,
          category: "security",
          type: "potential",
          severity: "Critical",
          confidence: "high",
          file: relativePath,
          line: lineNum,
          title: `Potential Secret Detected: ${name}`,
          description: `Discovered a pattern matching ${name} embedded directly in source code. Value: [REDACTED].`,
          recommendation: "Move sensitive credentials to environment variables or secret vaults. Never commit secrets.",
          snippet: line.replace(/(['"])(?:[a-zA-Z0-9_\-.~]{8,})\1/g, "$1[REDACTED]$1"),
          source: "static-analysis",
        });
      }
    }

    // Unsafe eval/exec
    if (/\b(eval|exec)\s*\(/.test(line) && !trimmed.startsWith("#") && !trimmed.startsWith("//")) {
      issues.push({
        id: `sec_${relativePath}_${issueId++}`,
        category: "security",
        type: "potential",
        severity: "High",
        confidence: "high",
        file: relativePath,
        line: lineNum,
        title: "Dynamic Code Execution (eval / exec)",
        description: "Executing arbitrary code via eval/exec can lead to Remote Code Execution (RCE) if input is untrusted.",
        recommendation: "Avoid eval/exec; use safe parsing libraries like json.loads() or ast.literal_eval().",
        snippet: trimmed,
        source: "static-analysis",
      });
    }

    // Shell injection
    if ((/subprocess\.(Popen|call|run)\(.*shell\s*=\s*True/.test(line) || /os\.system\(/.test(line)) && !trimmed.startsWith("#")) {
      issues.push({
        id: `sec_${relativePath}_${issueId++}`,
        category: "security",
        type: "potential",
        severity: "High",
        confidence: "high",
        file: relativePath,
        line: lineNum,
        title: "Shell Command Execution with Shell=True",
        description: "Executing shell commands with shell=True or os.system() creates risk of command injection.",
        recommendation: "Pass command arguments as a list of strings with shell=False.",
        snippet: trimmed,
        source: "static-analysis",
      });
    }

    // SQL query concatenation
    if (/(SELECT|INSERT|UPDATE|DELETE)\s+.*f['"]|\bcursor\.execute\(f['"]/.test(line) && !trimmed.startsWith("#")) {
      issues.push({
        id: `sec_${relativePath}_${issueId++}`,
        category: "security",
        type: "potential",
        severity: "High",
        confidence: "medium",
        file: relativePath,
        line: lineNum,
        title: "Raw SQL String Formatting",
        description: "Constructing SQL queries using f-strings or string concatenation exposes SQL Injection vulnerabilities.",
        recommendation: "Use parameterized queries with placeholders (? or %s) or an ORM.",
        snippet: trimmed,
        source: "static-analysis",
      });
    }

    // Path traversal check
    if ((/\bopen\s*\(.*\+.*['"]\.\./.test(line) || /os\.path\.join\(.*['"]\.\./.test(line)) && !trimmed.startsWith("#")) {
      issues.push({
        id: `sec_${relativePath}_${issueId++}`,
        category: "security",
        type: "potential",
        severity: "High",
        confidence: "medium",
        file: relativePath,
        line: lineNum,
        title: "Potential Path Traversal",
        description: "Concatenating relative path segments ('..') into file open calls can allow unauthorized directory traversal.",
        recommendation: "Sanitize paths using os.path.abspath and verify they reside within the allowed root directory.",
        snippet: trimmed,
        source: "static-analysis",
      });
    }

    // Sensitive data logging
    if (/(?:logging|logger)\.(?:info|debug|warn|error)\(.*(?:password|token|secret|apiKey)/i.test(line) ||
        /(?:print|console\.log)\(.*(?:password|token|secret|apiKey)/i.test(line)) {
      if (!trimmed.startsWith("#") && !trimmed.startsWith("//")) {
        issues.push({
          id: `sec_${relativePath}_${issueId++}`,
          category: "security",
          type: "potential",
          severity: "Medium",
          confidence: "medium",
          file: relativePath,
          line: lineNum,
          title: "Sensitive Information Logging",
          description: "Printing or logging sensitive variables (passwords, tokens) can lead to credential exposure in log aggregators.",
          recommendation: "Mask or omit credentials before logging.",
          snippet: trimmed,
          source: "static-analysis",
        });
      }
    }

    // 2. BUG DETECTION
    if (language === "Python") {
      // Mutable default argument
      if (/def\s+\w+\s*\(.*=\s*(\[\]|\{\}|\bset\(\))/.test(line)) {
        issues.push({
          id: `bug_${relativePath}_${issueId++}`,
          category: "bug",
          type: "confirmed",
          severity: "Medium",
          confidence: "high",
          file: relativePath,
          line: lineNum,
          title: "Mutable Default Argument",
          description: "Python evaluates default arguments once at function definition time. Mutating it modifies state across calls.",
          recommendation: "Use None as the default argument and initialize inside the function (e.g. if arg is None: arg = []).",
          snippet: trimmed,
          source: "static-analysis",
        });
      }

      // Bare except clause
      if (/^except\s*:/.test(trimmed)) {
        issues.push({
          id: `bug_${relativePath}_${issueId++}`,
          category: "bug",
          type: "confirmed",
          severity: "Low",
          confidence: "high",
          file: relativePath,
          line: lineNum,
          title: "Bare Except Clause",
          description: "Catching bare 'except:' catches KeyboardInterrupt and SystemExit, hiding critical errors and preventing termination.",
          recommendation: "Catch specific exceptions like 'except Exception:' or 'except (ValueError, KeyError):'.",
          snippet: trimmed,
          source: "static-analysis",
        });
      }

      // Unclosed file handle without with
      if (/\bopen\s*\(/.test(line) && !line.includes("with ") && !trimmed.startsWith("#")) {
        issues.push({
          id: `bug_${relativePath}_${issueId++}`,
          category: "bug",
          type: "potential",
          severity: "Medium",
          confidence: "medium",
          file: relativePath,
          line: lineNum,
          title: "File Opened Without Context Manager (Resource Leak)",
          description: "Opening files without 'with open(...) as f:' risks leaving file descriptors open if an error occurs.",
          recommendation: "Use the 'with open(...) as f:' pattern for automatic and safe resource cleanup.",
          snippet: trimmed,
          source: "static-analysis",
        });
      }

      // Comparison to None with == or !=
      if (/[!=]=\s*None\b|\bNone\s*[!=]=/.test(line) && !trimmed.startsWith("#")) {
        issues.push({
          id: `bug_${relativePath}_${issueId++}`,
          category: "bug",
          type: "confirmed",
          severity: "Low",
          confidence: "high",
          file: relativePath,
          line: lineNum,
          title: "Comparison to None Using Equality Operator",
          description: "Comparisons to None should always use 'is' or 'is not', never the equality operators (== or !=).",
          recommendation: "Replace '== None' with 'is None' or '!= None' with 'is not None'.",
          snippet: trimmed,
          source: "static-analysis",
        });
      }

      // Suspicious conditions
      if ((/if\s+True\s*:/.test(trimmed) || /if\s+False\s*:/.test(trimmed)) && !trimmed.startsWith("#")) {
        issues.push({
          id: `bug_${relativePath}_${issueId++}`,
          category: "bug",
          type: "potential",
          severity: "Low",
          confidence: "high",
          file: relativePath,
          line: lineNum,
          title: "Suspicious Constant Condition",
          description: `Conditional expression '${trimmed}' always evaluates to the same constant boolean value.`,
          recommendation: "Review the condition logic or simplify the control flow.",
          snippet: trimmed,
          source: "static-analysis",
        });
      }

      // Naming convention: Python functions should be snake_case
      const fnNameMatch = trimmed.match(/^def\s+([A-Z][a-zA-Z0-9_]*)\s*\(/);
      if (fnNameMatch && !trimmed.startsWith("#")) {
        issues.push({
          id: `qual_${relativePath}_${issueId++}`,
          category: "quality",
          type: "potential",
          severity: "Low",
          confidence: "high",
          file: relativePath,
          line: lineNum,
          title: `Non-Standard Function Naming: ${fnNameMatch[1]}`,
          description: `Function '${fnNameMatch[1]}' uses PascalCase. PEP 8 standard specifies snake_case for Python functions.`,
          recommendation: `Rename function to '${fnNameMatch[1].replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "")}'.`,
          snippet: trimmed,
          source: "static-analysis",
        });
      }
    }

    // 3. PERFORMANCE CHECKS
    if (/for\s+.*\s+in\s+.*:/.test(trimmed) && idx + 1 < lines.length) {
      const nextLine = lines[idx + 1].trim();
      if (/for\s+.*\s+in\s+.*:/.test(nextLine)) {
        issues.push({
          id: `perf_${relativePath}_${issueId++}`,
          category: "performance",
          type: "potential",
          severity: "High",
          confidence: "high",
          file: relativePath,
          line: lineNum,
          title: "Nested Loop Detected (Quadratic Overhead)",
          description: "Nested loops cause O(n × m) or O(n²) comparison overhead.",
          recommendation: "Consider dictionary/set lookup or vectorized operations.",
          snippet: `${trimmed}\n    ${nextLine}`,
          source: "static-analysis",
        });
      }
    }

    if (/\+=\s*['"]/.test(line) && (line.includes("for ") || lines.slice(Math.max(0, idx - 5), idx).some((l) => /^\s*for\s+/.test(l)))) {
      issues.push({
        id: `perf_${relativePath}_${issueId++}`,
        category: "performance",
        type: "potential",
        severity: "Medium",
        confidence: "medium",
        file: relativePath,
        line: lineNum,
        title: "String Concatenation Inside Loop",
        description: "Repeated += on strings reallocates memory on each iteration.",
        recommendation: "Collect strings in a list and join them with ''.join() after the loop.",
        snippet: trimmed,
        source: "static-analysis",
      });
    }

    // Repeated DB query inside loop
    if (/(?:cursor\.execute|session\.query|\.query\(|\.fetch\().*inside/i.test(line) ||
        (line.includes("cursor.execute") && lines.slice(Math.max(0, idx - 5), idx).some((l) => /^\s*for\s+/.test(l)))) {
      issues.push({
        id: `perf_${relativePath}_${issueId++}`,
        category: "performance",
        type: "potential",
        severity: "High",
        confidence: "medium",
        file: relativePath,
        line: lineNum,
        title: "Database Query Executed Inside Loop",
        description: "Executing database queries within an iteration loop triggers N+1 query performance degradation.",
        recommendation: "Batch fetch records with an 'IN' query or join before entering the loop.",
        snippet: trimmed,
        source: "static-analysis",
      });
    }

    // 4. CODE QUALITY CHECKS
    // Deep nesting (> 4 indentation levels)
    const indentMatch = line.match(/^(\s+)/);
    if (indentMatch && indentMatch[1].length >= 16 && trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("//")) {
      issues.push({
        id: `qual_${relativePath}_${issueId++}`,
        category: "quality",
        type: "potential",
        severity: "Low",
        confidence: "medium",
        file: relativePath,
        line: lineNum,
        title: "Deeply Nested Logic (Nesting Depth >= 4)",
        description: "Excessive nesting degrades code readability and testability.",
        recommendation: "Refactor into smaller helper functions or use guard clauses with early returns.",
        snippet: trimmed,
        source: "static-analysis",
      });
    }

    // Unreachable code check (line directly following return / raise / break with same indent)
    if (idx > 0) {
      const prevLine = lines[idx - 1].trim();
      if (/^(return\b|raise\b|break\b|continue\b)/.test(prevLine) && trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("else:") && !trimmed.startsWith("elif:") && !trimmed.startsWith("except:") && !trimmed.startsWith("finally:")) {
        const prevIndent = (lines[idx - 1].match(/^(\s*)/)?.[1] || "").length;
        const currIndent = (line.match(/^(\s*)/)?.[1] || "").length;
        if (currIndent === prevIndent && prevIndent > 0) {
          issues.push({
            id: `qual_${relativePath}_${issueId++}`,
            category: "quality",
            type: "potential",
            severity: "Low",
            confidence: "medium",
            file: relativePath,
            line: lineNum,
            title: "Potential Unreachable Code",
            description: `Statement follows directly after a '${prevLine.split(" ")[0]}' at the same indentation level.`,
            recommendation: "Remove redundant statements or inspect preceding branch conditions.",
            snippet: trimmed,
            source: "static-analysis",
          });
        }
      }
    }
  });

  // Large file check
  if (lines.length > 400) {
    issues.push({
      id: `qual_${relativePath}_${issueId++}`,
      category: "quality",
      type: "confirmed",
      severity: "Low",
      confidence: "high",
      file: relativePath,
      line: 1,
      title: `Large File (${lines.length} lines)`,
      description: `File exceeds 400 lines (${lines.length} lines total). Large files are often harder to maintain and test.`,
      recommendation: "Consider breaking this module into focused, cohesive submodules.",
      source: "static-analysis",
    });
  }

  return issues;
}

/**
 * Builds module dependency analysis (graph, hubs, cycle detection).
 */
function analyzeModuleDependencies(
  filesMap: Record<string, FileDetail>,
): ModuleDependencyAnalysis {
  const nodes: ModuleDependencyNode[] = [];
  const edges: { source: string; target: string }[] = [];
  const allFilePaths = Object.keys(filesMap);

  // Map module name aliases to file paths
  const moduleToPath: Record<string, string> = {};
  allFilePaths.forEach((fp) => {
    const noExt = fp.replace(/\.[^/.]+$/, "");
    const base = path.basename(fp, path.extname(fp));
    moduleToPath[fp] = fp;
    moduleToPath[noExt] = fp;
    moduleToPath[base] = fp;
    moduleToPath[noExt.replace(/\//g, ".")] = fp;
  });

  // Initialize node representations
  allFilePaths.forEach((fp) => {
    const file = filesMap[fp];
    const internalImports = new Set<string>();
    const externalImports = new Set<string>();

    file.imports.forEach((imp) => {
      const clean = imp.split(" ")[0].trim();
      const targetPath = moduleToPath[clean] || moduleToPath[clean.replace(/\./g, "/")];
      if (targetPath && targetPath !== fp) {
        internalImports.add(targetPath);
        edges.push({ source: fp, target: targetPath });
      } else {
        externalImports.add(clean.split(".")[0]);
      }
    });

    // Also include any internalImports identified by AST
    (file.internalImports || []).forEach((imp) => {
      const targetPath = moduleToPath[imp] || moduleToPath[imp.replace(/\./g, "/")];
      if (targetPath && targetPath !== fp) {
        internalImports.add(targetPath);
        if (!edges.some((e) => e.source === fp && e.target === targetPath)) {
          edges.push({ source: fp, target: targetPath });
        }
      }
    });

    nodes.push({
      id: fp,
      name: path.basename(fp),
      internalImports: Array.from(internalImports),
      externalImports: Array.from(externalImports),
      incomingDependenciesCount: 0,
      outgoingDependenciesCount: internalImports.size,
    });
  });

  // Calculate incoming dependencies
  edges.forEach((e) => {
    const targetNode = nodes.find((n) => n.id === e.target);
    if (targetNode) targetNode.incomingDependenciesCount++;
  });

  // Identify highly connected modules
  const highlyConnectedModules: ModuleDependencyAnalysis["highlyConnectedModules"] = [];
  nodes.forEach((n) => {
    if (n.incomingDependenciesCount >= 2) {
      highlyConnectedModules.push({
        file: n.id,
        connectionsCount: n.incomingDependenciesCount,
        type: "central_hub",
      });
    } else if (n.outgoingDependenciesCount >= 3) {
      highlyConnectedModules.push({
        file: n.id,
        connectionsCount: n.outgoingDependenciesCount,
        type: "high_consumer",
      });
    }
  });

  // Circular Dependency Detection via DFS
  const circularDependencies: ModuleDependencyAnalysis["circularDependencies"] = [];
  const adjacency: Record<string, string[]> = {};
  nodes.forEach((n) => {
    adjacency[n.id] = n.internalImports;
  });

  const visited: Record<string, boolean> = {};
  const recStack: Record<string, boolean> = {};

  function detectCycle(current: string, pathStack: string[]) {
    visited[current] = true;
    recStack[current] = true;
    pathStack.push(current);

    const neighbors = adjacency[current] || [];
    for (const neighbor of neighbors) {
      if (!visited[neighbor]) {
        detectCycle(neighbor, pathStack);
      } else if (recStack[neighbor]) {
        const cycleStartIndex = pathStack.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          const cyclePath = pathStack.slice(cycleStartIndex).concat(neighbor);
          const cycleKey = cyclePath.join(" -> ");
          if (!circularDependencies.some((c) => c.cycle.join(" -> ") === cycleKey)) {
            circularDependencies.push({
              cycle: cyclePath,
              description: `Circular dependency detected: ${cycleKey}`,
            });
          }
        }
      }
    }

    pathStack.pop();
    recStack[current] = false;
  }

  nodes.forEach((n) => {
    if (!visited[n.id]) {
      detectCycle(n.id, []);
    }
  });

  const totalInternal = edges.length;
  const totalExternal = nodes.reduce((sum, n) => sum + n.externalImports.length, 0);

  return {
    nodes,
    edges,
    highlyConnectedModules: highlyConnectedModules.sort((a, b) => b.connectionsCount - a.connectionsCount),
    circularDependencies,
    totalInternalDependencies: totalInternal,
    totalExternalDependencies: totalExternal,
  };
}

/**
 * Recursively scans directory and builds project representation.
 */
export async function analyzeDirectory(
  rootDir: string,
  projectName: string,
  method: ProjectIngestMethod,
): Promise<CodebaseAnalysisResult> {
  const filesMap: Record<string, FileDetail> = {};
  const allIssues: CodebaseIssue[] = [];
  const languageStats: Record<string, { filesCount: number; linesOfCode: number }> = {};
  const ignoredStats: Record<string, number> = {};
  const dependencies: DependencyInfo[] = [];
  const frameworks: FrameworkDetected[] = [];

  const manifestsFound: string[] = [];
  const entryPoints: string[] = [];
  const sourceDirectoriesSet = new Set<string>();
  const testDirectoriesSet = new Set<string>();
  const buildFiles: string[] = [];
  const deploymentFiles: string[] = [];

  let totalFiles = 0;
  let totalDirs = 0;
  let sourceFiles = 0;
  let testFiles = 0;
  let configFiles = 0;
  let docFiles = 0;
  let totalLinesOfCode = 0;

  let testFunctionsCount = 0;
  let totalFunctionsCount = 0;
  let documentedFunctionsCount = 0;

  let hasReadme = false;
  let hasLicense = false;
  let hasContributing = false;
  let hasInstallInReadme = false;
  let hasUsageInReadme = false;
  let hasApiDocs = false;

  async function walk(dir: string, relDir = ""): Promise<FileNode> {
    totalDirs++;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const children: FileNode[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relDir, entry.name).replace(/\\/g, "/");

      // Check if ignored directory
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name) || entry.name.startsWith(".")) {
          ignoredStats[entry.name] = (ignoredStats[entry.name] || 0) + 1;
          continue;
        }

        const lowerName = entry.name.toLowerCase();
        if (lowerName === "test" || lowerName === "tests" || lowerName === "spec" || lowerName === "__tests__") {
          testDirectoriesSet.add(relPath);
        } else if (lowerName === "src" || lowerName === "lib" || lowerName === "app" || lowerName === "backend" || lowerName === "frontend" || lowerName === "api" || lowerName === "components") {
          sourceDirectoriesSet.add(relPath);
        }

        children.push(await walk(fullPath, relPath));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const lowerName = entry.name.toLowerCase();

        // Check if sensitive or ignored file
        if (entry.name.startsWith(".env") || entry.name.endsWith(".key") || entry.name.endsWith(".pem")) {
          ignoredStats["secrets/.env"] = (ignoredStats["secrets/.env"] || 0) + 1;
          continue;
        }

        if (IGNORED_EXTENSIONS.has(ext)) {
          ignoredStats[ext || "binary"] = (ignoredStats[ext || "binary"] || 0) + 1;
          continue;
        }

        totalFiles++;

        // Determine category
        let category: FileNode["category"] = "other";
        const isTest =
          relPath.includes("/test") ||
          relPath.includes("/tests") ||
          entry.name.startsWith("test_") ||
          entry.name.endsWith("_test.py") ||
          entry.name.includes(".test.") ||
          entry.name.includes(".spec.");

        if (isTest) {
          category = "test";
          testFiles++;
        } else if (lowerName.startsWith("readme")) {
          category = "docs";
          docFiles++;
          hasReadme = true;
        } else if (lowerName.startsWith("license")) {
          category = "docs";
          docFiles++;
          hasLicense = true;
        } else if (lowerName.startsWith("contributing")) {
          category = "docs";
          docFiles++;
          hasContributing = true;
        } else if (relPath.includes("/docs/") || ext === ".md" || ext === ".rst") {
          category = "docs";
          docFiles++;
          if (relPath.toLowerCase().includes("api")) hasApiDocs = true;
        } else if (lowerName === "dockerfile" || lowerName === "makefile" || lowerName === "cmakelists.txt" || lowerName === "pom.xml" || lowerName === "build.gradle" || lowerName.includes("vite.config") || lowerName.includes("tsconfig")) {
          category = "build";
          buildFiles.push(relPath);
        } else if (relPath.startsWith(".github/workflows") || lowerName.startsWith("docker-compose") || lowerName === "procfile" || lowerName.includes("nginx")) {
          category = "deployment";
          deploymentFiles.push(relPath);
        } else if (
          lowerName === "package.json" ||
          lowerName === "requirements.txt" ||
          lowerName === "pyproject.toml" ||
          lowerName.endsWith(".config.js") ||
          lowerName.endsWith(".config.ts") ||
          lowerName.startsWith(".")
        ) {
          category = "config";
          configFiles++;
        } else if (LANGUAGE_EXTENSIONS[ext]?.supported) {
          category = "source";
          sourceFiles++;
        }

        // Detect entry points
        if (
          lowerName === "main.py" ||
          lowerName === "app.py" ||
          lowerName === "server.py" ||
          lowerName === "manage.py" ||
          lowerName === "wsgi.py" ||
          lowerName === "asgi.py" ||
          lowerName === "index.ts" ||
          lowerName === "index.js" ||
          lowerName === "main.ts" ||
          lowerName === "main.js" ||
          lowerName === "server.ts" ||
          lowerName === "server.js" ||
          lowerName === "app.tsx" ||
          lowerName === "index.html"
        ) {
          entryPoints.push(relPath);
        }

        // Read file content
        let content = "";
        let lineCount = 0;
        let fileSize = 0;

        try {
          const stats = await fs.stat(fullPath);
          fileSize = stats.size;
          if (fileSize <= MAX_FILE_SIZE_BYTES) {
            content = await fs.readFile(fullPath, "utf-8");
            lineCount = content.split("\n").length;
            totalLinesOfCode += lineCount;
          }
        } catch {
          // ignore unreadable file
        }

        // Check for if __name__ == "__main__" entry point in Python
        if (ext === ".py" && content.includes('__name__ == "__main__"') && !entryPoints.includes(relPath)) {
          entryPoints.push(relPath);
        }

        // Inspect README for install and usage instructions
        if (hasReadme && lowerName.startsWith("readme") && content) {
          const lowerContent = content.toLowerCase();
          if (lowerContent.includes("install") || lowerContent.includes("setup") || lowerContent.includes("getting started")) {
            hasInstallInReadme = true;
          }
          if (lowerContent.includes("usage") || lowerContent.includes("run") || lowerContent.includes("quickstart")) {
            hasUsageInReadme = true;
          }
        }

        // Track language stats
        const langConfig = LANGUAGE_EXTENSIONS[ext];
        if (langConfig) {
          const lName = langConfig.name;
          if (!languageStats[lName]) {
            languageStats[lName] = { filesCount: 0, linesOfCode: 0 };
          }
          languageStats[lName].filesCount++;
          languageStats[lName].linesOfCode += lineCount;
        }

        // Parse dependency manifests
        if (entry.name === "requirements.txt") {
          manifestsFound.push(relPath);
          content.split("\n").forEach((l) => {
            const trimmed = l.trim().split("#")[0];
            if (trimmed && !trimmed.startsWith("-")) {
              const [pkg, ver] = trimmed.split(/==|>=|<=|~=/);
              dependencies.push({
                ecosystem: "Python",
                manifestFile: relPath,
                name: pkg.trim(),
                version: ver ? ver.trim() : undefined,
                type: "direct",
              });
            }
          });
        } else if (entry.name === "pyproject.toml") {
          manifestsFound.push(relPath);
          const depMatches = content.matchAll(/([a-zA-Z0-9_\-]+)\s*=\s*['"]([0-9a-zA-Z^~><=.]+)['"]/g);
          for (const m of depMatches) {
            if (m[1] && m[1] !== "python") {
              dependencies.push({
                ecosystem: "Python",
                manifestFile: relPath,
                name: m[1],
                version: m[2],
                type: "direct",
              });
            }
          }
        } else if (entry.name === "package.json") {
          manifestsFound.push(relPath);
          try {
            const pkgJson = JSON.parse(content);
            const deps = pkgJson.dependencies || {};
            const devDeps = pkgJson.devDependencies || {};
            Object.entries(deps).forEach(([k, v]) => {
              dependencies.push({
                ecosystem: "JavaScript/Node",
                manifestFile: relPath,
                name: k,
                version: String(v),
                type: "direct",
              });
            });
            Object.entries(devDeps).forEach(([k, v]) => {
              dependencies.push({
                ecosystem: "JavaScript/Node",
                manifestFile: relPath,
                name: k,
                version: String(v),
                type: "dev",
              });
            });
          } catch {
            // ignore malformed package.json
          }
        } else if (entry.name === "pom.xml" || entry.name === "build.gradle" || entry.name === "CMakeLists.txt") {
          manifestsFound.push(relPath);
        }

        // Detailed code structure analysis
        let functions: { name: string; line: number; params: string[]; docstring?: string; lines?: number; returns?: string }[] = [];
        let classes: { name: string; line: number; methodsCount: number; methods?: string[] }[] = [];
        let imports: string[] = [];
        let internalImports: string[] = [];
        let externalImports: string[] = [];

        if (ext === ".py" && content) {
          const pyAst = await analyzePythonFileAst(fullPath, content);
          functions = pyAst.functions || [];
          classes = pyAst.classes || [];
          imports = pyAst.imports || [];
          internalImports = pyAst.internalImports || [];
          externalImports = pyAst.externalImports || [];
          totalFunctionsCount += functions.length;
          documentedFunctionsCount += functions.filter((f) => f.docstring).length;
          if (isTest) {
            testFunctionsCount += functions.length;
          }
        } else if ((ext === ".ts" || ext === ".tsx" || ext === ".js" || ext === ".jsx") && content) {
          const fnMatches = content.matchAll(/(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_]\w*)\s*\((.*?)\)/g);
          for (const m of fnMatches) {
            functions.push({
              name: m[1],
              line: 1,
              params: m[2] ? m[2].split(",").map((s) => s.trim().split(":")[0]) : [],
              lines: 1,
            });
            totalFunctionsCount++;
          }
          const impMatches = content.matchAll(/(?:import|from)\s+['"](.*?)['"]/g);
          for (const m of impMatches) {
            imports.push(m[1]);
            if (m[1].startsWith(".") || m[1].startsWith("@/")) {
              internalImports.push(m[1].replace(/^\.\.?\//, ""));
            } else {
              externalImports.push(m[1].split("/")[0]);
            }
          }
          if (isTest) {
            const itMatches = content.matchAll(/\b(?:it|test)\s*\(\s*['"](.*?)['"]/g);
            for (const m of itMatches) testFunctionsCount++;
          }
        }

        // Scan file for issues
        const fileIssues = scanFileForIssues(relPath, content, langConfig?.name || "Other");

        // Check for large functions in this file
        functions.forEach((fn) => {
          if ((fn.lines || 1) > 60) {
            fileIssues.push({
              id: `qual_${relPath}_fn_${fn.name}`,
              category: "quality",
              type: "confirmed",
              severity: "Medium",
              confidence: "high",
              file: relPath,
              line: fn.line,
              title: `Large Function: ${fn.name}() (${fn.lines} lines)`,
              description: `Function exceeds recommended size threshold of 60 lines (${fn.lines} lines).`,
              recommendation: "Decompose into smaller helper functions with focused single responsibilities.",
              source: "static-analysis",
            });
          }
          if (fn.params.length > 5) {
            fileIssues.push({
              id: `qual_${relPath}_params_${fn.name}`,
              category: "quality",
              type: "confirmed",
              severity: "Low",
              confidence: "high",
              file: relPath,
              line: fn.line,
              title: `Excessive Parameters: ${fn.name}() (${fn.params.length} params)`,
              description: `Function declares ${fn.params.length} parameters, exceeding the threshold of 5.`,
              recommendation: "Group parameters into a configuration object, Pydantic model, or dataclass.",
              source: "static-analysis",
            });
          }
        });

        // Check for large classes
        classes.forEach((cls) => {
          if (cls.methodsCount > 10) {
            fileIssues.push({
              id: `qual_${relPath}_cls_${cls.name}`,
              category: "quality",
              type: "confirmed",
              severity: "Medium",
              confidence: "high",
              file: relPath,
              line: cls.line,
              title: `Large Class: ${cls.name} (${cls.methodsCount} methods)`,
              description: `Class contains ${cls.methodsCount} methods, suggesting high coupling or God-object tendency.`,
              recommendation: "Consider extracting specialized responsibility into delegate service classes.",
              source: "static-analysis",
            });
          }
        });

        allIssues.push(...fileIssues);

        const fileDetail: FileDetail = {
          path: relPath,
          lines: lineCount,
          size: fileSize,
          language: langConfig?.name || "Other",
          category,
          contentSample: content.slice(0, 10000), // First 10KB sample for viewer
          functions,
          classes,
          imports,
          internalImports,
          externalImports,
          issues: fileIssues,
        };

        filesMap[relPath] = fileDetail;

        children.push({
          path: relPath,
          name: entry.name,
          type: "file",
          size: fileSize,
          lines: lineCount,
          language: langConfig?.name,
          category,
          functionsCount: functions.length,
          classesCount: classes.length,
          issuesSummary: {
            bugs: fileIssues.filter((i) => i.category === "bug").length,
            security: fileIssues.filter((i) => i.category === "security").length,
            performance: fileIssues.filter((i) => i.category === "performance").length,
            quality: fileIssues.filter((i) => i.category === "quality").length,
          },
        });
      }
    }

    return {
      path: relDir || "/",
      name: relDir ? path.basename(relDir) : projectName,
      type: "directory",
      size: children.reduce((acc, c) => acc + c.size, 0),
      lines: children.reduce((acc, c) => acc + c.lines, 0),
      category: "other",
      children,
    };
  }

  const rootTree = await walk(rootDir);

  // Module Dependency Analysis
  const moduleDependencies = analyzeModuleDependencies(filesMap);

  // Add any circular dependencies to issues list
  moduleDependencies.circularDependencies.forEach((cd, idx) => {
    allIssues.push({
      id: `dep_cycle_${idx}`,
      category: "dependency",
      type: "confirmed",
      severity: "Medium",
      confidence: "high",
      file: cd.cycle[0],
      line: 1,
      title: "Circular Module Dependency",
      description: cd.description,
      recommendation: "Refactor shared functionality into a common base module to break the import cycle.",
      source: "static-analysis",
    });
  });

  // Detect Unused and Missing Imports
  const depNames = new Set(dependencies.map((d) => d.name.toLowerCase()));
  const projectModuleNames = new Set(
    Object.keys(filesMap).flatMap((fp) => {
      const noExt = fp.replace(/\.[^/.]+$/, "").toLowerCase();
      const base = path.basename(fp, path.extname(fp)).toLowerCase();
      return [noExt, base, fp.toLowerCase()];
    }),
  );
  const unusedImports: { file: string; line: number; name: string }[] = [];
  const missingImports: { file: string; line: number; name: string; suggestion: string }[] = [];

  Object.values(filesMap).forEach((file) => {
    if (!file.contentSample) return;
    const content = file.contentSample;
    const isPy = file.language === "Python";

    // Unused imports check
    file.imports.forEach((imp) => {
      const baseName = imp.split(".").pop() || imp;
      // Skip wildcard or empty
      if (baseName === "*" || baseName.length <= 1) return;
      const regex = new RegExp(`\\b${baseName}\\b`, "g");
      const matches = content.match(regex);
      // If it only occurs once (the import statement itself), it's likely unused
      if (matches && matches.length === 1) {
        unusedImports.push({ file: file.path, line: 1, name: baseName });
        allIssues.push({
          id: `qual_unused_imp_${file.path}_${baseName}`,
          category: "quality",
          type: "potential",
          severity: "Low",
          confidence: "medium",
          file: file.path,
          line: 1,
          title: `Unused Import: ${baseName}`,
          description: `'${baseName}' is imported in ${file.path} but never referenced in the module body.`,
          recommendation: "Remove unused imports to keep bundle size and startup time clean.",
          source: "static-analysis",
        });
      }
    });

    // Missing imports check (external packages not in manifest)
    (file.externalImports || []).forEach((extPkg) => {
      const cleanPkg = extPkg.toLowerCase();
      if (isPy) {
        if (!PYTHON_STDLIB.has(cleanPkg) && !depNames.has(cleanPkg) && !projectModuleNames.has(cleanPkg)) {
          missingImports.push({
            file: file.path,
            line: 1,
            name: extPkg,
            suggestion: `Add '${extPkg}' to requirements.txt or pyproject.toml`,
          });
          allIssues.push({
            id: `dep_missing_${file.path}_${extPkg}`,
            category: "dependency",
            type: "potential",
            severity: "Medium",
            confidence: "medium",
            file: file.path,
            line: 1,
            title: `Undeclared Dependency: ${extPkg}`,
            description: `Module '${extPkg}' is imported in ${file.path} but is not found in requirements.txt/pyproject.toml or standard library.`,
            recommendation: `Add '${extPkg}' to project dependency manifest to prevent runtime ImportError in deployments.`,
            source: "static-analysis",
          });
        }
      } else if (file.language.includes("JavaScript") || file.language.includes("TypeScript")) {
        if (!NODE_STDLIB.has(cleanPkg) && !depNames.has(cleanPkg) && !projectModuleNames.has(cleanPkg) && !cleanPkg.startsWith("@/")) {
          missingImports.push({
            file: file.path,
            line: 1,
            name: extPkg,
            suggestion: `Add '${extPkg}' to package.json dependencies`,
          });
        }
      }
    });
  });

  // Framework Detection based on verified evidence
  if (depNames.has("fastapi") || Object.values(filesMap).some((f) => f.imports.some((i) => i.includes("fastapi")))) {
    frameworks.push({ name: "FastAPI", category: "Backend", evidence: "fastapi in dependencies/imports" });
  }
  if (depNames.has("flask") || Object.values(filesMap).some((f) => f.imports.some((i) => i.includes("flask")))) {
    frameworks.push({ name: "Flask", category: "Backend", evidence: "flask in dependencies/imports" });
  }
  if (depNames.has("django") || Object.values(filesMap).some((f) => f.imports.some((i) => i.includes("django")))) {
    frameworks.push({ name: "Django", category: "Backend", evidence: "django in dependencies/imports" });
  }
  if (depNames.has("sqlalchemy") || Object.values(filesMap).some((f) => f.imports.some((i) => i.includes("sqlalchemy")))) {
    frameworks.push({ name: "SQLAlchemy", category: "Database/ORM", evidence: "sqlalchemy in dependencies/imports" });
  }
  if (depNames.has("pytest") || testFiles > 0) {
    frameworks.push({ name: "Pytest", category: "Testing", evidence: "pytest in dependencies or test directory present" });
  }
  if (depNames.has("react") || Object.values(filesMap).some((f) => f.imports.some((i) => i.includes("react")))) {
    frameworks.push({ name: "React", category: "Frontend", evidence: "react in dependencies/imports" });
  }
  if (depNames.has("next")) {
    frameworks.push({ name: "Next.js", category: "Frontend", evidence: "next in dependencies" });
  }
  if (depNames.has("express")) {
    frameworks.push({ name: "Express", category: "Backend", evidence: "express in dependencies" });
  }
  if (depNames.has("vite") || depNames.has("@vitejs/plugin-react")) {
    frameworks.push({ name: "Vite", category: "Build/Tooling", evidence: "vite in dependencies" });
  }
  if (depNames.has("@tanstack/react-router") || depNames.has("@tanstack/react-start")) {
    frameworks.push({ name: "TanStack Start / Router", category: "Frontend", evidence: "@tanstack dependencies" });
  }
  if (depNames.has("tailwindcss") || depNames.has("@tailwindcss/vite")) {
    frameworks.push({ name: "Tailwind CSS", category: "Frontend", evidence: "tailwindcss in dependencies" });
  }
  if (depNames.has("torch") || depNames.has("pytorch")) {
    frameworks.push({ name: "PyTorch", category: "ML/AI", evidence: "torch in dependencies" });
  }
  if (depNames.has("drizzle-orm")) {
    frameworks.push({ name: "Drizzle ORM", category: "Database/ORM", evidence: "drizzle-orm in dependencies" });
  }

  // Format language stats
  const totalLoc = totalLinesOfCode || 1;
  const languages: LanguageStat[] = Object.entries(languageStats)
    .map(([name, stat]) => ({
      name,
      filesCount: stat.filesCount,
      linesOfCode: stat.linesOfCode,
      percentage: Math.round((stat.linesOfCode / totalLoc) * 100),
      color: Object.values(LANGUAGE_EXTENSIONS).find((l) => l.name === name)?.color || "#888888",
      analysisSupported: Object.values(LANGUAGE_EXTENSIONS).find((l) => l.name === name)?.supported ?? false,
    }))
    .sort((a, b) => b.linesOfCode - a.linesOfCode);

  // Testing analysis
  const untestedFunctionsCount = Math.max(0, totalFunctionsCount - testFunctionsCount);
  const testing: TestingAnalysis = {
    testFilesCount: testFiles,
    testFunctionsCount,
    untestedFunctionsCount,
    testFrameworks: frameworks.filter((f) => f.category === "Testing").map((f) => f.name),
    coverageMeasured: false,
    statusMessage: "Coverage: Not measured. Run coverage analysis to calculate actual coverage.",
    testDirectories: Array.from(testDirectoriesSet),
  };

  // Documentation analysis & gaps
  const docstringCoveragePercent = totalFunctionsCount > 0
    ? Math.round((documentedFunctionsCount / totalFunctionsCount) * 100)
    : 100;

  const docGaps: string[] = [];
  if (!hasReadme) docGaps.push("No README.md found at root.");
  if (!hasInstallInReadme) docGaps.push("README lacks explicit Installation / Setup guide.");
  if (!hasUsageInReadme) docGaps.push("README lacks Usage / Getting Started guide.");
  if (!hasApiDocs) docGaps.push("No API documentation or endpoint specifications found.");
  if (docstringCoveragePercent < 50) docGaps.push(`Docstring coverage is low (${docstringCoveragePercent}%).`);

  const documentation: DocumentationAnalysis = {
    hasReadme,
    hasLicense,
    hasContributing,
    hasInstallationGuide: hasInstallInReadme,
    hasUsageGuide: hasUsageInReadme,
    hasApiDocs,
    missingDocstringsCount: Math.max(0, totalFunctionsCount - documentedFunctionsCount),
    totalFunctionsCount,
    docstringCoveragePercent,
    documentationGaps: docGaps,
  };

  // Structure analysis calculations
  const allFilesList = Object.values(filesMap);
  const largestFiles = allFilesList
    .slice()
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 5)
    .map((f) => ({ path: f.path, lines: f.lines }));

  const allFunctionsList: { name: string; file: string; line: number; lines: number }[] = [];
  allFilesList.forEach((f) => {
    f.functions.forEach((fn) => {
      allFunctionsList.push({
        name: fn.name,
        file: f.path,
        line: fn.line,
        lines: fn.lines || 1,
      });
    });
  });

  const largestFunctions = allFunctionsList
    .slice()
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 5);

  const averageFunctionSize = allFunctionsList.length > 0
    ? Math.round(allFunctionsList.reduce((sum, fn) => sum + fn.lines, 0) / allFunctionsList.length)
    : 0;

  const structure: StructureAnalysisDetails = {
    entryPoints,
    sourceDirectories: Array.from(sourceDirectoriesSet),
    testDirectories: Array.from(testDirectoriesSet),
    buildFiles,
    deploymentFiles,
    largestFiles,
    largestFunctions,
    averageFunctionSize,
  };

  const dependencyDetails: DependencyAnalysisDetails = {
    manifestsFound,
    dependencies,
    unusedImports,
    missingImports,
  };

  // Group issues by category
  const bugIssues = allIssues.filter((i) => i.category === "bug");
  const securityIssues = allIssues.filter((i) => i.category === "security");
  const perfIssues = allIssues.filter((i) => i.category === "performance");
  const qualityIssues = allIssues.filter((i) => i.category === "quality");

  // Generate AI architecture summary
  const aiSummary = await generateCodebaseSummary({
    projectName,
    totalFiles,
    totalLinesOfCode,
    languages: languages.map((l) => `${l.name} (${l.percentage}%)`),
    frameworks: frameworks.map((f) => f.name),
    issuesCounts: {
      bugs: bugIssues.length,
      security: securityIssues.length,
      performance: perfIssues.length,
      quality: qualityIssues.length,
    },
    testingSummary: `${testFiles} test files, ${testFunctionsCount} tests`,
    documentationSummary: hasReadme ? "README present" : "No README found",
  });

  return {
    id: `analysis_${Date.now()}`,
    projectName,
    ingestMethod: method,
    timestamp: new Date().toISOString(),
    overview: {
      totalFiles,
      totalDirectories: totalDirs,
      sourceFiles,
      testFiles,
      configFiles,
      docFiles,
      buildFiles: buildFiles.length,
      deploymentFiles: deploymentFiles.length,
      entryPointsCount: entryPoints.length,
      totalLinesOfCode,
    },
    ignoredSummary: {
      totalIgnoredFiles: Object.values(ignoredStats).reduce((a, b) => a + b, 0),
      categories: Object.entries(ignoredStats).map(([name, count]) => ({ name, count })),
    },
    languages,
    frameworks,
    fileTree: rootTree,
    files: filesMap,
    dependencies,
    moduleDependencies,
    dependencyDetails,
    structure,
    quality: {
      largeFunctionsCount: qualityIssues.filter((i) => i.title.startsWith("Large Function")).length,
      largeFilesCount: qualityIssues.filter((i) => i.title.startsWith("Large File")).length,
      unusedImportsCount: unusedImports.length,
      highComplexityCount: qualityIssues.filter((i) => i.title.includes("Nesting") || i.title.includes("Complexity")).length,
      issues: qualityIssues,
    },
    bugs: {
      confirmedCount: bugIssues.filter((i) => i.type === "confirmed").length,
      potentialCount: bugIssues.filter((i) => i.type === "potential").length,
      issues: bugIssues,
    },
    security: {
      criticalCount: securityIssues.filter((i) => i.severity === "Critical").length,
      highCount: securityIssues.filter((i) => i.severity === "High").length,
      mediumCount: securityIssues.filter((i) => i.severity === "Medium").length,
      lowCount: securityIssues.filter((i) => i.severity === "Low").length,
      issues: securityIssues,
    },
    performance: {
      totalOpportunities: perfIssues.length,
      issues: perfIssues,
    },
    testing,
    documentation,
    aiSummary,
  };
}

/**
 * AI architectural interpretation layer using existing AI client.
 */
async function generateCodebaseSummary(data: {
  projectName: string;
  totalFiles: number;
  totalLinesOfCode: number;
  languages: string[];
  frameworks: string[];
  issuesCounts: { bugs: number; security: number; performance: number; quality: number };
  testingSummary: string;
  documentationSummary: string;
}) {
  const prompt = `You are a principal software architect. Analyze this codebase overview based strictly on empirical facts:
Project: ${data.projectName}
Total Files: ${data.totalFiles}
Total Lines of Code: ${data.totalLinesOfCode}
Languages: ${data.languages.join(", ") || "Unknown"}
Frameworks: ${data.frameworks.join(", ") || "None detected"}
Testing: ${data.testingSummary}
Documentation: ${data.documentationSummary}
Issues Detected:
- Potential Bugs: ${data.issuesCounts.bugs}
- Security Findings: ${data.issuesCounts.security}
- Performance Opportunities: ${data.issuesCounts.performance}
- Quality Warnings: ${data.issuesCounts.quality}

Provide a concise, grounded architectural evaluation in JSON format:
{
  "overview": "1-2 sentences summarizing stack and architecture based on verified facts",
  "architecture": "1-2 sentences on architectural pattern and modular layout",
  "strengths": ["string", "string"],
  "keyConcerns": ["string", "string"],
  "recommendations": ["string", "string"]
}`;

  try {
    const apiKey =
      process.env["LOVABLE_AI_GATEWAY_API_KEY"] ||
      process.env["OPENAI_API_KEY"] ||
      process.env["GEMINI_API_KEY"];

    if (apiKey) {
      const { generateText } = await import("ai");
      const { createLovableAiGatewayProvider, ANALYSIS_MODEL } = await import("./ai-gateway.server.ts");
      const gateway = createLovableAiGatewayProvider(apiKey);
      const { text } = await generateText({
        model: gateway(ANALYSIS_MODEL),
        system: "You are a principal software architect. Respond with strict JSON only.",
        prompt,
      });
      const cleaned = text.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
      return JSON.parse(cleaned);
    }
  } catch {
    // Deterministic fallback if AI is unavailable or offline
  }

  return {
    overview: `This project contains ${data.totalFiles} files with approximately ${data.totalLinesOfCode} lines of code across ${data.languages.join(", ") || "various languages"}.`,
    architecture: data.frameworks.length > 0
      ? `Built with ${data.frameworks.join(", ")}.`
      : "Standard modular repository layout.",
    strengths: [
      data.frameworks.length > 0 ? `Modern stack with ${data.frameworks[0]}` : "Modular organization",
      "Deterministic static analysis completed successfully",
    ],
    keyConcerns: [
      data.issuesCounts.security > 0 ? `${data.issuesCounts.security} potential security issue(s) detected` : "Clean security surface",
      data.issuesCounts.bugs > 0 ? `${data.issuesCounts.bugs} potential bug(s) identified` : "No obvious runtime logic bugs",
      data.issuesCounts.performance > 0 ? `${data.issuesCounts.performance} performance optimization opportunity(s)` : "Optimal algorithmic flow",
    ],
    recommendations: [
      data.issuesCounts.security > 0
        ? "Review flagged security patterns and ensure secrets are loaded via environment variables."
        : "Maintain existing secure coding practices.",
      "Expand unit tests to cover uncovered functions.",
      "Review high-complexity functions to improve maintainability.",
    ],
  };
}

/**
 * Ingests a local file path.
 */
export async function analyzeLocalPath(folderPath: string) {
  const resolved = path.resolve(folderPath);
  const stats = await fs.stat(resolved);
  if (!stats.isDirectory()) {
    throw new Error(`The provided path is not a directory: ${folderPath}`);
  }
  const projectName = path.basename(resolved);
  return await analyzeDirectory(resolved, projectName, "local_path");
}

/**
 * Safely extracts a ZIP archive preventing path traversal.
 */
export async function ingestZipAndAnalyze(base64Data: string, filename: string) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "codebase_zip_"));
  const zipPath = path.join(tempDir, "archive.zip");
  const extractDir = path.join(tempDir, "extracted");

  await fs.mkdir(extractDir, { recursive: true });

  try {
    const buffer = Buffer.from(base64Data, "base64");
    await fs.writeFile(zipPath, buffer);

    // Secure extraction using Python's zipfile module with path sanitization
    const pyExtractScript = `
import zipfile, os, sys

zip_path = sys.argv[1]
dest_dir = sys.argv[2]
max_total_size = ${MAX_EXTRACT_SIZE_BYTES}

total_size = 0
with zipfile.ZipFile(zip_path, 'r') as z:
    for member in z.infolist():
        # Prevent zip-slip
        target_path = os.path.abspath(os.path.join(dest_dir, member.filename))
        if not target_path.startswith(os.path.abspath(dest_dir)):
            sys.exit(2) # Path traversal attempt
        total_size += member.file_size
        if total_size > max_total_size:
            sys.exit(3) # Size limit exceeded
        z.extract(member, dest_dir)
sys.exit(0)
`;

    const { exitCode } = await runCommand("python", ["-c", pyExtractScript, zipPath, extractDir]);
    if (exitCode === 2) {
      throw new Error("This archive could not be safely processed: contains path traversal sequences.");
    }
    if (exitCode === 3) {
      throw new Error("Archive extraction exceeds maximum permitted size of 50MB.");
    }
    if (exitCode !== 0) {
      throw new Error("This archive could not be safely processed.");
    }

    const projectName = filename.replace(/\.zip$/i, "");
    return await analyzeDirectory(extractDir, projectName, "zip");
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

/**
 * Ingests a public GitHub repository and performs codebase analysis.
 */
export async function ingestGitHubAndAnalyze(repoUrl: string) {
  const match = repoUrl.match(/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
  if (!match) {
    throw new Error("Invalid GitHub URL. Format: https://github.com/owner/repository");
  }
  const owner = match[1];
  const repo = match[2].replace(/\.git$/, "");
  const projectName = `${owner}/${repo}`;

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "codebase_gh_"));

  try {
    const cloneUrl = `https://github.com/${owner}/${repo}.git`;
    try {
      // Shallow clone with depth 1
      await runCommand("git", ["clone", "--depth", "1", cloneUrl, tempDir], undefined, 15000);
      return await analyzeDirectory(tempDir, projectName, "github");
    } catch (cloneErr) {
      console.warn("Git clone failed, attempting zipball download:", cloneErr);
    }

    // Fallback: download zipball archive directly
    const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/HEAD`;
    const resp = await fetch(zipUrl, {
      headers: { "User-Agent": "PyLens-Codebase-Analyzer" },
    });
    if (!resp.ok) {
      throw new Error(`Unable to access this repository (HTTP ${resp.status}). Check the URL and repository visibility.`);
    }

    const arrayBuffer = await resp.arrayBuffer();
    return await ingestZipAndAnalyze(Buffer.from(arrayBuffer).toString("base64"), `${repo}.zip`);
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}
