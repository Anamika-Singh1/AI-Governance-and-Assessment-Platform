import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { RiskBadge } from "@/components/RiskBadge";
import { useAssessments } from "@/hooks/useAssessments";
import { Loader2, ArrowRight, Download, FileDown, FileJson } from "lucide-react";
import { csvValue, downloadFile } from "@/lib/utils";
import { jsPDF } from "jspdf";

export function HistoryPage() {
  const { items, loading } = useAssessments();

  function exportJson() {
    downloadFile("assessment-history.json", JSON.stringify(items, null, 2), "application/json");
  }

  function exportCsv() {
    const header = ["Use Case", "Industry", "Region", "Score", "Risk Level", "Risk Percentage", "Date"];
    const rows = items.map((item) => [item.useCaseName, item.industry, item.region, item.overallScore, item.riskLevel, `${item.riskPercentage}%`, new Date(item.createdAt).toISOString()]);
    downloadFile("assessment-history.csv", [header, ...rows].map((row) => row.map((value) => csvValue(value)).join(",")).join("\n"), "text/csv;charset=utf-8");
  }

  function exportPdf() {
    const document = new jsPDF({ orientation: "landscape" });
    document.setFontSize(18);
    document.text("AI Governance Assessment History", 14, 18);
    document.setFontSize(9);
    document.setTextColor(100);
    document.text(`Generated ${new Date().toLocaleString()}`, 14, 25);
    document.setTextColor(30);

    let y = 37;
    document.setFont("helvetica", "bold");
    document.text("Use Case", 14, y);
    document.text("Industry", 84, y);
    document.text("Region", 144, y);
    document.text("Score", 204, y);
    document.text("Risk", 232, y);
    document.text("Date", 266, y);
    document.setFont("helvetica", "normal");
    y += 7;

    items.forEach((item) => {
      if (y > 190) {
        document.addPage();
        y = 18;
      }
      document.text(document.splitTextToSize(item.useCaseName, 62)[0], 14, y);
      document.text(document.splitTextToSize(item.industry, 54)[0], 84, y);
      document.text(document.splitTextToSize(item.region, 54)[0], 144, y);
      document.text(`${item.overallScore}/50 (${item.riskPercentage}%)`, 204, y);
      document.text(item.riskLevel, 232, y);
      document.text(new Date(item.createdAt).toLocaleDateString(), 266, y);
      y += 7;
    });

    document.save("assessment-history.pdf");
  }

  return (
    <AppShell title="Assessment History" subtitle="Every assessment ever run is stored for audit and comparison.">
      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-400 dark:text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-400">No assessments yet. Run one from New Assessment.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-950" onClick={exportCsv} title="Download assessment history as CSV">
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button type="button" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-950" onClick={exportPdf} title="Download assessment history as PDF">
              <FileDown className="h-4 w-4" /> Export PDF
            </button>
            <button type="button" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-950" onClick={exportJson} title="Download assessment history as JSON">
              <FileJson className="h-4 w-4" /> Export JSON
            </button>
          </div>
          <Card className="overflow-x-auto" tabIndex={0} role="region" aria-label="Assessment history table">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
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
                <tr key={a.useCaseId} className="border-b border-slate-100 dark:border-slate-700 last:border-none hover:bg-slate-50 dark:hover:bg-slate-950">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{a.useCaseName}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{a.industry}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{a.region}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {a.overallScore}/50 ({a.riskPercentage}%)
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge level={a.riskLevel} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-slate-400 dark:text-slate-400">{new Date(a.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link to={`/use-cases/${a.useCaseId}`} className="text-slate-500 dark:text-slate-400 hover:underline">
                        Use Case
                      </Link>
                      <Link to={`/assessments/${a.useCaseId}`} className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:underline">
                        View <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
