import { RegulatoryMappingEntry } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const APPLICABILITY_STYLES: Record<string, string> = {
  Applicable: "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  "Potentially Applicable": "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  "Needs Legal Review": "bg-sky-50 text-sky-700 border-sky-200",
  "Not Applicable": "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
};

export function RegulatoryMappingTable({ mapping }: { mapping: RegulatoryMappingEntry[] }) {
  return (
    <div className="space-y-3">
      {mapping.map((m) => (
        <div key={m.regulationId} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium text-slate-900 dark:text-slate-100">{m.name}</div>
            <Badge className={cn("border", APPLICABILITY_STYLES[m.applicability])}>{m.applicability}</Badge>
          </div>
          <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Jurisdiction: {m.jurisdiction}</div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-700 dark:text-slate-200">Why potentially relevant: </span>
            {m.whyPotentiallyRelevant}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-700 dark:text-slate-200">Applicability conditions: </span>
            {m.applicabilityConditions}
          </p>
        </div>
      ))}
      {mapping.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No regulatory frameworks were mapped for this use case.</p>}
      <p className="text-xs italic text-slate-400 dark:text-slate-400">
        This is not legal advice. Confirm applicability with qualified legal/compliance counsel before relying on this mapping.
      </p>
    </div>
  );
}
