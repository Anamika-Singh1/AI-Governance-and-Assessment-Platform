import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, Label, Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { SourceRecord, SourceType } from "@/types/api";
import { SOURCE_TYPES } from "@/data/sourceTypes";
import { SOURCE_TYPE_COLORS } from "@/lib/riskColors";
import { cn } from "@/lib/utils";
import { ExternalLink, CheckCircle2, HelpCircle, Loader2 } from "lucide-react";

export function SourcesPage() {
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceType, setSourceType] = useState<string>("");
  const [jurisdiction, setJurisdiction] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .listSources()
      .then((res) => setSources(res.sources))
      .finally(() => setLoading(false));
  }, []);

  const jurisdictions = useMemo(() => Array.from(new Set(sources.map((s) => s.jurisdiction))).sort(), [sources]);

  const filtered = sources.filter((s) => {
    if (sourceType && s.sourceType !== sourceType) return false;
    if (jurisdiction && s.jurisdiction !== jurisdiction) return false;
    if (search && !`${s.title} ${s.publisher} ${s.description}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppShell title="Sources / Research" subtitle="Curated authoritative public sources used as evidence across every assessment.">
      <div className="space-y-5">
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-3">
            <div>
              <Label>Source Type</Label>
              <Select value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                <option value="">All types ({sources.length})</option>
                {SOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t} ({sources.filter((s) => s.sourceType === t).length})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Jurisdiction</Label>
              <Select value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)}>
                <option value="">All jurisdictions</option>
                {jurisdictions.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Search</Label>
              <Input placeholder="Search title, publisher, description…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-slate-400 dark:text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((s) => (
              <Card key={s.id}>
                <CardContent className="space-y-2.5 pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <Badge className={cn("border", SOURCE_TYPE_COLORS[s.sourceType])}>{s.sourceType}</Badge>
                    {s.verified ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        <HelpCircle className="h-3.5 w-3.5" /> Unverified
                      </span>
                    )}
                  </div>
                  <a href={s.url} target="_blank" rel="noreferrer" className="block text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400">
                    {s.title}
                    <ExternalLink className="ml-1 inline h-3 w-3 text-slate-400 dark:text-slate-400" />
                  </a>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {s.publisher} · {s.jurisdiction}
                  </p>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{s.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[11px] text-slate-400 dark:text-slate-400">
                    <span>Published: {s.publicationDate || "—"}</span>
                    <span>Last verified: {s.lastVerifiedDate || "—"}</span>
                    <span>{s.reliabilityLevel}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && <p className="text-sm text-slate-400 dark:text-slate-400">No sources match the current filters.</p>}
          </div>
        )}
      </div>
    </AppShell>
  );
}
