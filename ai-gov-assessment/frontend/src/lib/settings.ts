/** Deployment-owned API location. It is intentionally not user-editable. */
export function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
}
