import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { requireApiKey } from "../middleware/auth";
import { createUseCaseHandler, listUseCasesHandler, getUseCaseHandler } from "../controllers/useCaseController";

const router = Router();
router.post("/", requireApiKey, asyncHandler(createUseCaseHandler));
router.get("/", requireApiKey, asyncHandler(listUseCasesHandler));
router.get("/:id", requireApiKey, asyncHandler(getUseCaseHandler));

export default router;
