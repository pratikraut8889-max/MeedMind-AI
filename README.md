# MediMind AI - Production Retrieval-Augmented Generation (RAG) Architecture

MediMind AI implements a production-quality, real clinical retrieval layer designed to ensure every medical answer is grounded in authoritative, peer-reviewed clinical guidelines, and that no sources or citations are ever fabricated.

---

## 1. End-to-End RAG Architecture

```text
User Question
      │
      ▼
1. Query Processing
   ├── Text Normalization & PII Sanitization
   ├── Medical Taxonomy & Synonym Expansion (AHA, CDC, NIH terms)
   ├── Intent Classification (emergency, diagnostic, medication, lifestyle)
   └── Dense Embedding Generation (gemini-embedding-2-preview)
      │
      ▼
2. Pluggable Medical Retriever (IMedicalRetriever)
   ├── Semantic Cosine Similarity (Dense Vector Search)
   ├── Lexical & Clinical Tag Overlap Matching
   └── Hybrid Scored Ranking: 0.65 * denseSimilarity + 0.35 * lexicalScore
      │
      ▼
3. Relevant Medical Documents
   └── Scored & Ranked Chunks with Document Identifiers & Metadata
      │
      ▼
4. Context Filtering Layer
   ├── Strict Relevance Thresholding (default minRelevanceScore = 0.58)
   ├── Low-Quality / Irrelevant Query Suppression
   ├── Token-Budget Aware Deduplication
   └── Structured Evidence Formatting with Anti-Hallucination Directives
      │
      ▼
5. Gemini Reasoning & Synthesis
   └── Grounded Clinical Extraction (gemini-3.8-flash)
      │
      ▼
6. Structured Answer
   └── Validated JSON response with clinical nuance & non-diagnostic phrasing
      │
      ▼
7. Citation Verification & Binding
   ├── Strict Anti-Fabrication Filter (Candidate vs. Verified Sources)
   └── Zero Fabricated Citations Guarantee (Rendered via MedicalCitationCard)
```

---

## 2. Knowledge-Source Abstraction Layer

To ensure the system is extensible without modifying application logic, medical knowledge sources are modeled using an abstract registry:

### Stored Metadata Schema
Every indexed source stores:
* **source title**: Full title of the peer-reviewed clinical document
* **organization**: Authoritative publishing body (e.g., American Heart Association, CDC, NIH, WHO, Mayo Clinic, ADA, FDA)
* **URL**: Direct canonical link to the guideline
* **document identifier**: Unique clinical identifier (e.g., `AHA-GDL-2026-CV01`, `CDC-STR-2026-01`, `NIH-NLM-2026-CBC`)
* **publication date**: When available (ISO format: `YYYY-MM-DD`)
* **content chunks**: Granular, self-contained clinical passages with keywords, clinical domain, and token counts
* **embeddings**: High-dimensional semantic vectors (`gemini-embedding-2-preview` with deterministic clinical vectorizer fallback)
* **metadata**: Evidence grades, peer-review tags, indexing timestamps

### Pluggable Retriever Interface (`IMedicalRetriever`)
The retrieval provider is isolated behind the `IMedicalRetriever` interface:

```typescript
export interface IMedicalRetriever {
  readonly providerName: string;
  retrieve(query: ProcessedQuery, options?: RetrievalOptions): Promise<ScoredChunk[]>;
  indexChunks(chunks: KnowledgeChunk[]): Promise<void>;
  removeSourceChunks(sourceId: string): Promise<void>;
  getStats(): { indexedChunksCount: number; provider: string };
}
```

You can swap the active provider dynamically at runtime using `setMedicalRetriever(newProvider)` (e.g., switching from the default in-memory vector retriever to Google Cloud Firestore Vector Search, Cloud SQL PostgreSQL pgvector, or Pinecone) with **zero changes** to downstream workflows or prompt templates.

---

## 3. Semantic Retrieval & Relevance Thresholding

### Query Processing & Clinical Term Expansion
User queries are processed through a clinical normalization pipeline:
- Emergency intent identification (cardiac arrest, acute stroke, anaphylaxis)
- Synonym expansion across common clinical terms (e.g., expanding "high blood sugar" to `["glucose", "hba1c", "diabetes", "hyperglycemia"]`)
- Dense semantic vector generation

