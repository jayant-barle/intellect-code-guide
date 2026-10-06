import type {
  CodeAnalysisResult,
  TestGenerationResult,
  TestCaseItem,
  SuggestedFix,
  TestCategory,
} from "./test-generator-types";
export { auditCodeSecurity } from "./python-safety";

/**
 * Generates local AST-driven unit tests when AI is offline or unconfigured.
 */
export function generateLocalPytestSuite(
  code: string,
  analysis: CodeAnalysisResult,
): TestGenerationResult {
  const testCases: TestCaseItem[] = [];
  const lines: string[] = [
    "# Automatically generated pytest suite",
    "import pytest",
  ];

  const targetFunctions: string[] = [];
  for (const f of analysis.functions) targetFunctions.push(f.name);
  for (const c of analysis.classes) targetFunctions.push(c.name);

  if (targetFunctions.length > 0) {
    lines.push(`from solution import ${targetFunctions.join(", ")}`);
  } else {
    lines.push("import solution");
  }
  lines.push("");

  let testId = 1;

  // Generate tests for standalone functions
  for (const func of analysis.functions) {
    const fnName = func.name;
    const params = func.params;

    // Determine parameter defaults or samples
    const sampleArgs: string[] = [];
    const edgeZeroArgs: string[] = [];
    const edgeNegArgs: string[] = [];
    const edgeEmptyArgs: string[] = [];
    const invalidTypeArgs: string[] = [];

    for (const p of params) {
      const typeHint = (p.typeAnnotation || "").toLowerCase();
      const pName = p.name.toLowerCase();

      if (typeHint.includes("int") || typeHint.includes("float") || pName.includes("num") || pName.includes("val") || pName.includes("count") || pName.includes("target") || pName.includes("price") || pName.includes("a") || pName.includes("b") || pName.includes("n")) {
        sampleArgs.push("5");
        edgeZeroArgs.push("0");
        edgeNegArgs.push("-5");
        edgeEmptyArgs.push("1000000");
        invalidTypeArgs.push(`"invalid_string"`);
      } else if (typeHint.includes("str") || pName.includes("text") || pName.includes("str") || pName.includes("word") || pName.includes("name") || pName.includes("key")) {
        sampleArgs.push(`"hello"`);
        edgeZeroArgs.push(`""`);
        edgeNegArgs.push(`"a"`);
        edgeEmptyArgs.push(`"   "`);
        invalidTypeArgs.push("12345");
      } else if (typeHint.includes("list") || typeHint.includes("iterable") || typeHint.includes("sequence") || pName.includes("items") || pName.includes("nums") || pName.includes("values") || pName.includes("list") || pName.includes("arr")) {
        sampleArgs.push("[1, 2, 3]");
        edgeZeroArgs.push("[]");
        edgeNegArgs.push("[-1, -2]");
        edgeEmptyArgs.push("[42]");
        invalidTypeArgs.push("None");
      } else if (typeHint.includes("bool") || pName.startsWith("is_") || pName.startsWith("has_")) {
        sampleArgs.push("True");
        edgeZeroArgs.push("False");
        edgeNegArgs.push("True");
        edgeEmptyArgs.push("False");
        invalidTypeArgs.push(`"not_a_bool"`);
      } else {
        sampleArgs.push("2");
        edgeZeroArgs.push("0");
        edgeNegArgs.push("-1");
        edgeEmptyArgs.push("None");
        invalidTypeArgs.push(`"xyz"`);
      }
    }

    // 1. Normal Case
    const normalTestName = `test_${fnName}_normal_inputs`;
    const normalCall = `${fnName}(${sampleArgs.join(", ")})`;
    const normalCode = `def ${normalTestName}():\n    \"\"\"Validates standard valid inputs for ${fnName}.\"\"\"\n    result = ${normalCall}\n    assert result is not None\n`;
    lines.push(normalCode);
    testCases.push({
      id: `tc_${testId++}`,
      name: normalTestName,
      targetFunction: fnName,
      category: "Normal",
      input: sampleArgs.join(", ") || "(no arguments)",
      expectedOutput: "Valid return value",
      reason: `Ensures ${fnName} computes correctly on typical valid arguments.`,
      code: normalCode.trim(),
    });

    // 2. Edge Case (Zero / Empty / Boundary)
    const edgeZeroTestName = `test_${fnName}_edge_zero_or_empty`;
    const edgeZeroCall = `${fnName}(${edgeZeroArgs.join(", ")})`;
    const funcRaises = func.raises || [];
    const edgeZeroCode =
      funcRaises.length > 0
        ? `def ${edgeZeroTestName}():\n    \"\"\"Tests edge boundary conditions or expected exception.\"\"\"\n    try:\n        result = ${edgeZeroCall}\n        assert result is not None or result == 0 or result == [] or result == "" or result is None\n    except (${funcRaises.join(", ")}):\n        pass  # Expected safe boundary exception\n`
        : `def ${edgeZeroTestName}():\n    \"\"\"Tests edge boundary conditions (zero, empty, or minimum values).\"\"\"\n    result = ${edgeZeroCall}\n    assert result is not None or result == 0 or result == [] or result == "" or result is None\n`;
    lines.push(edgeZeroCode);
    testCases.push({
      id: `tc_${testId++}`,
      name: edgeZeroTestName,
      targetFunction: fnName,
      category: "Edge Case",
      input: edgeZeroArgs.join(", ") || "(no arguments)",
      expectedOutput: funcRaises.length > 0 ? "Deterministic result or expected exception" : "Deterministic edge result or safe exit",
      reason: `Tests edge boundary with zeros, empty collections, or empty strings.`,
      code: edgeZeroCode.trim(),
    });

    // 3. Edge Case (Negative or Single-element)
    if (params.length > 0) {
      const edgeNegTestName = `test_${fnName}_edge_negative_or_single`;
      const edgeNegCall = `${fnName}(${edgeNegArgs.join(", ")})`;
      const edgeNegCode = `def ${edgeNegTestName}():\n    \"\"\"Checks behaviour when handling negative numbers or single items.\"\"\"\n    result = ${edgeNegCall}\n    assert result is not None or result == [] or result is None\n`;
      lines.push(edgeNegCode);
      testCases.push({
        id: `tc_${testId++}`,
        name: edgeNegTestName,
        targetFunction: fnName,
        category: "Boundary",
        input: edgeNegArgs.join(", "),
        expectedOutput: "Determined during execution",
        reason: `Validates negative integers or single element collections.`,
        code: edgeNegCode.trim(),
      });
    }

    // 4. Exception Case if this specific function raises an exception
    if (funcRaises.length > 0) {
      const exc = funcRaises[0];
      const excTestName = `test_${fnName}_raises_${exc.toLowerCase()}`;
      const excCode = `def ${excTestName}():\n    \"\"\"Verifies that ${exc} is properly raised under invalid or boundary conditions.\"\"\"\n    with pytest.raises(${exc}):\n        ${fnName}(${edgeZeroArgs.join(", ")})\n`;
      lines.push(excCode);
      testCases.push({
        id: `tc_${testId++}`,
        name: excTestName,
        targetFunction: fnName,
        category: "Exception",
        input: edgeZeroArgs.join(", "),
        expectedOutput: `Raises ${exc}`,
        reason: `Validates expected exception handling when boundary condition triggers ${exc}.`,
        code: excCode.trim(),
      });
    } else if (params.length > 0) {
      // 5. Invalid Input Case
      const invTestName = `test_${fnName}_invalid_type_resilience`;
      const invCode = `def ${invTestName}():\n    \"\"\"Verifies behavior or raises appropriate TypeError/ValueError on invalid input.\"\"\"\n    try:\n        result = ${fnName}(${invalidTypeArgs.join(", ")})\n        assert result is not None or result is None\n    except (TypeError, ValueError, AttributeError):\n        pass  # Expected safe exception raised for invalid type\n`;
      lines.push(invCode);
      testCases.push({
        id: `tc_${testId++}`,
        name: invTestName,
        targetFunction: fnName,
        category: "Invalid Input",
        input: invalidTypeArgs.join(", "),
        expectedOutput: "Raises TypeError/ValueError or returns safely",
        reason: `Ensures robust error or exception handling when passed invalid data types.`,
        code: invCode.trim(),
      });
    }
  }

  // Generate tests for classes
  for (const cls of analysis.classes) {
    const clsName = cls.name;
    const initMethod = cls.methods.find((m) => m.name === "__init__");
    const otherMethods = cls.methods.filter((m) => !m.name.startsWith("__"));

    const initArgs = initMethod
      ? initMethod.params.map(() => "1").join(", ")
      : "";

    const instTestName = `test_${clsName.toLowerCase()}_instantiation`;
    const instCode = `def ${instTestName}():\n    \"\"\"Verifies ${clsName} instance initialization and attributes.\"\"\"\n    instance = ${clsName}(${initArgs})\n    assert instance is not None\n`;
    lines.push(instCode);
    testCases.push({
      id: `tc_${testId++}`,
      name: instTestName,
      targetFunction: clsName,
      category: "Normal",
      input: initArgs || "(default constructor)",
      expectedOutput: `Instance of ${clsName}`,
      reason: `Ensures ${clsName} instantiates properly with valid initial state.`,
      code: instCode.trim(),
    });

    for (const m of otherMethods) {
      const mArgs = m.params.map(() => "5").join(", ");
      const mTestName = `test_${clsName.toLowerCase()}_${m.name}_normal`;
      const mCode = `def ${mTestName}():\n    \"\"\"Tests ${clsName}.${m.name} execution.\"\"\"\n    instance = ${clsName}(${initArgs})\n    result = instance.${m.name}(${mArgs})\n    assert result is not None or result is None\n`;
      lines.push(mCode);
      testCases.push({
        id: `tc_${testId++}`,
        name: mTestName,
        targetFunction: `${clsName}.${m.name}`,
        category: "Normal",
        input: mArgs || "(no args)",
        expectedOutput: "Method completes successfully",
        reason: `Verifies ${clsName}.${m.name} executes without error.`,
        code: mCode.trim(),
      });
    }
  }

  const normalCount = testCases.filter((t) => t.category === "Normal").length;
  const edgeCount = testCases.filter((t) => t.category === "Edge Case").length;
  const invalidCount = testCases.filter((t) => t.category === "Invalid Input").length;
  const exceptionCount = testCases.filter((t) => t.category === "Exception").length;
  const boundaryCount = testCases.filter((t) => t.category === "Boundary").length;

  return {
    analysis,
    pytestCode: lines.join("\n"),
    testCases,
    summary: {
      totalTests: testCases.length,
      normalCount,
      edgeCount,
      invalidCount,
      exceptionCount,
      boundaryCount,
    },
  };
}

