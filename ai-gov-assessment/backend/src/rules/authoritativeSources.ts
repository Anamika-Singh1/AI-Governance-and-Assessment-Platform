import { SourceType } from "../config/sourceTypes";

/**
 * Curated library of authoritative public sources.
 *
 * ANTI-HALLUCINATION DESIGN: this is the ONLY place new Source records
 * are allowed to originate from URL-bearing metadata. The LLM layer is
 * never permitted to invent a source object — it may only select /
 * summarize from this curated list (see services/research). Sources the
 * team has not been able to independently confirm are flagged
 * `confidence: "needs-verification"` and the app will present them to
 * the user as "Unverified" rather than authoritative evidence until the
 * runtime verification check (services/sources/verifySource.ts)
 * succeeds against the live URL.
 */
export interface CuratedSource {
  id: string;
  title: string;
  url: string;
  publisher: string;
  sourceType: SourceType;
  jurisdiction: string;
  publicationDate: string | null;
  description: string;
  /** Curator's confidence that the URL/citation is accurate as of authoring time. */
  confidence: "high" | "needs-verification";
  /** Free-text tags used by the deterministic research/regulatory-mapping layer. */
  tags: string[];
}

export const CURATED_SOURCES: CuratedSource[] = [
  {
    id: "eu-ai-act",
    title: "Regulation (EU) 2024/1689 — Artificial Intelligence Act",
    url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32024R1689",
    publisher: "European Union (EUR-Lex)",
    sourceType: "Law / Regulation",
    jurisdiction: "European Union",
    publicationDate: "2024-06-13",
    description:
      "The EU's binding, risk-tiered legal framework for AI systems. Establishes obligations for 'high-risk' AI systems, including those used in creditworthiness assessment, employment/recruitment, and essential financial services.",
    confidence: "high",
    tags: ["ai-act", "high-risk-ai", "credit", "employment", "recruitment", "eu", "automated-decision", "biometric"]
  },
  {
    id: "gdpr",
    title: "Regulation (EU) 2016/679 — General Data Protection Regulation (GDPR)",
    url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679",
    publisher: "European Union (EUR-Lex)",
    sourceType: "Law / Regulation",
    jurisdiction: "European Union",
    publicationDate: "2016-04-27",
    description:
      "EU law governing the processing of personal data, including Article 22 rights concerning solely automated decision-making with legal or similarly significant effects.",
    confidence: "high",
    tags: ["privacy", "personal-data", "automated-decision", "consent", "cross-border", "eu", "data-subject-rights"]
  },
  {
    id: "india-dpdp-act",
    title: "Digital Personal Data Protection Act, 2023",
    url: "https://www.meity.gov.in/data-protection-framework",
    publisher: "Ministry of Electronics and Information Technology (MeitY), Government of India",
    sourceType: "Law / Regulation",
    jurisdiction: "India",
    publicationDate: "2023-08-11",
    description:
      "India's principal data protection law, governing consent, purpose limitation, and obligations of data fiduciaries processing digital personal data.",
    confidence: "high",
    tags: ["privacy", "personal-data", "consent", "india", "data-subject-rights"]
  },
  {
    id: "us-ecoa-reg-b",
    title: "Equal Credit Opportunity Act — Regulation B (12 CFR Part 1002)",
    url: "https://www.ecfr.gov/current/title-12/chapter-X/part-1002",
    publisher: "Consumer Financial Protection Bureau (CFPB) / eCFR",
    sourceType: "Law / Regulation",
    jurisdiction: "United States",
    publicationDate: null,
    description:
      "US federal law prohibiting credit discrimination on the basis of protected characteristics and requiring adverse-action notices with specific reasons for credit denial — directly relevant to AI-based loan approval and credit scoring.",
    confidence: "needs-verification",
    tags: ["fair-lending", "credit", "loan", "anti-discrimination", "adverse-action", "us"]
  },
  {
    id: "us-fcra",
    title: "Fair Credit Reporting Act — Implementing Regulation V (12 CFR Part 1022)",
    url: "https://www.ecfr.gov/current/title-12/chapter-X/part-1022",
    publisher: "Consumer Financial Protection Bureau (CFPB) / eCFR",
    sourceType: "Law / Regulation",
    jurisdiction: "United States",
    publicationDate: null,
    description:
      "Governs the use of consumer report data (e.g., credit bureau data) in automated eligibility decisions, including risk-based pricing and adverse-action disclosure obligations.",
    confidence: "needs-verification",
    tags: ["fair-lending", "credit", "credit-report", "us", "adverse-action"]
  },
  {
    id: "nist-ai-rmf",
    title: "NIST AI Risk Management Framework (AI RMF 1.0)",
    url: "https://www.nist.gov/itl/ai-risk-management-framework",
    publisher: "National Institute of Standards and Technology (NIST)",
    sourceType: "Regulatory Guidance",
    jurisdiction: "United States / Global",
    publicationDate: "2023-01-26",
    description:
      "Voluntary framework organized around Govern, Map, Measure, and Manage functions for identifying and mitigating AI risk across the system lifecycle.",
    confidence: "high",
    tags: ["risk-management", "governance", "model-risk", "monitoring", "global", "us"]
  },
  {
    id: "nist-sp-1270-bias",
    title: "NIST SP 1270 — Towards a Standard for Identifying and Managing Bias in Artificial Intelligence",
    url: "https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.1270.pdf",
    publisher: "National Institute of Standards and Technology (NIST)",
    sourceType: "Research",
    jurisdiction: "United States / Global",
    publicationDate: "2022-03-15",
    description:
      "Technical research publication analyzing statistical, human, and systemic sources of bias in AI systems and approaches to identify and manage them.",
    confidence: "needs-verification",
    tags: ["bias", "fairness", "research", "discrimination"]
  },
  {
    id: "oecd-ai-principles",
    title: "OECD AI Principles",
    url: "https://oecd.ai/en/ai-principles",
    publisher: "Organisation for Economic Co-operation and Development (OECD)",
    sourceType: "Regulatory Guidance",
    jurisdiction: "International",
    publicationDate: "2019-05-22",
    description:
      "Intergovernmental policy principles promoting AI that is innovative, trustworthy, and respects human rights and democratic values; widely referenced baseline for national AI policy.",
    confidence: "high",
    tags: ["governance", "principles", "global", "trustworthy-ai"]
  },
  {
    id: "rbi-regulatory-portal",
    title: "RBI Notifications and Master Directions (IT, Outsourcing, and Digital Lending)",
    url: "https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx",
    publisher: "Reserve Bank of India (RBI)",
    sourceType: "Regulatory Guidance",
    jurisdiction: "India",
    publicationDate: null,
    description:
      "Index of RBI Master Directions, including IT governance, outsourcing of financial services, and digital lending guidelines that may apply to AI-enabled banking systems. The specific applicable circular must be confirmed for each use case.",
    confidence: "needs-verification",
    tags: ["banking", "india", "outsourcing", "digital-lending", "it-governance"]
  },
  {
    id: "iso-42001",
    title: "ISO/IEC 42001:2023 — Information technology — Artificial intelligence management system",
    url: "https://www.iso.org/standard/81230.html",
    publisher: "International Organization for Standardization (ISO)",
    sourceType: "Industry Standard",
    jurisdiction: "International",
    publicationDate: "2023-12-18",
    description:
      "The first international management-system standard for AI, specifying requirements for establishing, implementing, and continually improving an organizational AI management system.",
    confidence: "needs-verification",
    tags: ["governance", "management-system", "iso", "global", "audit"]
  },
  {
    id: "iso-23894",
    title: "ISO/IEC 23894:2023 — Artificial intelligence — Guidance on risk management",
    url: "https://www.iso.org/standard/77304.html",
    publisher: "International Organization for Standardization (ISO)",
    sourceType: "Industry Standard",
    jurisdiction: "International",
    publicationDate: "2023-02-06",
    description:
      "Guidance on how organizations that develop, produce, deploy, or use AI-based products/services can manage risk specific to AI.",
    confidence: "needs-verification",
    tags: ["risk-management", "model-risk", "iso", "global"]
  },
  {
    id: "iso-27001",
    title: "ISO/IEC 27001 — Information security management",
    url: "https://www.iso.org/isoiec-27001-information-security.html",
    publisher: "International Organization for Standardization (ISO)",
    sourceType: "Industry Standard",
    jurisdiction: "International",
    publicationDate: null,
    description:
      "The leading international standard for information security management systems; commonly referenced for the security controls that protect model APIs, training data, and inference infrastructure.",
    confidence: "needs-verification",
    tags: ["security", "information-security", "iso", "global", "api-abuse"]
  },
  {
    id: "arxiv-model-cards",
    title: "Model Cards for Model Reporting (Mitchell et al., 2019)",
    url: "https://arxiv.org/abs/1810.03993",
    publisher: "arXiv (Cornell University)",
    sourceType: "Research",
    jurisdiction: "Global",
    publicationDate: "2018-10-05",
    description:
      "Peer-reviewed research proposing standardized documentation ('model cards') disclosing model performance characteristics across demographic and other relevant groups — foundational reference for explainability and fairness documentation.",
    confidence: "high",
    tags: ["explainability", "documentation", "fairness", "research", "interpretability"]
  },
  {
    id: "vendor-watsonx-governance",
    title: "IBM watsonx.governance — AI Governance Product Overview",
    url: "https://www.ibm.com/products/watsonx-governance",
    publisher: "IBM Corporation",
    sourceType: "Vendor Information",
    jurisdiction: "Global",
    publicationDate: null,
    description:
      "Vendor product marketing material describing a commercial AI governance/monitoring platform. Useful for illustrating tooling patterns; not an authoritative or independent source and must not be cited as legal or regulatory evidence.",
    confidence: "needs-verification",
    tags: ["monitoring", "tooling", "vendor", "governance-platform"]
  },
  {
    id: "wikipedia-algorithmic-bias",
    title: "Algorithmic bias",
    url: "https://en.wikipedia.org/wiki/Algorithmic_bias",
    publisher: "Wikipedia",
    sourceType: "General Web Content",
    jurisdiction: "Global",
    publicationDate: null,
    description:
      "General-audience encyclopedia overview of algorithmic bias. Background context only — lowest reliability tier, never used as sole evidence for a governance conclusion.",
    confidence: "high",
    tags: ["bias", "background", "general"]
  }
];
