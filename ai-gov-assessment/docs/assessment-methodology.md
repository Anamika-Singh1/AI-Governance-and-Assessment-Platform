# Assessment Methodology

## The ten governance dimensions

Every use case is scored 0–5 on each of ten dimensions (50 points total). Definitions live in the `dimensions` table (seeded from `backend/src/config/dimensions.ts`) and are served live by `GET /api/methodology` — this document summarizes them; the API response is the authoritative, current copy.

| Dimension | What it assesses |
|---|---|
| Data Governance | Sensitivity, quality, provenance, and lifecycle management of the data the system uses. |
| Privacy | Personal/sensitive-personal data handling, legal basis, data subject rights, cross-border processing. |
| Bias & Fairness | Potential for discriminatory outcomes and the rigor of fairness controls. |
| Human Oversight | Whether humans meaningfully review, can override, and are accountable for AI outputs. |
| Explainability | Whether decisions can be explained to users, regulators, and auditors. |
| Security | Technical controls protecting the model, data, and APIs from misuse or attack. |
| Decision Impact | Magnitude and reach of consequences on affected individuals. |
| Regulatory Exposure | Extent to which laws, regulations, and standards potentially apply. |
| Model Risk | Model complexity, validation rigor, drift exposure, third-party/hallucination risk. |
| Monitoring | Maturity of post-deployment monitoring, incident response, and review. |

## Scoring pipeline, end to end

1. **Structuring (once, at `POST /api/use-cases`)**: the active `LLMProvider` (or the deterministic fallback) reads the free-text use-case fields and returns `ExtractedSignals` — booleans and enums like `hasFinancialData`, `hasBiometricData`, `hasHealthData`, `hasIdentityData`, `isLargeScale`, `multiRegion`, `mentionsProtectedCharacteristics`, `automationLevel`, `isGenerativeAI`, `primaryDomain`. `buildStructuredUseCase()` turns these into the `StructuredUseCase` rule-evaluation context, and both the raw signals and the structured context are persisted on the `use_cases` row.
2. **Per-dimension scoring (every `POST /api/assessments` or `.../run`)**: for nine of the ten dimensions, `getActiveGovernanceRules(dimensionKey)` loads that dimension's active rules from Postgres. Each rule has a condition list (`matchMode: "all"` or `"any"` over `{field, op, value}` comparisons — `==, !=, >, >=, <, <=, in, not-in`) and a `scoreDelta`. Every rule whose conditions match the structured use case contributes its `scoreDelta`; the dimension's score is the sum, clamped to `[0, 5]`. `REGULATORY_EXPOSURE` is scored by a completely separate mechanism — see below; it has zero rows in `governance_rules` by design, not by omission.
3. **Evidence retrieval**: for each dimension, `retrieveEvidenceForDimension` runs a pgvector cosine-similarity search over `source_chunks` (see [ai-and-rag.md](./ai-and-rag.md)) and attaches the top matches above a relevance threshold as supporting evidence, plus a legacy keyword-based source list (`selectSourcesForDimension`) merged in defensively so evidence is never empty just because the embedding search found nothing.
4. **Overall score and base risk level**: `overallScore` is the sum of all ten dimension scores (max 50); `riskPercentage = overallScore / 50 * 100`. The percentage maps to a base risk level via fixed thresholds (`backend/src/config/thresholds.json`):

   | Risk level | Percentage range |
   |---|---|
   | Low | 0–20% |
   | Moderate | 21–40% |
   | Elevated | 41–60% |
   | High | 61–80% |
   | Critical | 81–100% |

5. **Override rules (floor layer)**: eight cross-dimension rules (`backend/src/rules/overrideRules.json`, loaded into the `override_rules` table) each check a small combination of dimension scores or signals — e.g. "`DECISION_IMPACT >= 4` and `HUMAN_OVERSIGHT <= 2`" enforces a **minimum** of "High" regardless of the aggregate percentage. A triggered override can only raise the final classification, never lower it: `determineRiskLevel` takes the max of the threshold-derived level and every triggered override's `enforcedMinRiskLevel`. This exists because a use case can have a moderate aggregate score while still containing one specific, severe combination (e.g. fully automated + maximum impact) that the average would understate.
6. **Required controls and human oversight statement**: `generateRequiredControls` collects each dimension's `recommended_controls` (from the `dimensions` table) for every dimension scoring 3 or above, deduplicated. The required-human-oversight text is derived directly from the final risk level (e.g. Critical → mandatory pre-decision human review with documented sign-off).

## Regulatory Exposure — a full exception, documented rather than hidden

`REGULATORY_EXPOSURE` does not go through the governance-rule engine at all — `runDeterministicAssessment` special-cases it (`backend/src/services/scoring/assessmentEngine.ts`) and scores it entirely from `computeRegulatoryMapping()` (`backend/src/services/research/regulatoryMapping.ts`), which does keyword matching against the use case's domain/description/region to decide which specific regulations (EU AI Act, GDPR, ECOA/Reg B, FCRA, India DPDP Act, RBI guidance, …) are "Applicable," "Potentially Applicable," or "Not Applicable," each with a stated jurisdiction and source citation. The 0–5 score is then derived from a weighted count (`regulatoryExposureScore`: each "Applicable" match weighs 1.5, each "Potentially Applicable" match weighs 0.75, and the weighted total maps onto 1–5 via fixed bands). This mapping is surfaced separately in the API response (`regulatoryMapping[]`) so a reviewer can see *which specific law* drove the exposure, not just a 0–5 number — and it's why `REGULATORY_EXPOSURE` correctly shows zero rows under it on the Governance Rules page: its scoring logic lives entirely in `regulatoryMapping.ts`, not in `governance_rules`.

**Known limitation, stated plainly**: the keyword set behind this mapping was originally written for a financial-services proof of concept and is still financial-services-leaning. It has been observed to produce false-positive matches (e.g. flagging ECOA/Reg B or FCRA relevance) for clearly non-financial use cases such as warehouse-safety monitoring. This inflates `REGULATORY_EXPOSURE` and, transitively, the final risk level for those cases. The fix — making the mapping rules industry-scoped the same way `governance_rules` already are (via `industry_id`) — is a natural next step, not yet done.

## Explainability of a result

Every `Assessment` API response includes: the per-dimension score and plain-language `reasoning`; the specific `evidence` snippets and `sourceIds` that were retrieved for that dimension; which `governance_rules` fired (`applied_rule_ids`) and why (`reason` on each); which `override_rules`, if any, fired and what minimum they enforced; the full `regulatoryMapping`; and an `auditTrail` narrating each step taken to produce the result, including whether the LLM was called on this run or whether stored signals were reused. Nothing in the final score is opaque — every point can be traced to either a specific fired rule or a specific retrieved evidence chunk.

## Reproducibility, verified

Because scoring never calls the LLM again after use-case creation, re-running an assessment against an unchanged use case with unchanged rules always produces an identical `overallScore` and `riskLevel`. This is asserted directly in `backend/src/__tests__/assessmentApi.test.ts` (creates a use case, runs an assessment, re-runs it via `POST /:id/run`, asserts the scores match) and was additionally verified by hand via raw `curl` against two independent runs of an identical new use case.
