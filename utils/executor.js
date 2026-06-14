import { exec, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import os from "os";
import axios from "axios";

const execPromise = promisify(exec);

const checkCommandVersion = async (command) => {
  try {
    await execPromise(`"${command}" --version`);
    return true;
  } catch {
    return false;
  }
};

const isCommandAvailable = async (cmd) => {
  if (await checkCommandVersion(cmd)) return true;

  try {
    if (process.platform === 'win32') {
      await execPromise(`where ${cmd}`);
    } else {
      await execPromise(`which ${cmd}`);
    }
    return true;
  } catch {
    // Fall back to JAVA_HOME for Java tools when PATH is not configured.
    if (process.env.JAVA_HOME && (cmd === 'javac' || cmd === 'java')) {
      const javaPath = path.join(process.env.JAVA_HOME, 'bin', `${cmd}${process.platform === 'win32' ? '.exe' : ''}`);
      return await checkCommandVersion(javaPath);
    }
    return false;
  }
};

const findAvailableCompiler = async (candidates) => {
  for (const c of candidates) {
    if (await isCommandAvailable(c)) {
      if (process.env.JAVA_HOME && (c === 'javac' || c === 'java')) {
        const javaPath = path.join(process.env.JAVA_HOME, 'bin', `${c}${process.platform === 'win32' ? '.exe' : ''}`);
        if (await checkCommandVersion(javaPath)) return javaPath;
      }
      return c;
    }
  }
  return null;
};

const judge0LanguageMap = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,
};

const getJudge0Config = () => {
  const baseUrl = String(process.env.JUDGE0_BASE_URL || "").trim();
  const apiKey = String(process.env.JUDGE0_API_KEY || "").trim();
  const apiHost = String(process.env.JUDGE0_API_HOST || "").trim();
  return { baseUrl, apiKey, apiHost };
};

const useJudge0 = () => {
  const { baseUrl } = getJudge0Config();
  return Boolean(baseUrl);
};

const executeWithJudge0 = async (language, code, input) => {
  const { baseUrl, apiKey, apiHost } = getJudge0Config();
  if (!baseUrl) {
    throw new Error("Judge0 execution is not configured. Set JUDGE0_BASE_URL.");
  }

  const languageId = judge0LanguageMap[language.toLowerCase()];
  if (!languageId) {
    throw new Error(`Judge0 does not support language: ${language}`);
  }

  const headers = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers["X-RapidAPI-Key"] = apiKey;
  }
  if (apiHost) {
    headers["X-RapidAPI-Host"] = apiHost;
  }

  const url = `${baseUrl.replace(/\/+$/, "")}/submissions?wait=true&base64_encoded=false`;
  const payload = {
    source_code: code,
    language_id: languageId,
    stdin: input || "",
  };

  const res = await axios.post(url, payload, { headers, timeout: 30000 });
  const data = res.data || {};

  const output = data.stdout || "";
  const compileOutput = data.compile_output || "";
  const stderr = data.stderr || "";
  const message = data.message || "";

  const error = compileOutput || stderr || message || "";
  const status = error ? "error" : "success";

  return {
    output: output.trim(),
    error: error.trim(),
    status,
    executionTime: data.time ? Number(data.time) : 0,
    memoryUsed: data.memory ? Number(data.memory) : 0,
  };
};

export const getSupportedLanguages = async () => {
  if (useJudge0()) {
    return Object.keys(judge0LanguageMap);
  }

  const supported = ["javascript", "python"];

  const javacCmd = await findAvailableCompiler(["javac"]);
  const javaCmd = await findAvailableCompiler(["java"]);
  if (javacCmd && javaCmd) {
    supported.push("java");
  }

  const cppCmd = await findAvailableCompiler(["g++", "clang++"]);
  if (cppCmd) supported.push("cpp");

  const cCmd = await findAvailableCompiler(["gcc", "clang"]);
  if (cCmd) supported.push("c");

  return supported;
};

const normalizeProblemTitle = (title) => String(title || "").trim().toLowerCase();

export const getExecutionTemplateName = (title) => {
  const normalizedTitle = normalizeProblemTitle(title);
  if (normalizedTitle.includes("running sum")) return "runningSum";
  if (normalizedTitle.includes("product except self")) return "productExceptSelf";
  if (normalizedTitle.includes("plus one")) return "plusOne";
  return "twoSum";
};

const normalizeExecutionTemplate = (executionTemplate) => executionTemplate || "twoSum";

