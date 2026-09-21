import { Request, Response } from "express";
import thresholds from "../config/thresholds.json";
import { REGULATORY_MAPPING_RULES } from "../rules/regulatoryMappingRules";
import { SOURCE_HIERARCHY_ORDER, SOURCE_TYPE_RELIABILITY } from "../config/sourceTypes";
import { config } from "../config/env";
import { getActiveGovernanceRules, getActiveOverrideRules } from "../repositories/rulesRepository";
import { getAllDimensions } from "../repositories/dimensionsRepository";

/** GET /api/rules — reads the ACTIVE rule set live from Postgres (governance_rules + override_rules), never a static bundled file. */
export async function getRulesHandler(_req: Request, res: Response) {
  const [governanceRules, overrideRules] = await Promise.all([getActiveGovernanceRules(), getActiveOverrideRules()]);
  res.json({
    thresholds: thresholds.thresholds,
    maxScore: thresholds.maxScore,
    governanceRules,
    overrideRules,
    rulesVersion: config.assessmentEngineVersion,
    regulatoryMappingRules: REGULATORY_MAPPING_RULES.map((r) => ({
      sourceId: r.sourceId,
      name: r.name,
      applicabilityConditions: r.applicabilityConditions
    }))
  });
}

export async function getMethodologyHandler(_req: Request, res: Response) {
  const [dimensions, overrideRules] = await Promise.all([getAllDimensions(), getActiveOverrideRules()]);
  res.json({
    dimensions,
    scoring: {
      scale: "0-5 per dimension, 10 dimensions",
      maxScore: thresholds.maxScore,
      formula: "riskPercentage = (sum of all 10 dimension scores / 50) * 100"
    },
    thresholds: thresholds.thresholds,
    overrideRules,
    rulesVersion: config.assessmentEngineVersion,
    assessmentEngineVersion: config.assessmentEngineVersion,
    sourceHierarchy: SOURCE_HIERARCHY_ORDER.map((t) => ({ sourceType: t, ...SOURCE_TYPE_RELIABILITY[t] })),
    aiUsageStatement:
      "The LLM generates dimension scores, risk levels, explanations, controls and regulatory applicability from the use case and supplied source references. The app validates output and calculates totals. New runs may differ. Thresholds and override rules shown here are legacy reference data, not applied to new LLM assessments.",
    legalDisclaimer:
      "This application provides governance research and risk-assessment support. It does not provide legal advice. Regulatory mapping indicates potential applicability only; consult qualified legal counsel to confirm applicability for any specific deployment."
  });
}
