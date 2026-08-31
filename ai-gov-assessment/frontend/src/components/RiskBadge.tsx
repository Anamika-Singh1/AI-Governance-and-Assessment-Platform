import { RiskLevel } from "@/types/api";
import { RISK_COLORS } from "@/lib/riskColors";
import { cn } from "@/lib/utils";

export function RiskBadge({ level, className, size = "md" }: { level: RiskLevel; className?: string; size?: "sm" | "md" | "lg" }) {
  const c = RISK_COLORS[level];
  const sizeClasses = size === "sm" ? "text-[11px] px-2 py-0.5" : size === "lg" ? "text-sm px-3.5 py-1.5" : "text-xs px-2.5 py-1";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border font-semibold", c.bg, c.text, c.border, sizeClasses, className)}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.solid }} />
      {level} Risk
    </span>
  );
}
