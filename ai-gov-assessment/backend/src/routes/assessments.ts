import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { requireApiKey } from "../middleware/auth";
import {
  createAssessment,
  listAssessmentsHandler,
  getAssessmentHandler,
  rerunAssessmentHandler,
  getFindingsHandler,
  getAssessmentSourcesHandler,
  getAssessmentDimensionsHandler
} from "../controllers/assessmentController";

const router = Router();

router.post("/", requireApiKey, asyncHandler(createAssessment));
router.get("/", requireApiKey, asyncHandler(listAssessmentsHandler));
router.get("/:id", requireApiKey, asyncHandler(getAssessmentHandler));
router.post("/:id/run", requireApiKey, asyncHandler(rerunAssessmentHandler));
router.get("/:id/findings", requireApiKey, asyncHandler(getFindingsHandler));
router.get("/:id/sources", requireApiKey, asyncHandler(getAssessmentSourcesHandler));
router.get("/:id/dimensions", requireApiKey, asyncHandler(getAssessmentDimensionsHandler));

export default router;
