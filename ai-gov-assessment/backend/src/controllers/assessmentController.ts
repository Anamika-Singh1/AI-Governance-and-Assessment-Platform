import { Request, Response } from "express";
import { runAssessmentSchema, AppError } from "../utils/validation";
import { runAssessment, getAssessmentById, listAssessments, getDimensionsForAssessment } from "../services/assessment/assessmentService";
import { getSourcesByIds } from "../repositories/sourceRepository";

/** POST /api/assessments — { useCaseId } for an already-created use case (see POST /api/use-cases). Runs deterministic scoring against the stored, previously-extracted signals. */
export async function createAssessment(req: Request, res: Response) {
  const parsed = runAssessmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid request. Expected { useCaseId } — create a use case first via POST /api/use-cases.", details: parsed.error.issues });
  }
  const stored = await runAssessment(parsed.data.useCaseId, req.user!.id);
  res.status(201).json(stored);
}

export async function listAssessmentsHandler(req: Request, res: Response) {
  const items = await listAssessments(req.user!.id);
  res.json(items);
}

export async function getAssessmentHandler(req: Request, res: Response) {
  const item = await getAssessmentById(req.params.id, req.user!.id);
  if (!item) throw new AppError("Assessment not found.", 404, "NOT_FOUND");
  res.json(item);
}

/** POST /api/assessments/:id/run — re-runs the deterministic engine against the SAME use case's already-stored extraction signals (no LLM call), producing a new assessment record — useful after a governance-rules change. */
export async function rerunAssessmentHandler(req: Request, res: Response) {
  const existing = await getAssessmentById(req.params.id, req.user!.id);
  if (!existing) throw new AppError("Assessment not found.", 404, "NOT_FOUND");
  const rerun = await runAssessment(req.params.id, req.user!.id);
  res.status(201).json(rerun);
}

export async function getFindingsHandler(req: Request, res: Response) {
  const item = await getAssessmentById(req.params.id, req.user!.id);
  if (!item) throw new AppError("Assessment not found.", 404, "NOT_FOUND");
  res.json(item.findings);
}

export async function getAssessmentSourcesHandler(req: Request, res: Response) {
  const item = await getAssessmentById(req.params.id, req.user!.id);
  if (!item) throw new AppError("Assessment not found.", 404, "NOT_FOUND");
  const sources = await getSourcesByIds(item.sourceIds);
  res.json(sources);
}

export async function getAssessmentDimensionsHandler(req: Request, res: Response) {
  const item = await getAssessmentById(req.params.id, req.user!.id);
  if (!item) throw new AppError("Assessment not found.", 404, "NOT_FOUND");
  const dims = await getDimensionsForAssessment(req.params.id);
  res.json(dims.length ? dims : item.dimensionAssessments);
}
