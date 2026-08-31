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
router.get("/", asyncHandler(listAssessmentsHandler));
router.get("/:id", asyncHandler(getAssessmentHandler));
router.post("/:id/run", requireApiKey, asyncHandler(rerunAssessmentHandler));
router.get("/:id/findings", asyncHandler(getFindingsHandler));
router.get("/:id/sources", asyncHandler(getAssessmentSourcesHandler));
router.get("/:id/dimensions", asyncHandler(getAssessmentDimensionsHandler));

export default router;