### Strict Relevance Thresholds
To prevent low-quality or irrelevant results from being blindly passed to Gemini:
- Chunks must achieve a minimum hybrid relevance score (`minRelevanceScore = 0.58`).
- If an input query is out of medical scope (e.g., automotive repair, entertainment, sports), the context filtering layer rejects all candidates.
- The model receives an explicit grounding notice instructing it that no authoritative documents matched, preventing citation hallucination.

---

## 4. Zero-Fabrication & Anti-Hallucination Guarantees

1. **System Prompt Directives**: The clinical prompt registry strictly forbids the LLM from inventing or citing external studies not present in the retrieved evidence block.
2. **Post-Generation Citation Binding**: The `verifyAndBindCitations` function audits candidate citations against the verified RAG document pool. Any citation returned to the user **must** correspond to an actual document retrieved from the knowledge registry.
3. **Clean Citation UI**: The `MedicalCitationCard` displays the organization badge, document ID, publication date, relevance match percentage, official external URL, and an expandable clinical evidence passage.

---

## 5. Evaluation Dataset & Benchmark Suite

The codebase includes an evaluation suite (`server/ai/rag/evaluation/`) testing 14 diverse clinical scenarios and negative out-of-scope controls:

| Test ID | Query Topic | Expected Document | Clinical Domain | Type |
|---|---|---|---|---|
| `eval_cv_01` | Heart attack signs & radiating pain | `AHA-GDL-2026-CV01` | Cardiology | Positive |
| `eval_stroke_02` | Facial drooping & FAST protocol | `CDC-STR-2026-01` | Neurology | Positive |
| `eval_bp_03` | Hypertensive crisis classification | `AHA-ACC-2026-BP` | Cardiovascular | Positive |
| `eval_cbc_04` | Hemoglobin reference & anemia | `NIH-NLM-2026-CBC` | Hematology | Positive |
| `eval_wbc_05` | WBC count & leukocytosis infection | `NIH-NLM-2026-WBC` | Immunology | Positive |
| `eval_dm_06` | Fasting glucose & HbA1c criteria | `ADA-DM-2026-01` | Endocrinology | Positive |
| `eval_lipid_07` | Cholesterol, LDL, & triglycerides | `NHLBI-LPD-2026-01` | Cardiology | Positive |
| `eval_kidney_08` | Serum creatinine & eGFR limits | `NIDDK-CKD-2026-01` | Nephrology | Positive |
| `eval_liver_09` | Liver enzymes ALT, AST, & bilirubin | `NLM-HEP-2026-01` | Hepatology | Positive |
| `eval_fever_10` | Fever with stiff neck red flags | `MAYO-FVR-2026-01` | General Medicine | Positive |
| `eval_statin_11` | Statin myopathy & rhabdomyolysis | `FDA-SAF-2026-01` | Pharmacology | Positive |
| `eval_neg_12` | Brake pad replacement (vehicle) | *(Rejected by Threshold)* | Non-Medical | Negative Control |
| `eval_neg_13` | Film director trivia | *(Rejected by Threshold)* | Non-Medical | Negative Control |
| `eval_neg_14` | Planetary astronomy | *(Rejected by Threshold)* | Non-Medical | Negative Control |

### Evaluation Metrics Computed
* **Top-1 Accuracy**: % of queries where the top-ranked retrieved document matches the ground truth.
* **Top-3 Recall**: % of queries where the expected document is present in the top 3 candidates.
* **MRR (Mean Reciprocal Rank)**: Measure of ranking quality.
* **Negative Rejection Specificity**: % of out-of-scope non-medical queries correctly suppressed by the relevance threshold.
* **Latency**: End-to-end processing time per query in milliseconds.

---

## 6. RAG API Endpoints

* **`GET /api/ai/rag/sources`**: Returns registered medical sources, organizations, total chunks, and active provider stats.
* **`POST /api/ai/rag/retrieve`**: Directly inspect semantic retrieval for any query (`{ query, topK, minScore }`).
* **`POST /api/ai/rag/sources`**: Dynamically registers a new medical guideline at runtime.
* **`DELETE /api/ai/rag/sources/:id`**: Removes a knowledge source dynamically.
* **`GET /api/ai/rag/evaluate`**: Executes the evaluation benchmark suite and returns quantitative metrics.
