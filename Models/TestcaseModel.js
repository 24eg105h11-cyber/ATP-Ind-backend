import mongoose from "mongoose";

const testcaseSchema = new mongoose.Schema({
    problem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Problem",
        required: true
    },
    input: {
        type: String,
        required: true
    },
    expectedOutput: {
        type: String,
        required: true
    },
    isSample: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export const Testcase = mongoose.model("Testcase", testcaseSchema);
