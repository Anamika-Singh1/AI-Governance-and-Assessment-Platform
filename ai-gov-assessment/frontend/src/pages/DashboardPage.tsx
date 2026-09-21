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
import { FilePlus2, Loader2, ArrowRight, ClipboardList, ShieldAlert, Scale, Eye, ShieldCheck, BookOpen } from "lucide-react";

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
        <section className="dashboard-welcome relative px-1 py-6 sm:py-8">
          <div className="relative z-10 max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-neutral-500 dark:text-neutral-400"><ShieldCheck className="h-3.5 w-3.5" /> Governance overview</div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">AI governance, clearly understood.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-500 dark:text-neutral-400">Understand your AI risks, review the evidence, and turn assessment findings into confident next steps.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/new-assessment" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"><FilePlus2 className="h-4 w-4" /> New assessment <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/methodology" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-200 px-5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"><BookOpen className="h-4 w-4" /> Explore methodology</Link>
            </div>
          </div>
        </section>
        <div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold tracking-tight">Assessment portfolio</h2><span className="text-xs text-slate-500">All assessments</span></div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Card>
            <CardContent className="flex flex-col items-start gap-3 pt-5">
              <div className="rounded-lg bg-brand-50 dark:bg-brand-950 p-2.5 text-brand-600 dark:text-brand-400">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <div className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{listLoading ? "?" : items.length}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Total Assessments</div>
              </div>
            </CardContent>
          </Card>
          {RISK_LEVELS.map((level) => (
            <Card key={level}>
              <CardContent className="pt-5">
                <div className="text-2xl font-bold" style={{ color: RISK_COLORS[level].solid }}>
                  {listLoading ? "?" : distribution[level]}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{level} Risk</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {listLoading ? (
          <div className="flex h-40 items-center justify-center text-slate-400 dark:text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center px-6 py-12 text-center">
              <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-indigo-100 bg-brand-50 text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-brand-300"><ClipboardList className="h-6 w-6" /></div>
              <h3 className="text-lg font-semibold tracking-tight">Your governance journey starts here</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">Create your first assessment to see risk scores, supporting evidence, and recommended controls in one place.</p>
              <Link to="/new-assessment" className={buttonVariants({className:"mt-6"})}>Create first assessment <ArrowRight className="h-4 w-4" /></Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label className="mb-0">Viewing assessment:</Label>
              <Select className="w-full min-w-0 sm:w-72" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                {items.map((a) => (
                  <option key={a.useCaseId} value={a.useCaseId}>
                    {a.useCaseName} — {new Date(a.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </Select>
            </div>

            {detailLoading || !assessment ? (
              <div className="flex h-40 items-center justify-center text-slate-400 dark:text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <Card>
                  <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[1fr_auto]">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-400">{assessment.industry}</div>
                      <h2 className="mt-0.5 text-xl font-semibold text-slate-900 dark:text-slate-100">{assessment.useCaseName}</h2>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <RiskBadge level={assessment.riskLevel} size="lg" />
                        <span className="text-sm text-slate-500 dark:text-slate-400">{assessment.impactLevel}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-950 px-8 py-4 text-center">
                      <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{assessment.riskPercentage}%</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
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
                          <div className="font-medium text-slate-700 dark:text-slate-200">Critical Areas</div>
                          <div className="text-slate-500 dark:text-slate-400">
                            {assessment.criticalAreas.length ? assessment.criticalAreas.map((d) => DIMENSION_MAP[d]?.label || d).join(", ") : "None"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Scale className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                        <div>
                          <div className="font-medium text-slate-700 dark:text-slate-200">Regulatory Exposure</div>
                          <div className="text-slate-500 dark:text-slate-400">{assessment.regulatoryMapping.filter((m) => m.applicability === "Applicable").length} applicable, {assessment.regulatoryMapping.filter((m) => m.applicability === "Potentially Applicable").length} potentially applicable</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Eye className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <div>
                          <div className="font-medium text-slate-700 dark:text-slate-200">Required Human Oversight</div>
                          <div className="text-slate-500 dark:text-slate-400">{assessment.requiredHumanOversight}</div>
                        </div>
                      </div>
                      <Link to={`/assessments/${assessment.useCaseId}`} className="flex items-center gap-1 pt-1 text-brand-600 dark:text-brand-400 hover:underline">
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