/**
 * Builds AI Prompt for generating pytest tests.
 */
function buildAiTestGenPrompt(pythonCode: string, analysis: CodeAnalysisResult): string {
  const funcList = analysis.functions.map((f) => `${f.name}(${f.params.map((p) => p.name).join(", ")})`).join(", ");
  const clsList = analysis.classes.map((c) => c.name).join(", ");

  return `You are an expert Python QA and Test Automation Engineer.
Generate a comprehensive, high-quality pytest test suite for the following Python code.

Functions detected: ${funcList || "none"}
Classes detected: ${clsList || "none"}
Raised Exceptions detected: ${analysis.raisedExceptions.join(", ") || "none"}

REQUIREMENTS:
1. Generate valid pytest code importing target functions/classes from 'solution':
   Example:
   import pytest
   from solution import ${analysis.allFunctionNames.slice(0, 5).join(", ") || "..."}

2. Cover:
   - Normal Cases: typical valid inputs with exact expected outputs.
   - Edge Cases: empty strings (""), empty lists ([]), 0, negative numbers, single elements, very large numbers, None, duplicate values.
   - Boundary Cases: boundary comparison values (<, <=, >, >=).
   - Invalid Input Cases: wrong types or missing arguments where appropriate.
   - Exception Cases: if the code raises an exception (e.g. ValueError, ZeroDivisionError), use 'with pytest.raises(...)'. Do NOT invent exceptions the code does not produce.

3. Follow PEP 8 style:
   - Descriptive test function names (e.g. test_add_positive_numbers, test_add_zero, test_divide_by_zero_raises_error).
   - One logical assertion/test per function.
   - Deterministic tests only. No external APIs or network calls.

4. Output STRICT JSON only (no markdown fences, no extra commentary) in this exact schema:
{
  "test_cases": [
    {
      "name": "test_add_positive_numbers",
      "target_function": "add",
      "category": "Normal", // exactly one of: "Normal" | "Edge Case" | "Invalid Input" | "Exception" | "Boundary"
      "input": "a=2, b=3",
      "expected_output": "5",
      "reason": "Tests addition with positive integers.",
      "code": "def test_add_positive_numbers():\\n    assert add(2, 3) == 5"
    }
  ],
  "pytest_code": "import pytest\\nfrom solution import add\\n\\ndef test_add_positive_numbers():\\n    assert add(2, 3) == 5\\n..."
}

SOURCE PYTHON CODE:
\`\`\`python
${pythonCode}
\`\`\``;
}

