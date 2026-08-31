export type SourceType =
  | "Law / Regulation"
  | "Regulatory Guidance"
  | "Industry Standard"
  | "Research"
  | "Vendor Information"
  | "General Web Content";

export type ReliabilityTier = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Source reliability hierarchy (Section 21).
 * Lower tier number = higher authority. Used to resolve conflicting
 * information: when two sources disagree, the lower-tier (more
 * authoritative) source wins and this is surfaced in the UI.
 */
export const SOURCE_TYPE_RELIABILITY: Record<
  SourceType,
  { tier: ReliabilityTier; label: string }
> = {
  "Law / Regulation": { tier: 1, label: "Tier 1 — Official legislation / government or regulatory source" },
  "Regulatory Guidance": { tier: 2, label: "Tier 2 — Regulatory guidance from an authoritative body" },
  "Industry Standard": { tier: 2, label: "Tier 2 — Recognized standards organization" },
  Research: { tier: 3, label: "Tier 3 — Peer-reviewed research" },
  "Vendor Information": { tier: 5, label: "Tier 5 — Vendor information" },
  "General Web Content": { tier: 6, label: "Tier 6 — General web content" }
};

export const SOURCE_TYPES: SourceType[] = [
  "Law / Regulation",
  "Regulatory Guidance",
  "Industry Standard",
  "Research",
  "Vendor Information",
  "General Web Content"
];

export const SOURCE_HIERARCHY_ORDER: SourceType[] = [
  "Law / Regulation",
  "Regulatory Guidance",
  "Industry Standard",
  "Research",
  "Vendor Information",
  "General Web Content"
];
