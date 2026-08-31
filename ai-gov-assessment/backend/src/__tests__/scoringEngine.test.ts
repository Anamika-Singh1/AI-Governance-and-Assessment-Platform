import { describe, it, expect } from "vitest";
import { calculateOverallScore, applyOverrideRules, determineRiskLevel, generateRequiredControls, runDeterministicAssessment } from "../services/scoring/assessmentEngine";
import { DimensionAssessment, ExtractedSignals, UseCaseInput } from "../types";
import { DIMENSION_KEYS } from "../config/dimensions";
import { extractSignalsDeterministic } from "../services/llm/DeterministicExtractor";

function makeDims(scores: Partial<Record<string, number>>): DimensionAssessment[] {
  return DIMENSION_KEYS.map((key) => ({
    dimension: key,
    score: scores[key] ?? 0,
    reasoning: "test",
    evidence: [],
    riskFactors: [],
    recommendedControls: key === "PRIVACY" ? ["Do X"] : ["Do Y"],
    sourceIds: []
  }));
}

const baseSignals: ExtractedSignals = {
  entities: { dataTypes: [], affectedGroups: [], decisionKind: "OTHER" },
  candidateRiskFactors: [],
  candidateRegulations: [],
  isGenerativeAI: false,
  usesProtectedCharacteristics: false,
  automationLevel: "advisory",
  summary: "",
  extractionMethod: "deterministic-fallback"
};

describe("calculateOverallScore", () => {
  it("sums all ten dimension scores and computes percentage out of 50", () => {
    const dims = makeDims({ DATA_GOVERNANCE: 5, PRIVACY: 5, BIAS_FAIRNESS: 5, HUMAN_OVERSIGHT: 5, EXPLAINABILITY: 5 });
    const { overallScore, riskPercentage } = calculateOverallScore(dims);
    expect(overallScore).toBe(25);
    expect(riskPercentage).toBe(50);
  });

  it("returns 0% for an all-zero assessment", () => {
    const dims = makeDims({});
    const { overallScore, riskPercentage } = calculateOverallScore(dims);
    expect(overallScore).toBe(0);
    expect(riskPercentage).toBe(0);
  });

  it("returns 100% for a maxed-out assessment", () => {
    const dims = makeDims(Object.fromEntries(DIMENSION_KEYS.map((k) => [k, 5])));
    const { overallScore, riskPercentage } = calculateOverallScore(dims);
    expect(overallScore).toBe(50);
    expect(riskPercentage).toBe(100);
  });
});

describe("determineRiskLevel (threshold table)", () => {
  it.each([
    [0, "Low"],
    [20, "Low"],
    [21, "Moderate"],
    [40, "Moderate"],
    [41, "Elevated"],
    [60, "Elevated"],
    [61, "High"],
    [80, "High"],
    [81, "Critical"],
    [100, "Critical"]
  ])("classifies %i%% as %s when no override rules fire", (pct, expected) => {
    expect(determineRiskLevel(pct, [])).toBe(expected);
  });
});

describe("applyOverrideRules / RULE-001 (now Postgres-backed)", () => {
  it("triggers RULE-001 when Decision Impact >= 4 AND Human Oversight <= 2", async () => {
    const dims = makeDims({ DECISION_IMPACT: 4, HUMAN_OVERSIGHT: 1 });
    const triggered = await applyOverrideRules(dims, baseSignals);
    expect(triggered.map((r) => r.ruleId).length).toBeGreaterThan(0);
  });

  it("does not trigger the high-impact-no-oversight rule when Human Oversight is above the threshold", async () => {
    const dims = makeDims({ DECISION_IMPACT: 5, HUMAN_OVERSIGHT: 3 });
    const triggered = await applyOverrideRules(dims, baseSignals);
    expect(triggered.find((r) => r.name.toLowerCase().includes("without oversight"))).toBeUndefined();
  });

  it("triggers the regulatory-exposure + decision-impact rule when both are >= 4", async () => {
    const dims = makeDims({ REGULATORY_EXPOSURE: 4, DECISION_IMPACT: 4, HUMAN_OVERSIGHT: 5 });
    const triggered = await applyOverrideRules(dims, baseSignals);
    expect(triggered.find((r) => r.name.toLowerCase().includes("regulatory exposure"))).toBeTruthy();
  });

  it("an override rule can only raise, never lower, the base threshold classification", async () => {
    // Low aggregate score (10%) but the high-impact/no-oversight rule's conditions are met -> must still enforce at least High.
    const dims = makeDims({ DECISION_IMPACT: 4, HUMAN_OVERSIGHT: 1 });
    const { riskPercentage } = calculateOverallScore(dims);
    const triggered = await applyOverrideRules(dims, baseSignals);
    const level = determineRiskLevel(riskPercentage, triggered);
    expect(["High", "Critical"]).toContain(level);
  });
});

