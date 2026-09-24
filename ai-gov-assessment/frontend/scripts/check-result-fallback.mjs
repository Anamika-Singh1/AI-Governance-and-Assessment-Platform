import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const storage = new Map();
globalThis.sessionStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
};
async function load(file, replacements = []) {
  let source = await readFile(new URL(file, import.meta.url), 'utf8');
  for (const [from, to] of replacements) source = source.replace(from, to);
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText;
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
}
const cacheUrl = await load('../src/lib/resultCache.ts');
const cache = await import(cacheUrl);
const { api } = await import(await load('../src/lib/api.ts', [
  ['import { getApiBaseUrl } from "./settings";', 'const getApiBaseUrl = () => "http://test";'],
  ['from "./resultCache"', `from "${cacheUrl}"`],
]));
const reply = (body, status = 200) => {
  globalThis.fetch = async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
};
reply({ user: { id: 'one', tenantId: 'tenant' } });
await api.me();
const result = { useCaseId: 'case', findings: [], overallScore: 12 };
reply(result);
await api.runAssessment('case');
globalThis.fetch = async () => { throw new TypeError('Network unavailable'); };
assert.deepEqual(await api.getAssessment('case'), result);
assert.equal(cache.hasStoredFallback(), true);
reply({ message: 'Service unavailable' }, 503);
assert.deepEqual(await api.rerunAssessment('case'), result);
await assert.rejects(api.getAssessment('uncached'));
reply(result);
await api.getAssessment('case');
assert.equal(cache.hasStoredFallback(), false);
reply({ message: 'Not found' }, 404);
await assert.rejects(api.getAssessment('case'), error => error.status === 404);
reply({ message: 'Unauthorized' }, 401);
await assert.rejects(api.getAssessment('case'), error => error.status === 401);
reply({ user: { id: 'two', tenantId: 'tenant' } });
await api.me();
reply({}, 503);
await assert.rejects(api.getAssessment('case'));
reply({ user: { id: 'one', tenantId: 'tenant' } });
await api.me();
globalThis.sessionStorage.getItem = () => '{broken';
reply({}, 503);
await assert.rejects(api.getAssessment('case'));
globalThis.sessionStorage.setItem = () => { throw new Error('Storage full'); };
reply(result);
assert.deepEqual(await api.getAssessment('case'), result);
console.log('Assessment fallback checks passed.');
