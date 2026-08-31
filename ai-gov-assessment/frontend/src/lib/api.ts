import { Assessment, AssessmentListItem, FindingRecord, MethodologyResponse, RulesResponse, SourceRecord, SourceType, UseCaseInput, UseCaseRecord, UseCaseListItem } from "@/types/api";
import { getApiBaseUrl, getApiKey } from "./settings";

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, opts: RequestInit = {}, auth = false): Promise<T> {
  const base = getApiBaseUrl();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts.headers as Record<string, string>) || {})
  };
  // if (auth) {
  //   const key = getApiKey();
  //   if (key) headers["Authorization"] = `Bearer ${key}`;
  // }
if (auth) {
  const key = getApiKey();

  console.log("API KEY EXISTS:", !!key);
  console.log("API KEY LENGTH:", key?.length);
  console.log("API KEY:", key);
  console.log("AUTH HEADER:", `Bearer ${key}`);

  if (!key) {
    throw new ApiError("Backend API key is not configured", 401);
  }

  headers["Authorization"] = `Bearer ${key}`;
}
  const res = await fetch(`${base}${path}`, { ...opts, headers });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    throw new ApiError(body?.message || `Request failed with status ${res.status}`, res.status, body?.details);
  }
  return body as T;
}

export const api = {
  health: () => request<{ status: string; version: string }>("/api/health"),

  // "Use Case Management" (create + structure) is now a separate step from
  // "Assessment Engine" (score) — matching the assignment's own module
  // list and the use_cases/assessments table split. createUseCaseAndAssess
  // is the convenience helper the New Assessment screen uses to do both in
  // one submit, without collapsing the two concepts in the API itself.
  createUseCase: (input: UseCaseInput) =>
    request<UseCaseRecord>("/api/use-cases", { method: "POST", body: JSON.stringify(input) }, true),

  listUseCases: (limit = 50, offset = 0) =>
    request<{ items: UseCaseListItem[]; total: number }>(`/api/use-cases?limit=${limit}&offset=${offset}`),

  getUseCase: (id: string) => request<UseCaseRecord>(`/api/use-cases/${id}`),

  runAssessment: (useCaseId: string) =>
    request<Assessment>("/api/assessments", { method: "POST", body: JSON.stringify({ useCaseId }) }, true),

  createUseCaseAndAssess: async (input: UseCaseInput) => {
    const useCase = await request<UseCaseRecord>("/api/use-cases", { method: "POST", body: JSON.stringify(input) }, true);
    return request<Assessment>("/api/assessments", { method: "POST", body: JSON.stringify({ useCaseId: useCase.id }) }, true);
  },

  listAssessments: () => request<AssessmentListItem[]>("/api/assessments"),

  getAssessment: (id: string) => request<Assessment>(`/api/assessments/${id}`),

  rerunAssessment: (id: string) => request<Assessment>(`/api/assessments/${id}/run`, { method: "POST" }, true),

  getFindings: (id: string) => request<FindingRecord[]>(`/api/assessments/${id}/findings`),

  getAssessmentSources: (id: string) => request<SourceRecord[]>(`/api/assessments/${id}/sources`),

  listSources: (filters?: { sourceType?: SourceType; jurisdiction?: string }) => {
    const params = new URLSearchParams();
    if (filters?.sourceType) params.set("sourceType", filters.sourceType);
    if (filters?.jurisdiction) params.set("jurisdiction", filters.jurisdiction);
    const qs = params.toString();
    return request<{ sourceTypes: SourceType[]; sources: SourceRecord[] }>(`/api/sources${qs ? `?${qs}` : ""}`);
  },

  getRules: () => request<RulesResponse>("/api/rules"),

  // GET /api/assessments/:id actually looks up by use_case_id and
  // returns the LATEST run for that use case (assessments are one row
  // per run, but the API only exposes the most recent one per use
  // case today — see docs/database.md). This wrapper exists so the
  // Use Case Details page can ask "is there an assessment yet" without
  // the page itself needing to know that 404-means-none-yet.
  getLatestAssessmentForUseCase: async (useCaseId: string): Promise<Assessment | null> => {
    try {
      return await request<Assessment>(`/api/assessments/${useCaseId}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },

  getMethodology: () => request<MethodologyResponse>("/api/methodology")
};
