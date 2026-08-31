/**
 * App-level connection settings, stored only in the browser's
 * localStorage — never baked into the built JS bundle. This keeps the
 * API key out of source control and out of the shipped frontend
 * artifact (Section 22: "No API keys in frontend"). LLM provider keys
 * (Anthropic/OpenAI) never touch the browser at all — they are read
 * server-side only, from the backend's own environment variables.
 */
const API_BASE_KEY = "aigov.apiBaseUrl";
const API_KEY_KEY = "aigov.apiKey";

export function getApiBaseUrl(): string {
  return localStorage.getItem(API_BASE_KEY) || "http://localhost:4000";
}

export function setApiBaseUrl(url: string) {
  localStorage.setItem(API_BASE_KEY, url);
}

export function getApiKey(): string {
  return localStorage.getItem(API_KEY_KEY) || "";
}

export function setApiKey(key: string) {
  localStorage.setItem(API_KEY_KEY, key);
}
