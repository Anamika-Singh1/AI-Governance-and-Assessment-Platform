import { RegulatoryMappingEntry } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const APPLICABILITY_STYLES: Record<string, string> = {
  Applicable: "bg-red-50 text-red-700 border-red-200",
  "Potentially Applicable": "bg-amber-50 text-amber-700 border-amber-200",
  "Needs Legal Review": "bg-sky-50 text-sky-700 border-sky-200",
  "Not Applicable": "bg-slate-100 text-slate-500 border-slate-200"
};

export function RegulatoryMappingTable({ mapping }: { mapping: RegulatoryMappingEntry[] }) {
  return (
    <div className="space-y-3">
      {mapping.map((m) => (
        <div key={m.regulationId} className="rounded-lg border border-slate-200 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium text-slate-900">{m.name}</div>
            <Badge className={cn("border", APPLICABILITY_STYLES[m.applicability])}>{m.applicability}</Badge>
          </div>
          <div className="mt-1.5 text-xs text-slate-500">Jurisdiction: {m.jurisdiction}</div>
          <p className="mt-2 text-sm text-slate-600">
            <span className="font-medium text-slate-700">Why potentially relevant: </span>
            {m.whyPotentiallyRelevant}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-medium text-slate-700">Applicability conditions: </span>
            {m.applicabilityConditions}
          </p>
        </div>
      ))}
      {mapping.length === 0 && <p className="text-sm text-slate-500">No regulatory frameworks were mapped for this use case.</p>}
      <p className="text-xs italic text-slate-400">
        This is not legal advice. Confirm applicability with qualified legal/compliance counsel before relying on this mapping.
      </p>
    </div>
  );
}
