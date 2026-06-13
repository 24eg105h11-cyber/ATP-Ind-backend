import exp from "express";
import jwt from "jsonwebtoken";
import { Testcase } from "../Models/TestcaseModel.js";
import { verifyToken } from "../middleware/VerifyToken.js";

export const TestcaseAPI = exp.Router();
const testcaseApp = TestcaseAPI;

const toTestcasePayload = (body) => {
  const payload = {
    problem: body.problem || body.problemId,
    input: body.input,
    expectedOutput: body.expectedOutput,
    isSample: body.isSample
  };

  Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

  return payload;
};

// Create a testcase (Admin only)
testcaseApp.post("/", verifyToken("admin"), async (req, res, next) => {
  try {
    const data = toTestcasePayload(req.body);
    const testcase = new Testcase(data);
    await testcase.save();

    try {
      const io = req.app.get("io");
      if (io) {
        const populated = await Testcase.findById(testcase._id).populate("problem");
        io.emit("testcase:created", populated);
      }
    } catch (err) {
      console.error("Failed to emit testcase:created", err?.message ?? err.message);
    }

    return res.status(201).json({ message: "Testcase created", payload: testcase });
  } catch (err) {
    return next(err);
  }
});

// Get testcases for a problem (Can be accessed by anyone, but non-admins only see samples)
testcaseApp.get("/problem/:problemId", async (req, res, next) => {
  try {
    // Check if token exists to determine if admin
    const token = req.cookies?.token;
    let isAdmin = false;
    if (token) {
      const jwtSecret = process.env.SECRET_KEY || process.env.JWT_SECRET;
      try {
        const decoded = jwt.verify(token, jwtSecret);
        isAdmin = decoded.role === "admin";
      } catch (e) {
        // invalid token, treat as guest/user
      }
    }

    let list;
    if (isAdmin) {
      list = await Testcase.find({ problem: req.params.problemId });
    } else {
      // For users, only send sample testcases
      list = await Testcase.find({ problem: req.params.problemId, isSample: true });
    }
    return res.status(200).json({ message: "Testcases fetched", payload: list });
  } catch (err) {
    return next(err);
  }
});

// Get a single testcase
testcaseApp.get("/:id", async (req, res, next) => {
  try {
    const testcase = await Testcase.findById(req.params.id).populate("problem");
    if (!testcase) return res.status(404).json({ message: "Testcase not found" });
    return res.status(200).json({ message: "Testcase fetched", payload: testcase });
  } catch (err) {
    return next(err);
  }
});

// Update a testcase (Admin only)
testcaseApp.put("/:id", verifyToken("admin"), async (req, res, next) => {
  try {
    const updated = await Testcase.findByIdAndUpdate(req.params.id, toTestcasePayload(req.body), { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: "Testcase not found" });

    try {
      const io = req.app.get("io");
      if (io) {
        const populated = await Testcase.findById(updated._id).populate("problem");
        io.emit("testcase:updated", populated);
      }
    } catch (err) {
      console.error("Failed to emit testcase:updated", err?.message ?? err.message);
    }

    return res.status(200).json({ message: "Testcase updated", payload: updated });
  } catch (err) {
    return next(err);
  }
});

// Delete a testcase (Admin only)
testcaseApp.delete("/:id", verifyToken("admin"), async (req, res, next) => {
  try {
    const deleted = await Testcase.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Testcase not found" });
    return res.status(200).json({ message: "Testcase deleted" });
  } catch (err) {
    return next(err);
  }
});

export default TestcaseAPI;
