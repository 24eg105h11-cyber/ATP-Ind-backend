import exp from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../Models/UserModel.js";
import { Submission } from "../Models/SubmissionModel.js";
import { verifyToken } from "../middleware/VerifyToken.js";

export const UserAPI = exp.Router();
const userApp = UserAPI;

const toUserPayload = (body) => {
  const payload = {
    username: body.username,
    email: body.email,
    password: body.password,
    role: body.role
  };

  Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

  return payload;
};

// Signup
userApp.post("/signup", async (req, res, next) => {
  try {
    const data = toUserPayload(req.body);
    
    const existingUser = await User.findOne({ $or: [{ email: data.email }, { username: data.username }] });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    const newUser = new User(data);
    await newUser.save();

    return res.status(201).json({ message: "User created", payload: { id: newUser._id, username: newUser.username, email: newUser.email } });
  } catch (err) {
    return next(err);
  }
});

// Login
userApp.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role, username: user.username },
      process.env.SECRET_KEY || process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful",
      payload: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// Logout
userApp.post("/logout", (req, res) => {
  res.clearCookie("token");
  return res.status(200).json({ message: "Logged out" });
});

// Get current user info (Silent check to avoid console noise)
userApp.get("/me", async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(200).json({ message: "Not logged in", payload: null });
    }

    const jwtSecret = process.env.SECRET_KEY || process.env.JWT_SECRET || "secret";
    const decoded = jwt.verify(token, jwtSecret);
    
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(200).json({ message: "User not found", payload: null });
    }

    return res.status(200).json({ message: "User profile fetched", payload: user });
  } catch (err) {
    // Return 200 with null payload for invalid/expired tokens to keep console clean
    return res.status(200).json({ message: "Session invalid or expired", payload: null });
  }
});

// Update profile
userApp.put("/profile", verifyToken("user", "admin"), async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updateData, { new: true }).select("-password");
    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ message: "Profile updated", payload: updatedUser });
  } catch (err) {
    return next(err);
  }
});

// Get all users (Admin only)
userApp.get("/admin/all-users", verifyToken("admin"), async (req, res, next) => {
  try {
    const users = await User.find().select("-password");
    return res.status(200).json({ message: "Users fetched", payload: users });
  } catch (err) {
    return next(err);
  }
});

// Delete a user (Admin only)
userApp.delete("/:userId", verifyToken("admin"), async (req, res, next) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.userId);
    if (!deletedUser) return res.status(404).json({ message: "User not found" });
    
    // Also delete all submissions by this user
    await Submission.deleteMany({ user: req.params.userId });
    
    return res.status(200).json({ message: "User deleted", payload: deletedUser });
  } catch (err) {
    return next(err);
  }
});

// Leaderboard
userApp.get("/leaderboard", async (req, res, next) => {
  try {
    const leaderboard = await Submission.aggregate([
      { $match: { status: "accepted" } },
      { 
        $group: { 
          _id: "$user", 
          uniqueProblems: { $addToSet: "$problem" } 
        } 
      },
      { 
        $project: { 
          user: "$_id", 
          solvedCount: { $size: "$uniqueProblems" } 
        } 
      },
      { $sort: { solvedCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: "$userDetails" },
      {
        $project: {
          _id: "$user",
          username: "$userDetails.username",
          solvedCount: 1
        }
      }
    ]);

    if (leaderboard.length === 0) {
      const topUsers = await User.find().limit(10).select("username");
      const mockLeaderboard = topUsers.map(u => ({ _id: u._id, username: u.username, solvedCount: 0 }));
      return res.status(200).json({ message: "Leaderboard fetched (no submissions yet)", payload: mockLeaderboard });
    }

    return res.status(200).json({ message: "Leaderboard fetched", payload: leaderboard });
  } catch (err) {
    return next(err);
  }
});

export default UserAPI;
