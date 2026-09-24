import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/RiskBadge";
import { DimensionChart } from "@/components/dashboard/DimensionChart";
import { FindingCard } from "@/components/findings/FindingCard";
import { RegulatoryMappingTable } from "@/components/RegulatoryMappingTable";
import { TriggeredRulesList } from "@/components/TriggeredRulesList";
import { AuditTrailList } from "@/components/AuditTrailList";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAssessment } from "@/hooks/useAssessment";
import { api } from "@/lib/api";
import { SourceRecord } from "@/types/api";
import { Loader2, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { DIMENSION_MAP } from "@/data/dimensions";
import { riskLevelForScore } from "@/lib/riskColors";

export function AssessmentResultsPage() {
  const { id } = useParams();
  const { data, loading, error, reload } = useAssessment(id);
  const [sourceMap, setSourceMap] = useState<Record<string, SourceRecord>>({});
  const [rerunning, setRerunning] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);

  async function rerun() {
    if (!id || rerunning) return;
    setRerunning(true);
    setRerunError(null);
    try {
      await api.rerunAssessment(id);
      reload();
    } catch (error) {
      setRerunError(error instanceof Error ? error.message : "Unable to rerun assessment. Please try again.");
    } finally {
      setRerunning(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    let active = true;
    setSourceMap({});
    api.getAssessmentSources(id).then((sources) => {
      if (active) setSourceMap(Object.fromEntries(sources.map((s) => [s.id, s])));
    }).catch(() => { if (active) setSourceMap({}); });
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return (
      <AppShell title="Assessment Results">
        <div className="flex h-64 items-center justify-center text-slate-400 dark:text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell title="Assessment Results">
        <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-4 text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4" /> {error || "Assessment not found."}
        </div>
      </AppShell>
    );
  }

  const riskReductionPlan = [...data.dimensionAssessments]
    .filter((dimension) => dimension.recommendedControls.length > 0)
    .sort((a, b) => b.score - a.score);

  return (
    <AppShell title={data.useCaseName} subtitle={`${data.industry} · ${data.region}`}>
      <div className="space-y-6">
        {/* Overall risk hero */}
        <Card className="overflow-hidden border-t-4 border-t-brand-500">
          <div className="grid grid-cols-1 gap-6 p-5 sm:p-7 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="min-w-0">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Assessment overview</p>
              <div className="flex flex-wrap items-center gap-3">
                <RiskBadge level={data.riskLevel} size="lg" />
                <Badge>{data.impactLevel}</Badge>
                <Badge className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400">
                  Assessment: {data.llmProviderUsed}
                </Badge>
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{data.description}</p>
              <Link to={`/use-cases/${data.useCaseId}`} className="mt-2 inline-block text-xs text-brand-600 dark:text-brand-400 hover:underline">
                View use case details & extracted signals →
              </Link>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-slate-400 dark:text-slate-400">Decision type: </span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{data.decisionType.replace(/_/g, " ")}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-400">Human review: </span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{data.humanReview ? "Yes" : "No"}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-400">Affected parties: </span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{data.affectedParties}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-brand-100 bg-brand-50/60 dark:border-slate-700 dark:bg-slate-950 px-6 py-6 text-center">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Overall risk score</div>
              <div className="text-5xl font-semibold tracking-tight tabular-nums text-slate-900 dark:text-slate-100">{data.riskPercentage}%</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {data.overallScore} / {data.maxScore} points
              </div>
              <Button variant="outline" className="mt-5 w-full" disabled={rerunning} onClick={rerun}>
                <RefreshCw className={`h-4 w-4 ${rerunning ? "animate-spin" : ""}`} /> {rerunning ? "Assessing…" : "Run again"}
              </Button>
            </div>
          </div>
        </Card>
        {rerunError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">{rerunError}</p>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Governance Dimension Scores</CardTitle>
              <CardDescription>All 10 dimensions, scored from 0 to 5.</CardDescription>
            </CardHeader>
            <CardContent>
              <DimensionChart dimensions={data.dimensionAssessments} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Risk Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">Critical Areas</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {data.criticalAreas.length ? (
                    data.criticalAreas.map((d) => (
                      <Badge key={d} className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400">
                        {DIMENSION_MAP[d]?.label || d}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400">None (no dimension scored 4 or 5)</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">Required Human Oversight</div>
                <p className="mt-1 text-slate-600 dark:text-slate-300">{data.requiredHumanOversight}</p>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">Top Recommended Controls</div>
                <ul className="mt-1.5 space-y-1">
                  {data.requiredControls.slice(0, 5).map((c, i) => (
                    <li key={i} className="flex gap-2 text-slate-600 dark:text-slate-300">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-500" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="findings">
          <TabsList>
            <TabsTrigger value="findings">Findings</TabsTrigger>
            <TabsTrigger value="suggestions">Risk Reduction Plan</TabsTrigger>
            <TabsTrigger value="rules">Triggered Rules ({data.triggeredRules.length})</TabsTrigger>
            <TabsTrigger value="regulatory">Regulatory Mapping ({data.regulatoryMapping.length})</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>

          <TabsContent value="findings" className="mt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {data.findings.map((f) => (
                <FindingCard key={f.dimension} finding={f} sourceMap={sourceMap} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="suggestions" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Suggested Actions to Reduce Risk</CardTitle>
                <CardDescription>
                  Address the highest-scoring dimensions first, then re-run the assessment to measure the effect.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {riskReductionPlan.map((dimension, dimensionIndex) => (
                  <div key={dimension.dimension} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">
                          Priority {dimensionIndex + 1}
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                          {DIMENSION_MAP[dimension.dimension]?.label || dimension.dimension}
                        </h3>
                      </div>
                      <RiskBadge level={riskLevelForScore(dimension.score)} size="sm" />
                    </div>
                    <ul className="space-y-2">
                      {dimension.recommendedControls.map((control, controlIndex) => (
                        <li key={controlIndex} className="flex gap-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          {control}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {riskReductionPlan.length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No additional mitigation actions were generated for this assessment.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules" className="mt-4">
            <Card>
              <CardContent className="pt-5">
                <TriggeredRulesList rules={data.triggeredRules} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regulatory" className="mt-4">
            <Card>
              <CardContent className="pt-5">
                <RegulatoryMappingTable mapping={data.regulatoryMapping} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Audit Trail</CardTitle>
                <CardDescription>
                  Engine v{data.assessmentEngineVersion} · Rules v{data.rulesVersion} · Provider: {data.llmProviderUsed}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AuditTrailList entries={data.auditTrail} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="text-center">
          <Link to="/history" className="text-sm text-brand-600 dark:text-brand-400 hover:underline">
            ← Back to Assessment History
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
