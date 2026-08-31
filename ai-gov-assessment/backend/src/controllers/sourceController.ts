import { Request, Response } from "express";
import { listSources } from "../repositories/sourceRepository";
import { SOURCE_TYPES } from "../config/sourceTypes";

export async function listSourcesHandler(req: Request, res: Response) {
  const { sourceType, jurisdiction } = req.query as { sourceType?: string; jurisdiction?: string };
  let sources = await listSources();
  if (sourceType) sources = sources.filter((s) => s.sourceType === sourceType);
  if (jurisdiction) sources = sources.filter((s) => s.jurisdiction.toLowerCase().includes(jurisdiction.toLowerCase()));
  res.json({ sourceTypes: SOURCE_TYPES, sources });
}
