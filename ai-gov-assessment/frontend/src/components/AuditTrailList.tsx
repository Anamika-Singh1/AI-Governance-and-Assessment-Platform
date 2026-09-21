import { AuditTrailEntry } from "@/types/api";

export function AuditTrailList({ entries }: { entries: AuditTrailEntry[] }) {
  return (
    <ol className="space-y-0">
      {entries.map((e, i) => (
        <li key={i} className="relative border-l border-slate-200 dark:border-slate-700 py-2 pl-5 last:border-transparent">
          <span className="absolute -left-[5px] top-3 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500" />
          <div className="text-xs text-slate-400 dark:text-slate-400">{new Date(e.timestamp).toLocaleString()}</div>
          <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{e.step}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">{e.detail}</div>
        </li>
      ))}
    </ol>
  );
}
