const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const llm = require('../dist/services/assessment/llmAssessment');
const engine = require('../dist/services/scoring/assessmentEngine');
const useCases = require('../dist/repositories/useCaseRepository');
const assessments = require('../dist/repositories/assessmentRepository');
const { runAssessment } = require('../dist/services/assessment/assessmentService');
const { AppError } = require('../dist/utils/validation');

test('assessment service fallback and persistence', async t => {
  t.afterEach(() => mock.restoreAll());
  const useCase = { id: 'case', input: { useCaseName: 'Test' }, signals: { extractionMethod: 'llm' } };
  const result = { overallScore: 20, maxScore: 50, riskPercentage: 40, llmProviderUsed: 'openai:test' };
  function setup() {
    mock.method(useCases, 'getUseCaseById', async (id, user) => {
      assert.equal(user, 'owner');
      return useCase;
    });
    return mock.method(assessments, 'saveAssessment', async (id, data, auditTrail) => ({ ...data, auditTrail }));
  }
  for (const code of ['LLM_CONNECTION_ERROR', 'LLM_API_ERROR', 'LLM_INVALID_RESPONSE', 'LLM_QUOTA_EXCEEDED', 'LLM_NOT_CONFIGURED']) {
    await t.test(`persists rule-based result on ${code}`, async () => {
      const save = setup();
      mock.method(llm, 'runLLMAssessment', async () => { throw new AppError('Provider failed', 502, code); });
      mock.method(engine, 'runDeterministicAssessment', async (input, signals) => {
        assert.equal(input, useCase.input);
        assert.equal(signals, useCase.signals);
        return { ...result };
      });
      const saved = await runAssessment('case', 'owner');
      assert.equal(saved.llmProviderUsed, 'deterministic (fallback)');
      assert.equal(save.mock.callCount(), 1);
      assert.ok(saved.auditTrail.some(entry => entry.step === 'Rule-based fallback' && entry.detail.includes(code)));
      assert.ok(!saved.auditTrail.some(entry => entry.step === 'LLM assessment'));
    });
  }
  await t.test('successful LLM response does not invoke fallback', async () => {
    setup();
    mock.method(llm, 'runLLMAssessment', async () => result);
    const fallback = mock.method(engine, 'runDeterministicAssessment', async () => { throw new Error('Unexpected fallback'); });
    assert.equal((await runAssessment('case', 'owner')).llmProviderUsed, 'openai:test');
    assert.equal(fallback.mock.callCount(), 0);
  });
  await t.test('database errors are not disguised as provider failures', async () => {
    const save = setup();
    mock.method(llm, 'runLLMAssessment', async () => { throw new Error('Database unavailable'); });
    await assert.rejects(runAssessment('case', 'owner'), /Database unavailable/);
    assert.equal(save.mock.callCount(), 0);
  });
  await t.test('fallback failure does not persist a partial assessment', async () => {
    const save = setup();
    mock.method(llm, 'runLLMAssessment', async () => { throw new AppError('Unavailable', 502, 'LLM_API_ERROR'); });
    mock.method(engine, 'runDeterministicAssessment', async () => { throw new Error('Rules unavailable'); });
    await assert.rejects(runAssessment('case', 'owner'), /Rules unavailable/);
    assert.equal(save.mock.callCount(), 0);
  });
});
