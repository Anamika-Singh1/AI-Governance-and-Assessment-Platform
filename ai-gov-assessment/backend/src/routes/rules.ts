import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { getRulesHandler, getMethodologyHandler } from "../controllers/rulesController";

const router = Router();
router.get("/rules", asyncHandler(getRulesHandler));
router.get("/methodology", asyncHandler(getMethodologyHandler));

export default router;
