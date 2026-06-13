import exp from "express";
import { executeCode, getSupportedLanguages } from "../utils/executor.js";

export const PlaygroundAPI = exp.Router();

PlaygroundAPI.post("/run", async (req, res, next) => {
  try {
    const { language, code, input, templateKey } = req.body;
    
    if (!language || !code) {
      return res.status(400).json({ message: "Language and code are required" });
    }

    const result = await executeCode(templateKey, language, code, input || "");
    
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
