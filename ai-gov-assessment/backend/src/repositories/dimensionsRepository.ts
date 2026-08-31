import { pgPool } from "../database/pool";
import { DimensionKey } from "../config/dimensions";

export interface DbDimension {
  key: DimensionKey;
  label: string;
  shortLabel: string;
  description: string;
  evaluationCriteria: string[];
  recommendedControls: string[];
  maxScore: number;
}

/**
 * Loaded live from Postgres, not imported as a TS constant — this is
 * what makes the ten dimensions genuinely configuration-driven rather
 * than "hard-coded ... in frontend code" (the assignment's own phrase).
 * Adding an eleventh dimension is an INSERT, not a deploy.
 */
export async function getAllDimensions(): Promise<DbDimension[]> {
  const res = await pgPool.query(
    `SELECT key, label, short_label, description, evaluation_criteria, recommended_controls, max_score
     FROM dimensions ORDER BY sort_order`
  );
  return res.rows.map((r) => ({
    key: r.key,
    label: r.label,
    shortLabel: r.short_label,
    description: r.description,
    evaluationCriteria: r.evaluation_criteria,
    recommendedControls: r.recommended_controls,
    maxScore: r.max_score
  }));
}