const buildJsWrapper = (executionTemplate) => {
  switch (executionTemplate) {
    case "runningSum":
      return `${
        "const fs = require('fs');\n"
      }try {\n  const input = fs.readFileSync(0, 'utf8').trim().split('\\n');\n  const nums = JSON.parse(input[0]);\n  const result = runningSum(nums);\n  console.log(JSON.stringify(result));\n} catch (e) {\n  console.error(e.message);\n  process.exit(1);\n}`;
    case "productExceptSelf":
      return `${
        "const fs = require('fs');\n"
      }try {\n  const input = fs.readFileSync(0, 'utf8').trim().split('\\n');\n  const nums = JSON.parse(input[0]);\n  const result = productExceptSelf(nums);\n  console.log(JSON.stringify(result));\n} catch (e) {\n  console.error(e.message);\n  process.exit(1);\n}`;
    case "plusOne":
      return `${
        "const fs = require('fs');\n"
      }try {\n  const input = fs.readFileSync(0, 'utf8').trim().split('\\n');\n  const digits = JSON.parse(input[0]);\n  const result = plusOne(digits);\n  console.log(JSON.stringify(result));\n} catch (e) {\n  console.error(e.message);\n  process.exit(1);\n}`;
    case "twoSum":
    default:
      return `${
        "const fs = require('fs');\n"
      }try {\n  const input = fs.readFileSync(0, 'utf8').trim().split('\\n');\n  const nums = JSON.parse(input[0]);\n  const target = parseInt(input[1], 10);\n  const result = twoSum(nums, target);\n  console.log(JSON.stringify(result));\n} catch (e) {\n  console.error(e.message);\n  process.exit(1);\n}`;
  }
};

const buildPythonWrapper = (executionTemplate) => {
  switch (executionTemplate) {
    case "runningSum":
      return `${
        "\nif __name__ == \"__main__\":\n    import sys\n    import json\n    try:\n        lines = sys.stdin.read().splitlines()\n        nums = json.loads(lines[0])\n        sol = Solution()\n        result = sol.runningSum(nums)\n        print(json.dumps(result))\n    except Exception as e:\n        print(str(e), file=sys.stderr)\n        raise\n"
      }`;
    case "productExceptSelf":
      return `${
        "\nif __name__ == \"__main__\":\n    import sys\n    import json\n    try:\n        lines = sys.stdin.read().splitlines()\n        nums = json.loads(lines[0])\n        sol = Solution()\n        result = sol.productExceptSelf(nums)\n        print(json.dumps(result))\n    except Exception as e:\n        print(str(e), file=sys.stderr)\n        raise\n"
      }`;
    case "plusOne":
      return `${
        "\nif __name__ == \"__main__\":\n    import sys\n    import json\n    try:\n        lines = sys.stdin.read().splitlines()\n        digits = json.loads(lines[0])\n        sol = Solution()\n        result = sol.plusOne(digits)\n        print(json.dumps(result))\n    except Exception as e:\n        print(str(e), file=sys.stderr)\n        raise\n"
      }`;
    case "twoSum":
    default:
      return `${
        "\nif __name__ == \"__main__\":\n    import sys\n    import json\n    try:\n        lines = sys.stdin.read().splitlines()\n        nums = json.loads(lines[0])\n        target = int(lines[1])\n        sol = Solution()\n        result = sol.twoSum(nums, target)\n        print(json.dumps(result))\n    except Exception as e:\n        print(str(e), file=sys.stderr)\n        raise\n"
      }`;
  }
};

const buildJavaWrapper = (executionTemplate) => {
  const methodName = executionTemplate === "runningSum"
    ? "runningSum"
    : executionTemplate === "productExceptSelf"
      ? "productExceptSelf"
      : executionTemplate === "plusOne"
        ? "plusOne"
        : "twoSum";

  const invocation = executionTemplate === "twoSum"
    ? `int target = Integer.parseInt(sc.nextLine().trim());\n                Solution sol = new Solution();\n                int[] result = sol.${methodName}(nums, target);\n                System.out.println(Arrays.toString(result).replace(" ", ""));`
    : `Solution sol = new Solution();\n                int[] result = sol.${methodName}(nums);\n                System.out.println(Arrays.toString(result).replace(" ", ""));`;

  return `class Main {\n    private static int[] parseArray(String line) {\n        String cleaned = line.replace("[", "").replace("]", "").trim();\n        if (cleaned.isEmpty()) {\n            return new int[0];\n        }\n        return Arrays.stream(cleaned.split(",")).map(String::trim).mapToInt(Integer::parseInt).toArray();\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        try {\n            if (sc.hasNextLine()) {\n                int[] nums = parseArray(sc.nextLine());\n                ${invocation}\n            }\n        } catch (Exception e) {\n            System.err.println(e.getMessage());\n            System.exit(1);\n        }\n    }\n}`;
};

