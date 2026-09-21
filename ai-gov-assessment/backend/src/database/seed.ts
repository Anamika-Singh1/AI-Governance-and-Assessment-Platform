/**
 * Seed script — loads dimensions, the default tenant/industry, the
 * curated source library (chunked + embedded), and both rule tables
 * into Postgres. Run with: npm run db:seed
 *
 * Idempotent: safe to re-run (upserts on natural keys).
 */
import { pgPool } from "./pool";
import { DIMENSIONS } from "../config/dimensions";
import { CURATED_SOURCES } from "../rules/authoritativeSources";
import { embeddingProvider } from "../services/embeddings/hashingEmbeddingProvider";
import { upsertSourceAndChunks } from "../services/sources/sourceUpsert";
import overrideRulesConfig from "../rules/overrideRules.json";
import bcrypt from "bcryptjs";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// Controls ported 1:1 from the recommendedControls arrays in the
// original dimensionScoring.ts scorer functions.
const DIMENSION_CONTROLS: Record<string, string[]> = {
  DATA_GOVERNANCE: [
    "Document data provenance and lineage for all training and inference data",
    "Apply data minimization — collect only fields necessary for the stated purpose",
    "Define and enforce a data retention schedule",
    "Assess training-data suitability and representativeness before deployment"
  ],
  PRIVACY: [
    "Confirm and document the legal basis / consent mechanism for processing",
    "Apply purpose limitation — restrict use of the data to the stated purpose",
    "Provide data subject rights mechanisms (access, correction, erasure where applicable)",
    "Conduct a Data Protection / Privacy Impact Assessment (DPIA/PIA)"
  ],
  BIAS_FAIRNESS: [
    "Run pre-deployment fairness testing across protected-characteristic proxies",
    "Establish ongoing outcome-disparity monitoring in production",
    "Document training-data representativeness relative to the affected population",
    "Define a bias incident response and remediation process"
  ],
  HUMAN_OVERSIGHT: [
    "Define clear human-review checkpoints before high-impact outcomes take effect",
    "Provide a documented override / escalation mechanism",
    "Assign explicit human accountability for final decisions",
    "Give affected individuals a channel to challenge the AI-influenced decision"
  ],
  EXPLAINABILITY: [
    "Provide user-facing explanations / reason codes for adverse outcomes",
    "Maintain model interpretability documentation (e.g., model cards)",
    "Document the decision rationale logic for audit purposes",
    "Where generative AI is used, disclose its use and limitations to affected users"
  ],
  SECURITY: [
    "Enforce strong authentication and authorization on all model-serving APIs",
    "Apply input validation and prompt-injection defenses for any generative components",
    "Rate-limit and monitor for API/model abuse",
    "Assess third-party/model supply-chain security (weights, dependencies, hosting)"
  ],
  DECISION_IMPACT: [
    "Classify this use case's outcomes against a documented impact-severity scale",
    "Provide a remediation path for individuals harmed by an incorrect outcome",
    "Track outcome-level metrics (approval/denial rates, false-positive rates) by affected population segment"
  ],
  REGULATORY_EXPOSURE: [
    "Maintain a regulatory inventory mapping this use case to every applicable framework",
    "Engage legal/compliance review for every item marked 'Needs Legal Review'",
    "Track regulatory changes (e.g., EU AI Act implementing acts) that may reclassify this use case"
  ],
  MODEL_RISK: [
    "Establish a model validation process prior to deployment (independent of model developers)",
    "Monitor for performance degradation and concept/data drift in production",
    "Document third-party model dependencies and fallback plans",
    "For generative AI, implement hallucination-detection and human review of high-stakes outputs"
  ],
  MONITORING: [
    "Implement production performance, bias, and drift monitoring dashboards",
    "Maintain audit logs of inputs, outputs, and overrides for every decision",
    "Establish a periodic (e.g., quarterly) model review cadence",
    "Implement a kill switch / rollback plan for rapid deactivation if serious issues are detected"
  ]
};

