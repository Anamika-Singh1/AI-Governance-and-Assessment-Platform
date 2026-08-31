/**
 * Generic, data-driven rule evaluator. Governance rules (per-dimension
 * additive scoring) and override rules (cross-dimension risk floor) are
 * BOTH expressed as rows of this shape — this file contains the only
 * logic that interprets them; the rules themselves live in Postgres
 * (governance_rules / override_rules tables), not in this file.
 */

export type ConditionOp = "==" | "!=" | ">" | ">=" | "<" | "<=" | "in" | "not-in";

export interface RuleCondition {
  field: string;
  op: ConditionOp;
  value: unknown;
}

export interface Rule {
  id: string;
  name: string;
  dimensionKey?: string; // present for governance_rules, absent for override_rules
  conditions: RuleCondition[];
  matchMode?: "all" | "any"; // default "all"
  scoreDelta?: number; // governance_rules
  minRiskLevel?: string; // override_rules
  reason: string;
  version: string;
}

export type RuleContext = Record<string, unknown>;

function getField(ctx: RuleContext, field: string): unknown {
  return field.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, ctx);
}

function evaluateCondition(cond: RuleCondition, ctx: RuleContext): boolean {
  const actual = getField(ctx, cond.field);
  switch (cond.op) {
    case "==":
      return actual === cond.value;
    case "!=":
      return actual !== cond.value;
    case ">":
      return typeof actual === "number" && actual > (cond.value as number);
    case ">=":
      return typeof actual === "number" && actual >= (cond.value as number);
    case "<":
      return typeof actual === "number" && actual < (cond.value as number);
    case "<=":
      return typeof actual === "number" && actual <= (cond.value as number);
    case "in":
      return Array.isArray(cond.value) && cond.value.includes(actual);
    case "not-in":
      return Array.isArray(cond.value) && !cond.value.includes(actual);
    default:
      return false;
  }
}

export interface FiredRule {
  ruleId: string;
  name: string;
  reason: string;
  scoreDelta?: number;
  minRiskLevel?: string;
}

/** Returns every rule whose conditions match the given context — the full transparency trace the assignment's "Explainability" section asks for. */
export function evaluateRules(rules: Rule[], ctx: RuleContext): FiredRule[] {
  return rules
    .filter((rule) => {
      if (rule.conditions.length === 0) return true; // unconditional "baseline" rule
      const mode = rule.matchMode ?? "all";
      return mode === "all"
        ? rule.conditions.every((c) => evaluateCondition(c, ctx))
        : rule.conditions.some((c) => evaluateCondition(c, ctx));
    })
    .map((rule) => ({
      ruleId: rule.id,
      name: rule.name,
      reason: rule.reason,
      scoreDelta: rule.scoreDelta,
      minRiskLevel: rule.minRiskLevel
    }));
}
