import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { pgPool } from "../database/pool";
import { seedSources } from "../repositories/sourceRepository";

describe("POST /api/sources/import (CSV, integration)", () => {
  const app = createApp();
  const authHeader = { Authorization: `Bearer ${process.env.API_KEY}` };
  const testSourceId = "test-csv-import-source";

  const csv = [
    "id,title,url,publisher,sourceType,jurisdiction,publicationDate,description,confidence,tags",
    `${testSourceId},CSV Test Source,https://example.com/test-source,Test Publisher,Regulatory Guidance,Global,2025-01-01,"A source added purely to verify the CSV import path, tagged for privacy and monitoring.",high,privacy;monitoring`
  ].join("\n");

  beforeAll(async () => {
    await seedSources({ verifyLive: false });
  });

  afterAll(async () => {
    // Leave the seeded catalog exactly as other tests expect it.
    await pgPool.query(`DELETE FROM source_chunks WHERE source_id = $1`, [testSourceId]);
    await pgPool.query(`DELETE FROM sources WHERE id = $1`, [testSourceId]);
  });

  it("rejects import without an API key", async () => {
    const res = await request(app).post("/api/sources/import").set("Content-Type", "text/csv").send(csv);
    expect(res.status).toBe(401);
  });

  it("imports a valid CSV, chunking/embedding the new source and making it retrievable via GET /api/sources", async () => {
    const res = await request(app)
      .post("/api/sources/import")
      .set(authHeader)
      .set("Content-Type", "text/csv")
      .send(csv);

    expect(res.status).toBe(201);
    expect(res.body.insertedCount).toBe(1);
    expect(res.body.updatedCount).toBe(0);
    expect(res.body.chunksWritten).toBeGreaterThan(0);
    expect(res.body.sourceIds).toEqual([testSourceId]);
    expect(res.body.errors).toEqual([]);

    const listRes = await request(app).get("/api/sources");
    const imported = listRes.body.sources.find((s: any) => s.id === testSourceId);
    expect(imported).toBeTruthy();
    expect(imported.sourceType).toBe("Regulatory Guidance");
    expect(imported.reliabilityTier).toBe(2);
    expect(imported.verified).toBe(true);

    const chunkRes = await pgPool.query(`SELECT dimension_tags FROM source_chunks WHERE source_id = $1`, [testSourceId]);
    expect(chunkRes.rows.length).toBeGreaterThan(0);
    const tags = chunkRes.rows[0].dimension_tags;
    expect(tags).toEqual(expect.arrayContaining(["PRIVACY", "MONITORING"]));
  });

  it("re-importing the same id updates rather than duplicates, and JSON {csv:...} body works the same as raw text/csv", async () => {
    const updatedCsv = csv.replace("A source added purely", "An UPDATED description, added purely");
    const res = await request(app)
      .post("/api/sources/import")
      .set(authHeader)
      .send({ csv: updatedCsv });

    expect(res.status).toBe(201);
    expect(res.body.insertedCount).toBe(0);
    expect(res.body.updatedCount).toBe(1);

    const countRes = await pgPool.query(`SELECT count(*) FROM sources WHERE id = $1`, [testSourceId]);
    expect(Number(countRes.rows[0].count)).toBe(1);
  });

  it("imports valid rows and reports errors for invalid rows in the same file, without failing the whole batch", async () => {
    const mixedCsv = [
      "id,title,url,publisher,sourceType,jurisdiction,publicationDate,description,confidence,tags",
      "test-csv-import-good,Good Row,https://example.com/good,Pub,Research,Global,,A good row.,,",
      "test-csv-import-bad,Bad Row,not-a-url,Pub,Research,Global,,A bad row.,,"
    ].join("\n");

    const res = await request(app).post("/api/sources/import").set(authHeader).set("Content-Type", "text/csv").send(mixedCsv);

    expect(res.status).toBe(201);
    expect(res.body.insertedCount).toBe(1);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toContain("http");

    await pgPool.query(`DELETE FROM source_chunks WHERE source_id = $1`, ["test-csv-import-good"]);
    await pgPool.query(`DELETE FROM sources WHERE id = $1`, ["test-csv-import-good"]);
  });

  it("returns 400 when the request has no CSV content", async () => {
    const res = await request(app).post("/api/sources/import").set(authHeader).set("Content-Type", "text/csv").send("");
    expect(res.status).toBe(400);
  });
});