// --- Additive governance rules ported 1:1 from the original
// dimensionScoring.ts scorer functions, so behavior is provably
// unchanged — every condition/delta below has a matching `if` branch
// in the code it replaces.
const GOVERNANCE_RULES: Array<{
  dimension: string;
  name: string;
  conditions: unknown[];
  matchMode?: "all" | "any";
  scoreDelta: number;
  reason: string;
}> = [
  // DATA_GOVERNANCE (base 1)
  { dimension: "DATA_GOVERNANCE", name: "Baseline data governance risk", conditions: [], scoreDelta: 1, reason: "Baseline data governance risk assumed for any AI system processing business data." },
  { dimension: "DATA_GOVERNANCE", name: "Financial data used", conditions: [{ field: "hasFinancialData", op: "==", value: true }], scoreDelta: 1, reason: "Financial data used as model input." },
  { dimension: "DATA_GOVERNANCE", name: "Biometric or health data", conditions: [{ field: "hasBiometricData", op: "==", value: true }, { field: "hasHealthData", op: "==", value: true }], matchMode: "any", scoreDelta: 1, reason: "Biometric or health data present, requiring elevated data governance controls." },
  { dimension: "DATA_GOVERNANCE", name: "Directly identifying data", conditions: [{ field: "hasIdentityData", op: "==", value: true }], scoreDelta: 1, reason: "Directly identifying data used, raising lineage and minimization requirements." },
  { dimension: "DATA_GOVERNANCE", name: "Large-scale processing", conditions: [{ field: "isLargeScale", op: "==", value: true }], scoreDelta: 1, reason: "Large-scale data processing increases governance and data-quality assurance burden." },
  { dimension: "DATA_GOVERNANCE", name: "Complex data pipeline domain", conditions: [{ field: "primaryDomain", op: "in", value: ["TRANSACTION_MONITORING", "CREDIT_LENDING"] }], scoreDelta: 1, reason: "Domain typically involves complex, multi-source data pipelines with provenance risk." },

  // PRIVACY (base 1)
  { dimension: "PRIVACY", name: "Baseline privacy risk", conditions: [], scoreDelta: 1, reason: "Baseline privacy risk assumed for any system processing user-related data." },
  { dimension: "PRIVACY", name: "Identifying personal data", conditions: [{ field: "hasIdentityData", op: "==", value: true }], scoreDelta: 1, reason: "Processes personal data that can identify an individual." },
  { dimension: "PRIVACY", name: "Financial personal data", conditions: [{ field: "hasFinancialData", op: "==", value: true }], scoreDelta: 1, reason: "Processes financial information tied to individuals." },
  { dimension: "PRIVACY", name: "Special-category data", conditions: [{ field: "hasBiometricData", op: "==", value: true }, { field: "hasHealthData", op: "==", value: true }], matchMode: "any", scoreDelta: 1, reason: "Processes special-category / sensitive personal data." },
  { dimension: "PRIVACY", name: "Cross-border processing", conditions: [{ field: "multiRegion", op: "==", value: true }], scoreDelta: 1, reason: "Use case spans multiple jurisdictions, raising cross-border data transfer considerations." },
  { dimension: "PRIVACY", name: "Automated decision effect", conditions: [{ field: "decisionType", op: "!=", value: "recommendation" }], scoreDelta: 1, reason: "Produces an automated decision with potential legal or similarly significant effect on the individual." },

  // BIAS_FAIRNESS (base 1)
  { dimension: "BIAS_FAIRNESS", name: "Baseline bias/fairness risk", conditions: [], scoreDelta: 1, reason: "Baseline bias/fairness risk assumed for any AI-influenced decision." },
  { dimension: "BIAS_FAIRNESS", name: "High discriminatory-impact domain", conditions: [{ field: "primaryDomain", op: "in", value: ["CREDIT_LENDING", "RECRUITMENT_HR", "INSURANCE_CLAIMS"] }], scoreDelta: 2, reason: "Use case falls in a domain with well-documented discriminatory-impact history (credit, employment, or insurance)." },
  { dimension: "BIAS_FAIRNESS", name: "Protected-characteristic proxies", conditions: [{ field: "mentionsProtectedCharacteristics", op: "==", value: true }], scoreDelta: 1, reason: "Description references characteristics that may correlate with protected classes." },
  { dimension: "BIAS_FAIRNESS", name: "Fully automated decisioning", conditions: [{ field: "decisionType", op: "==", value: "automated_decision" }], scoreDelta: 1, reason: "Fully automated decisioning reduces opportunity to catch disparate outcomes before they affect individuals." },
  { dimension: "BIAS_FAIRNESS", name: "Large affected population", conditions: [{ field: "isLargeScale", op: "==", value: true }], scoreDelta: 1, reason: "Outcome disparities would affect a large population if present." },

  // HUMAN_OVERSIGHT (base 0, purely additive by automation level)
  { dimension: "HUMAN_OVERSIGHT", name: "Advisory only", conditions: [{ field: "automationLevel", op: "==", value: "advisory" }], scoreDelta: 0, reason: "System output is advisory only; a human makes the actual decision." },
  { dimension: "HUMAN_OVERSIGHT", name: "Human-in-the-loop", conditions: [{ field: "automationLevel", op: "==", value: "human-in-loop" }], scoreDelta: 1, reason: "A human is involved in finalizing each decision." },
  { dimension: "HUMAN_OVERSIGHT", name: "Human-on-the-loop", conditions: [{ field: "automationLevel", op: "==", value: "human-on-loop" }], scoreDelta: 3, reason: "Humans monitor and can intervene, but the system acts autonomously by default." },
  { dimension: "HUMAN_OVERSIGHT", name: "Fully automated", conditions: [{ field: "automationLevel", op: "==", value: "fully-automated" }], scoreDelta: 5, reason: "No human reviews individual outcomes before they take effect." },

  // EXPLAINABILITY (base 1)
  { dimension: "EXPLAINABILITY", name: "Baseline explainability risk", conditions: [], scoreDelta: 1, reason: "Baseline explainability risk assumed for any model-influenced decision." },
  { dimension: "EXPLAINABILITY", name: "Generative/LLM output", conditions: [{ field: "isGenerativeAI", op: "==", value: true }], scoreDelta: 2, reason: "Generative / LLM-based outputs are inherently harder to fully explain and may hallucinate." },
  { dimension: "EXPLAINABILITY", name: "Reason-code domain", conditions: [{ field: "primaryDomain", op: "in", value: ["CREDIT_LENDING", "RECRUITMENT_HR", "INSURANCE_CLAIMS"] }], scoreDelta: 1, reason: "Domain typically carries regulatory adverse-action / reason-code explanation requirements." },
  { dimension: "EXPLAINABILITY", name: "Automated decision rationale", conditions: [{ field: "decisionType", op: "==", value: "automated_decision" }], scoreDelta: 1, reason: "Automated decisions require a documented rationale accessible to the affected individual." },

  // SECURITY (base 2)
  { dimension: "SECURITY", name: "Baseline security risk", conditions: [], scoreDelta: 2, reason: "Baseline API/authentication security risk assumed for any networked AI system." },
  { dimension: "SECURITY", name: "Sensitive data exposure", conditions: [{ field: "hasFinancialData", op: "==", value: true }, { field: "hasIdentityData", op: "==", value: true }], matchMode: "any", scoreDelta: 1, reason: "Sensitive data increases the impact of a potential data leakage or breach." },
  { dimension: "SECURITY", name: "Generative attack surface", conditions: [{ field: "isGenerativeAI", op: "==", value: true }], scoreDelta: 1, reason: "Generative/chatbot interfaces are exposed to prompt-injection and output-manipulation risks." },
  { dimension: "SECURITY", name: "Adversarial-evasion target domain", conditions: [{ field: "primaryDomain", op: "in", value: ["FRAUD_DETECTION", "TRANSACTION_MONITORING"] }], scoreDelta: 1, reason: "Fraud/AML systems are high-value targets for adversarial evasion attacks." },

  // DECISION_IMPACT (base 1)
  { dimension: "DECISION_IMPACT", name: "Baseline decision impact", conditions: [], scoreDelta: 1, reason: "Baseline decision-impact risk assumed for any AI-influenced outcome." },
  { dimension: "DECISION_IMPACT", name: "Financial/insurance access", conditions: [{ field: "primaryDomain", op: "in", value: ["CREDIT_LENDING", "INSURANCE_CLAIMS"] }], scoreDelta: 2, reason: "Directly affects access to financial services or insurance coverage." },
  { dimension: "DECISION_IMPACT", name: "Employment outcomes", conditions: [{ field: "primaryDomain", op: "==", value: "RECRUITMENT_HR" }], scoreDelta: 2, reason: "Directly affects employment outcomes." },
  { dimension: "DECISION_IMPACT", name: "False-positive consequence domain", conditions: [{ field: "primaryDomain", op: "in", value: ["TRANSACTION_MONITORING", "FRAUD_DETECTION"] }], scoreDelta: 1, reason: "False positives can freeze accounts or block legitimate transactions, with financial and legal consequences." },
  { dimension: "DECISION_IMPACT", name: "Large affected population", conditions: [{ field: "isLargeScale", op: "==", value: true }], scoreDelta: 1, reason: "A large number of individuals are potentially affected." },
  { dimension: "DECISION_IMPACT", name: "No human checkpoint", conditions: [{ field: "decisionType", op: "==", value: "automated_decision" }], scoreDelta: 1, reason: "Impact is realized automatically without an intermediate human checkpoint." },

  // MODEL_RISK (base 1)
  { dimension: "MODEL_RISK", name: "Baseline model risk", conditions: [], scoreDelta: 1, reason: "Baseline model risk assumed for any deployed predictive/generative model." },
  { dimension: "MODEL_RISK", name: "Generative model dependency", conditions: [{ field: "isGenerativeAI", op: "==", value: true }], scoreDelta: 2, reason: "Generative models carry hallucination risk and often depend on third-party foundation models." },
  { dimension: "MODEL_RISK", name: "Drift-prone domain", conditions: [{ field: "primaryDomain", op: "in", value: ["CREDIT_LENDING", "FRAUD_DETECTION", "TRANSACTION_MONITORING"] }], scoreDelta: 1, reason: "Domain typically uses complex predictive models subject to concept drift." },
  { dimension: "MODEL_RISK", name: "Scale amplifies degradation impact", conditions: [{ field: "isLargeScale", op: "==", value: true }], scoreDelta: 1, reason: "Model operates at scale, amplifying the impact of undetected performance degradation." },

  // MONITORING (base 2)
  { dimension: "MONITORING", name: "Baseline monitoring risk", conditions: [], scoreDelta: 2, reason: "No production monitoring program was described, so a moderate baseline risk is assumed." },
  { dimension: "MONITORING", name: "Fully automated requires monitoring", conditions: [{ field: "automationLevel", op: "==", value: "fully-automated" }], scoreDelta: 1, reason: "Fully automated systems require continuous monitoring since no human naturally observes each outcome." },
  { dimension: "MONITORING", name: "High-impact regulated domain", conditions: [{ field: "primaryDomain", op: "in", value: ["CREDIT_LENDING", "FRAUD_DETECTION", "TRANSACTION_MONITORING", "RECRUITMENT_HR", "INSURANCE_CLAIMS"] }], scoreDelta: 1, reason: "High-impact regulated domain warrants active bias, drift, and performance monitoring." },
  { dimension: "MONITORING", name: "Generative quality monitoring", conditions: [{ field: "isGenerativeAI", op: "==", value: true }], scoreDelta: 1, reason: "Generative outputs require ongoing quality/hallucination-rate monitoring." }
];

