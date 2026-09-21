import { Request, Response } from "express";
import { useCaseInputSchema, AppError } from "../utils/validation";
import { createUseCase, getUseCaseById, listUseCases } from "../services/useCase/useCaseService";

/** POST /api/use-cases — validation -> use-case structuring (LLM/deterministic extraction) -> persistence. No scoring happens here. */
export async function createUseCaseHandler(req: Request, res: Response) {
  const parsed = useCaseInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid use case input.", details: parsed.error.issues });
  }
  const useCase = await createUseCase(parsed.data, req.user!.id);
  res.status(201).json({
    id: useCase.id,
    ...useCase.input,
    extractedSignals: useCase.signals,
    structured: useCase.structured,
    createdAt: useCase.createdAt,
    updatedAt: useCase.updatedAt
  });
}

export async function listUseCasesHandler(req: Request, res: Response) {
  const limit = Math.min(parseInt((req.query.limit as string) || "50", 10) || 50, 200);
  const offset = Math.max(parseInt((req.query.offset as string) || "0", 10) || 0, 0);
  const { items, total } = await listUseCases(limit, offset, req.user!.id);
  res.json({ items, total, limit, offset });
}

export async function getUseCaseHandler(req: Request, res: Response) {
  const useCase = await getUseCaseById(req.params.id, req.user!.id);
  if (!useCase) throw new AppError("Use case not found.", 404, "NOT_FOUND");
  res.json({
    id: useCase.id,
    ...useCase.input,
    extractedSignals: useCase.signals,
    structured: useCase.structured,
    createdAt: useCase.createdAt,
    updatedAt: useCase.updatedAt
  });
}
