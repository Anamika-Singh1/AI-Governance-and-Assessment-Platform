import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { RiskBadge } from "@/components/RiskBadge";
import { useAssessments } from "@/hooks/useAssessments";
import { Loader2, ArrowRight } from "lucide-react";

export function HistoryPage() {
  const { items, loading } = useAssessments();

  return (
    <AppShell title="Assessment History" subtitle="Every assessment ever run is stored for audit and comparison.">
      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400">No assessments yet. Run one from New Assessment.</p>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Use Case</th>
                <th className="px-4 py-3 font-medium">Industry</th>
                <th className="px-4 py-3 font-medium">Region</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Risk Level</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.useCaseId} className="border-b border-slate-100 last:border-none hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{a.useCaseName}</td>
                  <td className="px-4 py-3 text-slate-500">{a.industry}</td>
                  <td className="px-4 py-3 text-slate-500">{a.region}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {a.overallScore}/50 ({a.riskPercentage}%)
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge level={a.riskLevel} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-slate-400">{new Date(a.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link to={`/use-cases/${a.useCaseId}`} className="text-slate-500 hover:underline">
                        Use Case
                      </Link>
                      <Link to={`/assessments/${a.useCaseId}`} className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                        View <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </AppShell>
  );
}
