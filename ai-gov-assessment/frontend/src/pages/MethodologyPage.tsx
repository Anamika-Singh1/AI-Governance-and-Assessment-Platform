import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { MethodologyResponse } from "@/types/api";
import { RiskBadge } from "@/components/RiskBadge";
import { Loader2, ArrowDown } from "lucide-react";

export function MethodologyPage() {
  const [data, setData] = useState<MethodologyResponse | null>(null);

  useEffect(() => {
    api.getMethodology().then(setData);
  }, []);

  if (!data) {
    return (
      <AppShell title="Rules & Methodology">
        <div className="flex h-64 items-center justify-center text-slate-400 dark:text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Rules & Methodology" subtitle="How AI assessments use your input and source references.">
      <div className="mx-auto max-w-4xl space-y-6">
        <Alert variant="info" title="LLM assessment">
          The LLM generates scores, risk classifications, explanations, recommendations, and regulatory applicability. The application validates the response and sums dimension scores. Saved results preserve the model output; new runs may differ.
        </Alert>
        <Alert variant="warning" title="Not legal advice">
          {data.legalDisclaimer}
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>1. The 10 Governance Dimensions</CardTitle>
            <CardDescription>Every use case is scored 0–5 on each dimension (5 = highest risk).</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {data.dimensions.map((d) => (
              <div key={d.key} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3.5">
                <div className="font-medium text-slate-900 dark:text-slate-100">{d.label}</div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{d.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {d.evaluationCriteria.map((c) => (
                    <Badge key={c} className="text-[10px]">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Scoring & Overall Calculation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p>Scale: {data.scoring.scale}</p>
            <div className="rounded-lg bg-slate-900 p-4 font-mono text-xs text-slate-100">
              Total Score = sum of all 10 dimension scores
              <br />
              Maximum Score = {data.scoring.maxScore}
              <br />
              Risk Percentage = (Total Score / {data.scoring.maxScore}) × 100
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Legacy Risk Thresholds</CardTitle>
            <CardDescription>These thresholds describe historical rule-based assessments. New LLM assessments choose risk levels directly.</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400 dark:text-slate-400">
                <tr>
                  <th className="py-1.5">Range</th>
                  <th className="py-1.5">Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {data.thresholds.map((t) => (
                  <tr key={t.level} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="py-2 text-slate-600 dark:text-slate-300">
                      {t.minPercent}% – {t.maxPercent}%
                    </td>
                    <td className="py-2">
                      <RiskBadge level={t.level} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Legacy Override Rules</CardTitle>
            <CardDescription>These rules remain available for historical reference and do not override new LLM assessments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.overrideRules.map((r) => (
              <div key={r.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    {r.id} — {r.name}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    enforces min. <RiskBadge level={r.minRiskLevel} size="sm" />
                  </div>
                </div>
                <div className="mt-1.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                  IF {r.conditions.map((c: any) => `${c.dimension || c.key} ${c.op || (c.equals ? "==" : "")} ${c.value ?? c.equals}`).join(" AND ")}
                </div>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{r.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Source Reliability Hierarchy</CardTitle>
            <CardDescription>Used to resolve conflicting information — lower tier number is more authoritative.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-stretch gap-1">
              {data.sourceHierarchy.map((s, i) => (
                <div key={s.sourceType}>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2.5">
                    <span className="font-medium text-slate-800 dark:text-slate-100">{s.sourceType}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{s.label}</span>
                  </div>
                  {i < data.sourceHierarchy.length - 1 && <ArrowDown className="mx-auto my-1 h-4 w-4 text-slate-300" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
