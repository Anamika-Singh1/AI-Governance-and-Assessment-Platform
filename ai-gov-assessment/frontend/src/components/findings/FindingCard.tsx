import { FindingRecord, SourceRecord } from "@/types/api";
import { DIMENSION_MAP } from "@/data/dimensions";
import { RiskBadge } from "@/components/RiskBadge";
import { Badge } from "@/components/ui/badge";
import { SOURCE_TYPE_COLORS } from "@/lib/riskColors";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ExternalLink, ShieldAlert, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

export function FindingCard({ finding, sourceMap }: { finding: FindingRecord; sourceMap: Record<string, SourceRecord> }) {
  const dim = DIMENSION_MAP[finding.dimension];
  const sources = finding.sourceIds.map((id) => sourceMap[id]).filter(Boolean);
  // Section 27/28: never present unverifiable evidence as authoritative — if no source
  // could be resolved, or every resolved source failed verification, say so explicitly
  // instead of silently showing nothing or treating it as confirmed evidence.
  const allUnverified = sources.length > 0 && sources.every((s) => !s.verified);
  const noSourcesFound = sources.length === 0;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0 gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-400">{dim?.label || finding.dimension}</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{finding.score}</span>
            <span className="text-sm text-slate-400 dark:text-slate-400">/ 5</span>
          </div>
        </div>
        <RiskBadge level={finding.severity} size="sm" />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{finding.explanation}</p>

        {finding.evidence.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <ShieldAlert className="h-3.5 w-3.5" /> Evidence / Risk Factors
            </div>
            <ul className="space-y-1">
              {finding.evidence.map((e, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        {finding.recommendedMitigation.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Wrench className="h-3.5 w-3.5" /> Recommended Mitigation
            </div>
            <ul className="space-y-1">
              {finding.recommendedMitigation.map((c, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {sources.length > 0 && (
          <div>
            <div className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Sources</div>
            <div className="flex flex-wrap gap-2">
              {sources.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium hover:underline", SOURCE_TYPE_COLORS[s.sourceType])}
                  title={`${s.publisher} — ${s.jurisdiction}${s.verified ? "" : " (Unverified)"}`}
                >
                  {s.title.length > 40 ? s.title.slice(0, 40) + "…" : s.title}
                  <ExternalLink className="h-3 w-3" />
                  {!s.verified && <Badge className="ml-1 border-none bg-transparent p-0 text-[10px] text-amber-600 dark:text-amber-400">Unverified</Badge>}
                </a>
              ))}
            </div>
          </div>
        )}

        {noSourcesFound && (
          <Alert variant="warning" title="Research unavailable">
            This finding could not be verified against an external source. Treat this dimension's evidence as the assessment's reasoning
            alone, not as externally-cited fact.
          </Alert>
        )}

        {!noSourcesFound && allUnverified && (
          <Alert variant="warning" title="Sources unverified">
            Every source matched to this finding is currently marked Unverified — its citation could not be confirmed against the live URL. Do not
            treat it as authoritative evidence until verified (see Sources / Research page).
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
