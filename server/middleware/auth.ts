import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username?: string;
        email?: string;
        role?: string;
      };
    }
  }
}

// Middleware to attach full user info to req.user if needed
export async function attachUser(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: "Authentication required" });

    // Use storage.getUser instead of storage.getUserById
    const user = await storage.getUser(req.user.id);
    if (!user) return res.status(401).json({ error: "User not found" });

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err) {
    console.error("attachUser error:", err);
    res.status(500).json({ error: "Failed to attach user" });
  }
}

// Middleware to enforce admin-only access
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
