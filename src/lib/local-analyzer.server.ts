import type { AnalyzeResponse, ApiBug, ApiImprovement } from "@/lib/api-analysis";

/**
 * Intelligent local Python code analyzer.
 * Used when running locally without an external AI Gateway API key,
 * or as a fast, resilient, and comprehensive offline diagnostic engine.
 */
export function analyzePythonLocally(code: string): AnalyzeResponse {
  const lines = code.split("\n");

  // 1. Line-by-line explanations
  const explanation: AnalyzeResponse["explanation"] = [];
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const lineNum = idx + 1;
    let text = "Executes Python statement.";

    if (/^def\s+([a-zA-Z_]\w*)\s*\((.*?)\):/.test(trimmed)) {
      const match = trimmed.match(/^def\s+([a-zA-Z_]\w*)\s*\((.*?)\):/);
      text = `Defines function '${match?.[1] || ""}' accepting arguments (${match?.[2] || ""}).`;
    } else if (/^class\s+([a-zA-Z_]\w*)/.test(trimmed)) {
      text = `Declares class '${trimmed.match(/^class\s+([a-zA-Z_]\w*)/)?.[1] || ""}'.`;
    } else if (/^for\s+(\w+)\s+in\s+(.*?):/.test(trimmed)) {
      const match = trimmed.match(/^for\s+(\w+)\s+in\s+(.*?):/);
      text = `Iterates over collection '${match?.[2]}', assigning each item to '${match?.[1]}'.`;
    } else if (/^while\s+(.*?):/.test(trimmed)) {
      text = `Repeats loop while condition '${trimmed.match(/^while\s+(.*?):/)?.[1]}' evaluates to True.`;
    } else if (/^if\s+(.*?):/.test(trimmed)) {
      text = `Branches execution if condition '${trimmed.match(/^if\s+(.*?):/)?.[1]}' is True.`;
    } else if (/^elif\s+(.*?):/.test(trimmed)) {
      text = `Checks alternate condition '${trimmed.match(/^elif\s+(.*?):/)?.[1]}'.`;
    } else if (/^else\s*:/.test(trimmed)) {
      text = "Fallback branch when preceding conditions evaluate to False.";
    } else if (/^try\s*:/.test(trimmed)) {
      text = "Begins exception-handling block to catch runtime errors.";
    } else if (/^except(\s+[\w\s,]+)?\s*:/.test(trimmed)) {
      text = `Catches and handles exception${trimmed.slice(6, -1) ? ` ${trimmed.slice(6, -1).trim()}` : ""}.`;
    } else if (/^with\s+(.*?):/.test(trimmed)) {
      text = `Enters context manager for automatic resource acquisition and cleanup: '${trimmed.match(/^with\s+(.*?):/)?.[1]}'.`;
    } else if (/^return\b/.test(trimmed)) {
      const retVal = trimmed.replace(/^return\s*/, "") || "None";
      text = `Returns '${retVal}' to caller and terminates function execution.`;
    } else if (/^yield\b/.test(trimmed)) {
      text = `Yields intermediate value to generator iterator.`;
    } else if (/^raise\b/.test(trimmed)) {
      text = `Raises runtime exception explicitly.`;
    } else if (/^print\s*\(/.test(trimmed)) {
      text = `Prints formatted output to standard output stream.`;
    } else if (/^[a-zA-Z_]\w*\s*(=|\+=|-=|\*=|\/=)\s*(.+)/.test(trimmed)) {
      text = `Evaluates expression and assigns value to variable.`;
    }

    explanation.push({
      line: lineNum,
      code: trimmed,
      explanation: text,
    });
  });

  // 2. Control flow chart (Mermaid)
  const chartNodes: string[] = ["Start([Start])"];
  let prevNode = "Start";
  let nodeCount = 0;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    nodeCount++;
    const nodeId = `N${nodeCount}`;

    const cleanLabel = trimmed
      .replace(/"/g, "'")
      .replace(/[[\]{}()]/g, "")
      .slice(0, 32);

    if (trimmed.startsWith("def ")) {
      chartNodes.push(`  ${prevNode} --> ${nodeId}["${cleanLabel}"]`);
      prevNode = nodeId;
    } else if (trimmed.startsWith("if ") || trimmed.startsWith("elif ")) {
      chartNodes.push(`  ${prevNode} --> ${nodeId}{"${cleanLabel}?"}`);
      prevNode = nodeId;
    } else if (trimmed.startsWith("for ") || trimmed.startsWith("while ")) {
      chartNodes.push(`  ${prevNode} --> ${nodeId}{{"Loop: ${cleanLabel}"}}`);
      prevNode = nodeId;
    } else if (trimmed.startsWith("return ")) {
      chartNodes.push(`  ${prevNode} --> ${nodeId}["${cleanLabel}"]`);
      chartNodes.push(`  ${nodeId} --> End([Return / End])`);
      prevNode = nodeId;
    } else if (idx === lines.length - 1 || trimmed.startsWith("print(")) {
      chartNodes.push(`  ${prevNode} --> ${nodeId}["${cleanLabel}"]`);
      prevNode = nodeId;
    }
  });

  if (chartNodes.length === 1) {
    chartNodes.push("  Start --> End([Finish])");
  } else if (!chartNodes.some((n) => n.includes("End([Return / End])"))) {
    chartNodes.push(`  ${prevNode} --> End([End])`);
  }

  const mermaid_chart = `flowchart TD\n${chartNodes.join("\n")}`;

  // 3. Commented source code
  const commented_code = lines
    .map((l) => {
      const trimmed = l.trim();
      if (!trimmed || trimmed.startsWith("#")) return l;
      if (trimmed.startsWith("def ")) return `${l}  # Define function entry point`;
      if (trimmed.startsWith("for ")) return `${l}  # Iterate items in collection`;
      if (trimmed.startsWith("while ")) return `${l}  # Loop while condition holds`;
      if (trimmed.startsWith("if ")) return `${l}  # Check conditional predicate`;
      if (trimmed.startsWith("return ")) return `${l}  # Return computed result`;
      return l;
    })
    .join("\n");

  // 4. Bugs detection
  const bugs: ApiBug[] = [];

  // Bug rule 1: ZeroDivisionError with len() in denominator without guard
  lines.forEach((l, idx) => {
    const trimmed = l.trim();
    if (
      (trimmed.includes("/ len(") || trimmed.includes("/len(")) &&
      !code.includes("if not ") &&
      !code.includes("if len(") &&
      !code.includes("== 0")
    ) {
      const indent = l.match(/^(\s*)/)?.[1] ?? "";
      const match = trimmed.match(/(\w+)\s*\/\s*len\((\w+)\)/);
      const collection = match ? match[2] : "values";
      bugs.push({
        title: "Potential ZeroDivisionError on empty collection",
        severity: "high",
        category: "runtime",
        line: idx + 1,
        cause: `Dividing by len(${collection}) when the collection is empty produces a ZeroDivisionError at runtime.`,
        fix: `Guard before division: if not ${collection}: return 0`,
        before: l,
        after: `${indent}if not ${collection}:\n${indent}    return 0\n${l}`,
      });
    }
  });

  // Bug rule 2: Out of bounds access (e.g. data[j + 1] with range(len(data)))
  lines.forEach((l, idx) => {
    const trimmed = l.trim();
    if (
      trimmed.includes("[j + 1]") &&
      code.includes("for j in range(len(") &&
      !code.includes("- 1")
    ) {
      const loopLineIdx = lines.findIndex((line) => line.includes("for j in range(len("));
      if (loopLineIdx !== -1) {
        const loopLine = lines[loopLineIdx];
        const loopIndent = loopLine.match(/^(\s*)/)?.[1] ?? "";
        const m = loopLine.match(/for j in range\(len\((\w+)\)\):/);
        const col = m ? m[1] : "data";
        bugs.push({
          title: "IndexError in loop boundary access",
          severity: "high",
          category: "runtime",
          line: loopLineIdx + 1,
          cause: `Accessing index [j + 1] on the final iteration will exceed '${col}' bounds and throw IndexError.`,
          fix: `Adjust range upper limit to len(${col}) - 1`,
          before: loopLine,
          after: `${loopIndent}for j in range(len(${col}) - 1):`,
        });
      }
    }
  });

  // Bug rule 3: Mutable default argument in function
  lines.forEach((l, idx) => {
    const trimmed = l.trim();
    const mutableMatch = trimmed.match(/^def\s+(\w+)\((.*?(\w+)\s*=\s*(\[\]|\{\}))(.*?)\):/);
    if (mutableMatch) {
      const fnName = mutableMatch[1];
      const paramName = mutableMatch[3];
      const isList = mutableMatch[4] === "[]";
      const indent = l.match(/^(\s*)/)?.[1] ?? "";
      const fixedSig = l.replace(`${paramName}=${mutableMatch[4]}`, `${paramName}=None`);
      const guard = `${indent}    if ${paramName} is None:\n${indent}        ${paramName} = ${isList ? "[]" : "{}"}`;
      bugs.push({
        title: "Mutable default argument creates shared state",
        severity: "medium",
        category: "logic",
        line: idx + 1,
        cause: `Default argument '${paramName}' is evaluated once at definition time and shared across all invocations of '${fnName}'.`,
        fix: `Use None as default and initialize inside function: ${paramName}=None`,
        before: l,
        after: `${fixedSig}\n${guard}`,
      });
    }
  });

  // Bug rule 4: 2D List shallow multiplication [[0] * cols] * rows
  lines.forEach((l, idx) => {
    const trimmed = l.trim();
    const shallow2dMatch = trimmed.match(
      /(\w+)\s*=\s*\[\s*\[\s*([^\]]+?)\s*\]\s*\*\s*(\w+|\d+)\s*\]\s*\*\s*(\w+|\d+)/,
    );
    if (shallow2dMatch) {
      const varName = shallow2dMatch[1];
      const val = shallow2dMatch[2];
      const cols = shallow2dMatch[3];
      const rows = shallow2dMatch[4];
      const indent = l.match(/^(\s*)/)?.[1] ?? "";
      bugs.push({
        title: "2D list shallow replication causes row aliasing",
        severity: "high",
        category: "logic",
        line: idx + 1,
        cause: `The pattern '[[val] * ${cols}] * ${rows}' creates identical references to the same row object. Modifying ${varName}[r][c] will unintentionally modify every row.`,
        fix: `Use independent list comprehensions: [[${val} for _ in range(${cols})] for _ in range(${rows})]`,
        before: l,
        after: `${indent}${varName} = [[${val} for _ in range(${cols})] for _ in range(${rows})]`,
      });
    }
  });

  // Bug rule 5: Mutating collection while iterating over it (e.g. for x in lst: lst.remove(x))
  lines.forEach((l, idx) => {
    const trimmed = l.trim();
    const forMatch = trimmed.match(/^for\s+(\w+)\s+in\s+(\w+):/);
    if (forMatch) {
      const itemVar = forMatch[1];
      const collVar = forMatch[2];
      // Check subsequent lines in loop body
      for (let j = idx + 1; j < Math.min(lines.length, idx + 15); j++) {
        const nextTrimmed = lines[j].trim();
        if (
          nextTrimmed.startsWith(`def `) ||
          (nextTrimmed.length > 0 && !lines[j].startsWith(" ") && !lines[j].startsWith("\t"))
        ) {
          break;
        }
        if (
          nextTrimmed.includes(`${collVar}.remove(`) ||
          nextTrimmed.includes(`${collVar}.pop(`) ||
          nextTrimmed.startsWith(`del ${collVar}[`)
        ) {
          const indent = l.match(/^(\s*)/)?.[1] ?? "";
          bugs.push({
            title: "Mutating collection during active iteration",
            severity: "high",
            category: "logic",
            line: idx + 1,
            cause: `Modifying '${collVar}' while iterating over it shifts index positions and causes elements to be skipped silently.`,
            fix: `Iterate over a shallow copy: for ${itemVar} in list(${collVar}):`,
            before: l,
            after: `${indent}for ${itemVar} in list(${collVar}):`,
          });
          break;
        }
      }
    }
  });

  // Bug rule 6: Recursion missing base case
  let inFunc = false;
  let currentFn = "";
  let fnDefLine = -1;
  let hasBaseCase = false;
  let hasRecursiveCall = false;
  let fnIndent = 0;

  lines.forEach((l, idx) => {
    const trimmed = l.trim();
    const defMatch = trimmed.match(/^def\s+([a-zA-Z_]\w*)\s*\((.*?)\):/);
    if (defMatch) {
      if (inFunc && hasRecursiveCall && !hasBaseCase) {
        bugs.push({
          title: `Infinite recursion in '${currentFn}' (missing base case)`,
          severity: "high",
          category: "runtime",
          line: fnDefLine + 1,
          cause: `Function '${currentFn}' calls itself recursively without an early termination check ('if ...: return'), triggering RecursionError.`,
          fix: `Add a base case check at the start of '${currentFn}'.`,
          before: lines[fnDefLine],
          after: `${lines[fnDefLine]}\n    # Base case guard\n    if not args:\n        return`,
        });
      }
      inFunc = true;
      currentFn = defMatch[1];
      fnDefLine = idx;
      hasBaseCase = false;
      hasRecursiveCall = false;
      fnIndent = l.match(/^(\s*)/)?.[1].length ?? 0;
      return;
    }

    if (inFunc) {
      const currentIndent = l.match(/^(\s*)/)?.[1].length ?? 0;
      if (trimmed.length > 0 && currentIndent <= fnIndent && !trimmed.startsWith("#")) {
        // Exited function scope
        if (hasRecursiveCall && !hasBaseCase) {
          bugs.push({
            title: `Infinite recursion in '${currentFn}' (missing base case)`,
            severity: "high",
            category: "runtime",
            line: fnDefLine + 1,
            cause: `Function '${currentFn}' calls itself recursively without an early termination check ('if ...: return'), triggering RecursionError.`,
            fix: `Add a base case guard at the start of '${currentFn}'.`,
            before: lines[fnDefLine],
            after: `${lines[fnDefLine]}\n    # Base case guard\n    if not args:\n        return`,
          });
        }
        inFunc = false;
      } else {
        if (
          trimmed.startsWith("if ") &&
          (trimmed.includes("return") || trimmed.includes("==") || trimmed.includes("<="))
        ) {
          hasBaseCase = true;
        }
        if (new RegExp(`\\b${currentFn}\\s*\\(`).test(trimmed)) {
          hasRecursiveCall = true;
        }
      }
    }
  });
  if (inFunc && hasRecursiveCall && !hasBaseCase) {
    bugs.push({
      title: `Infinite recursion in '${currentFn}' (missing base case)`,
      severity: "high",
      category: "runtime",
      line: fnDefLine + 1,
      cause: `Function '${currentFn}' calls itself recursively without an early termination check, triggering RecursionError.`,
      fix: `Add a base case guard at the start of '${currentFn}'.`,
      before: lines[fnDefLine],
      after: `${lines[fnDefLine]}\n    if not args:\n        return`,
    });
  }

  // Bug rule 6b: Incomplete base case in two-step recursion (e.g. fn(n-1) + fn(n-2) with only if n == 0:)
  lines.forEach((l, idx) => {
    const trimmed = l.trim();
    const match = trimmed.match(/^if\s+([a-zA-Z_]\w*)\s*==\s*0:/);
    if (match) {
      const varName = match[1];
      if (
        code.includes(`${varName} - 2`) &&
        !code.includes(`${varName} <= 1`) &&
        !code.includes(`${varName} < 2`) &&
        !code.includes(`${varName} == 1`)
      ) {
        const indent = l.match(/^(\s*)/)?.[1] ?? "";
        bugs.push({
          title: "Incomplete recursion base case bypasses odd/negative inputs",
          severity: "high",
          category: "logic",
          line: idx + 1,
          cause: `The recursion steps by 2 (${varName} - 2). When called with ${varName}=1 or negative integers, '${varName} == 0' is bypassed, triggering infinite recursion and stack overflow.`,
          fix: `Update base case guard to check: if ${varName} <= 1:`,
          before: l,
          after: `${indent}if ${varName} <= 1:`,
        });
      }
    }
  });

  // Bug rule 7: Bare 'except:' clause
  lines.forEach((l, idx) => {
    const trimmed = l.trim();
    if (trimmed === "except:" || trimmed.startsWith("except :")) {
      const indent = l.match(/^(\s*)/)?.[1] ?? "";
      bugs.push({
        title: "Bare 'except:' masks system interrupts",
        severity: "medium",
        category: "runtime",
        line: idx + 1,
        cause:
          "A bare 'except:' catches KeyboardInterrupt, SystemExit, and memory errors, preventing clean program shutdown and masking syntax bugs.",
        fix: "Catch 'Exception' explicitly: except Exception:",
        before: l,
        after: `${indent}except Exception:`,
      });
    }
  });

  // Bug rule 8: Unclosed file handle without 'with' statement
  lines.forEach((l, idx) => {
    const trimmed = l.trim();
    const openMatch = trimmed.match(/^(\w+)\s*=\s*open\((.*?)\)/);
    if (openMatch && !code.includes(`with open(`)) {
      const fileVar = openMatch[1];
      const openArgs = openMatch[2];
      const indent = l.match(/^(\s*)/)?.[1] ?? "";
      bugs.push({
        title: "Unmanaged file descriptor resource leak",
        severity: "medium",
        category: "resource",
        line: idx + 1,
        cause: `Opening file with '${fileVar} = open(...)' without a context manager risks leaking file descriptors if an exception occurs before '${fileVar}.close()'.`,
        fix: `Use context manager: with open(${openArgs}) as ${fileVar}:`,
        before: l,
        after: `${indent}with open(${openArgs}) as ${fileVar}:`,
      });
    }
  });

  // Bug rule 9: Shadowing Python built-in names
  const builtins = [
    "sum",
    "list",
    "dict",
    "set",
    "id",
    "type",
    "min",
    "max",
    "filter",
    "map",
    "str",
    "int",
  ];
  lines.forEach((l, idx) => {
    const trimmed = l.trim();
    for (const b of builtins) {
      const regex = new RegExp(`^${b}\\s*=\\s*`);
      if (regex.test(trimmed)) {
        const indent = l.match(/^(\s*)/)?.[1] ?? "";
        const replacement = `${b}_val`;
        bugs.push({
          title: `Variable shadows built-in identifier '${b}'`,
          severity: "medium",
          category: "logic",
          line: idx + 1,
          cause: `Assigning to '${b}' overwrites Python's built-in function, causing subsequent calls to '${b}()' to fail with TypeError.`,
          fix: `Rename variable to '${replacement}'`,
          before: l,
          after: `${indent}${trimmed.replace(new RegExp(`^${b}\\b`), replacement)}`,
        });
      }
    }
  });

  // Bug rule 10: Float equality check == or !=
  lines.forEach((l, idx) => {
    const trimmed = l.trim();
    if (
      (trimmed.startsWith("if ") || trimmed.startsWith("elif ") || trimmed.startsWith("while ")) &&
      /(?:==|!=)\s*\d+\.\d+/.test(trimmed)
    ) {
      const indent = l.match(/^(\s*)/)?.[1] ?? "";
      bugs.push({
        title: "Direct floating-point equality comparison",
        severity: "medium",
        category: "logic",
        line: idx + 1,
        cause:
          "Binary floating-point arithmetic introduces representation rounding errors (e.g. 0.1 + 0.2 != 0.3). Direct == equality is prone to unpredictable failures.",
        fix: "Use math.isclose(a, b, rel_tol=1e-9)",
        before: l,
        after: `${indent}# Consider math.isclose() for float equality\n${l}`,
      });
    }
  });

  // Bug rule 11: Boolean comparison with == True or == False
  lines.forEach((l, idx) => {
    const trimmed = l.trim();
    if (trimmed.includes("== True") || trimmed.includes("== False")) {
      const indent = l.match(/^(\s*)/)?.[1] ?? "";
      const fixed = trimmed
        .replace(/(\w+)\s*==\s*True/g, "$1")
        .replace(/(\w+)\s*==\s*False/g, "not $1");
      bugs.push({
        title: "Redundant boolean comparison with == True / == False",
        severity: "low",
        category: "syntax",
        line: idx + 1,
        cause:
          "Testing equality directly against True/False is unidiomatic and slower than testing truth value directly.",
        fix: "Use 'if var:' or 'if not var:'",
        before: l,
        after: `${indent}${fixed}`,
      });
    }
  });

  // Bug rule 12: 'is' operator used with literal value (x is 100 or x is "str")
  lines.forEach((l, idx) => {
    const trimmed = l.trim();
    const isLitMatch = trimmed.match(/\b(\w+)\s+is\s+(-?\d+|"[^"]*"|'[^']*')\b/);
    if (isLitMatch) {
      const indent = l.match(/^(\s*)/)?.[1] ?? "";
      const fixed = trimmed.replace(
        new RegExp(`\\b${isLitMatch[1]}\\s+is\\s+(${isLitMatch[2]})\\b`),
        `${isLitMatch[1]} == $1`,
      );
      bugs.push({
        title: "Identity operator 'is' used with literal value",
        severity: "medium",
        category: "runtime",
        line: idx + 1,
        cause:
          "'is' checks memory reference identity rather than value equality. Python only caches small integers and short strings, causing non-deterministic failures.",
        fix: "Replace 'is' with value equality '=='",
        before: l,
        after: `${indent}${fixed}`,
      });
    }
  });

  // Bug rule 13: Unreachable code after return / raise
  lines.forEach((l, idx) => {
    const trimmed = l.trim();
    if (
      (trimmed.startsWith("return ") || trimmed === "return" || trimmed.startsWith("raise ")) &&
      idx < lines.length - 1
    ) {
      const nextLine = lines[idx + 1];
      const nextTrimmed = nextLine.trim();
      const currentIndent = l.match(/^(\s*)/)?.[1].length ?? 0;
      const nextIndent = nextLine.match(/^(\s*)/)?.[1].length ?? 0;
      if (
        nextTrimmed.length > 0 &&
        !nextTrimmed.startsWith("#") &&
        nextIndent === currentIndent &&
        !nextTrimmed.startsWith("def ") &&
        !nextTrimmed.startsWith("class ")
      ) {
        bugs.push({
          title: "Unreachable statement detected after return/raise",
          severity: "low",
          category: "logic",
          line: idx + 2,
          cause: `The statement '${nextTrimmed}' immediately follows an unconditional return or raise in the same block and will never execute.`,
          fix: "Remove or reorganize unreachable statement.",
          before: nextLine,
          after: `    # ${nextTrimmed} (unreachable)`,
        });
      }
    }
  });

  // Bug rule 14: Infinite while True loop without break or return
  lines.forEach((l, idx) => {
    const trimmed = l.trim();
    if (trimmed === "while True:" || trimmed.startsWith("while True :")) {
      let hasExit = false;
      const whileIndent = l.match(/^(\s*)/)?.[1].length ?? 0;
      for (let j = idx + 1; j < lines.length; j++) {
        const bodyLine = lines[j];
        const bodyTrimmed = bodyLine.trim();
        const bodyIndent = bodyLine.match(/^(\s*)/)?.[1].length ?? 0;
        if (bodyTrimmed.length > 0 && bodyIndent <= whileIndent) break;
        if (
          bodyTrimmed.startsWith("break") ||
          bodyTrimmed.startsWith("return") ||
          bodyTrimmed.startsWith("raise")
        ) {
          hasExit = true;
          break;
        }
      }
      if (!hasExit) {
        bugs.push({
          title: "Infinite loop without break, return, or exit condition",
          severity: "high",
          category: "runtime",
          line: idx + 1,
          cause:
            "Loop 'while True:' contains no break, return, or exception raise, freezing application execution.",
          fix: "Add termination condition or break inside while loop.",
          before: l,
          after: `${l}\n        # Add exit condition\n        break`,
        });
      }
    }
  });

  // 5. Improvements
  const improvements: ApiImprovement[] = [];

  // Suggestion rule 1: Loop accumulation -> sum()
  const accumMatch = code.match(
    /((?:total|count|s)\s*=\s*0\s*\n\s*for\s+(\w+)\s+in\s+(\w+):\s*\n\s*(?:total|count|s)\s*\+=\s*\2)/,
  );
  if (accumMatch) {
    const varName = accumMatch[0].split("=")[0].trim();
    const iterVar = accumMatch[2];
    const collVar = accumMatch[3];
    improvements.push({
      title: "Use built-in sum() instead of manual accumulator loop",
      rationale:
        "Python's built-in sum() is implemented in C and runs up to 3x faster than manual for-loop accumulation while making intent unmistakable.",
      before: accumMatch[0],
      after: `${varName} = sum(${collVar})`,
    });
  }

  // Suggestion rule 2: Manual append loop -> list comprehension
  const compMatch = code.match(
    /(\w+)\s*=\s*\[\]\s*\n\s*for\s+(\w+)\s+in\s+(\w+):\s*\n\s*\1\.append\((.*?)\)/,
  );
  if (compMatch) {
    improvements.push({
      title: "Replace append loop with list comprehension",
      rationale:
        "List comprehensions are idiomatic, evaluate faster in bytecode by avoiding repeated .append() method attribute lookups, and improve readability.",
      before: compMatch[0],
      after: `${compMatch[1]} = [${compMatch[4]} for ${compMatch[2]} in ${compMatch[3]}]`,
    });
  }

  // Suggestion rule 3: Temporary variable swap -> tuple unpacking
  const swapMatch = code.match(
    /(temp\s*=\s*([a-zA-Z_]\w*(?:\[.*?\])?)\s*\n\s*\2\s*=\s*([a-zA-Z_]\w*(?:\[.*?\])?)\s*\n\s*\3\s*=\s*temp)/,
  );
  if (swapMatch) {
    const first = swapMatch[2];
    const second = swapMatch[3];
    improvements.push({
      title: "Use tuple unpacking for swap instead of temporary variable",
      rationale:
        "Python supports atomic tuple swapping `a, b = b, a` natively in bytecode without requiring a separate temporary variable.",
      before: swapMatch[0],
      after: `${first}, ${second} = ${second}, ${first}`,
    });
  }

  // Suggestion rule 4: Inefficient string concatenation in loop
  const strConcatMatch = code.match(
    /(\w+)\s*=\s*(?:""|'')\s*\n\s*for\s+(\w+)\s+in\s+(\w+):\s*\n\s*\1\s*\+=\s*(.+)/,
  );
  if (strConcatMatch) {
    const strVar = strConcatMatch[1];
    const itemVar = strConcatMatch[2];
    const iterVar = strConcatMatch[3];
    const expr = strConcatMatch[4];
    improvements.push({
      title: "Use str.join() instead of iterative += string concatenation",
      rationale:
        "Strings in Python are immutable. Repeated string concatenation (+ or +=) within a loop creates a new copy of the string on every iteration, leading to O(N²) time complexity. Using ''.join(...) is linear O(N).",
      before: strConcatMatch[0],
      after: `${strVar} = "".join(${expr} for ${itemVar} in ${iterVar})`,
    });
  }

  // Suggestion rule 5: range(len(data)) with indexing -> enumerate(data)
  lines.forEach((l) => {
    const trimmed = l.trim();
    const enumMatch = trimmed.match(/^for\s+(\w+)\s+in\s+range\(len\((\w+)\)\):/);
    if (enumMatch) {
      const idxVar = enumMatch[1];
      const listVar = enumMatch[2];
      if (code.includes(`${listVar}[${idxVar}]`)) {
        improvements.push({
          title: `Use enumerate(${listVar}) instead of range(len(${listVar}))`,
          rationale:
            "Using 'enumerate()' yields both the index and value directly, avoiding repeated subscript indexing operations and improving readability.",
          before: trimmed,
          after: `for ${idxVar}, item in enumerate(${listVar}):`,
        });
      }
    }
  });

  // Detect double recursion (e.g. fib(n-1) + fib(n-2) or binary tree traversal)
  let isDoubleRecursion = false;
  lines.forEach((l) => {
    const trimmed = l.trim();
    const matches = trimmed.match(/([a-zA-Z_]\w*)\s*\([^)]*\).*?\1\s*\(/);
    if (matches && code.includes(`def ${matches[1]}`)) {
      isDoubleRecursion = true;
    }
  });

  // Suggestion rule 6: Type annotations on function signature
  if (!code.includes("->") && code.includes("def ")) {
    const defLine = lines.find((l) => l.trim().startsWith("def "))?.trim();
    if (defLine && !defLine.includes("def __")) {
      improvements.push({
        title: "Add Python type annotations to function signature",
        rationale:
          "Type annotations improve static safety, unlock IDE autocompletion, and make code contracts self-documenting for team collaboration.",
        before: defLine,
        after: defLine.replace("):", ") -> None:"),
      });
    }
  }

  // Suggestion rule 7: Memoization for exponential recursion
  if (isDoubleRecursion && !code.includes("lru_cache") && !code.includes("@cache")) {
    const defLine = lines.find((l) => l.trim().startsWith("def "))?.trim();
    if (defLine) {
      improvements.push({
        title: "Optimize recursion with functools.lru_cache memoization",
        rationale:
          "Overlapping subproblems cause exponential O(2^N) calls. Adding '@lru_cache(maxsize=None)' caches intermediate results and achieves linear O(N) runtime.",
        before: defLine,
        after: `@lru_cache(maxsize=None)\n${defLine}`,
      });
    }
  }

  // 6. Complexity calculation & Algorithm breakdown
  let maxLoopDepth = 0;
  let currentDepth = 0;
  lines.forEach((l) => {
    const trimmed = l.trim();
    if (trimmed.startsWith("for ") || trimmed.startsWith("while ")) {
      currentDepth++;
      if (currentDepth > maxLoopDepth) maxLoopDepth = currentDepth;
    } else if (trimmed.startsWith("def ") || (!trimmed.startsWith(" ") && trimmed.length > 0)) {
      currentDepth = 0;
    }
  });

  // Detect binary divide-and-conquer (// 2 or >> 1 inside while)
  const isLogarithmic =
    code.includes("// 2") ||
    code.includes(">> 1") ||
    (code.includes("mid =") && (code.includes("low =") || code.includes("left =")));

  // Detect sorting operations
  const hasSorting = code.includes(".sort(") || code.includes("sorted(");

  let timeComplexity = "O(1)";
  let verdict = "Constant time operations with minimal algorithmic overhead.";

  if (isDoubleRecursion) {
    timeComplexity = "O(2^N)";
    verdict = "Exponential time complexity due to multiple branching recursive calls per state.";
  } else if (maxLoopDepth >= 3) {
    timeComplexity = "O(N³)";
    verdict = "Cubic time complexity due to 3 levels of nested loops.";
  } else if (maxLoopDepth === 2) {
    timeComplexity = "O(N²)";
    verdict = "Quadratic time complexity due to nested loop iterations over data elements.";
  } else if (maxLoopDepth === 1 && hasSorting) {
    timeComplexity = "O(N log N)";
    verdict = "Linearithmic time complexity driven by sorting and linear scan operations.";
  } else if (hasSorting) {
    timeComplexity = "O(N log N)";
    verdict = "Linearithmic time complexity governed by Timsort comparison overhead.";
  } else if (isLogarithmic && maxLoopDepth >= 1) {
    timeComplexity = "O(log N)";
    verdict = "Logarithmic time complexity through binary search interval halving.";
  } else if (maxLoopDepth === 1 || hasRecursiveCall) {
    timeComplexity = "O(N)";
    verdict = "Linear time complexity proportional to the size of the input collection.";
  }

  const spaceComplexity = isDoubleRecursion
    ? "O(N)"
    : code.includes("list(") || code.includes("[]") || code.includes("{}") || code.includes("set(")
      ? "O(N)"
      : "O(1)";

  return {
    explanation,
    mermaid_chart,
    commented_code,
    bugs,
    improvements,
    complexity: {
      time: timeComplexity,
      space: spaceComplexity,
      verdict,
      breakdown: [
        {
          name: "Main Algorithm",
          time: timeComplexity,
          space: spaceComplexity,
          justification: isDoubleRecursion
            ? "Recursive tree branches twice per step without memoization."
            : `Analyzed ${maxLoopDepth} loop nesting level(s) and algorithmic data structures.`,
        },
      ],
    },
  };
}
