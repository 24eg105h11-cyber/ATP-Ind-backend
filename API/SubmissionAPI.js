import exp from "express";
import { Problem } from "../Models/ProblemModel.js";
import { Submission } from "../Models/SubmissionModel.js";
import { Testcase } from "../Models/TestcaseModel.js";
import { User } from "../Models/UserModel.js";
import { verifyToken } from "../middleware/VerifyToken.js";
import { executeCode, getExecutionTemplateName } from "../utils/executor.js";
import { compareOutputs } from "../utils/outputComparator.js";
import { defaultProblems } from "../utils/defaultProblemData.js";

export const SubmissionAPI = exp.Router();
const submissionApp = SubmissionAPI;

const toSubmissionPayload = (body) => {
  const payload = {
    user: body.user || body.userId,
    problem: body.problem || body.problemId,
    code: body.code,
    language: body.language,
    status: body.status,
    executionTime: body.executionTime,
    memoryUsed: body.memoryUsed
  };

  Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

  return payload;
};

// Create a submission
submissionApp.post("/", verifyToken("user", "admin"), async (req, res, next) => {
  try {
    const data = toSubmissionPayload(req.body);
    if (!data.user && req.user) data.user = req.user.id;

    const problem = await Problem.findById(data.problem);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }
    const executionTemplate = getExecutionTemplateName(problem.title);
    
    // 1. Save initial submission
    const submission = new Submission(data);
    await submission.save();

    // 2. Fetch ALL testcases (including hidden ones)
    let testcases = await Testcase.find({ problem: data.problem });
    
    // FALLBACK: If DB is empty, use more robust evaluation cases to simulate hidden ones
    if (testcases.length === 0) {
      const fallbackProblem = defaultProblems.find((item) => item.title === problem.title);
      testcases = fallbackProblem?.testcases || [];
    }

    let allPassed = true;
    let finalStatus = "accepted";
    let firstErrorOutput = null;
    let lastOutput = null;
    let passedCount = 0;
    const startTimeResult = Date.now();

    for (const test of testcases) {
      const result = await executeCode(executionTemplate, data.language, data.code, test.input);
      // capture latest output for persistence
      if (result && typeof result.output !== "undefined") {
        lastOutput = result.output;
      }
      
      if (result.status !== "success") {
        allPassed = false;
        finalStatus = "runtime error";
        firstErrorOutput = result.error || "Runtime Error";
        break;
      }

      const actualOutput = String(result.output ?? "");
      const expectedOutput = String(test.expectedOutput ?? "");

      if (!compareOutputs(actualOutput, expectedOutput)) {
        allPassed = false;
        finalStatus = "wrong answer";
        break;
      }
      passedCount++;
    }

    const totalTime = Date.now() - startTimeResult;
    // Calculate efficiency (faster is better, max 100%)
    const efficiency = passedCount === testcases.length 
      ? Math.max(15, 100 - (totalTime / (testcases.length * 10))).toFixed(1)
      : 0;

    submission.status = finalStatus;
    submission.passedCount = passedCount;
    submission.totalCases = testcases.length;
    submission.executionTime = totalTime;
    if (lastOutput) submission.output = lastOutput;
    
    if (firstErrorOutput && finalStatus === "runtime error") {
      submission.error = firstErrorOutput;
    }
    await submission.save();

    // If accepted, mark problem as completed for the user
    if (finalStatus === "accepted") {
      try {
        await User.findByIdAndUpdate(data.user, { $addToSet: { completedProblems: data.problem } });
      } catch (err) {
        console.error("Failed to mark problem as completed for user:", err?.message ?? err);
      }
    }

    return res.status(201).json({ 
      message: `Submission ${finalStatus}`, 
      payload: {
        ...submission.toObject(),
        passedCount,
        totalCases: testcases.length,
        efficiencyScore: efficiency,
        runtime: totalTime
      } 
    });
  } catch (err) {
    return next(err);
  }
});

// Get all submissions
submissionApp.get("/", verifyToken("user", "admin"), async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role !== "admin") {
      query.user = req.user.id;
    }
    if (req.query.problem) query.problem = req.query.problem;
    
    const list = await Submission.find(query)
      .populate("problem", "title difficulty")
      .populate("user", "username")
      .sort({ createdAt: -1 });
      
    return res.status(200).json({ message: "Submissions fetched", payload: list });
  } catch (err) {
    return next(err);
  }
});

// Get submissions for a specific problem
const getProblemSubmissions = async (req, res, next) => {
  try {
    const query = { problem: req.params.problemId };
    if (req.user.role !== "admin") {
      query.user = req.user.id;
    }
    const list = await Submission.find(query)
      .populate("user", "username")
      .sort({ createdAt: -1 });
    return res.status(200).json({ message: "Submissions fetched", payload: list });
  } catch (err) {
    return next(err);
  }
};

submissionApp.get("/problem/:problemId", verifyToken("user", "admin"), getProblemSubmissions);
submissionApp.get("/submissions/problem/:problemId", verifyToken("user", "admin"), getProblemSubmissions);

// Get a single submission
submissionApp.get("/submissions/:id", verifyToken("user", "admin"), async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate("problem", "title")
      .populate("user", "username");
      
    if (!submission) return res.status(404).json({ message: "Submission not found" });

    if (req.user.role !== "admin" && submission.user._id.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to view this submission" });
    }

    return res.status(200).json({ message: "Submission fetched", payload: submission });
  } catch (err) {
    return next(err);
  }
});

export default SubmissionAPI;
