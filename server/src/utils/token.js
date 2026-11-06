import jwt from "jsonwebtoken";

export const SESSION_COOKIE = "tr_session";
const SESSION_DAYS = 7;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) {
    throw new Error("JWT_SECRET must be set to at least 32 characters");
  }
  return value;
}

export function signToken(userId) {
  return jwt.sign({ sub: userId }, secret(), { expiresIn: `${SESSION_DAYS}d` });
}

export function verifyToken(token) {
  return jwt.verify(token, secret());
}

export function sendSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MS,
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}
