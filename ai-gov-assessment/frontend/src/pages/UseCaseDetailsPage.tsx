import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { RiskBadge } from "@/components/RiskBadge";
import { api, ApiError } from "@/lib/api";
import { Assessment, UseCaseRecord } from "@/types/api";
import { Loader2, AlertCircle, ShieldQuestion, ArrowRight, RefreshCw } from "lucide-react";

function labelize(key: string): string {
  // camelCase -> "Camel Case"
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.map(String).join(", ") : "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

/** Renders a Record<string, unknown> (raw LLM signals or the structured rule-evaluation context) as a readable key/value grid. */
function SignalsGrid({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return <p className="text-sm text-slate-400">No data.</p>;
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <span className="text-slate-500">{labelize(key)}</span>
          <span className="font-medium text-slate-800">{formatFieldValue(value)}</span>
        </div>
      ))}
    </div>
  );
}

export function UseCaseDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [useCase, setUseCase] = useState<UseCaseRecord | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([api.getUseCase(id), api.getLatestAssessmentForUseCase(id)])
      .then(([uc, assess]) => {
        setUseCase(uc);
        setAssessment(assess);
        setNotFound(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRunAssessment() {
    if (!id) return;
    setRunning(true);
    setError(null);
    try {
      await api.runAssessment(id);
      navigate(`/assessments/${id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not run the assessment.");
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Use Case Details">
        <div className="flex h-64 items-center justify-center text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (notFound || !useCase) {
    return (
      <AppShell title="Use Case Details">
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-4 w-4" /> Use case not found.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={useCase.useCaseName} subtitle={`${useCase.industry} · ${useCase.region} · structured ${new Date(useCase.createdAt).toLocaleString()}`}>
      <div className="mx-auto max-w-4xl space-y-6">
        {error && (
          <Alert variant="error" title="Something went wrong">
            {error}
          </Alert>
        )}

        <Card>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Latest assessment</div>
              {assessment ? (
                <div className="mt-1 flex items-center gap-3">
                  <RiskBadge level={assessment.riskLevel} size="lg" />
                  <span className="text-sm text-slate-600">
                    {assessment.overallScore}/{assessment.maxScore} ({assessment.riskPercentage}%) · {new Date(assessment.createdAt).toLocaleString()}
                  </span>
                </div>
              ) : (
                <div className="mt-1 text-sm text-slate-500">No assessment has been run against this use case yet.</div>
              )}
            </div>
            <div className="flex gap-2">
              {assessment && (
                <Link to={`/assessments/${useCase.id}`}>
                  <Button variant="outline">
                    View Full Results <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              )}
              <Button onClick={handleRunAssessment} disabled={running}>
                {running ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Running…
                  </>
                ) : assessment ? (
                  <>
                    <RefreshCw className="h-4 w-4" /> Re-run Assessment
                  </>
                ) : (
                  <>
                    <ShieldQuestion className="h-4 w-4" /> Run Assessment
                  </>
                )}
              </Button>
            </div>
          </div>
          {assessment && (
            <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
              Re-running replays the signals extracted below through the current governance rules — it never calls the LLM again, which is why an
              unchanged use case always reproduces the same score.
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Use Case</CardTitle>
            <CardDescription>The submitted description this assessment is based on.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Description</div>
              <p className="mt-1 text-sm text-slate-700">{useCase.description}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Purpose</div>
                <p className="mt-1 text-sm text-slate-700">{useCase.purpose}</p>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Data Used</div>
                <p className="mt-1 text-sm text-slate-700">{useCase.dataUsed}</p>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Intended Users</div>
                <p className="mt-1 text-sm text-slate-700">{useCase.intendedUsers}</p>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Affected Parties</div>
                <p className="mt-1 text-sm text-slate-700">{useCase.affectedParties}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <Badge>{useCase.decisionType === "automated_decision" ? "Automated decision" : useCase.decisionType === "both" ? "Automated + recommendation" : "Recommendation only"}</Badge>
              <Badge>{useCase.humanReview ? "Human review: yes" : "Human review: no"}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Extracted Signals</CardTitle>
            <CardDescription>
              What the LLM (or deterministic fallback) returned from the text above, at creation time — persisted once and reused on every re-run.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignalsGrid data={useCase.extractedSignals} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Structured Rule-Evaluation Context</CardTitle>
            <CardDescription>The canonical, normalized context every governance rule's conditions are actually evaluated against.</CardDescription>
          </CardHeader>
          <CardContent>
            <SignalsGrid data={useCase.structured} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
