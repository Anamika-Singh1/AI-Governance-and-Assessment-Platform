const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { config } = require('../dist/config/env');
const sources = require('../dist/repositories/sourceRepository');
const { DIMENSION_KEYS } = require('../dist/config/dimensions');
const { parseLLMAssessment, runLLMAssessment } = require('../dist/services/assessment/llmAssessment');
const originalFetch = global.fetch;
after(() => { global.fetch = originalFetch; });
const signals = { extractionMethod: 'deterministic-fallback' };
function fixture() {
  return { riskLevel: 'Critical', impactLevel: 'High impact', requiredHumanOversight: 'Review before use.', criticalAreas: ['PRIVACY'], regulatoryMapping: [],
    dimensionAssessments: DIMENSION_KEYS.map(dimension => ({ dimension, score: 2, severity: 'High', reasoning: 'Specific model judgment.', evidence: [], riskFactors: ['Uncertain retention.'], recommendedControls: ['Document retention.'], sourceIds: ['known'] })) };
}
test('preserves model classifications instead of applying score thresholds', () => {
  const result = parseLLMAssessment(JSON.stringify(fixture()), [{ id: 'known' }], signals);
  assert.equal(result.overallScore, 20);
  assert.equal(result.riskLevel, 'Critical');
  assert.equal(result.findings[0].severity, 'High');
  assert.equal(result.extractionMethod, 'deterministic-fallback');
  assert.deepEqual(result.triggeredRules, []);
});
test('rejects invented citations, duplicate dimensions, invalid scores and incomplete JSON', () => {
  for (const change of [x => x.dimensionAssessments[0].sourceIds.push('invented'), x => x.dimensionAssessments[0].score = 6, x => x.dimensionAssessments[0].dimension = x.dimensionAssessments[1].dimension]) {
    const result = fixture(); change(result);
    assert.throws(() => parseLLMAssessment(JSON.stringify(result), [{ id: 'known' }], signals), { code: 'LLM_INVALID_RESPONSE' });
  }
  assert.throws(() => parseLLMAssessment('{', [], signals), { code: 'LLM_INVALID_RESPONSE' });
});
test('fails clearly without credentials and never calls a fallback engine', async () => {
  config.llmProvider = 'deterministic';
  await assert.rejects(runLLMAssessment({}, signals), { code: 'LLM_NOT_CONFIGURED' });
});
test('sends the use case to the model and surfaces quota and malformed response failures', async () => {
  config.llmProvider = 'openai'; config.openaiApiKey = 'test-key';
  sources.listSources = async () => [{ id: 'known' }];
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/chat/completions');
    const body = JSON.parse(options.body);
    assert.equal(JSON.parse(body.messages[1].content).useCase.description, 'Test input');
    return { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(fixture()) } }] }) };
  };
  assert.equal((await runLLMAssessment({ description: 'Test input' }, signals)).riskLevel, 'Critical');
  global.fetch = async () => ({ ok: false, status: 429, json: async () => ({ error: { code: 'rate_limit_exceeded' } }) });
  await assert.rejects(runLLMAssessment({}, signals), { code: 'LLM_API_ERROR' });
  global.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ finish_reason: 'length' }] }) });
  await assert.rejects(runLLMAssessment({}, signals), { code: 'LLM_INVALID_RESPONSE' });
});

test('distinguishes exhausted API credits from temporary rate limits without exposing provider messages', async () => {
  config.llmProvider = 'openai'; config.openaiApiKey = 'test-key';
  sources.listSources = async () => [{ id: 'known' }];
  for (const error of [
    { code: 'credit_balance_exhausted', type: 'insufficient_quota' },
    { code: 'insufficient_quota' },
    { type: 'insufficient_quota' }
  ]) {
    global.fetch = async () => ({ ok: false, status: 429, json: async () => ({ error: { ...error, message: 'sensitive-provider-details' } }) });
    await assert.rejects(runLLMAssessment({}, signals), error => {
      assert.equal(error.code, 'LLM_QUOTA_EXCEEDED');
      assert.equal(error.statusCode, 503);
      assert.match(error.message, /billing/);
      assert.doesNotMatch(error.message, /sensitive-provider-details/);
      return true;
    });
  }
  global.fetch = async () => ({ ok: false, status: 502, json: async () => { throw new Error('not JSON'); } });
  await assert.rejects(runLLMAssessment({}, signals), { code: 'LLM_API_ERROR' });
});

test('stored model severity, regulatory mapping and controls survive repository reads', async () => {
  const { pgPool } = require('../dist/database/pool');
  const { getAssessmentById, getDimensionsForAssessment } = require('../dist/repositories/assessmentRepository');
  const originalQuery = pgPool.query;
  const snapshot = parseLLMAssessment(JSON.stringify(fixture()), [{ id: 'known' }], signals);
  const now = new Date();
  pgPool.query = async sql => sql.includes('FROM use_cases')
    ? { rows: [{ id: '00000000-0000-0000-0000-000000000001', created_at: now }] }
    : { rows: [{ id: 'run', created_at: now, result_snapshot: snapshot, audit_trail: [] }] };
  try {
    const stored = await getAssessmentById('00000000-0000-0000-0000-000000000001');
    assert.deepEqual(stored.findings, snapshot.findings);
    assert.deepEqual(stored.regulatoryMapping, snapshot.regulatoryMapping);
    assert.equal(stored.riskLevel, 'Critical');
    assert.deepEqual((await getDimensionsForAssessment('use-case'))[0].sourceIds, ['known']);
  } finally { pgPool.query = originalQuery; }
});
