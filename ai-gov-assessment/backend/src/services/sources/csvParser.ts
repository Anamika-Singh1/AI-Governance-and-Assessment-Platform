import { SourceType, SOURCE_TYPES } from "../../config/sourceTypes";
import { UpsertableSource } from "./sourceUpsert";

/**
 * Minimal RFC4180-style CSV parser (quoted fields, embedded commas,
 * doubled-quote escaping, CRLF or LF line endings). No external
 * dependency: the format this app needs (a handful of plain-text
 * columns, occasionally with a comma inside a quoted description) does
 * not justify pulling in a CSV library.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let sawAnyContent = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      sawAnyContent = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
      sawAnyContent = true;
    } else if (c === "\r") {
      // ignore — paired \n (or a lone \r, rare) handles the line break
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      sawAnyContent = false;
    } else {
      field += c;
      sawAnyContent = true;
    }
  }
  if (sawAnyContent || field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

export interface CsvRowError {
  row: number; // 1-based, counting the header as row 1
  message: string;
}

const REQUIRED_COLUMNS = ["title", "url", "publisher", "sourcetype", "jurisdiction", "description"];
const KNOWN_COLUMNS = new Set([...REQUIRED_COLUMNS, "id", "publicationdate", "confidence", "tags"]);
const SOURCE_TYPE_BY_LOWER = new Map(SOURCE_TYPES.map((t) => [t.toLowerCase(), t]));

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Parses and validates a sources CSV. Expected header columns (order-
 * independent, case-insensitive): id (optional — slugified from title
 * if blank), title, url, publisher, sourceType (must be one of the six
 * classification labels — see config/sourceTypes.ts), jurisdiction,
 * publicationDate (optional, YYYY-MM-DD), description, confidence
 * (optional: "high" or "needs-verification", default
 * "needs-verification"), tags (optional, ';' or '|'-separated).
 *
 * Never throws on bad data: every row is validated independently, and
 * a bad row is reported in `errors` and excluded from `valid` rather
 * than failing the whole import. Duplicate ids within the same file
 * are also reported as errors, since silently letting the second row
 * clobber the first would hide a likely copy-paste mistake.
 */
export function parseSourcesCsv(text: string): { valid: UpsertableSource[]; errors: CsvRowError[] } {
  const rows = parseCsv(text.replace(/^﻿/, ""));
  const errors: CsvRowError[] = [];
  if (rows.length === 0) {
    return { valid: [], errors: [{ row: 0, message: "CSV is empty." }] };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    return {
      valid: [],
      errors: [{ row: 1, message: `Missing required column(s): ${missing.join(", ")}. Required: ${REQUIRED_COLUMNS.join(", ")}.` }]
    };
  }
  const unknown = header.filter((h) => h && !KNOWN_COLUMNS.has(h));
  if (unknown.length > 0) {
    errors.push({ row: 1, message: `Unrecognized column(s) ignored: ${unknown.join(", ")}.` });
  }

  const col = (r: string[], name: string) => {
    const idx = header.indexOf(name);
    return idx === -1 ? "" : (r[idx] ?? "").trim();
  };

  const valid: UpsertableSource[] = [];
  const seenIds = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 1;
    if (r.every((f) => f.trim() === "")) continue; // blank line

    const title = col(r, "title");
    const url = col(r, "url");
    const publisher = col(r, "publisher");
    const sourceTypeRaw = col(r, "sourcetype");
    const jurisdiction = col(r, "jurisdiction");
    const description = col(r, "description");
    const publicationDate = col(r, "publicationdate") || null;
    const confidenceRaw = col(r, "confidence").toLowerCase();
    const tagsRaw = col(r, "tags");
    let id = col(r, "id");

    const rowErrors: string[] = [];
    if (!title) rowErrors.push("title is required");
    if (!url) rowErrors.push("url is required");
    else if (!/^https?:\/\//i.test(url)) rowErrors.push(`url must start with http:// or https:// (got "${url}")`);
    if (!publisher) rowErrors.push("publisher is required");
    if (!jurisdiction) rowErrors.push("jurisdiction is required");
    if (!description) rowErrors.push("description is required");
    if (publicationDate && !/^\d{4}-\d{2}-\d{2}$/.test(publicationDate)) {
      rowErrors.push(`publicationDate must be YYYY-MM-DD (got "${publicationDate}")`);
    }

    const sourceType = SOURCE_TYPE_BY_LOWER.get(sourceTypeRaw.toLowerCase()) as SourceType | undefined;
    if (!sourceTypeRaw) rowErrors.push("sourceType is required");
    else if (!sourceType) rowErrors.push(`sourceType must be one of: ${SOURCE_TYPES.join(", ")} (got "${sourceTypeRaw}")`);

    let confidence: "high" | "needs-verification" = "needs-verification";
    if (confidenceRaw === "high") confidence = "high";
    else if (confidenceRaw && confidenceRaw !== "needs-verification") {
      rowErrors.push(`confidence must be "high" or "needs-verification" if provided (got "${confidenceRaw}")`);
    }

    if (!id) id = slugify(title);
    else id = slugify(id) || slugify(title);
    if (!id) rowErrors.push("could not derive a usable id/slug from title");
    else if (seenIds.has(id)) rowErrors.push(`duplicate id "${id}" within this file`);

    if (rowErrors.length > 0) {
      errors.push({ row: rowNum, message: rowErrors.join("; ") });
      continue;
    }

    seenIds.add(id);
    const tags = tagsRaw
      ? tagsRaw
          .split(/[;|]/)
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      : [];

    valid.push({
      id,
      title,
      url,
      publisher,
      sourceType: sourceType!,
      jurisdiction,
      publicationDate,
      description,
      confidence,
      tags
    });
  }

  return { valid, errors };
}
