import express from "express";
import { rateLimit } from "express-rate-limit";
import { User } from "../models/User.js";
import { optionalAuth } from "../middleware/auth.js";
import {
  signToken,
  sendSessionCookie,
  clearSessionCookie,
} from "../utils/token.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function invalid(res, error, field) {
  return res.status(400).json({ error, field });
}

router.post("/register", authLimiter, async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  if (name.length < 2 || name.length > 60) {
    return invalid(res, "Enter your full name", "name");
  }
  if (!EMAIL_RE.test(email)) {
    return invalid(res, "Enter a valid email address", "email");
  }
  if (password.length < 8) {
    return invalid(res, "Password must be at least 8 characters", "password");
  }
  if (password.length > 128) {
    return invalid(res, "Password must be under 128 characters", "password");
  }

  if (await User.exists({ email })) {
    return res
      .status(409)
      .json({ error: "An account with this email already exists", field: "email" });
  }

  const user = await User.create({
    name,
    email,
    password,
    lastLoginAt: new Date(),
  });

  sendSessionCookie(res, signToken(user.id));
  res.status(201).json({ user: user.toPublicJSON() });
});

router.post("/login", authLimiter, async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  if (!email || !password) {
    return invalid(res, "Enter your email and password");
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.verifyPassword(password))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  sendSessionCookie(res, signToken(user.id));
  res.json({ user: user.toPublicJSON() });
});

router.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

router.get("/me", optionalAuth, (req, res) => {
  res.json({ user: req.user ? req.user.toPublicJSON() : null });
});

export default router;
