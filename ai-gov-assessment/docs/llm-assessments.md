# LLM assessments

New runs call OpenAI to generate all ten dimension scores and severities, overall risk and impact, reasoning, recommendations, oversight and regulatory applicability. The original use-case input and curated source descriptions are sent to the model. If the provider is unavailable, unconfigured, or returns an invalid response, the assessment service uses the existing rule-based engine with the submitted input and stored governance rules. It saves the result with `llmProviderUsed: deterministic (fallback)`, records the provider failure code in the audit trail, and displays the result directly without a warning banner.

Configure `backend/.env` (never commit the key):

```dotenv
LLM_PROVIDER=openai
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-4o-mini
```

Restart the backend after configuration changes. Provider HTTP 401 means the API rejected the credentials; HTTP 429 requires checking quota, billing or rate limits. These provider failures trigger rule-based assessment. Database, authorization, and fallback-engine failures still produce errors; they are not replaced with sample results.

For database upgrades, run from the repository root:

```powershell
npm.cmd --prefix backend run db:migrate
```

Migration 005 adds `assessments.result_snapshot`, preserving the entire validated result. Historical assessments remain unchanged; rerun a use case to generate a new LLM assessment. Reads of new results never reconstruct model severity or regulatory conclusions from legacy rules.

The application validates all ten unique dimensions, integer scores from 0 to 5, risk labels and source IDs. It sums scores and calculates the percentage, while the model chooses classifications. Source descriptions are context, not live web research or independently verified support for every model claim. Unknown citation IDs are rejected.

Run regression checks with `npm.cmd --prefix backend run test:llm`. These use mocked API responses and do not spend API credits. The current full-assessment integration supports OpenAI; the other legacy providers still serve extraction only.

API response format reference: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
