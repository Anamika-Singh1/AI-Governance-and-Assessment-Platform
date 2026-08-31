import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { pgPool } from "../database/pool";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * Assigns a request ID to every inbound request (echoed back as
 * X-Request-Id) and, on completion, writes a structured log line PLUS
 * an audit_logs row keyed by that request ID — the mechanism that lets
 * an investigator answer "what happened for request X" after the fact
 * (Observability section of the spec). DB writes are fire-and-forget
 * and never block or fail the response.
 */
export function auditLog(req: Request, res: Response, next: NextFunction) {
  req.requestId = req.header("x-request-id") || randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs,
        ip: req.ip
      })
    );

    pgPool
      .query(
        `INSERT INTO audit_logs (request_id, actor, action, entity_type, detail_json)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          req.requestId,
          req.ip || "unknown",
          `${req.method} ${req.path}`,
          "http_request",
          JSON.stringify({ status: res.statusCode, durationMs })
        ]
      )
      .catch(() => {
        // Audit logging is best-effort — a DB hiccup here must never
        // affect the already-sent response or crash the process.
      });
  });
  next();
}
