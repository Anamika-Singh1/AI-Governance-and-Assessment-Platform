// 
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { config } from "./config/env";
import assessmentsRouter from "./routes/assessments";
import useCasesRouter from "./routes/useCases";
import sourcesRouter from "./routes/sources";
import rulesRouter from "./routes/rules";
import {
  errorHandler,
  notFoundHandler
} from "./middleware/errorHandler";
import { auditLog } from "./middleware/auditLog";

/**
 * Creates and configures the Express application.
 *
 * Keeping this as a function is useful for:
 * - Local development
 * - Automated tests
 * - Vercel deployment
 */
export function createApp() {
  const app = express();

  // Disable Express identification header
  app.disable("x-powered-by");

  // Security headers
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: config.corsOrigin,
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"]
    })
  );

  // JSON body parser
  app.use(
    express.json({
      limit: "256kb"
    })
  );

  // Request logging
  app.use(
    morgan(
      config.nodeEnv === "test"
        ? "silent"
        : "tiny"
    )
  );

  // Audit logging
  app.use(auditLog);

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "RATE_LIMITED",
      message: "Too many requests. Please slow down."
    }
  });

  app.use("/api", limiter);

  // Health endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      version: config.assessmentEngineVersion
    });
  });

  // API routes
  app.use("/api/use-cases", useCasesRouter);
  app.use("/api/assessments", assessmentsRouter);
  app.use("/api/sources", sourcesRouter);
  app.use("/api", rulesRouter);

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}

/**
 * Vercel needs the Express application as the default export.
 */
const app = createApp();

export default app;