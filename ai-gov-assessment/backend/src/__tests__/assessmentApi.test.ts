import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { seedSources } from "../repositories/sourceRepository";

const validPayload = {
  useCaseName: "Test Fraud Detection System",
  description: "An AI system flags potentially fraudulent transactions for review by a fraud analyst before any account action is taken.",
  industry: "Financial Services / Banking",
  intendedUsers: "Fraud operations team",
  dataUsed: "Transaction amount, location, device fingerprint",
  purpose: "Detect potentially fraudulent transactions",
  affectedParties: "Cardholders",
  decisionType: "recommendation",
  humanReview: true,
  region: "United States"
};

describe("Use Case + Assessment API (integration)", () => {
  const app = createApp();
  const authHeader = { Authorization: `Bearer ${process.env.API_KEY}` };

  beforeAll(async () => {
    await seedSources({ verifyLive: false });
  });

  it("rejects use-case creation without an API key", async () => {
    const res = await request(app).post("/api/use-cases").send(validPayload);
    expect(res.status).toBe(401);
  });

  it("rejects an invalid use-case payload with a 400 and validation details", async () => {
    const res = await request(app)
      .post("/api/use-cases")
      .set(authHeader)
      .send({ ...validPayload, description: "too short" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });

  it("rejects assessment creation without an API key", async () => {
    const res = await request(app).post("/api/assessments").send({ useCaseId: "00000000-0000-0000-0000-000000000000" });
    expect(res.status).toBe(401);
  });

  it("rejects assessment creation for a malformed useCaseId", async () => {
    const res = await request(app).post("/api/assessments").set(authHeader).send({ useCaseId: "not-a-uuid" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });

  it("creates a use case, then runs a repeatable, evidence-based assessment against it", async () => {
    const ucRes = await request(app).post("/api/use-cases").set(authHeader).send(validPayload);
    expect(ucRes.status).toBe(201);
    expect(ucRes.body.id).toBeTruthy();
    expect(ucRes.body.extractedSignals).toBeTruthy();
    expect(ucRes.body.structured).toBeTruthy();
    const useCaseId = ucRes.body.id;

    const listUcRes = await request(app).get("/api/use-cases");
    expect(listUcRes.status).toBe(200);
    expect(listUcRes.body.items.some((u: any) => u.id === useCaseId)).toBe(true);

    const getUcRes = await request(app).get(`/api/use-cases/${useCaseId}`);
    expect(getUcRes.status).toBe(200);
    expect(getUcRes.body.useCaseName).toBe(validPayload.useCaseName);

    const res = await request(app).post("/api/assessments").set(authHeader).send({ useCaseId });
    expect(res.status).toBe(201);
    expect(res.body.useCaseId).toBe(useCaseId);
    expect(res.body.dimensionAssessments).toHaveLength(10);
    expect(res.body.riskLevel).toBeTruthy();
    expect(res.body.sourceIds.length).toBeGreaterThan(0);
    expect(res.body.auditTrail.length).toBeGreaterThan(0);

    const getRes = await request(app).get(`/api/assessments/${useCaseId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.useCaseName).toBe(validPayload.useCaseName);

    const findingsRes = await request(app).get(`/api/assessments/${useCaseId}/findings`);
    expect(findingsRes.status).toBe(200);
    expect(findingsRes.body).toHaveLength(10);

    const sourcesRes = await request(app).get(`/api/assessments/${useCaseId}/sources`);
    expect(sourcesRes.status).toBe(200);
    expect(Array.isArray(sourcesRes.body)).toBe(true);
    expect(sourcesRes.body.length).toBeGreaterThan(0);

    // Re-run: must reuse the stored extraction (no LLM call) and stay deterministic.
    const rerunRes = await request(app).post(`/api/assessments/${useCaseId}/run`).set(authHeader).send();
    expect(rerunRes.status).toBe(201);
    expect(rerunRes.body.overallScore).toBe(res.body.overallScore);
    expect(rerunRes.body.riskLevel).toBe(res.body.riskLevel);
  });

  it("returns 404 for an unknown assessment id", async () => {
    const res = await request(app).get("/api/assessments/does-not-exist");
    expect(res.status).toBe(404);
  });

  it("returns 404 when running an assessment for an unknown use case id", async () => {
    const res = await request(app).post("/api/assessments").set(authHeader).send({ useCaseId: "00000000-0000-0000-0000-000000000000" });
    expect(res.status).toBe(404);
  });

  it("lists sources filterable by source type", async () => {
    const res = await request(app).get("/api/sources").query({ sourceType: "Law / Regulation" });
    expect(res.status).toBe(200);
    expect(res.body.sources.every((s: any) => s.sourceType === "Law / Regulation")).toBe(true);
  });

  it("exposes the methodology and rules endpoints for auditability", async () => {
    const rulesRes = await request(app).get("/api/rules");
    expect(rulesRes.status).toBe(200);
    expect(rulesRes.body.overrideRules.length).toBeGreaterThan(0);
    expect(rulesRes.body.governanceRules.length).toBeGreaterThan(0);

    const methodologyRes = await request(app).get("/api/methodology");
    expect(methodologyRes.status).toBe(200);
    expect(methodologyRes.body.dimensions).toHaveLength(10);
    expect(methodologyRes.body.aiUsageStatement).toContain("deterministic");
  });
});