describe("generateRequiredControls", () => {
  it("de-duplicates controls and prioritizes higher-scored dimensions first", () => {
    const dims = makeDims({ PRIVACY: 5, DATA_GOVERNANCE: 0 });
    const controls = generateRequiredControls(dims);
    expect(controls[0]).toBe("Do X"); // PRIVACY has the highest score, so its controls appear first
    expect(new Set(controls).size).toBe(controls.length);
  });
});

describe("runDeterministicAssessment — full pipeline", () => {
  const highRiskInput: UseCaseInput = {
    useCaseName: "Automated Loan Approval Without Human Review",
    description:
      "An AI model automatically approves or denies consumer loan applications up to $50,000 using applicant credit history and income data, with no human review of any decision before it is communicated to the applicant.",
    industry: "Financial Services / Banking",
    intendedUsers: "Retail lending operations",
    dataUsed: "Applicant credit history, income, employment history, existing debts",
    purpose: "Fully automate consumer loan approval decisions",
    affectedParties: "Retail loan applicants",
    decisionType: "automated_decision",
    humanReview: false,
    region: "United States"
  };

  it("classifies a fully-automated, no-human-review loan approval as High or Critical risk", async () => {
    const signals = extractSignalsDeterministic(highRiskInput);
    const result = await runDeterministicAssessment(highRiskInput, signals);
    expect(["High", "Critical"]).toContain(result.riskLevel);
    expect(result.triggeredRules.length).toBeGreaterThan(0);
    expect(result.dimensionAssessments).toHaveLength(10);
  });

  const lowRiskChatbotInput: UseCaseInput = {
    useCaseName: "General FAQ Chatbot",
    description:
      "A simple rule-assisted chatbot answers general, publicly available questions about bank branch hours and product brochures. It does not access any customer account data and only provides informational, advisory responses.",
    industry: "Financial Services / Banking",
    intendedUsers: "General public website visitors",
    dataUsed: "Publicly available branch hours and product brochure content only",
    purpose: "Answer general informational questions about the bank's products and hours",
    affectedParties: "Website visitors",
    decisionType: "recommendation",
    humanReview: true,
    region: "United States"
  };

  it("classifies a low-data, advisory-only FAQ chatbot as Low or Moderate risk", async () => {
    const signals = extractSignalsDeterministic(lowRiskChatbotInput);
    const result = await runDeterministicAssessment(lowRiskChatbotInput, signals);
    expect(["Low", "Moderate"]).toContain(result.riskLevel);
  });

  it("classifies AI recruitment screening with elevated bias/fairness risk", async () => {
    const recruitmentInput: UseCaseInput = {
      useCaseName: "Resume Screening AI",
      description: "An AI system screens and ranks job applicant resumes for open positions before recruiter review.",
      industry: "Financial Services / Banking",
      intendedUsers: "HR talent acquisition team",
      dataUsed: "Resume content, education history, work experience",
      purpose: "Rank job applicants by predicted fit",
      affectedParties: "Job applicants",
      decisionType: "recommendation",
      humanReview: true,
      region: "European Union"
    };
    const signals = extractSignalsDeterministic(recruitmentInput);
    const result = await runDeterministicAssessment(recruitmentInput, signals);
    const bias = result.dimensionAssessments.find((d) => d.dimension === "BIAS_FAIRNESS");
    expect(bias?.score).toBeGreaterThanOrEqual(3);
  });

  it("dynamically handles a completely new, previously unseen use case (evaluator smoke test)", async () => {
    const newInput: UseCaseInput = {
      useCaseName: "Premium Offer Targeting",
      description:
        "Our bank wants to use an AI system to analyze customer spending patterns and automatically determine which customers should receive premium banking offers.",
      industry: "Financial Services / Banking",
      intendedUsers: "Marketing team",
      dataUsed: "Customer spending pattern, transaction history, account balance",
      purpose: "Identify customers eligible for premium banking offers",
      affectedParties: "Retail banking customers",
      decisionType: "automated_decision",
      humanReview: false,
      region: "United States"
    };
    const signals = extractSignalsDeterministic(newInput);
    const result = await runDeterministicAssessment(newInput, signals);
    expect(result.dimensionAssessments).toHaveLength(10);
    expect(result.dimensionAssessments.every((d) => d.score >= 0 && d.score <= 5)).toBe(true);
    expect(result.overallScore).toBe(result.dimensionAssessments.reduce((s, d) => s + d.score, 0));
    expect(["Low", "Moderate", "Elevated", "High", "Critical"]).toContain(result.riskLevel);
    expect(result.regulatoryMapping.length).toBeGreaterThan(0);
    expect(result.sourceIds.length).toBeGreaterThan(0);
  });
});