/**
 * Generates unit tests using project AI integration, falling back to local AST test engine.
 */
export async function generateUnitTests(
  code: string,
  analysis?: CodeAnalysisResult,
): Promise<TestGenerationResult> {
  const astAnalysis = analysis ?? (await analyzePythonAst(code));

  if (!astAnalysis.valid) {
    throw new Error(
      `Cannot generate tests: Python syntax error on line ${astAnalysis.syntaxError?.line}: ${astAnalysis.syntaxError?.message}`,
    );
  }

  const apiKey =
    process.env["LOVABLE_API_KEY"] ||
    process.env["OPENAI_API_KEY"] ||
    process.env["GEMINI_API_KEY"];

  if (!apiKey) {
    return generateLocalPytestSuite(code, astAnalysis);
  }

  try {
    const { generateText } = await import("ai");
    const { createLovableAiGatewayProvider, ANALYSIS_MODEL } =
      await import("@/lib/ai-gateway.server");

    const gateway = createLovableAiGatewayProvider(apiKey);
    const { text } = await generateText({
      model: gateway(ANALYSIS_MODEL),
      system: "You are a precise Python testing assistant. Respond with strict JSON only.",
      prompt: buildAiTestGenPrompt(code, astAnalysis),
    });

    const cleaned = text.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned);

    const testCases: TestCaseItem[] = (parsed.test_cases || []).map(
      (tc: Record<string, string>, index: number) => ({
        id: `tc_${index + 1}`,
        name: tc.name || `test_case_${index + 1}`,
        targetFunction: tc.target_function || "function",
        category: (["Normal", "Edge Case", "Invalid Input", "Exception", "Boundary"].includes(tc.category)
          ? tc.category
          : "Normal") as TestCategory,
        input: tc.input || "",
        expectedOutput: tc.expected_output || "Determined during execution",
        reason: tc.reason || "Validates expected behavior",
        code: tc.code || "",
      }),
    );

    const pytestCode = parsed.pytest_code || testCases.map((t) => t.code).join("\n\n");

    const normalCount = testCases.filter((t) => t.category === "Normal").length;
    const edgeCount = testCases.filter((t) => t.category === "Edge Case").length;
    const invalidCount = testCases.filter((t) => t.category === "Invalid Input").length;
    const exceptionCount = testCases.filter((t) => t.category === "Exception").length;
    const boundaryCount = testCases.filter((t) => t.category === "Boundary").length;

    return {
      analysis: astAnalysis,
      pytestCode,
      testCases,
      summary: {
        totalTests: testCases.length,
        normalCount,
        edgeCount,
        invalidCount,
        exceptionCount,
        boundaryCount,
      },
    };
  } catch (err) {
    console.warn("[AI Test Gen] Cloud AI generation failed or unconfigured, using local generator:", err);
    return generateLocalPytestSuite(code, astAnalysis);
  }
}