async function seed() {
  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO tenants (id, name) VALUES ($1, 'Default Tenant')
       ON CONFLICT (id) DO NOTHING`,
      [DEFAULT_TENANT_ID]
    );

    const demoPasswordHash = await bcrypt.hash(process.env.DEMO_PASSWORD || "Demo@12345", 12);
    await client.query(
      `INSERT INTO users (tenant_id,email,password_hash,name,role) VALUES ($1,'demo@aigov.local',$2,'Demo Assessor','ASSESSOR')
       ON CONFLICT (tenant_id,email) DO UPDATE SET password_hash=$2,name='Demo Assessor',role='ASSESSOR'`,
      [DEFAULT_TENANT_ID,demoPasswordHash]
    );

    for (const [i, d] of DIMENSIONS.entries()) {
      await client.query(
        `INSERT INTO dimensions (key, label, short_label, description, evaluation_criteria, recommended_controls, max_score, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (key) DO UPDATE SET label=$2, short_label=$3, description=$4, evaluation_criteria=$5, recommended_controls=$6, max_score=$7, sort_order=$8`,
        [d.key, d.label, d.shortLabel, d.description, JSON.stringify(d.evaluationCriteria), JSON.stringify(DIMENSION_CONTROLS[d.key] || []), d.maxScore, i]
      );
    }
    console.log(`Seeded ${DIMENSIONS.length} dimensions.`);

    const industryRes = await client.query(
      `INSERT INTO industries (tenant_id, name, config_json) VALUES ($1, 'Financial Services / Banking', '{}')
       ON CONFLICT (tenant_id, name) DO UPDATE SET config_json = industries.config_json
       RETURNING id`,
      [DEFAULT_TENANT_ID]
    );
    const industryId = industryRes.rows[0].id;

    const sourceChunksAvailable = Boolean((await client.query("SELECT to_regclass('public.source_chunks') AS table_name")).rows[0]?.table_name);
    let chunkCount = 0;
    if (sourceChunksAvailable) {
      for (const s of CURATED_SOURCES) {
        const { chunksWritten } = await upsertSourceAndChunks(client, s);
        chunkCount += chunksWritten;
      }
      console.log(`Seeded ${CURATED_SOURCES.length} sources, ${chunkCount} chunks (embedded via ${embeddingProvider.name}).`);
    } else {
      throw new Error("Research tables are missing. Run npm run db:repair-research, then run db:seed again.");
    }

    await client.query(`DELETE FROM governance_rules WHERE tenant_id = $1`, [DEFAULT_TENANT_ID]);
    for (const r of GOVERNANCE_RULES) {
      await client.query(
        `INSERT INTO governance_rules (tenant_id, industry_id, dimension_key, name, conditions_json, score_delta, reason, version)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'1.0')`,
        [DEFAULT_TENANT_ID, industryId, r.dimension, r.name, JSON.stringify({ conditions: r.conditions, matchMode: r.matchMode || "all" }), r.scoreDelta, r.reason]
      );
    }
    console.log(`Seeded ${GOVERNANCE_RULES.length} governance rules.`);

    await client.query(`DELETE FROM override_rules WHERE tenant_id = $1`, [DEFAULT_TENANT_ID]);
    for (const r of (overrideRulesConfig as any).rules) {
      const conditions = r.conditions.map((c: any) =>
        c.type === "dimension"
          ? { field: `dimensionScores.${c.dimension}`, op: c.op, value: c.value }
          : { field: `signals.${c.key}`, op: "==", value: c.equals }
      );
      await client.query(
        `INSERT INTO override_rules (tenant_id, name, conditions_json, min_risk_level, reason, version)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [DEFAULT_TENANT_ID, r.name, JSON.stringify({ conditions, matchMode: "all" }), r.minRiskLevel, r.reason, (overrideRulesConfig as any).rulesVersion]
      );
    }
    console.log(`Seeded ${(overrideRulesConfig as any).rules.length} override rules.`);

    await client.query("COMMIT");
    console.log("Seed complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
