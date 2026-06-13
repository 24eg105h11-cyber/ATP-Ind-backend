import exp from "express";
import { Problem } from "../Models/ProblemModel.js";
import { Testcase } from "../Models/TestcaseModel.js";
import { Submission } from "../Models/SubmissionModel.js";
import { verifyToken } from "../middleware/VerifyToken.js";

export const ProblemAPI = exp.Router();
const problemApp = ProblemAPI;

const toProblemPayload = (body) => {
  const payload = {
    title: body.title,
    description: body.description,
    difficulty: body.difficulty,
    tags: body.tags,
    constraints: body.constraints,
    templateKey: body.templateKey,
    createdBy: body.createdBy || body.userId
  };

  // Remove undefined fields
  Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

  return payload;
};

// Create a new problem (Admin only)
problemApp.post("/", verifyToken("admin"), async (req, res, next) => {
  try {
    const data = toProblemPayload(req.body);
    if (!data.createdBy && req.user) data.createdBy = req.user.id;
    const problem = new Problem(data);
    await problem.save();

    // emit socket event if io is available
    try {
      const io = req.app.get("io");
      if (io) {
        const populated = await Problem.findById(problem._id).populate("createdBy", "username");
        io.emit("problem:created", populated);
      }
    } catch (err) {
      console.error("Failed to emit problem:created", err?.message ?? err.message);
    }

    return res.status(201).json({ message: "Problem created", payload: problem });
  } catch (err) {
    return next(err);
  }
});

// Get all problems
problemApp.get("/", async (req, res, next) => {
  try {
    const query = {};
    if (req.query.difficulty) query.difficulty = req.query.difficulty;
    if (req.query.tag) query.tags = req.query.tag;
    
    const list = await Problem.find(query).populate("createdBy", "username");
    return res.status(200).json({ message: "Problems fetched", payload: list });
  } catch (err) {
    return next(err);
  }
});

// Get a single problem by ID
problemApp.get("/:id", async (req, res, next) => {
  try {
    const problem = await Problem.findById(req.params.id).populate("createdBy", "username");
    if (!problem) return res.status(404).json({ message: "Problem not found" });
    return res.status(200).json({ message: "Problem fetched", payload: problem });
  } catch (err) {
    return next(err);
  }
});

// Update a problem (Admin only)
problemApp.put("/:id", verifyToken("admin"), async (req, res, next) => {
  try {
    const updated = await Problem.findByIdAndUpdate(req.params.id, toProblemPayload(req.body), { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: "Problem not found" });
    
    try {
      const io = req.app.get("io");
      if (io) {
        const populated = await Problem.findById(updated._id).populate("createdBy", "username");
        io.emit("problem:updated", populated);
      }
    } catch (err) {
      console.error("Failed to emit problem:updated", err?.message ?? err.message);
    }
    
    return res.status(200).json({ message: "Problem updated", payload: updated });
  } catch (err) {
    return next(err);
  }
});

// Delete a problem (Admin only)
problemApp.delete("/:id", verifyToken("admin"), async (req, res, next) => {
  try {
    const deleted = await Problem.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Problem not found" });

    await Promise.all([
      Testcase.deleteMany({ problem: req.params.id }),
      Submission.deleteMany({ problem: req.params.id })
    ]);

    return res.status(200).json({ message: "Problem deleted" });
  } catch (err) {
    return next(err);
  }
});

export default ProblemAPI;
