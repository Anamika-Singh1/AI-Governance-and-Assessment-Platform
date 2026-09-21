import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { pgPool } from "../database/pool";
import { config } from "../config/env";
import { requireAuth, setSessionCookie, signSession } from "../middleware/auth";

const router = Router();
const TENANT = "00000000-0000-0000-0000-000000000001";
const email = z.string().trim().email("Enter a valid email address.").transform(v => v.toLowerCase());
const credentials = z.object({ email, password: z.string().min(8, "Password must contain at least 8 characters.").max(128, "Password must contain at most 128 characters.") });
const emailSchema = z.object({ email });
const resetSchema = z.object({ token: z.string().min(32), password: z.string().min(8).max(128) });

router.post("/register", async (req, res, next) => {
  try {
    const input = credentials.extend({ name: z.string().trim().min(2, "Full name must contain at least 2 characters.").max(80, "Full name must contain at most 80 characters.") }).parse(req.body);
    const exists = await pgPool.query("SELECT 1 FROM users WHERE lower(email)=lower($1)", [input.email]);
    if (exists.rowCount) return res.status(409).json({ error: "EMAIL_EXISTS", message: "An account with this email already exists." });
    const hash = await bcrypt.hash(input.password, 12);
    const result = await pgPool.query("INSERT INTO users (tenant_id,email,password_hash,name,role) VALUES ($1,$2,$3,$4,'ASSESSOR') RETURNING id,tenant_id,email,name,role", [TENANT,input.email,hash,input.name]);
    const row=result.rows[0]; const user={id:row.id,tenantId:row.tenant_id,email:row.email,name:row.name,role:row.role};
    setSessionCookie(res, signSession(user)); return res.status(201).json({user});
  } catch (error) { next(error); }
});

router.post("/login", async (req, res, next) => {
  try {
    const input=credentials.parse(req.body);
    const result=await pgPool.query("SELECT id,tenant_id,email,password_hash,name,role FROM users WHERE lower(email)=lower($1)",[input.email]);
    const row=result.rows[0];
    if(!row || row.password_hash === "DISABLED" || !(await bcrypt.compare(input.password,row.password_hash))) return res.status(401).json({error:"INVALID_CREDENTIALS",message:"Incorrect email or password."});
    const user={id:row.id,tenantId:row.tenant_id,email:row.email,name:row.name,role:row.role};
    setSessionCookie(res,signSession(user)); return res.json({user});
  } catch(error){next(error);}
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = emailSchema.parse(req.body);
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const result = await pgPool.query(
      "UPDATE users SET reset_token_hash = $1, reset_token_expires_at = $2 WHERE lower(email) = lower($3) RETURNING id",
      [tokenHash, expiresAt, email]
    );
    const response: { message: string; resetToken?: string } = { message: "If an account exists for that email, reset instructions have been created." };
    if (result.rowCount && config.nodeEnv !== "production") response.resetToken = token;
    res.json(response);
  } catch (error) { next(error); }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, password } = resetSchema.parse(req.body);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const hash = await bcrypt.hash(password, 12);
    const result = await pgPool.query(
      `UPDATE users SET password_hash = $1, reset_token_hash = NULL, reset_token_expires_at = NULL
       WHERE reset_token_hash = $2 AND reset_token_expires_at > now()
       RETURNING id, tenant_id, email, name, role`,
      [hash, tokenHash]
    );
    if (!result.rowCount) return res.status(400).json({ error: "RESET_TOKEN_INVALID", message: "This reset link is invalid or expired." });
    const row = result.rows[0];
    const user = { id: row.id, tenantId: row.tenant_id, email: row.email, name: row.name, role: row.role };
    setSessionCookie(res, signSession(user));
    res.json({ user });
  } catch (error) { next(error); }
});

router.post("/logout", (_req,res)=>{res.clearCookie("aigov_session",{path:"/"});res.status(204).end();});
router.get("/me",requireAuth,(req,res)=>res.json({user:req.user}));
export default router;
