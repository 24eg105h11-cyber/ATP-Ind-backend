import exp from "express";
import { Problem } from "../Models/ProblemModel.js";
import { executeCode, getExecutionTemplateName, getSupportedLanguages } from "../utils/executor.js";

export const PlaygroundAPI = exp.Router();

PlaygroundAPI.post("/run", async (req, res, next) => {
  try {
    const { language, code, input, problemId } = req.body;
    
    if (!language || !code) {
      return res.status(400).json({ message: "Language and code are required" });
    }

    let executionTemplate = "twoSum";
    if (problemId) {
      const problem = await Problem.findById(problemId);
      if (problem?.title) {
        executionTemplate = getExecutionTemplateName(problem.title);
      }
    }

    const result = await executeCode(executionTemplate, language, code, input || "");

    console.log("=== PLAYGROUND EXECUTION DEBUG ===");
    console.log("Language:", language);
    console.log("Execution template:", executionTemplate);
    console.log("Raw execution output:", JSON.stringify(result.output));
    console.log("Raw execution error:", JSON.stringify(result.error));
    console.log("Execution status:", result.status);

    return res.status(200).json({ 
      message: "Execution successful", 
      payload: result 
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

PlaygroundAPI.get("/languages", async (req, res, next) => {
  try {
    const supported = await getSupportedLanguages();
    return res.status(200).json({ message: "Supported languages fetched", payload: supported });
  } catch (err) {
    return next(err);
  }
});

export default PlaygroundAPI;
