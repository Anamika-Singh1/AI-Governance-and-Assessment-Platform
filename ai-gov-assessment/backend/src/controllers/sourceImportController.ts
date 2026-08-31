import { Request, Response } from "express";
import { AppError } from "../utils/validation";
import { importSourcesFromCsv } from "../services/sources/sourceImportService";

/**
 * POST /api/sources/import — add/update sources from a CSV file, no
 * code change or redeploy required. Accepts either raw CSV as the
 * request body (Content-Type: text/csv, parsed by the dedicated
 * express.text() middleware mounted only on this route — see app.ts)
 * or, for convenience from tools that only send JSON, {"csv": "..."}.
 */
export async function importSourcesCsvHandler(req: Request, res: Response) {
  const csvText = typeof req.body === "string" ? req.body : (req.body?.csv as string | undefined);
  if (!csvText || !csvText.trim()) {
    throw new AppError(
      'Provide CSV content as the raw request body (Content-Type: text/csv) or as {"csv": "..."} JSON.',
      400,
      "BAD_REQUEST"
    );
  }

  const result = await importSourcesFromCsv(csvText);
  const wroteNothing = result.insertedCount === 0 && result.updatedCount === 0;
  res.status(wroteNothing && result.errors.length > 0 ? 400 : 201).json(result);
}
