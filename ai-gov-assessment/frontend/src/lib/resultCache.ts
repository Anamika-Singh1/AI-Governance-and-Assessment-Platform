// Session storage limits retained assessment data to this browser tab.
let scope: string | null = null;
const fallbackPaths = new Set<string>();
const listeners = new Set<() => void>();
export const subscribeToFallback = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const hasStoredFallback = () => fallbackPaths.size > 0;
export function markFallback(path: string, active: boolean) {
  if (active) fallbackPaths.add(path); else fallbackPaths.delete(path);
  listeners.forEach(listener => listener());
}
export function setCacheScope(value: string | null) {
  scope = value;
  fallbackPaths.clear();
  listeners.forEach(listener => listener());
}
export function readResult<T>(owner: string | null, path: string): T | undefined {
  if (!owner || owner !== scope) return undefined;
  try {
    const raw = sessionStorage.getItem(`assessment-cache:${owner}:${path}`);
    return raw ? JSON.parse(raw).data as T : undefined;
  } catch { return undefined; }
}
export function writeResult(owner: string | null, path: string, data: unknown) {
  if (!owner || owner !== scope || data == null) return;
  try { sessionStorage.setItem(`assessment-cache:${owner}:${path}`, JSON.stringify({ data })); }
  catch { /* Storage may be unavailable or full; live requests still work. */ }
}
export const getCacheScope = () => scope;