const buildCppWrapper = (executionTemplate) => {
  const methodName = executionTemplate === "runningSum"
    ? "runningSum"
    : executionTemplate === "productExceptSelf"
      ? "productExceptSelf"
      : executionTemplate === "plusOne"
        ? "plusOne"
        : "twoSum";

  const body = executionTemplate === "twoSum"
    ? `int target;\n        cin >> target;\n        Solution sol;\n        vector<int> result = sol.${methodName}(nums, target);`
    : `Solution sol;\n        vector<int> result = sol.${methodName}(nums);`;

  return `#include <iostream>\n#include <vector>\n#include <string>\n#include <sstream>\n#include <algorithm>\nusing namespace std;\n${body.includes("target") ? "" : ""}\n${body.includes("target") ? "" : ""}`;
};

const buildCppSource = (executionTemplate, code) => {
  const methodName = executionTemplate === "runningSum"
    ? "runningSum"
    : executionTemplate === "productExceptSelf"
      ? "productExceptSelf"
      : executionTemplate === "plusOne"
        ? "plusOne"
        : "twoSum";

  const invocation = executionTemplate === "twoSum"
    ? `int target;\n        cin >> target;\n        Solution sol;\n        vector<int> result = sol.${methodName}(nums, target);`
    : `Solution sol;\n        vector<int> result = sol.${methodName}(nums);`;

  return `#include <bits/stdc++.h>\nusing namespace std;\n${code}\n\nint main() {\n    string line;\n    if (getline(cin, line)) {\n        line.erase(remove(line.begin(), line.end(), '['), line.end());\n        line.erase(remove(line.begin(), line.end(), ']'), line.end());\n        stringstream ss(line);\n        vector<int> nums;\n        string val;\n        while (getline(ss, val, ',')) {\n            if (!val.empty()) {\n                nums.push_back(stoi(val));\n            }\n        }\n        ${invocation}\n        cout << "[";\n        for (size_t i = 0; i < result.size(); ++i) {\n            cout << result[i];\n            if (i + 1 < result.size()) cout << ",";\n        }\n        cout << "]" << endl;\n    }\n    return 0;\n}`;
};

const buildCSource = (executionTemplate, code) => {
  const invocation = executionTemplate === "twoSum"
    ? `int target;\n        scanf("%d", &target);\n        int* result = twoSum(nums, numsSize, target, &returnSize);`
    : executionTemplate === "runningSum"
      ? `int* result = runningSum(nums, numsSize, &returnSize);`
      : executionTemplate === "productExceptSelf"
        ? `int* result = productExceptSelf(nums, numsSize, &returnSize);`
        : `int* result = plusOne(nums, numsSize, &returnSize);`;

  return `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <stdbool.h>\n#include <math.h>\n${code}\n\nstatic int* parseArray(const char* line, int* size) {\n    char* copy = strdup(line);\n    copy[strcspn(copy, "\n")] = 0;\n    char* ptr = copy;\n    while (*ptr == '[' || *ptr == ' ' || *ptr == '\\t') ptr++;\n    char* end = ptr + strlen(ptr);\n    while (end > ptr && (end[-1] == ']' || end[-1] == ' ')) {\n        end--;\n    }\n    *end = '\\0';\n    int capacity = 8;\n    int* nums = malloc(sizeof(int) * capacity);\n    int count = 0;\n    char* token = strtok(ptr, ",");\n    while (token) {\n        if (count >= capacity) {\n            capacity *= 2;\n            nums = realloc(nums, sizeof(int) * capacity);\n        }\n        nums[count++] = atoi(token);\n        token = strtok(NULL, ",");\n    }\n    free(copy);\n    *size = count;\n    return nums;\n}\n\nint main() {\n    char buffer[2048];\n    if (!fgets(buffer, sizeof(buffer), stdin)) return 0;\n    int numsSize = 0;\n    int* nums = parseArray(buffer, &numsSize);\n    int returnSize = 0;\n    ${invocation}\n    printf("[");\n    for (int i = 0; i < returnSize; ++i) {\n        printf("%d", result[i]);\n        if (i + 1 < returnSize) printf(",");\n    }\n    printf("]\\n");\n    return 0;\n}`;
};

const createExecutionSource = (executionTemplate, language, code) => {
  const normalizedTemplate = normalizeExecutionTemplate(executionTemplate);
  const lang = language.toLowerCase();

  switch (lang) {
    case "python":
    case "python3":
    case "py":
      return `from typing import *\nfrom collections import *\nfrom math import *\nimport heapq\nimport bisect\n\n${code}${buildPythonWrapper(normalizedTemplate)}`;
    case "javascript":
    case "js":
      return `${code}\n\n${buildJsWrapper(normalizedTemplate)}`;
    case "java":
      return `import java.util.*;\nimport java.io.*;\nimport java.math.*;\n${code}\n\n${buildJavaWrapper(normalizedTemplate)}`;
    case "cpp":
    case "c++":
      return buildCppSource(normalizedTemplate, code);
    case "c":
      return buildCSource(normalizedTemplate, code);
    default:
      throw new Error(`Language ${language} is not supported for local execution.`);
  }
};

