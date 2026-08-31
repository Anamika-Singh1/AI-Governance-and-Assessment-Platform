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
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { DIMENSION_MAP } from "@/data/dimensions";

export function AssessmentResultsPage() {
  const { id } = useParams();
  const { data, loading, error, reload } = useAssessment(id);
  const [sourceMap, setSourceMap] = useState<Record<string, SourceRecord>>({});

  useEffect(() => {
    if (!id) return;
    api.getAssessmentSources(id).then((sources) => {
      setSourceMap(Object.fromEntries(sources.map((s) => [s.id, s])));
    });
  }, [id]);

  if (loading) {
    return (
      <AppShell title="Assessment Results">
        <div className="flex h-64 items-center justify-center text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell title="Assessment Results">
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-4 w-4" /> {error || "Assessment not found."}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={data.useCaseName} subtitle={`${data.industry} · ${data.region}`}>
      <div className="space-y-6">
        {/* Overall risk hero */}
        <Card className="overflow-hidden">
          <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[1fr_auto]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <RiskBadge level={data.riskLevel} size="lg" />
                <Badge>{data.impactLevel}</Badge>
                <Badge className="border-slate-200 bg-slate-50 text-slate-500">
                  Extraction: {data.extractionMethod === "llm" ? "LLM" : "Deterministic fallback"}
                </Badge>
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">{data.description}</p>
              <Link to={`/use-cases/${data.useCaseId}`} className="mt-2 inline-block text-xs text-brand-600 hover:underline">
                View use case details & extracted signals →
              </Link>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-slate-400">Decision type: </span>
                  <span className="font-medium text-slate-700">{data.decisionType.replace(/_/g, " ")}</span>
                </div>
                <div>
                  <span className="text-slate-400">Human review: </span>
                  <span className="font-medium text-slate-700">{data.humanReview ? "Yes" : "No"}</span>
                </div>
                <div>
                  <span className="text-slate-400">Affected parties: </span>
                  <span className="font-medium text-slate-700">{data.affectedParties}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 px-8 py-5 text-center">
              <div className="text-4xl font-bold text-slate-900">{data.riskPercentage}%</div>
              <div className="mt-1 text-xs text-slate-500">
                {data.overallScore} / {data.maxScore} points
              </div>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => api.rerunAssessment(data.useCaseId).then(() => reload())}>
                <RefreshCw className="h-3.5 w-3.5" /> Re-run
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Governance Dimension Scores</CardTitle>
              <CardDescription>All 10 dimensions, scored 0–5 by the deterministic engine.</CardDescription>
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
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Critical Areas</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {data.criticalAreas.length ? (
                    data.criticalAreas.map((d) => (
                      <Badge key={d} className="border-red-200 bg-red-50 text-red-700">
                        {DIMENSION_MAP[d]?.label || d}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-slate-500">None (no dimension scored 4 or 5)</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Required Human Oversight</div>
                <p className="mt-1 text-slate-600">{data.requiredHumanOversight}</p>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Top Recommended Controls</div>
                <ul className="mt-1.5 space-y-1">
                  {data.requiredControls.slice(0, 5).map((c, i) => (
                    <li key={i} className="flex gap-2 text-slate-600">
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
          <Link to="/history" className="text-sm text-brand-600 hover:underline">
            ← Back to Assessment History
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
