import { RiskLevel } from "@/types/api";

export const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string; solid: string; ring: string }> = {
  Low: { bg: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800", solid: "#16a34a", ring: "ring-emerald-200 dark:ring-emerald-800" },
  Moderate: { bg: "bg-lime-50 dark:bg-lime-950", text: "text-lime-700 dark:text-lime-400", border: "border-lime-200 dark:border-lime-800", solid: "#65a30d", ring: "ring-lime-200 dark:ring-lime-800" },
  Elevated: { bg: "bg-amber-50 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800", solid: "#d97706", ring: "ring-amber-200 dark:ring-amber-800" },
  High: { bg: "bg-orange-50 dark:bg-orange-950", text: "text-orange-700 dark:text-orange-400", border: "border-orange-200 dark:border-orange-800", solid: "#ea580c", ring: "ring-orange-200 dark:ring-orange-800" },
  Critical: { bg: "bg-red-50 dark:bg-red-950", text: "text-red-700 dark:text-red-400", border: "border-red-200 dark:border-red-800", solid: "#dc2626", ring: "ring-red-200 dark:ring-red-800" }
};

export function scoreColor(score: number): string {
  if (score <= 1) return RISK_COLORS.Low.solid;
  if (score === 2) return RISK_COLORS.Moderate.solid;
  if (score === 3) return RISK_COLORS.Elevated.solid;
  if (score === 4) return RISK_COLORS.High.solid;
  return RISK_COLORS.Critical.solid;
}

export function riskLevelForScore(score: number): RiskLevel {
  if (score <= 1) return "Low";
  if (score === 2) return "Moderate";
  if (score === 3) return "Elevated";
  if (score === 4) return "High";
  return "Critical";
}

export const SOURCE_TYPE_COLORS: Record<string, string> = {
  "Law / Regulation": "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
  "Regulatory Guidance": "bg-sky-50 text-sky-700 border-sky-200",
  "Industry Standard": "bg-teal-50 text-teal-700 border-teal-200",
  Research: "bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800",
  "Vendor Information": "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  "General Web Content": "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
};
