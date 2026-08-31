import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { api, ApiError } from "@/lib/api";
import { UseCaseInput } from "@/types/api";
import { SAMPLE_USE_CASES } from "@/data/sampleUseCases";
import { Loader2, Sparkles, ShieldQuestion } from "lucide-react";
import { getApiKey } from "@/lib/settings";

const EMPTY: UseCaseInput = {
  useCaseName: "",
  description: "",
  industry: "Financial Services / Banking",
  intendedUsers: "",
  dataUsed: "",
  purpose: "",
  affectedParties: "",
  decisionType: "recommendation",
  humanReview: true,
  region: "United States"
};

export function NewAssessmentPage() {
  const [form, setForm] = useState<UseCaseInput>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  function update<K extends keyof UseCaseInput>(key: K, value: UseCaseInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function loadSample(name: string) {
    const sample = SAMPLE_USE_CASES.find((s) => s.useCaseName === name);
    if (sample) setForm(sample);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.createUseCaseAndAssess(form);
      navigate(`/assessments/${result.useCaseId}`);
    // } catch (err) {
    //   if (err instanceof ApiError && err.status === 401) {
    //     setError(
    //       !getApiKey()
    //         ? "Backend API key is not configured. Open Settings and configure the Backend API Key."
    //         : "Backend authentication failed. Check that the Backend API Key in Settings matches the API_KEY configured in the backend .env."
    //     );
    //   } else if (err instanceof ApiError) {
    //     setError(err.message + (err.details ? ` (${JSON.stringify(err.details).slice(0, 200)})` : ""));
    //   } else {
    //     setError("Something went wrong submitting the assessment.");
    //   }
 //}
 } catch (err) {
  console.error("ASSESSMENT SUBMISSION ERROR:", err);

  if (err instanceof ApiError && err.status === 401) {
    setError(
      !getApiKey()
        ? "Backend API key is not configured. Open Settings and configure the Backend API Key."
        : "Backend authentication failed. Check that the Backend API Key in Settings matches the API_KEY configured in the backend .env."
    );
  } else if (err instanceof ApiError) {
    console.error("API ERROR:", {
      status: err.status,
      message: err.message,
      details: err.details,
    });

    setError(
      err.message +
        (err.details
          ? ` (${JSON.stringify(err.details).slice(0, 200)})`
          : "")
    );
  } else if (err instanceof Error) {
    console.error("NETWORK/UNKNOWN ERROR:", err.message);
    setError(`Request failed: ${err.message}`);
  } else {
    setError("Something went wrong submitting the assessment.");
  }
}
 finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="AI Governance Assessment" subtitle="Enter an AI use case to run a repeatable, evidence-based governance assessment.">
      <div className="mx-auto max-w-3xl space-y-5">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Enter AI Use Case</CardTitle>
              <CardDescription>Describe the use case in your own words — the system dynamically analyzes it, including entirely new use cases.</CardDescription>
            </div>
            <Sparkles className="h-5 w-5 text-brand-500" />
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Label>Quick-start from a sample banking use case (optional)</Label>
              <Select
                defaultValue=""
                onChange={(e) => e.target.value && loadSample(e.target.value)}
              >
                <option value="">— Start from scratch —</option>
                {SAMPLE_USE_CASES.map((s) => (
                  <option key={s.useCaseName} value={s.useCaseName}>
                    {s.useCaseName}
                  </option>
                ))}
              </Select>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>AI Use Case Name</Label>
                <Input required value={form.useCaseName} onChange={(e) => update("useCaseName", e.target.value)} placeholder="e.g. AI-Based Loan Approval" />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  required
                  rows={4}
                  minLength={20}
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Describe what the AI system does, in plain language..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Industry</Label>
                  <Input required value={form.industry} onChange={(e) => update("industry", e.target.value)} />
                </div>
                <div>
                  <Label>Geographic / Regulatory Region</Label>
                  <Input
                    required
                    value={form.region}
                    onChange={(e) => update("region", e.target.value)}
                    placeholder="e.g. United States, European Union, India, Global"
                  />
                </div>
              </div>

              <div>
                <Label>Intended Users</Label>
                <Input required value={form.intendedUsers} onChange={(e) => update("intendedUsers", e.target.value)} placeholder="Who uses this system day-to-day?" />
              </div>

              <div>
                <Label>Data Used</Label>
                <Textarea required rows={2} value={form.dataUsed} onChange={(e) => update("dataUsed", e.target.value)} placeholder="What data does the system use?" />
              </div>

              <div>
                <Label>Purpose</Label>
                <Textarea required rows={2} value={form.purpose} onChange={(e) => update("purpose", e.target.value)} placeholder="What is the system trying to achieve?" />
              </div>

              <div>
                <Label>Who is affected?</Label>
                <Input required value={form.affectedParties} onChange={(e) => update("affectedParties", e.target.value)} placeholder="e.g. Retail loan applicants" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Decision Type</Label>
                  <Select value={form.decisionType} onChange={(e) => update("decisionType", e.target.value as UseCaseInput["decisionType"])}>
                    <option value="recommendation">Recommendation only</option>
                    <option value="automated_decision">Automated decision</option>
                    <option value="both">Both (automated decision + recommendation)</option>
                  </Select>
                </div>
                <div>
                  <Label>Human Oversight</Label>
                  <Select value={form.humanReview ? "yes" : "no"} onChange={(e) => update("humanReview", e.target.value === "yes")}>
                    <option value="yes">Humans review decisions</option>
                    <option value="no">No human review before the outcome takes effect</option>
                  </Select>
                </div>
              </div>

              {error && <Alert variant="error" title="Could not run assessment">{error}</Alert>}

              <Alert variant="info" title="How this works">
                An LLM (or the deterministic fallback, if no API key is configured server-side) only extracts entities and candidate risk factors from
                your text. The risk score, thresholds, override rules, and final classification are always computed by the deterministic scoring engine —
                never decided by the LLM.
              </Alert>

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Running assessment…
                  </>
                ) : (
                  <>
                    <ShieldQuestion className="h-4 w-4" /> Run Assessment
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
