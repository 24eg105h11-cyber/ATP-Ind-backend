import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { config } from "dotenv";
import { User } from "../Models/UserModel.js";
import { Problem } from "../Models/ProblemModel.js";
import { Testcase } from "../Models/TestcaseModel.js";
import { defaultProblems } from "./defaultProblemData.js";

config();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

export const seedDefaultProblems = async () => {
  for (const problemData of defaultProblems) {
    let problem = await Problem.findOne({ title: problemData.title });

    if (!problem) {
      problem = new Problem({
        title: problemData.title,
        description: problemData.description,
        difficulty: problemData.difficulty,
        tags: problemData.tags,
        constraints: problemData.constraints,
        templateKey: problemData.templateKey,
      });
      await problem.save();
    } else {
      const needsUpdate =
        problem.templateKey !== problemData.templateKey ||
        problem.description !== problemData.description ||
        problem.difficulty !== problemData.difficulty;

      if (needsUpdate) {
        problem.description = problemData.description;
        problem.difficulty = problemData.difficulty;
        problem.tags = problemData.tags;
        problem.constraints = problemData.constraints;
        problem.templateKey = problemData.templateKey;
        await problem.save();
      }
    }

    const testcaseCount = await Testcase.countDocuments({ problem: problem._id });
    if (testcaseCount === 0) {
      const casesToInsert = problemData.testcases.map((testcase) => ({
        problem: problem._id,
        input: testcase.input,
        expectedOutput: testcase.expectedOutput,
        isSample: testcase.isSample,
      }));
      await Testcase.insertMany(casesToInsert);
    }
  }

  await seedDefaultAdmin();
};

const seedDefaultAdmin = async () => {
  const existingAdmin = await User.findOne({ role: "admin" });
  if (existingAdmin) {
    return;
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const adminUser = new User({
    username: ADMIN_USERNAME,
    email: ADMIN_EMAIL,
    password: hashedPassword,
    role: "admin",
  });

  await adminUser.save();
  console.log(`Default admin created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
};

// If run directly, connect to DB and run seeding
if (process.argv[1] && process.argv[1].endsWith("seedDefaultProblems.js")) {
  (async () => {
    try {
      const mongoUrl = process.env.DB_URL;
      if (!mongoUrl) {
        console.error("Missing DB_URL in environment. Set DB_URL in .env or environment variables.");
        process.exit(1);
      }
      await mongoose.connect(mongoUrl);
      console.log("Connected to DB for seeding...");
      await seedDefaultProblems();
      console.log("Default problems seeded (standalone run).");
      const total = await Problem.countDocuments();
      console.log(`Total problems in DB: ${total}`);
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error("Seeding failed:", err);
      process.exit(1);
    }
  })();
}
