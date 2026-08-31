import { RiskLevel } from "@/types/api";

export const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string; solid: string; ring: string }> = {
  Low: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", solid: "#16a34a", ring: "ring-emerald-200" },
  Moderate: { bg: "bg-lime-50", text: "text-lime-700", border: "border-lime-200", solid: "#65a30d", ring: "ring-lime-200" },
  Elevated: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", solid: "#d97706", ring: "ring-amber-200" },
  High: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", solid: "#ea580c", ring: "ring-orange-200" },
  Critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", solid: "#dc2626", ring: "ring-red-200" }
};

export function scoreColor(score: number): string {
  if (score <= 1) return RISK_COLORS.Low.solid;
  if (score === 2) return RISK_COLORS.Moderate.solid;
  if (score === 3) return RISK_COLORS.Elevated.solid;
  if (score === 4) return RISK_COLORS.High.solid;
  return RISK_COLORS.Critical.solid;
}

export const SOURCE_TYPE_COLORS: Record<string, string> = {
  "Law / Regulation": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Regulatory Guidance": "bg-sky-50 text-sky-700 border-sky-200",
  "Industry Standard": "bg-teal-50 text-teal-700 border-teal-200",
  Research: "bg-violet-50 text-violet-700 border-violet-200",
  "Vendor Information": "bg-amber-50 text-amber-700 border-amber-200",
  "General Web Content": "bg-slate-100 text-slate-600 border-slate-200"
};