export const executeCode = async (executionTemplate, language, code, input) => {
  const normalizedTemplate = normalizeExecutionTemplate(executionTemplate);
  const lang = language.toLowerCase();
  const processedCode = createExecutionSource(normalizedTemplate, lang, code);

  if (useJudge0()) {
    return executeWithJudge0(lang, processedCode, input || "");
  }

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "Production execution is using local runtime tools. Make sure your Docker image includes Python, Node, Java, and build tools."
    );
  }

  const runId = uuidv4();
  const tempDir = path.join(os.tmpdir(), "code-playground", runId);

  try {
    await fs.mkdir(tempDir, { recursive: true });

    let fileName;
    let compileCmd;
    let runCmd;
    let runArgs = [];

    switch (lang) {
      case "python":
      case "python3":
      case "py": {
        const pythonCmd = await findAvailableCompiler(["python", "python3"]);
        if (!pythonCmd) {
          throw new Error(
            "Python runtime unavailable: install Python or choose another language."
          );
        }
        fileName = "solution.py";
        runCmd = pythonCmd;
        runArgs = [fileName];
        break;
      }
      case "javascript":
      case "js": {
        const nodeCmd = await findAvailableCompiler(["node"]);
        if (!nodeCmd) {
          throw new Error(
            "Node.js runtime unavailable: install Node.js or choose another language."
          );
        }
        fileName = "solution.js";
        runCmd = nodeCmd;
        runArgs = [fileName];
        break;
      }
      case "java": {
        fileName = "Solution.java";
        const javacCmd = await findAvailableCompiler(["javac"]);
        const javaCmd = await findAvailableCompiler(["java"]);
        if (!javacCmd) {
          throw new Error(
            "Java toolchain unavailable: 'javac' is not installed. Install a JDK or choose a different language."
          );
        }
        if (!javaCmd) {
          throw new Error(
            "Java runtime unavailable: 'java' is not installed. Install a JDK or choose a different language."
          );
        }
        compileCmd = `${javacCmd} ${fileName}`;
        runCmd = javaCmd;
        runArgs = ["Main"];
        break;
      }
      case "cpp":
      case "c++":
        fileName = "solution.cpp";
        // Try to find an available C++ compiler
        {
          const compiler = await findAvailableCompiler(["g++", "clang++", "cl.exe", "cl"]);
          if (!compiler) {
            throw new Error(
              "No C++ compiler found on the server. Install g++ (MinGW or GCC), clang++, or MSVC cl.exe, or run the backend in an environment with build tools."
            );
          }
          if (compiler.toLowerCase().includes("cl")) {
            compileCmd = `"${compiler}" /EHsc "${fileName}" /Fe:solution.exe`;
          } else {
            compileCmd = `"${compiler}" "${fileName}" -o solution.exe`;
          }
          runCmd = path.join(tempDir, "solution.exe");
        }
        break;
      case "c":
        fileName = "solution.c";
        {
          const compiler = await findAvailableCompiler(["gcc", "clang", "cl.exe", "cl"]);
          if (!compiler) {
            throw new Error(
              "No C compiler found on the server. Install gcc (MinGW or GCC), clang, or MSVC cl.exe, or run the backend in an environment with build tools."
            );
          }
          if (compiler.toLowerCase().includes("cl")) {
            compileCmd = `"${compiler}" /TC "${fileName}" /Fe:solution.exe`;
          } else {
            compileCmd = `"${compiler}" "${fileName}" -o solution.exe`;
          }
          runCmd = path.join(tempDir, "solution.exe");
        }
        break;
      default:
        throw new Error(`Language ${language} is not supported for local execution.`);
    }

    const filePath = path.join(tempDir, fileName);
    await fs.writeFile(filePath, processedCode);

    if (compileCmd) {
      await execPromise(compileCmd, { cwd: tempDir, timeout: 5000 });
    }

    const runner = new Promise((resolve, reject) => {
      const child = spawn(runCmd, runArgs, { cwd: tempDir });
      let stdout = "";
      let stderr = "";

      if (input) {
        child.stdin.write(input);
        child.stdin.end();
      }

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (exitCode) => {
        resolve({ stdout, stderr, code: exitCode });
      });

      child.on("error", (err) => {
        reject(err);
      });

      setTimeout(() => {
        child.kill();
        reject(new Error("Execution timed out"));
      }, 5000);
    });

    const result = await runner;

    return {
      output: result.stdout.trim(),
      error: result.stderr.trim(),
      status: result.code === 0 ? "success" : "error",
      executionTime: 0,
      memoryUsed: 0
    };
  } catch (err) {
    return {
      output: "",
      error: err.stderr || err.message,
      status: "error"
    };
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.error("Cleanup error:", cleanupErr);
    }
  }
};

export { createExecutionSource, getExecutionTemplateName };
