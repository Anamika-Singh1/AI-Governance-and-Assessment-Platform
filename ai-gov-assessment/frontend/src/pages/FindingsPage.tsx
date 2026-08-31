import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Select, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { FindingCard } from "@/components/findings/FindingCard";
import { useAssessments } from "@/hooks/useAssessments";
import { api } from "@/lib/api";
import { Assessment, FindingRecord, RiskLevel, SourceRecord, SourceType } from "@/types/api";
import { DIMENSIONS } from "@/data/dimensions";
import { SOURCE_TYPES } from "@/data/sourceTypes";
import { Loader2 } from "lucide-react";

const RISK_LEVELS: RiskLevel[] = ["Low", "Moderate", "Elevated", "High", "Critical"];

export function FindingsPage() {
  const [params] = useSearchParams();
  const { items } = useAssessments();
  const [selectedId, setSelectedId] = useState<string>(params.get("id") || "");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [sourceMap, setSourceMap] = useState<Record<string, SourceRecord>>({});
  const [loading, setLoading] = useState(false);

  const [riskFilter, setRiskFilter] = useState<string>("");
  const [dimensionFilter, setDimensionFilter] = useState<string>("");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>("");
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string>("");

  useEffect(() => {
    if (!selectedId && items.length > 0) setSelectedId(items[0].useCaseId);
  }, [items, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    Promise.all([api.getAssessment(selectedId), api.getAssessmentSources(selectedId)])
      .then(([a, sources]) => {
        setAssessment(a);
        setSourceMap(Object.fromEntries(sources.map((s) => [s.id, s])));
      })
      .finally(() => setLoading(false));
  }, [selectedId]);

  const jurisdictions = useMemo(() => Array.from(new Set(Object.values(sourceMap).map((s) => s.jurisdiction))).sort(), [sourceMap]);

  const filtered: FindingRecord[] = useMemo(() => {
    if (!assessment) return [];
    return assessment.findings.filter((f) => {
      if (riskFilter && f.severity !== riskFilter) return false;
      if (dimensionFilter && f.dimension !== dimensionFilter) return false;
      if (sourceTypeFilter) {
        const hasType = f.sourceIds.some((id) => sourceMap[id]?.sourceType === sourceTypeFilter);
        if (!hasType) return false;
      }
      if (jurisdictionFilter) {
        const hasJur = f.sourceIds.some((id) => sourceMap[id]?.jurisdiction === jurisdictionFilter);
        if (!hasJur) return false;
      }
      return true;
    });
  }, [assessment, riskFilter, dimensionFilter, sourceTypeFilter, jurisdictionFilter]);

  return (
    <AppShell title="Findings" subtitle="Detailed, evidence-backed findings for every governance dimension of a selected assessment.">
      <div className="space-y-5">
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-1">
              <Label>Assessment</Label>
              <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                {items.map((a) => (
                  <option key={a.useCaseId} value={a.useCaseId}>
                    {a.useCaseName}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Risk Level</Label>
              <Select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
                <option value="">All levels</option>
                {RISK_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Dimension</Label>
              <Select value={dimensionFilter} onChange={(e) => setDimensionFilter(e.target.value)}>
                <option value="">All dimensions</option>
                {DIMENSIONS.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Source Type</Label>
              <Select value={sourceTypeFilter} onChange={(e) => setSourceTypeFilter(e.target.value)}>
                <option value="">All source types</option>
                {SOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Jurisdiction</Label>
              <Select value={jurisdictionFilter} onChange={(e) => setJurisdictionFilter(e.target.value)}>
                <option value="">All jurisdictions</option>
                {jurisdictions.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading && (
          <div className="flex h-40 items-center justify-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {!loading && assessment && (
          <>
            <p className="text-sm text-slate-500">
              Showing {filtered.length} of {assessment.findings.length} findings for <span className="font-medium text-slate-700">{assessment.useCaseName}</span>
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filtered.map((f) => (
                <FindingCard key={f.dimension} finding={f} sourceMap={sourceMap} />
              ))}
            </div>
            {filtered.length === 0 && <p className="text-sm text-slate-400">No findings match the current filters.</p>}
          </>
        )}

        {!loading && !assessment && items.length === 0 && (
          <p className="text-sm text-slate-400">No assessments yet — run one from New Assessment to see findings here.</p>
        )}
      </div>
    </AppShell>
  );
}
