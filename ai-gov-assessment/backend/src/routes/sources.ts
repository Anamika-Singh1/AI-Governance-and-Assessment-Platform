import { Router } from "express";
import express from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { requireApiKey } from "../middleware/auth";
import { listSourcesHandler } from "../controllers/sourceController";
import { importSourcesCsvHandler } from "../controllers/sourceImportController";

const router = Router();
router.get("/", asyncHandler(listSourcesHandler));

// CSV bodies can reasonably be larger than the app-wide 256kb JSON
// limit (a source library of a few hundred rows), so this route gets
// its own text-body parser with a bigger cap rather than raising the
// limit for every other JSON endpoint.
router.post(
  "/import",
  requireApiKey,
  express.text({ type: ["text/csv", "text/plain"], limit: "5mb" }),
  asyncHandler(importSourcesCsvHandler)
);

export default router;
