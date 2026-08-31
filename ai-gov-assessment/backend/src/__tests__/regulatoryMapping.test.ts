import { describe, it, expect } from "vitest";
import { computeRegulatoryMapping } from "../services/research/regulatoryMapping";
import { UseCaseInput } from "../types";

const euLoanUseCase: UseCaseInput = {
  useCaseName: "EU Loan Approval",
  description: "AI-based credit approval for consumer loans processed automatically.",
  industry: "Financial Services / Banking",
  intendedUsers: "Lending team",
  dataUsed: "Credit history, income",
  purpose: "Automate credit approval",
  affectedParties: "Loan applicants",
  decisionType: "automated_decision",
  humanReview: false,
  region: "European Union"
};

const genericAdvisoryUseCase: UseCaseInput = {
  useCaseName: "Internal Analytics Tool",
  description: "An internal analytics dashboard summarizing aggregate branch foot-traffic trends for management reporting.",
  industry: "Financial Services / Banking",
  intendedUsers: "Branch operations management",
  dataUsed: "Aggregate, anonymized foot-traffic counts",
  purpose: "Support internal operational planning",
  affectedParties: "Internal management",
  decisionType: "recommendation",
  humanReview: true,
  region: "Global"
};

describe("Regulatory mapping", () => {
  it("marks EU AI Act as Applicable for an EU credit-decision use case (keyword + region match)", () => {
    const mapping = computeRegulatoryMapping(euLoanUseCase);
    const aiAct = mapping.find((m) => m.regulationId === "eu-ai-act");
    expect(aiAct?.applicability).toBe("Applicable");
    expect(aiAct?.whyPotentiallyRelevant).toBeTruthy();
    expect(aiAct?.jurisdiction).toBe("European Union");
  });

  it("never claims Applicable for a jurisdiction-specific law when the region does not match", () => {
    const mapping = computeRegulatoryMapping({ ...euLoanUseCase, region: "India" });
    const ecoa = mapping.find((m) => m.regulationId === "us-ecoa-reg-b");
    expect(ecoa?.applicability === "Applicable").toBe(false);
  });

  it("still surfaces universally-relevant voluntary guidance (NIST AI RMF, ISO 42001/23894) as Potentially Applicable regardless of region", () => {
    const mapping = computeRegulatoryMapping(genericAdvisoryUseCase);
    const nist = mapping.find((m) => m.regulationId === "nist-ai-rmf");
    expect(nist?.applicability).toBe("Potentially Applicable");
  });

  it("every mapping entry carries a jurisdiction, applicability conditions, and a source id (never a bare assertion)", () => {
    const mapping = computeRegulatoryMapping(euLoanUseCase);
    for (const entry of mapping) {
      expect(entry.jurisdiction).toBeTruthy();
      expect(entry.applicabilityConditions).toBeTruthy();
      expect(entry.sourceId).toBeTruthy();
      expect(["Applicable", "Potentially Applicable", "Not Applicable", "Needs Legal Review"]).toContain(entry.applicability);
    }
  });
});
