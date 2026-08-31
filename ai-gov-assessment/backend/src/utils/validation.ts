import { z } from "zod";

export const useCaseInputSchema = z.object({
  useCaseName: z.string().trim().min(3, "useCaseName must be at least 3 characters").max(200),
  description: z.string().trim().min(20, "description must be at least 20 characters to allow meaningful analysis").max(5000),
  industry: z.string().trim().min(2).max(200),
  intendedUsers: z.string().trim().min(2).max(500),
  dataUsed: z.string().trim().min(2).max(2000),
  purpose: z.string().trim().min(2).max(1000),
  affectedParties: z.string().trim().min(2).max(1000),
  decisionType: z.enum(["recommendation", "automated_decision", "both"]),
  humanReview: z.boolean(),
  region: z.string().trim().min(2).max(200)
});

export type ValidatedUseCaseInput = z.infer<typeof useCaseInputSchema>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const runAssessmentSchema = z.object({
  useCaseId: z.string().regex(UUID_RE, "useCaseId must be a valid use case id (see POST /api/use-cases)")
});

export class AppError extends Error {
  statusCode: number;
  code: string;
  constructor(message: string, statusCode = 400, code = "BAD_REQUEST") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}
