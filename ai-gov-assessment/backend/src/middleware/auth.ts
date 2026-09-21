import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env";

export type UserRole = "ADMIN" | "ASSESSOR" | "REVIEWER" | "VIEWER";
export interface SessionUser { id: string; tenantId: string; email: string; name: string; role: UserRole }

declare global { namespace Express { interface Request { user?: SessionUser } } }

export function signSession(user: SessionUser) {
  return jwt.sign(user, config.jwtSecret, { expiresIn: config.sessionHours * 60 * 60 });
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie("aigov_session", token, { httpOnly: true, secure: config.nodeEnv === "production", sameSite: config.cookieSameSite, maxAge: config.sessionHours * 60 * 60 * 1000, path: "/" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.aigov_session;
  if (token) {
    try { req.user = jwt.verify(token, config.jwtSecret) as SessionUser; return next(); }
    catch { return res.status(401).json({ error: "SESSION_EXPIRED", message: "Your session has expired. Please sign in again." }); }
  }
  const header = req.header("authorization") || "";
  if (config.nodeEnv === "test" && header === `Bearer ${config.apiKey}`) return next();
  return res.status(401).json({ error: "AUTHENTICATION_REQUIRED", message: "Please sign in to continue." });
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: "FORBIDDEN", message: "You do not have permission to perform this action." });
    next();
  };
}

export const requireApiKey = requireAuth;
