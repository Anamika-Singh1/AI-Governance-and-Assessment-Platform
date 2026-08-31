import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Select, Label } from "@/components/ui/input";
import { RiskBadge } from "@/components/RiskBadge";
import { DimensionChart } from "@/components/dashboard/DimensionChart";
import { useAssessments } from "@/hooks/useAssessments";
import { api } from "@/lib/api";
import { Assessment, RiskLevel } from "@/types/api";
import { DIMENSION_MAP } from "@/data/dimensions";
import { RISK_COLORS } from "@/lib/riskColors";
import { FilePlus2, Loader2, ArrowRight, ClipboardList, ShieldAlert, Scale, Eye } from "lucide-react";

const RISK_LEVELS: RiskLevel[] = ["Low", "Moderate", "Elevated", "High", "Critical"];

export function DashboardPage() {
  const { items, loading: listLoading } = useAssessments();
  const [selectedId, setSelectedId] = useState<string>("");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!selectedId && items.length > 0) setSelectedId(items[0].useCaseId);
  }, [items, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    setDetailLoading(true);
    api
      .getAssessment(selectedId)
      .then(setAssessment)
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const distribution = useMemo(() => {
    const counts = Object.fromEntries(RISK_LEVELS.map((l) => [l, 0])) as Record<RiskLevel, number>;
    items.forEach((i) => (counts[i.riskLevel] = (counts[i.riskLevel] || 0) + 1));
    return counts;
  }, [items]);

  return (
    <AppShell title="Dashboard" subtitle="Overview of your AI governance assessments.">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="flex items-center gap-3 pt-5">
              <div className="rounded-lg bg-brand-50 p-2.5 text-brand-600">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{items.length}</div>
                <div className="text-xs text-slate-500">Total Assessments</div>
              </div>
            </CardContent>
          </Card>
          {RISK_LEVELS.filter((l) => l !== "Moderate").map((level) => (
            <Card key={level}>
              <CardContent className="pt-5">
                <div className="text-2xl font-bold" style={{ color: RISK_COLORS[level].solid }}>
                  {distribution[level]}
                </div>
                <div className="text-xs text-slate-500">{level} Risk</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-gradient-to-br from-brand-600 to-brand-700 text-white">
          <CardContent className="flex flex-col items-start justify-between gap-4 pt-5 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-lg font-semibold">Run a new AI Governance Assessment</h3>
              <p className="mt-1 text-sm text-brand-100">Enter any AI use case — including one the evaluator writes on the spot — for a repeatable, evidence-based assessment.</p>
            </div>
            <Link to="/new-assessment" className={buttonVariants({ variant: "secondary", size: "lg", className: "shrink-0" })}>
              <FilePlus2 className="h-4 w-4" /> New Assessment
            </Link>
          </CardContent>
        </Card>

        {listLoading ? (
          <div className="flex h-40 items-center justify-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="pt-5 text-sm text-slate-500">No assessments yet. Run your first assessment to see the dashboard populate.</CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Label className="mb-0">Viewing assessment:</Label>
              <Select className="w-auto min-w-[280px]" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                {items.map((a) => (
                  <option key={a.useCaseId} value={a.useCaseId}>
                    {a.useCaseName} — {new Date(a.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </Select>
            </div>

            {detailLoading || !assessment ? (
              <div className="flex h-40 items-center justify-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <Card>
                  <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[1fr_auto]">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{assessment.industry}</div>
                      <h2 className="mt-0.5 text-xl font-semibold text-slate-900">{assessment.useCaseName}</h2>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <RiskBadge level={assessment.riskLevel} size="lg" />
                        <span className="text-sm text-slate-500">{assessment.impactLevel}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 px-8 py-4 text-center">
                      <div className="text-3xl font-bold text-slate-900">{assessment.riskPercentage}%</div>
                      <div className="text-xs text-slate-500">
                        {assessment.overallScore}/{assessment.maxScore} points
                      </div>
                    </div>
                  </div>
                </Card>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                  <Card className="lg:col-span-3">
                    <CardHeader>
                      <CardTitle>Risk Radar / Bar Chart</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DimensionChart dimensions={assessment.dimensionAssessments} />
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Risk Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div className="flex items-start gap-2.5">
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                        <div>
                          <div className="font-medium text-slate-700">Critical Areas</div>
                          <div className="text-slate-500">
                            {assessment.criticalAreas.length ? assessment.criticalAreas.map((d) => DIMENSION_MAP[d]?.label || d).join(", ") : "None"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Scale className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                        <div>
                          <div className="font-medium text-slate-700">Regulatory Exposure</div>
                          <div className="text-slate-500">{assessment.regulatoryMapping.filter((m) => m.applicability === "Applicable").length} applicable, {assessment.regulatoryMapping.filter((m) => m.applicability === "Potentially Applicable").length} potentially applicable</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Eye className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <div>
                          <div className="font-medium text-slate-700">Required Human Oversight</div>
                          <div className="text-slate-500">{assessment.requiredHumanOversight}</div>
                        </div>
                      </div>
                      <Link to={`/assessments/${assessment.useCaseId}`} className="flex items-center gap-1 pt-1 text-brand-600 hover:underline">
                        View full assessment <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
