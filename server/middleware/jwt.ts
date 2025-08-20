import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";
const COOKIE_NAME = process.env.JWT_COOKIE_NAME || "token";

if (!JWT_SECRET) throw new Error("JWT_SECRET must be defined in .env");

interface JwtPayload {
  userId: number;
  isAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; isAdmin: boolean };
    }
  }
}

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function jwtMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Authentication required" });

  const payload = verifyJwt(token);
  if (!payload) return res.status(401).json({ error: "Invalid or expired token" });

  req.user = { id: payload.userId, isAdmin: payload.isAdmin };
  next();
}

export function setTokenCookie(res: Response, payload: JwtPayload) {
  const token = signJwt(payload);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
  });
}

export function clearTokenCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
}
