import { UseCaseInput, AssessmentResult, AuditTrailEntry, DimensionAssessment } from "../types";

export interface StoredAssessment extends UseCaseInput, AssessmentResult {
  useCaseId: string;
  auditTrail: AuditTrailEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface StoredDimension extends DimensionAssessment {
  assessmentId: string;
  createdAt: string;
}

export interface AssessmentListItem {
  useCaseId: string;
  useCaseName: string;
  industry: string;
  region: string;
  overallScore: number;
  riskLevel: string;
  riskPercentage: number;
  createdAt: string;
}
