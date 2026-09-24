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
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError("Your session expired. Please sign in again.");
      else if (err instanceof ApiError) setError(err.message);
      else setError("Something went wrong submitting the assessment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="AI Governance Assessment" subtitle="Enter an AI use case to run a repeatable, evidence-based governance assessment.">
      <div className="assessment-form mx-auto max-w-4xl space-y-5">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-7 dark:border-slate-700">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">New assessment</p>
              <CardTitle className="text-2xl">Describe your AI use case</CardTitle>
              <CardDescription>Describe the use case in your own words — the system dynamically analyzes it, including entirely new use cases.</CardDescription>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300"><Sparkles className="h-5 w-5" /></span>
          </CardHeader>
          <CardContent className="p-5 sm:p-7">
            <div className="mb-7 rounded-xl border border-brand-100 bg-brand-50/50 p-4 dark:border-brand-900 dark:bg-brand-950/30">
              <Label htmlFor="sample">Start with a sample <span className="font-normal text-slate-500 dark:text-slate-400">(optional)</span></Label>
              <Select
                id="sample"
                disabled={submitting}
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

            <form onSubmit={handleSubmit} className="space-y-6" aria-busy={submitting}>
              <fieldset disabled={submitting} className="space-y-5">
              <legend className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">01 · Use case overview</legend>
              <div>
                <Label htmlFor="useCaseName">AI Use Case Name</Label>
                <Input id="useCaseName" required value={form.useCaseName} onChange={(e) => update("useCaseName", e.target.value)} placeholder="e.g. AI-Based Loan Approval" />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description"
                  required
                  rows={4}
                  minLength={20}
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Describe what the AI system does, in plain language..."
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input id="industry" required value={form.industry} onChange={(e) => update("industry", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="region">Geographic / Regulatory Region</Label>
                  <Input id="region"
                    required
                    value={form.region}
                    onChange={(e) => update("region", e.target.value)}
                    placeholder="e.g. United States, European Union, India, Global"
                  />
                </div>
              </div>

              </fieldset>
              <fieldset disabled={submitting} className="space-y-5 border-t border-slate-200 pt-6 dark:border-slate-700">
              <legend className="pr-3 text-base font-semibold text-slate-900 dark:text-slate-100">02 · People and data</legend>
              <div>
                <Label htmlFor="intendedUsers">Intended Users</Label>
                <Input id="intendedUsers" required value={form.intendedUsers} onChange={(e) => update("intendedUsers", e.target.value)} placeholder="Who uses this system day-to-day?" />
              </div>

              <div>
                <Label htmlFor="dataUsed">Data Used</Label>
                <Textarea id="dataUsed" required rows={2} value={form.dataUsed} onChange={(e) => update("dataUsed", e.target.value)} placeholder="What data does the system use?" />
              </div>

              <div>
                <Label htmlFor="purpose">Purpose</Label>
                <Textarea id="purpose" required rows={2} value={form.purpose} onChange={(e) => update("purpose", e.target.value)} placeholder="What is the system trying to achieve?" />
              </div>

              <div>
                <Label htmlFor="affectedParties">Who is affected?</Label>
                <Input id="affectedParties" required value={form.affectedParties} onChange={(e) => update("affectedParties", e.target.value)} placeholder="e.g. Retail loan applicants" />
              </div>

              </fieldset>
              <fieldset disabled={submitting} className="space-y-5 border-t border-slate-200 pt-6 dark:border-slate-700">
              <legend className="pr-3 text-base font-semibold text-slate-900 dark:text-slate-100">03 · Decisions and oversight</legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="decisionType">Decision Type</Label>
                  <Select id="decisionType" value={form.decisionType} onChange={(e) => update("decisionType", e.target.value as UseCaseInput["decisionType"])}>
                    <option value="recommendation">Recommendation only</option>
                    <option value="automated_decision">Automated decision</option>
                    <option value="both">Both (automated decision + recommendation)</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="humanReview">Human Oversight</Label>
                  <Select id="humanReview" value={form.humanReview ? "yes" : "no"} onChange={(e) => update("humanReview", e.target.value === "yes")}>
                    <option value="yes">Humans review decisions</option>
                    <option value="no">No human review before the outcome takes effect</option>
                  </Select>
                </div>
              </div>

              </fieldset>
              {error && <Alert variant="error" title="Could not run assessment">{error}</Alert>}

              <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">Your assessment includes risk scores, supporting findings, and recommended controls. Results are saved to your assessment history.</p>

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
