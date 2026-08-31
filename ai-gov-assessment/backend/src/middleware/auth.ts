import { Request, Response, NextFunction } from "express";
import { config } from "../config/env";

/**
 * Simple bearer-token auth for write endpoints. This is intentionally
 * lightweight (Section 22: "API authentication") — for a production
 * deployment this would be replaced with a full identity provider, but
 * it demonstrates that write access is gated and keys are never
 * exposed to the frontend bundle (the frontend reads this key from its
 * own server-side proxy / env, never hardcodes it into client JS).
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  if (!token || token !== config.apiKey) {
    return res.status(401).json({ error: "Unauthorized", message: "A valid API key is required (Authorization: Bearer <API_KEY>)." });
  }
  next();
}
