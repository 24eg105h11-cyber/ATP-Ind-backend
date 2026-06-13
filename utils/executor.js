import { exec, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import os from "os";

const execPromise = promisify(exec);

const isCommandAvailable = async (cmd) => {
  try {
    // Try common --version check; works for gcc/g++/clang
    await execPromise(`${cmd} --version`);
    return true;
  } catch (e) {
    try {
      // On Windows `where` can help determine presence
      await execPromise(`where ${cmd}`);
      return true;
    } catch (e2) {
      return false;
    }
  }
};

const findAvailableCompiler = async (candidates) => {
  for (const c of candidates) {
    if (await isCommandAvailable(c)) return c;
  }
  return null;
};

const normalizeTemplateKey = (templateKey) => templateKey || "twoSum";

const buildJsWrapper = (templateKey) => {
  switch (templateKey) {
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

const buildPythonWrapper = (templateKey) => {
  switch (templateKey) {
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

const buildJavaWrapper = (templateKey) => {
  const methodName = templateKey === "runningSum"
    ? "runningSum"
    : templateKey === "productExceptSelf"
      ? "productExceptSelf"
      : templateKey === "plusOne"
        ? "plusOne"
        : "twoSum";

  const invocation = templateKey === "twoSum"
    ? `int target = Integer.parseInt(sc.nextLine().trim());\n                Solution sol = new Solution();\n                int[] result = sol.${methodName}(nums, target);\n                System.out.println(Arrays.toString(result).replace(" ", ""));`
    : `Solution sol = new Solution();\n                int[] result = sol.${methodName}(nums);\n                System.out.println(Arrays.toString(result).replace(" ", ""));`;

  return `class Main {\n    private static int[] parseArray(String line) {\n        String cleaned = line.replace("[", "").replace("]", "").trim();\n        if (cleaned.isEmpty()) {\n            return new int[0];\n        }\n        return Arrays.stream(cleaned.split(",")).map(String::trim).mapToInt(Integer::parseInt).toArray();\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        try {\n            if (sc.hasNextLine()) {\n                int[] nums = parseArray(sc.nextLine());\n                ${invocation}\n            }\n        } catch (Exception e) {\n            System.err.println(e.getMessage());\n            System.exit(1);\n        }\n    }\n}`;
};

const buildCppWrapper = (templateKey) => {
  const methodName = templateKey === "runningSum"
    ? "runningSum"
    : templateKey === "productExceptSelf"
      ? "productExceptSelf"
      : templateKey === "plusOne"
        ? "plusOne"
        : "twoSum";

  const body = templateKey === "twoSum"
    ? `int target;\n        cin >> target;\n        Solution sol;\n        vector<int> result = sol.${methodName}(nums, target);`
    : `Solution sol;\n        vector<int> result = sol.${methodName}(nums);`;

  return `#include <iostream>\n#include <vector>\n#include <string>\n#include <sstream>\n#include <algorithm>\nusing namespace std;\n${body.includes("target") ? "" : ""}\n${body.includes("target") ? "" : ""}`;
};

const buildCppSource = (templateKey, code) => {
  const methodName = templateKey === "runningSum"
    ? "runningSum"
    : templateKey === "productExceptSelf"
      ? "productExceptSelf"
      : templateKey === "plusOne"
        ? "plusOne"
        : "twoSum";

  const invocation = templateKey === "twoSum"
    ? `int target;\n        cin >> target;\n        Solution sol;\n        vector<int> result = sol.${methodName}(nums, target);`
    : `Solution sol;\n        vector<int> result = sol.${methodName}(nums);`;

  return `#include <iostream>\n#include <vector>\n#include <string>\n#include <sstream>\n#include <algorithm>\nusing namespace std;\n${code}\n\nint main() {\n    string line;\n    if (getline(cin, line)) {\n        line.erase(remove(line.begin(), line.end(), '['), line.end());\n        line.erase(remove(line.begin(), line.end(), ']'), line.end());\n        stringstream ss(line);\n        vector<int> nums;\n        string val;\n        while (getline(ss, val, ',')) {\n            if (!val.empty()) {\n                nums.push_back(stoi(val));\n            }\n        }\n        ${invocation}\n        cout << "[";\n        for (size_t i = 0; i < result.size(); ++i) {\n            cout << result[i];\n            if (i + 1 < result.size()) cout << ",";\n        }\n        cout << "]" << endl;\n    }\n    return 0;\n}`;
};

const buildCSource = (templateKey, code) => {
  const invocation = templateKey === "twoSum"
    ? `int target;\n        scanf("%d", &target);\n        int* result = twoSum(nums, numsSize, target, &returnSize);`
    : templateKey === "runningSum"
      ? `int* result = runningSum(nums, numsSize, &returnSize);`
      : templateKey === "productExceptSelf"
        ? `int* result = productExceptSelf(nums, numsSize, &returnSize);`
        : `int* result = plusOne(nums, numsSize, &returnSize);`;

  return `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n${code}\n\nstatic int* parseArray(const char* line, int* size) {\n    char* copy = strdup(line);\n    copy[strcspn(copy, "\n")] = 0;\n    char* ptr = copy;\n    while (*ptr == '[' || *ptr == ' ' || *ptr == '\\t') ptr++;\n    char* end = ptr + strlen(ptr);\n    while (end > ptr && (end[-1] == ']' || end[-1] == ' ')) {\n        end--;\n    }\n    *end = '\\0';\n    int capacity = 8;\n    int* nums = malloc(sizeof(int) * capacity);\n    int count = 0;\n    char* token = strtok(ptr, ",");\n    while (token) {\n        if (count >= capacity) {\n            capacity *= 2;\n            nums = realloc(nums, sizeof(int) * capacity);\n        }\n        nums[count++] = atoi(token);\n        token = strtok(NULL, ",");\n    }\n    free(copy);\n    *size = count;\n    return nums;\n}\n\nint main() {\n    char buffer[2048];\n    if (!fgets(buffer, sizeof(buffer), stdin)) return 0;\n    int numsSize = 0;\n    int* nums = parseArray(buffer, &numsSize);\n    int returnSize = 0;\n    ${invocation}\n    printf("[");\n    for (int i = 0; i < returnSize; ++i) {\n        printf("%d", result[i]);\n        if (i + 1 < returnSize) printf(",");\n    }\n    printf("]\\n");\n    return 0;\n}`;
};

const createExecutionSource = (templateKey, language, code) => {
  const normalizedTemplateKey = normalizeTemplateKey(templateKey);
  const lang = language.toLowerCase();

  switch (lang) {
    case "python":
    case "python3":
    case "py":
      return `${code}${buildPythonWrapper(normalizedTemplateKey)}`;
    case "javascript":
    case "js":
      return `${code}\n\n${buildJsWrapper(normalizedTemplateKey)}`;
    case "java":
      return `import java.util.*;\nimport java.util.stream.*;\n${code}\n\n${buildJavaWrapper(normalizedTemplateKey)}`;
    case "cpp":
    case "c++":
      return buildCppSource(normalizedTemplateKey, code);
    case "c":
      return buildCSource(normalizedTemplateKey, code);
    default:
      throw new Error(`Language ${language} is not supported for local execution.`);
  }
};

export const executeCode = async (templateKey, language, code, input) => {
  const runId = uuidv4();
  const tempDir = path.join(os.tmpdir(), "code-playground", runId);

  try {
    await fs.mkdir(tempDir, { recursive: true });

    const normalizedTemplateKey = normalizeTemplateKey(templateKey);
    const lang = language.toLowerCase();
    let fileName;
    let compileCmd;
    let runCmd;
    let runArgs = [];
    const processedCode = createExecutionSource(normalizedTemplateKey, lang, code);

    switch (lang) {
      case "python":
      case "python3":
      case "py":
        fileName = "solution.py";
        runCmd = "python";
        runArgs = [fileName];
        break;
      case "javascript":
      case "js":
        fileName = "solution.js";
        runCmd = "node";
        runArgs = [fileName];
        break;
      case "java":
        fileName = "Solution.java";
        compileCmd = `javac ${fileName}`;
        runCmd = "java";
        runArgs = ["Main"];
        break;
      case "cpp":
      case "c++":
        fileName = "solution.cpp";
        // Try to find an available C++ compiler (g++, clang++)
        {
          const compiler = await findAvailableCompiler(["g++", "clang++"]);
          if (!compiler) {
            throw new Error(
              "No C++ compiler found on the server. Install g++ (MinGW or GCC) or clang++, or run the backend in an environment with build tools (WSL on Windows, or a Linux host)."
            );
          }
          compileCmd = `${compiler} ${fileName} -o solution.exe`;
          runCmd = path.join(tempDir, "solution.exe");
        }
        break;
      case "c":
        fileName = "solution.c";
        {
          const compiler = await findAvailableCompiler(["gcc", "clang"]);
          if (!compiler) {
            throw new Error(
              "No C compiler found on the server. Install gcc (MinGW or GCC) or clang, or run the backend in an environment with build tools."
            );
          }
          compileCmd = `${compiler} ${fileName} -o solution.exe`;
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
