import { TriggeredRule } from "@/types/api";
import { RiskBadge } from "@/components/RiskBadge";
import { Zap } from "lucide-react";

export function TriggeredRulesList({ rules }: { rules: TriggeredRule[] }) {
  if (rules.length === 0) {
    return <p className="text-sm text-slate-500">No override rules were triggered — the risk level was determined by the percentage threshold alone.</p>;
  }
  return (
    <div className="space-y-3">
      {rules.map((r) => (
        <div key={r.ruleId} className="rounded-lg border border-amber-200 bg-amber-50/50 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-medium text-slate-900">
              <Zap className="h-4 w-4 text-amber-600" />
              {r.ruleId} — {r.name}
            </div>
            <span className="text-xs text-slate-500">Enforces minimum:</span>
            <RiskBadge level={r.enforcedMinRiskLevel} size="sm" />
          </div>
          <p className="mt-2 text-sm text-slate-600">{r.reason}</p>
        </div>
      ))}
    </div>
  );
}
