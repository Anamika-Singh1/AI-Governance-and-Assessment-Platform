import { pgPool } from "../database/pool";
import { Rule } from "../services/rules/ruleEngine";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export async function getActiveGovernanceRules(dimensionKey?: string): Promise<Rule[]> {
  const res = await pgPool.query(
    `SELECT id, dimension_key, name, conditions_json, score_delta, reason, version
     FROM governance_rules
     WHERE tenant_id = $1 AND active = true ${dimensionKey ? "AND dimension_key = $2" : ""}
     ORDER BY id`,
    dimensionKey ? [DEFAULT_TENANT_ID, dimensionKey] : [DEFAULT_TENANT_ID]
  );
  return res.rows.map((r) => ({
    id: r.id,
    name: r.name,
    dimensionKey: r.dimension_key,
    conditions: r.conditions_json.conditions,
    matchMode: r.conditions_json.matchMode,
    scoreDelta: r.score_delta,
    reason: r.reason,
    version: r.version
  }));
}

export async function getActiveOverrideRules(): Promise<Rule[]> {
  const res = await pgPool.query(
    `SELECT id, name, conditions_json, min_risk_level, reason, version
     FROM override_rules WHERE tenant_id = $1 AND active = true ORDER BY id`,
    [DEFAULT_TENANT_ID]
  );
  return res.rows.map((r) => ({
    id: r.id,
    name: r.name,
    conditions: r.conditions_json.conditions,
    matchMode: r.conditions_json.matchMode,
    minRiskLevel: r.min_risk_level,
    reason: r.reason,
    version: r.version
  }));
}
