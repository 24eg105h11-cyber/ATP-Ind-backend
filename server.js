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
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.BACKEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow requests from other valid deployment origins dynamically.
    // This avoids 403 failures when the frontend origin differs from env values.
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
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
const rawDbUrl = process.env.DB_URL;
const mongoUrl = rawDbUrl
  ? String(rawDbUrl).trim().replace(/^["']|["']$/g, "")
  : "";
const startServer = () => {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

if (!mongoUrl) {
  console.error("Missing DB_URL in .env");
  process.exit(1);
}

if (!/^mongodb(?:\+srv)?:\/\//i.test(mongoUrl)) {
  console.error("Invalid DB_URL scheme. DB_URL must start with mongodb:// or mongodb+srv://");
  console.error("Please check your environment variable value and remove any surrounding quotes or whitespace.");
  process.exit(1);
}

const needsDbName = mongoUrl.startsWith("mongodb+srv://") && (() => {
  try {
    const parsed = new URL(mongoUrl);
    return parsed.pathname === "/" || parsed.pathname === "";
  } catch {
    return true;
  }
})();

if (needsDbName) {
  console.error(
    "Invalid DB_URL: mongodb+srv URIs must include a database name. Example: mongodb+srv://user:pass@cluster0.b30nexh.mongodb.net/myDatabase?retryWrites=true&w=majority"
  );
  process.exit(1);
}

mongoose.connect(mongoUrl, {
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => {
    console.log(`DB server connected`);
    return seedDefaultProblems();
  })
  .then(() => {
    console.log("Default problems seeded");
    startServer();
  })
  .catch(err => {
    console.error("DB connection error details:");
    console.error("Error Name:", err.name);
    console.error("Error Message:", err.message);
    if (err.message.includes("querySrv")) {
      console.error(
        "SRV lookup failed. Check that your MongoDB Atlas cluster is reachable, your network/DNS allows SRV lookups, and your DB_URL is a valid mongodb+srv URI with a database name."
      );
      console.error(
        "If your network blocks SRV/DNS queries, use a standard mongodb:// connection string from Atlas instead of mongodb+srv://."
      );
    }
    process.exit(1);
  });

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

export default app;
