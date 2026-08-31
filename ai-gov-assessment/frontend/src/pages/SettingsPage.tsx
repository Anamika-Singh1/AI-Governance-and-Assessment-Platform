import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { getApiBaseUrl, setApiBaseUrl, getApiKey, setApiKey } from "@/lib/settings";
import { api } from "@/lib/api";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export function SettingsPage() {
  const [baseUrl, setBaseUrl] = useState(getApiBaseUrl());
  const [apiKey, setApiKeyState] = useState(getApiKey());
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "fail">("idle");
  const [saved, setSaved] = useState(false);

  function save() {
    setApiBaseUrl(baseUrl.trim());
    setApiKey(apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function testConnection() {
    setApiBaseUrl(baseUrl.trim());
    setStatus("checking");
    try {
      await api.health();
      setStatus("ok");
    } catch {
      setStatus("fail");
    }
  }

  useEffect(() => {
    testConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell title="Settings" subtitle="Configure the connection to the AI Governance Assessment backend API.">
      <div className="mx-auto max-w-2xl space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Backend Connection</CardTitle>
            <CardDescription>
              This app never bundles LLM provider keys (Anthropic/OpenAI) into the browser — those live only in the backend's server-side
              environment variables. The value below is a lightweight app-level API key used to authorize write requests from this browser to
              your own backend, stored only in this browser's local storage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>API Base URL</Label>
              <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="http://localhost:4000" />
            </div>
            <div>
              <Label>API Key (matches backend API_KEY env var)</Label>
              <Input type="password" value={apiKey} onChange={(e) => setApiKeyState(e.target.value)} placeholder="changeme-local-dev-key" />
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={save}>Save Settings</Button>
              <Button variant="outline" onClick={testConnection} disabled={status === "checking"}>
                {status === "checking" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Test Connection
              </Button>
              {saved && <span className="text-xs text-emerald-600">Saved</span>}
            </div>

            {status === "ok" && (
              <Alert variant="success" title="Connected">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Backend API is reachable.
                </span>
              </Alert>
            )}
            {status === "fail" && (
              <Alert variant="error" title="Cannot reach backend">
                <span className="flex items-center gap-1.5">
                  <XCircle className="h-3.5 w-3.5" /> Check that the backend is running and the URL above is correct.
                </span>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About LLM Providers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>
              The backend selects its LLM provider via the <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">LLM_PROVIDER</code> environment
              variable (<code className="rounded bg-slate-100 px-1 py-0.5 text-xs">deterministic</code>,{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">anthropic</code>, or{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">openai</code>). If no key is configured, or a live call fails, the app
              automatically falls back to a deterministic, rule-based extractor — the application always remains fully functional and repeatable.
            </p>
            <p>All scoring, thresholds, override rules, and the final risk classification are computed deterministically regardless of provider.</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