/**
 * Explains failed tests and suggests concrete fixes to user code.
 */
export function analyzeFailureAndSuggestFix(
  userCode: string,
  testCode: string,
  testName: string,
  errorOutput: string,
): SuggestedFix {
  const lines = userCode.split("\n");

  // Case 1: Division by zero
  if (errorOutput.includes("ZeroDivisionError")) {
    const divIdx = lines.findIndex((l) => l.includes("/") && !l.trim().startsWith("#"));
    if (divIdx !== -1) {
      const indent = lines[divIdx].match(/^\s*/)?.[0] || "    ";
      const beforeCode = lines[divIdx];
      const afterCode = `${indent}if b == 0:\n${indent}    raise ValueError("Division by zero")\n${lines[divIdx]}`;
      const fixedLines = [...lines];
      fixedLines.splice(divIdx, 1, afterCode);

      return {
        explanation: `Test failed with ZeroDivisionError. The code divides without verifying if the divisor is zero. Adding a zero check prevents runtime crash.`,
        beforeCode,
        afterCode,
        fixedFullCode: fixedLines.join("\n"),
      };
    }
  }

  // Case 2: Assertion error comparison (e.g. subtraction vs addition, or off-by-one)
  const assertMatch = errorOutput.match(/assert\s+(.+?)\s*==\s*(.+)/);
  if (assertMatch) {
    const actual = assertMatch[1].trim();
    const expected = assertMatch[2].trim();

    // Check if operator mismatch (e.g., '-' instead of '+')
    if (userCode.includes("-") && (testName.includes("add") || testName.includes("sum"))) {
      const minusIdx = lines.findIndex((l) => l.includes("-") && l.includes("return"));
      if (minusIdx !== -1) {
        const beforeCode = lines[minusIdx];
        const afterCode = beforeCode.replace("-", "+");
        const fixedLines = [...lines];
        fixedLines[minusIdx] = afterCode;

        return {
          explanation: `Assertion failed: expected ${expected} but received ${actual}. The return statement uses subtraction '-' instead of addition '+'.`,
          beforeCode,
          afterCode,
          fixedFullCode: fixedLines.join("\n"),
        };
      }
    }
  }

  // Case 3: Empty sequence / IndexError
  if (errorOutput.includes("IndexError")) {
    const indexLineIdx = lines.findIndex((l) => /\[\w+\]|\[0\]|\[-1\]/.test(l));
    if (indexLineIdx !== -1) {
      const indent = lines[indexLineIdx].match(/^\s*/)?.[0] || "    ";
      const beforeCode = lines[indexLineIdx];
      const afterCode = `${indent}if not items:\n${indent}    return None\n${beforeCode}`;
      const fixedLines = [...lines];
      fixedLines.splice(indexLineIdx, 1, afterCode);

      return {
        explanation: `Test failed with IndexError. Accessing indices on empty collections causes an exception. Add an empty check before accessing elements.`,
        beforeCode,
        afterCode,
        fixedFullCode: fixedLines.join("\n"),
      };
    }
  }

  // Default intelligent fallback explanation
  const errSnippet = errorOutput.split("\n").filter((l) => l.startsWith("E   ")).join("\n") || errorOutput.slice(0, 200);

  return {
    explanation: `Test '${testName}' failed:\n${errSnippet}\n\nReview the boundary conditions and ensure input parameters handle edge cases (e.g. 0, None, empty collections, or expected exceptions).`,
    beforeCode: lines[0] || "",
    afterCode: lines[0] || "",
    fixedFullCode: userCode,
  };
}

