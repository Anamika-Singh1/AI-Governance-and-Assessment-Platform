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

export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  app.use(helmet());

  app.use(
    cors({
      origin: config.corsOrigin,
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"]
    })
  );

  app.use(
    express.json({
      limit: "256kb"
    })
  );

  app.use(
    morgan(
      config.nodeEnv === "test"
        ? "silent"
        : "tiny"
    )
  );

  app.use(auditLog);

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

  // Root route
  app.get("/", (_req, res) => {
    res.json({
      status: "ok",
      message: "AI Governance Assessment API is running",
      health: "/api/health"
    });
  });

  // Health route
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

  // 404
  app.use(notFoundHandler);

  // Error handler
  app.use(errorHandler);

  return app;
}

const app = createApp();

export default app;