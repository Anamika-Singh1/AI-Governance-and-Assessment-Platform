import { describe, it, expect } from "vitest";
import { CURATED_SOURCES } from "../rules/authoritativeSources";
import { SOURCE_TYPES, SOURCE_TYPE_RELIABILITY } from "../config/sourceTypes";
import { toSourceRecord } from "../services/sources/sourceCatalog";

describe("Source classification", () => {
  it("every curated source has a sourceType from the fixed 6-category list", () => {
    for (const source of CURATED_SOURCES) {
      expect(SOURCE_TYPES).toContain(source.sourceType);
    }
  });

  it("covers all 6 source type categories across the curated library", () => {
    const typesPresent = new Set(CURATED_SOURCES.map((s) => s.sourceType));
    for (const t of SOURCE_TYPES) {
      expect(typesPresent.has(t)).toBe(true);
    }
  });

  it("classifies known examples correctly (EU AI Act, NIST AI RMF, ISO 42001, arXiv paper, vendor page, Wikipedia)", () => {
    const byId = Object.fromEntries(CURATED_SOURCES.map((s) => [s.id, s]));
    expect(byId["eu-ai-act"].sourceType).toBe("Law / Regulation");
    expect(byId["nist-ai-rmf"].sourceType).toBe("Regulatory Guidance");
    expect(byId["iso-42001"].sourceType).toBe("Industry Standard");
    expect(byId["arxiv-model-cards"].sourceType).toBe("Research");
    expect(byId["vendor-watsonx-governance"].sourceType).toBe("Vendor Information");
    expect(byId["wikipedia-algorithmic-bias"].sourceType).toBe("General Web Content");
  });

  it("assigns a reliability tier consistent with the source-hierarchy (Law/Regulation is most authoritative)", () => {
    expect(SOURCE_TYPE_RELIABILITY["Law / Regulation"].tier).toBeLessThan(SOURCE_TYPE_RELIABILITY["Vendor Information"].tier);
    expect(SOURCE_TYPE_RELIABILITY["Vendor Information"].tier).toBeLessThan(SOURCE_TYPE_RELIABILITY["General Web Content"].tier);
  });

  it("produces a fully-populated SourceRecord with every required field (Section 3 data model)", () => {
    const record = toSourceRecord(CURATED_SOURCES[0]);
    for (const field of [
      "id",
      "title",
      "url",
      "publisher",
      "sourceType",
      "jurisdiction",
      "publicationDate",
      "lastVerifiedDate",
      "description",
      "reliabilityLevel"
    ]) {
      expect(record).toHaveProperty(field);
    }
  });

  it("never marks a low-confidence curated source as verified by default", () => {
    const lowConfidence = CURATED_SOURCES.find((s) => s.confidence === "needs-verification");
    expect(lowConfidence).toBeDefined();
    const record = toSourceRecord(lowConfidence!);
    expect(record.verified).toBe(false);
  });
});
