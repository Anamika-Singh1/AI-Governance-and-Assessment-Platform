import { UseCaseInput } from "@/types/api";

export const SAMPLE_USE_CASES: UseCaseInput[] = [
  {
    useCaseName: "AI-Based Loan Approval",
    description:
      "An AI model evaluates loan applications submitted through the bank's digital channels and automatically approves or denies personal loans up to $25,000 based on applicant financial data, without requiring a loan officer's sign-off for approvals below the threshold.",
    industry: "Financial Services / Banking",
    intendedUsers: "Retail lending operations team; consumers apply directly via the mobile app",
    dataUsed: "Applicant income, employment history, credit history, existing account balances, transaction history",
    purpose: "Automate and speed up small personal loan approval decisions",
    affectedParties: "Retail banking customers and loan applicants",
    decisionType: "automated_decision",
    humanReview: false,
    region: "United States"
  },
  {
    useCaseName: "Credit Risk Prediction",
    description:
      "A machine learning model predicts the probability of default for small business credit lines, generating a risk score that underwriters use as a primary input alongside their own judgment when setting credit limits.",
    industry: "Financial Services / Banking",
    intendedUsers: "Commercial underwriting team",
    dataUsed: "Business financial statements, transaction history, industry sector, bureau credit data",
    purpose: "Estimate probability of default to inform underwriting decisions",
    affectedParties: "Small business loan applicants",
    decisionType: "recommendation",
    humanReview: true,
    region: "United States"
  },
  {
    useCaseName: "Fraud Detection",
    description:
      "A real-time anomaly detection model flags potentially fraudulent card transactions and can automatically place a temporary hold on the transaction while a fraud analyst reviews the flagged case within a defined SLA.",
    industry: "Financial Services / Banking",
    intendedUsers: "Fraud operations analysts",
    dataUsed: "Transaction amount, location, merchant category, device fingerprint, historical spending pattern",
    purpose: "Detect and prevent fraudulent card transactions in real time",
    affectedParties: "All cardholders whose transactions are scored",
    decisionType: "both",
    humanReview: true,
    region: "Global"
  },
  {
    useCaseName: "Customer Service Chatbot",
    description:
      "A generative-AI-powered virtual assistant answers customer questions about account balances, transaction history, and general banking product information, and can escalate complex queries to a human agent.",
    industry: "Financial Services / Banking",
    intendedUsers: "Retail banking customers via mobile app and website",
    dataUsed: "Account balance, recent transactions, customer profile information, chat conversation history",
    purpose: "Provide 24/7 self-service customer support and reduce call center volume",
    affectedParties: "Retail banking customers",
    decisionType: "recommendation",
    humanReview: true,
    region: "United States"
  },
  {
    useCaseName: "AI-Generated Financial Advice",
    description:
      "A generative AI robo-advisor analyzes a customer's stated goals, risk tolerance, and portfolio holdings to generate personalized investment recommendations and rebalancing suggestions, which customers can accept with one click.",
    industry: "Financial Services / Banking",
    intendedUsers: "Retail wealth management customers",
    dataUsed: "Investment portfolio holdings, stated risk tolerance, financial goals, age, income bracket",
    purpose: "Provide personalized, scalable investment guidance to retail customers",
    affectedParties: "Retail wealth management customers",
    decisionType: "recommendation",
    humanReview: false,
    region: "United States"
  },
  {
    useCaseName: "Employee Recruitment Screening",
    description:
      "An AI system screens incoming job applications for open banking positions, ranking candidates by predicted fit based on resume content and an automated video-interview assessment, before a recruiter reviews the shortlist.",
    industry: "Financial Services / Banking",
    intendedUsers: "Human resources / talent acquisition team",
    dataUsed: "Resume/CV content, video interview responses, education history, prior work experience",
    purpose: "Efficiently screen and rank a high volume of job applicants",
    affectedParties: "Job applicants to the bank",
    decisionType: "recommendation",
    humanReview: true,
    region: "European Union"
  },
  {
    useCaseName: "Transaction Monitoring (AML)",
    description:
      "An AI system continuously monitors customer transactions for patterns indicative of money laundering or sanctions violations, automatically filing a Suspicious Activity Report queue item for compliance analyst review.",
    industry: "Financial Services / Banking",
    intendedUsers: "AML/compliance analysts",
    dataUsed: "Transaction amount, counterparties, geographic patterns, customer KYC profile, watchlist data",
    purpose: "Detect potential money laundering and sanctions-violation activity for regulatory compliance",
    affectedParties: "All customers whose transactions are monitored",
    decisionType: "both",
    humanReview: true,
    region: "India"
  },
  {
    useCaseName: "Insurance Claim Assessment",
    description:
      "An AI model assesses submitted auto insurance claims, automatically approving straightforward claims under $2,000 with supporting photo evidence, and routing all other claims to a human adjuster.",
    industry: "Financial Services / Banking (Bancassurance)",
    intendedUsers: "Claims processing operations team",
    dataUsed: "Claim photos, policy details, claim amount, claimant history, repair estimates",
    purpose: "Speed up processing of low-complexity insurance claims",
    affectedParties: "Policyholders filing auto insurance claims",
    decisionType: "automated_decision",
    humanReview: false,
    region: "European Union"
  }
];
