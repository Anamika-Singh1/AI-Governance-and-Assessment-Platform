import { UseCaseInput } from "../types";

export type UseCaseDomain =
  | "CREDIT_LENDING"
  | "FRAUD_DETECTION"
  | "CHATBOT_SUPPORT"
  | "FINANCIAL_ADVICE_GENAI"
  | "RECRUITMENT_HR"
  | "TRANSACTION_MONITORING"
  | "INSURANCE_CLAIMS"
  | "MARKETING_OFFERS"
  | "OTHER";

const DOMAIN_KEYWORDS: Record<Exclude<UseCaseDomain, "OTHER">, string[]> = {
  CREDIT_LENDING: ["loan", "credit approval", "creditworth", "underwrit", "lending", "credit score", "mortgage"],
  FRAUD_DETECTION: ["fraud", "anomaly detection", "suspicious activity", "identity theft", "account takeover"],
  CHATBOT_SUPPORT: ["chatbot", "virtual assistant", "customer service", "support agent", "conversational"],
  FINANCIAL_ADVICE_GENAI: ["financial advice", "robo-advisor", "investment recommendation", "wealth management", "portfolio recommendation", "generative"],
  RECRUITMENT_HR: ["recruit", "hiring", "resume", "cv screening", "candidate screening", "employment screening", "job applicant"],
  TRANSACTION_MONITORING: ["transaction monitoring", "aml", "anti-money laundering", "sanctions screening", "watchlist"],
  INSURANCE_CLAIMS: ["insurance claim", "claims assessment", "claims processing", "underwriting insurance", "policy claim"],
  MARKETING_OFFERS: ["marketing", "premium offer", "cross-sell", "upsell", "personalized offer", "spending pattern", "promotional"]
};

const SENSITIVE_DATA_KEYWORDS = {
  financial: ["financial", "income", "salary", "transaction", "account balance", "spending", "credit history", "bank statement", "asset"],
  biometric: ["biometric", "face", "fingerprint", "voice print", "iris"],
  health: ["health", "medical", "diagnosis", "disability status", "prescription"],
  behavioral: ["behavior", "browsing", "location", "spending pattern", "usage pattern", "clickstream"],
  identity: ["name", "address", "date of birth", "ssn", "social security", "national id", "pan", "aadhaar", "passport", "kyc"]
};

const PROTECTED_CHAR_KEYWORDS = [
  "race",
  "gender",
  "age",
  "disability",
  "religion",
  "national origin",
  "ethnicity",
  "marital status",
  "pregnancy",
  "sexual orientation",
  "caste"
];

const GENERATIVE_KEYWORDS = ["generative", "llm", "large language model", "gpt", "chatbot", "genai", "generate", "chat-based", "conversational ai"];

const LARGE_SCALE_KEYWORDS = ["all customers", "entire customer base", "millions", "every applicant", "nationwide", "all users", "population"];

function normalize(input: UseCaseInput): string {
  return [
    input.useCaseName,
    input.description,
    input.purpose,
    input.dataUsed,
    input.affectedParties,
    input.intendedUsers
  ]
    .join(" \n ")
    .toLowerCase();
}

function anyMatch(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

function matchedKeywords(text: string, keywords: string[]): string[] {
  return keywords.filter((k) => text.includes(k));
}

export interface TextSignals {
  domains: UseCaseDomain[];
  primaryDomain: UseCaseDomain;
  hasFinancialData: boolean;
  hasBiometricData: boolean;
  hasHealthData: boolean;
  hasBehavioralData: boolean;
  hasIdentityData: boolean;
  mentionsProtectedCharacteristics: boolean;
  isGenerativeAI: boolean;
  isLargeScale: boolean;
  affectsEmployment: boolean;
  affectsCreditAccess: boolean;
  affectsInsurance: boolean;
  matchedDataTypeKeywords: string[];
  matchedDomainKeywords: string[];
}

export function analyzeUseCaseText(input: UseCaseInput): TextSignals {
  const text = normalize(input);

  const domains: UseCaseDomain[] = [];
  let matchedDomainKeywords: string[] = [];
  (Object.keys(DOMAIN_KEYWORDS) as Array<Exclude<UseCaseDomain, "OTHER">>).forEach((domain) => {
    const hits = matchedKeywords(text, DOMAIN_KEYWORDS[domain]);
    if (hits.length > 0) {
      domains.push(domain);
      matchedDomainKeywords = matchedDomainKeywords.concat(hits);
    }
  });

  const primaryDomain: UseCaseDomain = domains[0] ?? "OTHER";

  const matchedDataTypeKeywords: string[] = [];
  Object.values(SENSITIVE_DATA_KEYWORDS)
    .flat()
    .forEach((k) => {
      if (text.includes(k)) matchedDataTypeKeywords.push(k);
    });

  return {
    domains: domains.length ? domains : ["OTHER"],
    primaryDomain,
    hasFinancialData: anyMatch(text, SENSITIVE_DATA_KEYWORDS.financial),
    hasBiometricData: anyMatch(text, SENSITIVE_DATA_KEYWORDS.biometric),
    hasHealthData: anyMatch(text, SENSITIVE_DATA_KEYWORDS.health),
    hasBehavioralData: anyMatch(text, SENSITIVE_DATA_KEYWORDS.behavioral),
    hasIdentityData: anyMatch(text, SENSITIVE_DATA_KEYWORDS.identity),
    mentionsProtectedCharacteristics: anyMatch(text, PROTECTED_CHAR_KEYWORDS),
    isGenerativeAI: anyMatch(text, GENERATIVE_KEYWORDS) || primaryDomain === "FINANCIAL_ADVICE_GENAI" || primaryDomain === "CHATBOT_SUPPORT",
    isLargeScale: anyMatch(text, LARGE_SCALE_KEYWORDS),
    affectsEmployment: primaryDomain === "RECRUITMENT_HR",
    affectsCreditAccess: primaryDomain === "CREDIT_LENDING",
    affectsInsurance: primaryDomain === "INSURANCE_CLAIMS",
    matchedDataTypeKeywords,
    matchedDomainKeywords
  };
}

export function detectRegion(regionInput: string): string[] {
  const t = regionInput.toLowerCase();
  const tokens: string[] = [];
  if (/\beu\b|europe|european union|eea/.test(t)) tokens.push("eu");
  if (/\bus\b|usa|united states/.test(t)) tokens.push("us");
  if (/india|\bin\b|rbi/.test(t)) tokens.push("india");
  if (/global|international|multi-?region|worldwide/.test(t)) tokens.push("global");
  return tokens;
}
