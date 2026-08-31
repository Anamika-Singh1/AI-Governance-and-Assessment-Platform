# Source and Licence Inventory

## What is actually stored and reproduced from each source

This is the fact that governs everything else in this document: for every curated source, the application stores and embeds only `${title}. ${description}` — the source's official title (a fact, not a copyrightable expression) plus a short description written by the developer for this project. **No full regulation text, no standard's normative text, and no verbatim excerpt of any copyrighted document is ingested, stored, or served anywhere in this system.** The `url` field links out to the authoritative original for anyone who needs the full text. This matters most for the three ISO standards below, which are commercially licensed documents that this project does not, and must not, reproduce.

The characterizations below are a general, good-faith categorization by publisher/document type to support engineering and product decisions (e.g., "is it safe to store this source's title and a short description"). **They are not a legal opinion.** Anyone planning to reproduce more than a title and short description from any of these sources — especially the ISO standards — should get that confirmed by counsel first.

## Inventory

| id | Title | Publisher | Jurisdiction | Type | Licence / reuse posture |
|---|---|---|---|---|---|
| `eu-ai-act` | Regulation (EU) 2024/1689 — AI Act | European Union (EUR-Lex) | EU | Law/Regulation | Official EU legal text. EU Decision 2011/833/EU permits reuse of Commission documents (including for commercial purposes) with source acknowledgement, unless stated otherwise for a specific document. Only title + a short original description are stored here. |
| `gdpr` | Regulation (EU) 2016/679 — GDPR | European Union (EUR-Lex) | EU | Law/Regulation | Same EU reuse posture as above. |
| `india-dpdp-act` | Digital Personal Data Protection Act, 2023 | MeitY, Government of India | India | Law/Regulation | Indian legislative text; government legislation is standard practice to cite/reference freely. Only title + short description stored. |
| `us-ecoa-reg-b` | ECOA — Regulation B (12 CFR Part 1002) | CFPB / eCFR | United States | Law/Regulation | US federal regulation text is a work of the US Government and is in the public domain (17 U.S.C. §105) — no copyright in the regulation text itself. |
| `us-fcra` | FCRA — Regulation V (12 CFR Part 1022) | CFPB / eCFR | United States | Law/Regulation | Same public-domain posture as above (17 U.S.C. §105). |
| `nist-ai-rmf` | NIST AI Risk Management Framework 1.0 | NIST | US / Global | Regulatory Guidance | NIST publications are US Government works — public domain (17 U.S.C. §105). |
| `nist-sp-1270-bias` | NIST SP 1270 (bias in AI) | NIST | US / Global | Research | Same public-domain posture as above. |
| `oecd-ai-principles` | OECD AI Principles | OECD | International | Regulatory Guidance | OECD publishes this content for public reference; OECD's own terms of use should be checked before reproducing beyond a short citation — only title + short description are stored here, which is within normal citation practice. |
| `rbi-regulatory-portal` | RBI Notifications and Master Directions index | Reserve Bank of India | India | Regulatory Guidance | Indian financial regulator's public notifications index; standard practice to cite/reference. Only title + short description stored. |
| `iso-42001` | ISO/IEC 42001:2023 — AI management systems | ISO | International | Industry Standard | **Commercially licensed.** ISO standards are copyrighted and sold by ISO; full text is not open. This project stores only the standard's official title and a short original description — never the standard's normative text — and links to ISO's own page for anyone who needs to purchase/read it. |
| `iso-23894` | ISO/IEC 23894:2023 — AI risk management guidance | ISO | International | Industry Standard | Same commercially-licensed posture as `iso-42001`. |
| `iso-27001` | ISO/IEC 27001 — Information security management | ISO | International | Industry Standard | Same commercially-licensed posture as `iso-42001`. |
| `arxiv-model-cards` | "Model Cards for Model Reporting" (Mitchell et al., 2019) | arXiv / Cornell University | Global | Research | Author-retained copyright per arXiv's standard non-exclusive distribution licence (the paper was also later published in ACM FAT* proceedings, which carries its own ACM copyright terms). Only title + short description stored here; full paper is not reproduced. |
| `vendor-watsonx-governance` | IBM watsonx.governance product overview | IBM Corporation | Global | Vendor Information | Proprietary marketing material, all rights reserved to IBM. Cited by title/link only; treated in-app as non-authoritative (explicitly labeled "not an authoritative or independent source" — see `CuratedSource.description`). |
| `wikipedia-algorithmic-bias` | "Algorithmic bias" | Wikipedia | Global | General Web Content | CC BY-SA 4.0 — freely reusable with attribution, share-alike. Lowest reliability tier in this app's own 6-tier classification; used for background context only, never as sole evidence for a governance conclusion. |

## Reliability tiers (for context — full detail in assessment-methodology.md)

The six `sourceType` categories used above (`Law / Regulation`, `Regulatory Guidance`, `Industry Standard`, `Research`, `Vendor Information`, `General Web Content`) also drive this app's own reliability tiering (`authority_level`, 1 highest–6 lowest), which is a governance/evidence-quality concept, independent from and not a substitute for the licence posture documented above. A source can be Tier 1 authority (a binding law) while also being freely reproducible (public domain), and a source can be low reliability (Tier 6, general web content) while still being freely reproducible (CC BY-SA) — the two axes are unrelated.

## What to do before adding a new source (CSV import or otherwise)

1. Confirm the publisher/document type against the categories above (government legal text, standards body, vendor, encyclopedia, etc.).
2. Never paste the source's full text into the `description` field that gets chunked and embedded — write a short, original description, the same way every seeded source does.
3. If the new source is a commercially licensed standard (ISO, IEC, ANSI, and similar), treat it the same way as the three ISO entries above: title, link, and a short original description only.
