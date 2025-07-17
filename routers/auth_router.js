import express from "express";
import { User } from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  generateTokens,
  isAuth,
  blacklistAccessToken,
  refreshTokenStorage,
} from "../middleware/auth.js";

const REFRESH_SECRET = "C09GalleryRefresh";

export const authRouter = express.Router();

// Signup
authRouter.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(422)
      .json({ error: "Username and password are required" });
  }

  // Check if user already exists
  const userExists = await User.findOne({
    where: { username },
  });
  if (userExists) {
    return res
      .status(409)
      .json({ error: "User with this username already exists" });
  }

  // Salt and hash the password
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  // Create a new user
  const newUser = await User.create({
    username,
    password: hashedPassword,
  });

  try {
    await newUser.save();
    const { accessToken, refreshToken } = generateTokens(newUser);
    refreshTokenStorage.add(refreshToken);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    });

    res.status(201).json({
      message: `Signup successful for ${newUser.username}`,
      username: newUser.username,
      accessToken,
    });

    // res.json({ accessToken });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(422).json({ error: "User creation failed" });
  }
});

// Signin
authRouter.post("/signin", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(422)
      .json({ error: "Username and password are required" });
  }

  // Find user by username
  const user = await User.findOne({
    where: { username },
  });
  if (!user) {
    return res.status(401).json({ error: "Incorrect username or password" });
  }

  // Check password
  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Incorrect username or password" });
  }

  // Generate JWT token
  const { accessToken, refreshToken } = generateTokens(user);
  refreshTokenStorage.add(refreshToken);
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
  });

  return res.json({
    message: `Signin successful for ${user.username}`,
    accessToken,
  });
});

// me
authRouter.get("/me", isAuth({ required: true }), async (req, res) => {
  return res.json({
    isAuthenticated: true,
    userId: req.user.id,
    username: req.user.username,
  });
});

// Signout
authRouter.get("/signout", isAuth({ required: false }), (req, res) => {
  // Clear the refresh token from storage and cookies
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    refreshTokenStorage.delete(refreshToken);
    res.clearCookie("refreshToken");
  }

  // Blacklist the access token to prevent reuse
  if (req.token) {
    blacklistAccessToken(req.token);
  }

  return res.json({ message: "Signed out successfully" });
});

// Refresh token
authRouter.post("/refresh", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token is required" });
  }

  if (!refreshTokenStorage.has(refreshToken)) {
    return res.status(403).json({ error: "Invalid refresh token" });
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = await User.findOne({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // Remove old refresh token and add new one
    refreshTokenStorage.delete(refreshToken);
    refreshTokenStorage.add(newRefreshToken);

    // Set new refresh token in cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    });

    return res.json({
      message: "Token refreshed successfully",
      accessToken,
    });
  } catch (error) {
    return res.status(403).json({ error: "Invalid refresh token" });
  }
});
