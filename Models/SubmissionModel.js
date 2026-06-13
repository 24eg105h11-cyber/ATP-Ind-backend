import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    problem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Problem",
        required: true
    },
    code: {
        type: String,
        required: true
    },
    language: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "wrong answer", "compilation error", "runtime error"],
        default: "pending"
    },
    executionTime: {
        type: Number // in ms
    },
    memoryUsed: {
        type: Number // in KB
    },
    passedCount: {
        type: Number,
        default: 0
    },
    totalCases: {
        type: Number,
        default: 0
    }
    ,
    output: {
        type: String
    },
    error: {
        type: String
    }
}, { timestamps: true });

export const Submission = mongoose.model("Submission", submissionSchema);
