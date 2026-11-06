import { User } from "../models/User.js";
import { SESSION_COOKIE, verifyToken } from "../utils/token.js";

function readToken(req) {
  const fromCookie = req.cookies?.[SESSION_COOKIE];
  if (fromCookie) return fromCookie;

  const header = req.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7);

  return null;
}

export async function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (!token) return next();

  try {
    const { sub } = verifyToken(token);
    req.user = await User.findById(sub);
  } catch {
    req.user = null;
  }

  next();
}

export async function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) {
    return res.status(401).json({ error: "Please sign in to continue" });
  }

  try {
    const { sub } = verifyToken(token);
    const user = await User.findById(sub);

    if (!user) {
      return res.status(401).json({ error: "Session is no longer valid" });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Session expired, please sign in again" });
  }
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, (error) => {
    if (error) return next(error);

    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Admin access only" });
    }

    next();
  });
}
