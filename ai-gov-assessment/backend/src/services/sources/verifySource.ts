/**
 * Best-effort live verification that a curated source URL still
 * resolves. This is a real anti-hallucination feature: rather than
 * trusting the curated metadata forever, the app can (re)check it and
 * mark a source "Unverified" if the check fails or network access is
 * unavailable in the current environment (e.g. an offline evaluation
 * sandbox). A failed/unavailable check NEVER upgrades a source's
 * confidence — it only ever downgrades or confirms it.
 */
export interface VerificationOutcome {
  verified: boolean;
  lastVerifiedDate: string | null;
  note: string;
}

export async function verifySourceUrl(url: string, timeoutMs = 6000): Promise<VerificationOutcome> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": "AI-Governance-Assessment-App/1.0 (source-verification)" }
    });
    if (res.ok || (res.status >= 300 && res.status < 400)) {
      return { verified: true, lastVerifiedDate: new Date().toISOString().slice(0, 10), note: `HTTP ${res.status}` };
    }
    return { verified: false, lastVerifiedDate: null, note: `HTTP ${res.status}` };
  } catch (err: any) {
    return { verified: false, lastVerifiedDate: null, note: `Verification unavailable: ${err?.message || "network error"}` };
  }
}
