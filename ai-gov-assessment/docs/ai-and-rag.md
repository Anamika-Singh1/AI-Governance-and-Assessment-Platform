# AI Usage and the RAG Pipeline

## Where AI is used, and where it is deliberately not

AI (an LLM) touches the system in exactly one place: `LLMProvider.extractSignals()`, called once per use case at creation time, to turn free-text (`description`, `dataUsed`, `purpose`, …) into structured booleans and enums (`hasFinancialData`, `automationLevel`, `isGenerativeAI`, `primaryDomain`, …). It is never called to compute a score, a risk level, or a recommendation — those are pure deterministic code over the extracted signals and the retrieved evidence (see [assessment-methodology.md](./assessment-methodology.md)). `LLMProvider.polishNarrative()` exists as an optional second use — rewriting a deterministic finding's prose for clarity without changing any fact or number — but is not currently wired into the assessment flow; it's implemented on every provider for when a narrative-polish step is added.

## Provider abstraction

```
LLMProvider (interface: name, isAvailable(), extractSignals(), polishNarrative())
├─ DeterministicProvider   — regex/keyword extraction, default, always available, no key
├─ AnthropicProvider       — LLM_PROVIDER=anthropic, needs ANTHROPIC_API_KEY
├─ OpenAIProvider          — LLM_PROVIDER=openai, needs OPENAI_API_KEY
└─ LocalLLMProvider        — LLM_PROVIDER=local, needs LOCAL_LLM_URL
                              (any OpenAI-chat-completions-compatible server:
                              Ollama, LM Studio, vLLM's OpenAI-compatible mode)
```

`services/llm/index.ts` is a factory: it reads `LLM_PROVIDER`, instantiates the matching provider, and — critically — checks `isAvailable()` before caching it, falling back to `DeterministicProvider` if the configured provider has no key/URL. Each provider also degrades to `extractSignalsDeterministic()` internally on any live-call failure (timeout, non-2xx response, network error), wrapped in try/catch. The result: the app never fails a request because an external LLM is unreachable — it degrades to deterministic extraction and says so in the response (`extractionMethod: "deterministic-fallback"` vs. `"anthropic"` / `"openai"` / `"local"`), never silently.

`LocalLLMProvider` was added specifically to satisfy the requirement that the system not be hard-dependent on a single hosted vendor: it speaks the same OpenAI-chat-completions wire format that Ollama, LM Studio, and vLLM's OpenAI-compatible server all implement, so pointing `LOCAL_LLM_URL` at any of them works without provider-specific code. No API key is sent. It uses a longer timeout (30s vs. the hosted providers' shorter timeouts) because local inference has no warm fleet to answer instantly.

## The RAG pipeline

```
Source ingested → chunked → embedded → stored in pgvector
                                              │
Use case + dimension → embedded as a query ───┘
                                              │
                              pgvector cosine search (top-K, threshold-filtered)
                                              │
                                    Evidence returned with full
                                    source metadata + similarity score
```

1. **Chunking** (`services/embeddings/chunking.ts`): sentence-boundary-aware, target ~400 characters per chunk, never splits mid-sentence — a retrieved chunk always reads as one complete, citable statement rather than a fragment.
2. **Embedding** (`services/embeddings/hashingEmbeddingProvider.ts`): see below.
3. **Storage**: each chunk's vector is written to `source_chunks.embedding`, a pgvector `vector(256)` column.
4. **Retrieval** (`services/retrieval/retrievalService.ts`): for a given use case and governance dimension, a query string is built from the dimension's own label/description plus the use case's description/data/purpose, embedded with the same provider, and matched against `source_chunks` via pgvector's `<=>` cosine-distance operator (`1 - distance = similarity`). Results are ordered first by whether the chunk was pre-tagged as relevant to that dimension (`dimension_tags`, assigned at seed time from the source's topical tags), then by similarity; the top 3 are kept, and anything below a relevance threshold of **0.12** is dropped entirely rather than returned as weak evidence.

## Why a hashing vectorizer, not a neural embedding model

The plan was a real sentence-transformer embedding model (e.g. via `@xenova/transformers`, which runs ONNX models in Node with no Python dependency). That requires downloading model weights from HuggingFace on first use. In this sandbox, HuggingFace is network-blocked:

```
$ curl -sI --max-time 8 https://huggingface.co
HTTP/1.1 403 Forbidden
```

confirmed directly, not assumed. Rather than ship a retrieval layer that silently fails or returns a fake result in this environment, `HashingEmbeddingProvider` was built to the same `EmbeddingProvider` interface a real model would implement: a feature-hashed, log-scaled term-frequency vector (the classic "hashing vectorizer" technique) — tokenize, drop stopwords, hash each surviving token into one of 256 dimensions via FNV-1a (a stable hash, unlike JavaScript's built-in string hashing, so embeddings are reproducible across runs and processes), accumulate a sign-adjusted log-count per dimension, then L2-normalize so pgvector's cosine-distance operator behaves exactly as it would with any other normalized embedding.

This is a legitimate, explainable, fully reproducible retrieval signal — every part of it is inspectable and deterministic, which is a genuine property, not a consolation prize — but it is a lexical/statistical signal, not a semantic one: it will not match a query and a passage that use different words for the same concept the way a neural embedding trained on semantic similarity would. It was verified functionally correct for this corpus by hand: a credit-discrimination query correctly surfaces ECOA/Reg B and FCRA chunks, and a biometric-privacy query correctly surfaces GDPR and the India DPDP Act. It works well *because* the 15-source curated library and the query text built from dimension labels/descriptions share enough vocabulary for lexical matching to succeed — it would degrade on a much larger, more heterogeneous source library where paraphrase-level matching starts to matter.

**Documented upgrade path**: swap `embeddingProvider` for an implementation backed by a real sentence-transformer (or a hosted embeddings API), update `config.embeddingDim` and the `vector(N)` column dimension to match, and re-run the seed script to re-embed all sources. No other code changes — this is exactly what the `EmbeddingProvider` abstraction and the dimension-driven column type were built for.

## Anti-hallucination design (sources)

The LLM layer is never permitted to invent a source — `CURATED_SOURCES` (`backend/src/rules/authoritativeSources.ts`) is the only place a Source record with a URL originates from, and it's authored/curated by the developer, not generated at runtime. Each curated source additionally carries a `confidence: "high" | "needs-verification"` flag; anything not independently confirmed at authoring time is marked `unverified` in the `sources.status` column and presented that way to the user rather than as authoritative evidence. See [source-and-licence-inventory.md](./source-and-licence-inventory.md) for the full list and what text is actually stored/embedded from each.
