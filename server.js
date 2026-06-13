import express from "express";
import { config } from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";

// Import all models to register them with Mongoose
import { User } from "./Models/UserModel.js";
import { Problem } from "./Models/ProblemModel.js";
import { Submission } from "./Models/SubmissionModel.js";
import { Testcase } from "./Models/TestcaseModel.js";
import { seedDefaultProblems } from "./utils/seedDefaultProblems.js";

// Import Routes
import UserRoutes from "./API/UserAPI.js";
import ProblemRoutes from "./API/ProblemAPI.js";
import SubmissionRoutes from "./API/SubmissionAPI.js";
import TestcaseRoutes from "./API/TestcaseAPI.js";
import PlaygroundRoutes from "./API/PlaygroundAPI.js";

config();

const app = express();

// Middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

// Routes
const apiRouter = express.Router();
apiRouter.use("/users", UserRoutes);
apiRouter.use("/problems", ProblemRoutes);
apiRouter.use("/submissions", SubmissionRoutes);
apiRouter.use("/testcases", TestcaseRoutes);
apiRouter.use("/playground", PlaygroundRoutes);
app.use("/api", apiRouter);

// DB Connection
const mongoUrl = process.env.DB_URL;
if (!mongoUrl) {
  console.error("Missing DB_URL in .env");
} else {
  mongoose.connect(mongoUrl)
    .then(() => {
      console.log(`DB server connected`);
      return seedDefaultProblems();
    })
    .then(() => {
      console.log("Default problems seeded");
    })
    .catch(err => {
      console.error("DB connection error details:");
      console.error("Error Name:", err.name);
      console.error("Error Message:", err.message);
    });
}

// Basic Routes
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Coding Platform API is running",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: `Path ${req.url} is invalid` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Error handler:", err);
  
  if (err.name === "ValidationError") {
    return res.status(400).json({ message: "Validation error", error: err.message });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid ID format", error: err.message });
  }

  res.status(500).json({ 
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : "Internal Server Error"
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
