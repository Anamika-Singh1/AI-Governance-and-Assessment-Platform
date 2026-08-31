import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, Label, Input } from "@/components/ui/input";
import { RiskBadge } from "@/components/RiskBadge";
import { api } from "@/lib/api";
import { RulesResponse, RuleCondition, DimensionKey } from "@/types/api";
import { DIMENSIONS, DIMENSION_MAP } from "@/data/dimensions";
import { Loader2, ArrowUpRight } from "lucide-react";

/**
 * Renders a rule's condition list the way a reviewer would read it:
 * "dimensionScores.DECISION_IMPACT" -> "Decision Impact score", and
 * "signals.isGenerativeAI" -> "isGenerativeAI" (override-rule fields are
 * prefixed this way — see backend/src/database/seed.ts's override-rule
 * loader — while governance-rule fields are plain signal names already).
 */
function formatConditionField(field: string): string {
  if (field.startsWith("dimensionScores.")) {
    const key = field.slice("dimensionScores.".length) as DimensionKey;
    return `${DIMENSION_MAP[key]?.label ?? key} score`;
  }
  if (field.startsWith("signals.")) return field.slice("signals.".length);
  return field;
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((v) => formatValue(v)).join(", ")}]`;
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function formatCondition(c: RuleCondition): string {
  return `${formatConditionField(c.field)} ${c.op} ${formatValue(c.value)}`;
}

function ConditionExpression({ conditions, matchMode }: { conditions: RuleCondition[]; matchMode: "all" | "any" }) {
  if (conditions.length === 0) {
    return <span className="font-mono text-xs text-slate-400">always applies (baseline)</span>;
  }
  const joiner = matchMode === "any" ? " OR " : " AND ";
  return (
    <span className="font-mono text-xs text-slate-500">
      IF {conditions.map((c) => formatCondition(c)).join(joiner)}
    </span>
  );
}

export function GovernanceRulesPage() {
  const [data, setData] = useState<RulesResponse | null>(null);
  const [dimensionFilter, setDimensionFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.getRules().then(setData);
  }, []);

  const filteredGovernanceRules = useMemo(() => {
    if (!data) return [];
    return data.governanceRules.filter((r) => {
      if (dimensionFilter && r.dimensionKey !== dimensionFilter) return false;
      if (search && !`${r.name} ${r.reason}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data, dimensionFilter, search]);

  const rulesByDimension = useMemo(() => {
    // Group in the canonical dimension order (DIMENSIONS), not the API
    // row order — rule ids are random UUIDs, so "ORDER BY id" from the
    // backend is not a meaningful display order.
    const map = new Map<string, typeof filteredGovernanceRules>();
    for (const d of DIMENSIONS) {
      const rules = filteredGovernanceRules.filter((r) => r.dimensionKey === d.key);
      if (rules.length > 0) map.set(d.key, rules);
    }
    return map;
  }, [filteredGovernanceRules]);

  if (!data) {
    return (
      <AppShell title="Governance Rules">
        <div className="flex h-64 items-center justify-center text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Governance Rules"
      subtitle={`The live, data-driven rule set (rules v${data.rulesVersion}) — every rule below is a row in Postgres, not code. Adding, changing, or disabling a rule is a database write.`}
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-3">
            <div>
              <Label>Dimension</Label>
              <Select value={dimensionFilter} onChange={(e) => setDimensionFilter(e.target.value)}>
                <option value="">All dimensions ({data.governanceRules.length} rules)</option>
                {DIMENSIONS.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label} ({data.governanceRules.filter((r) => r.dimensionKey === d.key).length})
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Search rule name / reason</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. biometric, automated, oversight..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Governance Rules — additive, per dimension</CardTitle>
            <CardDescription>
              Each dimension's score is the sum of every matching rule's score delta, clamped to 0–5. A rule with no conditions is a baseline
              that always applies.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {[...rulesByDimension.entries()].map(([dimensionKey, rules]) => (
              <div key={dimensionKey}>
                <div className="mb-2 flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-800">{DIMENSION_MAP[dimensionKey]?.label ?? dimensionKey}</h4>
                  <Badge className="text-[10px]">{rules.length} rule{rules.length === 1 ? "" : "s"}</Badge>
                </div>
                <div className="space-y-2">
                  {rules.map((r) => (
                    <div key={r.id} className="rounded-lg border border-slate-200 p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium text-slate-900">{r.name}</div>
                        <Badge className={r.scoreDelta > 0 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-500"}>
                          {r.scoreDelta > 0 ? "+" : ""}
                          {r.scoreDelta}
                        </Badge>
                      </div>
                      <div className="mt-1.5">
                        <ConditionExpression conditions={r.conditions} matchMode={r.matchMode} />
                      </div>
                      <p className="mt-1.5 text-sm text-slate-600">{r.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {filteredGovernanceRules.length === 0 && <p className="text-sm text-slate-400">No rules match this filter.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Override Rules — cross-dimension floor</CardTitle>
            <CardDescription>
              Can only raise the final risk classification above the threshold-derived level, never lower it — evaluated after every dimension is
              scored.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.overrideRules.map((r) => (
              <div key={r.id} className="rounded-lg border border-slate-200 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-slate-900">
                    {r.id} — {r.name}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    enforces min. <RiskBadge level={r.minRiskLevel} size="sm" />
                  </div>
                </div>
                <div className="mt-1.5">
                  <ConditionExpression conditions={r.conditions} matchMode={r.matchMode} />
                </div>
                <p className="mt-1.5 text-sm text-slate-600">{r.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regulatory Mapping Rules</CardTitle>
            <CardDescription>Keyword/region rules feeding the Regulatory Exposure dimension's specific-law citations (separate from the additive rule mechanism above).</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {data.regulatoryMappingRules.map((r) => (
              <div key={r.sourceId} className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm">
                <div>
                  <div className="font-medium text-slate-800">{r.name}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{r.applicabilityConditions}</div>
                </div>
                <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
