import { describe, it, expect } from "vitest";
import { parseCsv, parseSourcesCsv } from "../services/sources/csvParser";

const HEADER = "id,title,url,publisher,sourceType,jurisdiction,publicationDate,description,confidence,tags";

describe("parseCsv (generic RFC4180-ish parser)", () => {
  it("splits simple comma-separated rows", () => {
    const rows = parseCsv("a,b,c\n1,2,3\n");
    expect(rows).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"]
    ]);
  });

  it("handles quoted fields containing commas and escaped quotes", () => {
    const rows = parseCsv('a,b\n"hello, world","she said ""hi"""\n');
    expect(rows).toEqual([
      ["a", "b"],
      ["hello, world", 'she said "hi"']
    ]);
  });

  it("handles CRLF line endings and a final line with no trailing newline", () => {
    const rows = parseCsv("a,b\r\n1,2\r\n3,4");
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"]
    ]);
  });
});

describe("parseSourcesCsv (validation)", () => {
  it("parses a valid row into an UpsertableSource, deriving id from title and defaulting confidence", () => {
    const csv = `${HEADER}\n,"NIST AI RMF 2.0",https://www.nist.gov/example,NIST,Regulatory Guidance,United States,2025-01-01,"A framework.",,"risk-management;governance"`;
    const { valid, errors } = parseSourcesCsv(csv);
    expect(errors).toEqual([]);
    expect(valid).toHaveLength(1);
    expect(valid[0]).toMatchObject({
      id: "nist-ai-rmf-2-0",
      title: "NIST AI RMF 2.0",
      url: "https://www.nist.gov/example",
      publisher: "NIST",
      sourceType: "Regulatory Guidance",
      jurisdiction: "United States",
      publicationDate: "2025-01-01",
      description: "A framework.",
      confidence: "needs-verification",
      tags: ["risk-management", "governance"]
    });
  });

  it("accepts sourceType case-insensitively and normalizes to the canonical label", () => {
    const csv = `${HEADER}\nmy-id,Title,https://example.com,Pub,industry standard,Global,,Desc,high,`;
    const { valid, errors } = parseSourcesCsv(csv);
    expect(errors).toEqual([]);
    expect(valid[0].sourceType).toBe("Industry Standard");
    expect(valid[0].confidence).toBe("high");
  });

  it("reports a missing-column error and returns no valid rows when a required column is absent", () => {
    const csv = "title,url,publisher,jurisdiction,description\nA,https://x.com,P,Global,D";
    const { valid, errors } = parseSourcesCsv(csv);
    expect(valid).toEqual([]);
    expect(errors[0].message).toContain("sourcetype");
  });

  it("rejects a row with an invalid sourceType, reporting the row number without failing the whole file", () => {
    const csv = `${HEADER}\nid1,Title,https://example.com,Pub,NOT_A_TYPE,Global,,Desc,,\nid2,Title2,https://example.com/2,Pub,Research,Global,,Desc2,,`;
    const { valid, errors } = parseSourcesCsv(csv);
    expect(valid).toHaveLength(1);
    expect(valid[0].id).toBe("id2");
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toBe(2);
    expect(errors[0].message).toContain("sourceType must be one of");
  });

  it("rejects a row with a non-http(s) url", () => {
    const csv = `${HEADER}\nid1,Title,ftp://example.com,Pub,Research,Global,,Desc,,`;
    const { valid, errors } = parseSourcesCsv(csv);
    expect(valid).toEqual([]);
    expect(errors[0].message).toContain("http");
  });

  it("rejects duplicate ids within the same file", () => {
    const csv = `${HEADER}\nsame-id,Title A,https://a.com,Pub,Research,Global,,Desc A,,\nsame-id,Title B,https://b.com,Pub,Research,Global,,Desc B,,`;
    const { valid, errors } = parseSourcesCsv(csv);
    expect(valid).toHaveLength(1);
    expect(errors.some((e) => e.message.includes("duplicate id"))).toBe(true);
  });

  it("returns a single error for a completely empty CSV", () => {
    const { valid, errors } = parseSourcesCsv("");
    expect(valid).toEqual([]);
    expect(errors).toHaveLength(1);
  });
});
