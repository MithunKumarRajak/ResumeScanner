# Kaggle Submission Copy-Paste Cheat Sheet

Use the fields below to fill out your Kaggle Writeup submission form.

---

### [1] Title (56 / 80 characters)
```text
ResumeScanner: Privacy-First Multi-Agent Resume Analysis
```

---

### [2] Subtitle (126 / 140 characters)
```text
A two-agent system that scans, redacts, classifies, and gives feedback on resumes without sending raw candidate PII to external LLMs.
```

---

### [3] Card and Thumbnail Image (560 x 280)
*Action:* Upload the generated image located at:
```text
Report/kaggle_cover_image.png
```

---

### [4] Submission Tracks
*Action:* Select:
```text
Agents for Business
```

---

### [5] Media Gallery
*Action:* 
- Paste your YouTube video link here once recorded: `[Insert YouTube Link]`
- Upload the architecture diagram image located at: `Report/architecture_diagram.png`

---

### [6] Project Description (Copy everything inside the box below)
```markdown
# ResumeScanner: Privacy-First Multi-Agent Resume Analysis

**Subtitle:** A two-agent system that scans, redacts, classifies, and gives actionable feedback on resumes — without ever sending a candidate's raw personal data to an external LLM.

**Track:** Agents for Business
**GitHub:** https://github.com/MithunKumarRajak/ResumeScanner
**Demo Notebook:** https://github.com/MithunKumarRajak/ResumeScanner/blob/main/notebooks/kaggle_demo.ipynb
**Video:** [YouTube link — replace this before submitting]

---

## 1. The Problem

Every day, HR teams paste candidate resumes directly into AI tools — ChatGPT, Gemini, custom APIs. A typical resume contains a full name, personal email address, mobile number, and in the Indian context, a PAN card number and Aadhaar number. This data flows to third-party AI services, often without the candidate's knowledge or consent.

For an enterprise recruiter processing 500 resumes a week, the cumulative privacy exposure is enormous. Under GDPR and India's IT Act 2000, this is not merely a policy concern — it is an audit liability. A single data breach tracing back to a bulk resume upload to an external LLM could result in regulatory action.

The second problem is efficiency. A recruiter spending six minutes per resume across one hundred candidates wastes ten hours. A large fraction of that time is spent on candidates whose resumes obviously do not match the role. An automated pre-screening layer that delivers a structured job-category prediction, a skill gap analysis, and prioritised ATS improvement feedback could reclaim that time while simultaneously reducing the PII exposure risk.

These two problems — privacy leakage and screening inefficiency — are what ResumeScanner is designed to solve.

---

## 2. Why Agents?

A naive pipeline function could scan a file, run a regex, call a model, and return a prediction. But that approach fails in two ways that agents solve well.

**First — contextual judgment at the security boundary.** When a PDF is uploaded, the backend extracts text. That extracted text is not always a clean resume. A scanned image-only PDF produces garbled OCR. A corrupted DOCX produces Unicode noise. A static function has no way to decide whether extracted text is worth scoring — it either always scores (producing meaningless confidence values) or always rejects (losing valid uploads). An LLM-based agent can read the extracted text and decide: "This looks like a real resume — proceed." Or: "This is mostly noise — flag it as unclassifiable." That decision is exactly the kind of contextual judgment that agents are built for.

**Second — dynamic feedback that changes with every document.** An 87% confidence score for "Data Science" means something specific about a specific candidate's specific skill set. A static rule set cannot interpret what that score means in the context of the actual resume text and the actual job description. The FeedbackAgent reads the redacted text, the ML score, and optionally the job description, and produces advice that is unique to that candidate — specific skill gaps, specific improvements, estimated ATS impact per change. This is not something a template function can do.

In this project, agents are not decorative. They are the mechanism by which the system adapts its behavior to the specific content of each document.

---

## 3. Solution Overview

ResumeScanner is a full-stack application: React 18 + Vite frontend, FastAPI + Uvicorn backend, PostgreSQL 15 database, and a two-agent orchestration layer backed by Google Gemini (primary) and Groq llama-3.3-70b (fallback).

When a recruiter uploads a resume, the system:

1. **Validates** the file's true MIME type from its raw bytes using `libmagic` — not the file extension. An `.exe` renamed to `.pdf` is rejected at this step before any text is extracted.
2. **Redacts** PII (email, phone, PAN card, Aadhaar, SSN) from the extracted text using regex patterns. The redacted text is used for all outbound LLM calls. The original text is stored in the database and shown in the UI so recruiters keep real contact info.
3. **Classifies** the resume using a local, fully offline ML classifier (TF-IDF + calibrated SGD/SVM ensemble, v6). No external API call. No PII risk.
4. **Reasons** about the result using LLM agent logic — the agent decides if the text is scoreable, synthesizes the ML prediction with the redaction summary, and returns a structured assessment.
5. **Generates feedback** via a second LLM agent: top skill gaps, prioritised improvement actions with estimated ATS score boosts, a recruiter-facing headline.
6. **Logs** every pipeline step (scan, redact, llm_call, score, feedback) to an immutable audit trail in PostgreSQL, with counts and categories only — never raw PII values.

Beyond resume upload, the app also provides: job description generation and refinement, cover letter generation, side-by-side candidate comparison, ATS score checking, and a resume builder with live rescoring.

---

## 4. Architecture

The system has two agents, five skills, one MCP server, and a full-stack web interface.

```
Resume Upload (PDF / DOCX)
        │
        ▼
┌────────────────────────────────────────────┐
│  AGENT 1 — SecurityOrchestratorAgent       │
│  (FullStackApp/backend/app/agents/orchestrator.py)
│                                            │
│  Step 1: SkillScanFile                     │
│     magic-byte MIME validation             │
│     FAIL → HTTP 400, pipeline halted       │
│     PASS ↓                                 │
│  Step 2: SkillRedactPII                    │
│     regex strips email / phone / PAN /     │
│     Aadhaar / SSN — ALWAYS runs,           │
│     hardcoded, no LLM can skip this        │
│     ↓                                      │
│  Step 3: LLM reasoning (Gemini → Groq)     │
│     Is this text scoreable?                │
│     → tool call: SkillScoreResume          │
│     → local TF-IDF + classifier (offline)  │
└────────────────┬───────────────────────────┘
                 │ score_result
                 ▼
┌────────────────────────────────────────────┐
│  AGENT 2 — FeedbackAgent                   │
│  (app/agents/feedback_agent.py)            │
│                                            │
│  Input: redacted_text + score_result       │
│  LLM: Gemini / Groq (redacted text only)   │
│  Outputs:                                  │
│    skill_gaps     (top 3–5 gaps)           │
│    improvements   (prioritised + ATS pts)  │
│    category_fit   (Strong/Good/Moderate)   │
│    ats_summary    (recruiter headline)     │
└────────────────────────────────────────────┘
        │
        ▼
PostgreSQL audit_log  ·  FastAPI REST  ·  React UI
MCP server (5 tools)  ·  Agents CLI
```

**Why the security steps are hardcoded and not LLM-controlled:** Allowing an LLM to decide whether to run the file scan or PII redaction would be an architectural anti-pattern. Security controls must be unconditional. The "LLM decides" pattern is reserved for the steps that genuinely require contextual judgment — scoreability assessment and feedback generation.

---

## 5. Course Concepts Applied

### Concept 1 — Agent / Multi-agent System (ADK)

The system implements two coordinated agents using the ADK FunctionTool equivalent pattern. Each tool is defined as a Python dict with `name`, `description`, `input_schema`, and a `handler` callable. The orchestrator runs a tool-calling loop: the LLM generates a JSON object containing `tool_call.name + args`, the loop executes the handler, feeds the result back to the LLM, and repeats until the LLM returns a final answer.

Key files: `app/agents/orchestrator.py`, `app/agents/feedback_agent.py`

The two agents are loosely coupled. Agent 1 produces a typed `score_result` dict and a `redacted_text` string. Agent 2 receives those as inputs without knowing how they were produced. Neither agent is aware of the other's internal implementation.

### Concept 2 — MCP Server

`app/mcp_server.py` implements the full MCP protocol (stdio transport) using the official Python MCP SDK (`mcp.server.Server`, `mcp.server.stdio.stdio_server`). If the SDK is unavailable, it falls back to a manual JSON-RPC stdio loop that implements `tools/list` and `tools/call` — enough for any MCP inspector to discover and invoke all tools.

Five tools are exposed with complete `inputSchema` definitions:

| Tool | Skill | What it does |
|---|---|---|
| `scan_file` | SkillScanFile | MIME validation from base64-encoded bytes |
| `redact_pii` | SkillRedactPII | Regex PII redaction from text |
| `score_resume` | SkillScoreResume | Local ML classification (offline) |
| `generate_feedback` | SkillGenerateFeedback | LLM-driven feedback via FeedbackAgent |
| `log_audit` | SkillLogAudit | Write a step to the audit_log table |

Run: `python -m app.mcp_server`  
Inspect: `npx @modelcontextprotocol/inspector python -m app.mcp_server`

### Concept 3 — Security Features

Four distinct security layers, all implemented in code:

**Magic-byte file validation** (`app/tools/security_scanner.py`): Uses `libmagic` to read the first bytes of the uploaded file and determine its true MIME type. Rejects files not on the allowlist (PDF, DOCX, plain text), and cross-checks the detected MIME against the declared file extension. A `.exe` renamed to `.pdf` is caught and rejected before any text is extracted.

**PII redaction** (`app/tools/pii_redactor.py`): Five regex patterns covering email addresses, Indian mobile numbers (with/without +91 prefix), PAN cards (AAAAA9999A format), Aadhaar numbers (12-digit with optional spaces/hyphens), and US-format SSNs. Applied unconditionally before every outbound LLM call. The original text is never sent to external APIs.

**Immutable audit trail** (`app/models/audit_log.py`, `app/tools/audit_logger.py`): Every pipeline step writes one row to `audit_log` in PostgreSQL. The `detail` column contains only counts and type names — never raw PII values. This is documented as the single source of truth in the `orchestrator.py` module docstring and enforced at every call site.

**Redaction scope policy**: The boundary between "what gets redacted" and "what stays original" is documented in a table in `orchestrator.py`, in README Section 13, and in the Kaggle writeup. It is enforced in code, not just policy.

### Concept 4 — Agent Skills (Agents CLI)

`agent_skills.py` implements an ADK-style `SkillRegistry` — a central registry of five self-describing `Skill` dataclass objects. Each skill carries its name, description, input/output schema, handler callable, category, `requires_llm` flag, and examples. The registry exposes `list_skills()`, `get()`, `invoke()`, and `to_mcp_tool_list()` — the last of which feeds directly into the MCP server without duplicating tool definitions.

`cli_agent.py` wraps the registry as a command-line interface:

```bash
python cli_agent.py list-skills
python cli_agent.py describe SkillScanFile
python cli_agent.py run SkillRedactPII --text "john@example.com +91-9876543210"
python cli_agent.py run-pipeline resume.pdf --jd job_desc.txt
python cli_agent.py architecture
```

The full two-agent pipeline runs end-to-end without a web server, database, or API key.

### Concept 5 — Deployability

One-command Docker Compose deployment from the repository root:

```bash
docker-compose up --build
```

This builds the Python backend image (installs `libmagic1`, all pip packages, spaCy model), builds the Node/Vite frontend image, starts PostgreSQL 15 with a named volume and health check, waits for the health check to pass before starting the backend, and starts the React frontend dev server with hot-module replacement.

Three services, zero manual configuration beyond copying `.env.example` to `.env`.

### Concept 6 — Antigravity

Antigravity, Google's AI coding assistant, was used throughout development. Specific contributions: designing the MCP server's JSON-RPC fallback loop (so the server works in environments without the `mcp` SDK), structuring the `SKILL_REGISTRY` pattern (the insight that a single registry should drive CLI discovery, MCP tool export, and test invocation), and drafting the security architecture documentation. Demonstrated in the video submission.

---

## 6. Security Architecture: The Privacy Contract

The most important design decision in this project is the redaction boundary — the exact line between what gets sent to external LLMs and what stays local.

| Data | Location | Redacted before LLM? | Reason |
|---|---|---|---|
| Outbound LLM payload (Gemini / Groq) | External API | **YES — always** | PII must not leave the system |
| Audit log `detail` column | PostgreSQL | Counts only | Only "2 emails, 1 phone" — never values |
| `resumes.raw_text` column | PostgreSQL | **NO** | Recruiters need real contact info |
| Frontend UI display | Browser | **NO** | Recruiters need to see real names/emails |
| Local ML classifier input | In-process | **NO** | Fully offline — no privacy risk |

This boundary is enforced in code. The `orchestrator.py` module docstring is the single source of truth, and every call site that passes text to an LLM includes a comment explicitly stating which version of the text (original vs. redacted) is being passed and why.

---

## 7. Technical Implementation

**ML Model (v6):** TF-IDF vectorizer + calibrated SGD/SVM ensemble trained on a labeled dataset of resumes by job category. Hybrid inference vector combining TF-IDF features, 15 structured features (years experience, degree level, technical keyword presence), and optional sentence-transformer embeddings. Runs fully offline. Three model versions (v3, v5, v6) are supported; the agent can select the version dynamically.

**Fallback chain:** Every LLM call follows the same pattern: try Gemini Flash → try Groq llama-3.3-70b → use deterministic fallback. The entire app works without any API key — the ML scorer, file scanner, and PII redactor are all local.

**Audit trail:** Every pipeline step (scan, redact, llm_call, score, feedback) writes one row to `audit_log`. The immutable trail can be inspected via `GET /api/audit-log` (no auth required, visible in Swagger at `/docs`) or directly in PostgreSQL:

```sql
SELECT step_name, status, detail, resume_id, timestamp
FROM audit_log ORDER BY id DESC LIMIT 10;
```

**Test suite:** `tests/test_tools.py` — 21 test cases covering `TestScanFile`, `TestRedactPII`, `TestSkillRegistry`. Tests run without a web server, database, or API key. All 21 pass.

**Stack:** FastAPI 0.115 + Uvicorn · PostgreSQL 15 + SQLAlchemy 2 + Alembic · React 18 + Vite + Zustand + TanStack Query · Docker Compose · Google Gemini + Groq · MCP SDK ≥ 1.0.

---

## 8. Demo Walkthrough

A recruiter opens `http://localhost:5173` and uploads `candidate_resume.pdf`.

The backend `SecurityOrchestratorAgent` runs as a background task:
- `SkillScanFile` detects `application/pdf` → PASS
- `SkillRedactPII` finds 3 items: email, phone, PAN → redacted
- LLM reasoning: "Text is a real resume — proceed"
- `SkillScoreResume`: `predicted_category = "Data Science"`, `confidence = 0.87`

The `FeedbackAgent` runs on the redacted text + score:
- Identifies 3 skill gaps: missing MLOps keywords, no quantified metrics, weak professional summary
- Returns 3 prioritised improvements with ATS score boosts (+15, +12, +8)
- Category fit: Strong

The React UI shows the `SecurityBadge` component: scan passed, 3 PII fields redacted, category and confidence. The audit log in PostgreSQL has five rows: scan/passed, redact/passed, llm_call/passed, score/passed, feedback/passed.

CLI equivalent:
```bash
cd FullStackApp/backend
python cli_agent.py run-pipeline candidate_resume.pdf --jd job_description.txt
```

---

## 9. What I Learned

**Agents should not control security controls.** The temptation to let the LLM decide the order of the security pipeline is real — it would feel more "agentic." But it is wrong. Security controls must be unconditional. If an LLM could skip the PII redaction step, the entire privacy guarantee collapses. The agentic value is in scoreability judgment and feedback generation — not in deciding whether to protect candidate data.

**Build the fallback first.** The Gemini → Groq → deterministic fallback chain was not an afterthought — it was the first thing built. Every LLM feature works without API keys. This made the entire app demo-proof: it runs on any machine, without internet access, and produces correct results even when no LLM is available.

**Self-describing skill registries pay for themselves.** The `SKILL_REGISTRY` took time to build correctly. That time was recovered immediately: the same registry drives CLI discovery (`cli_agent.py list-skills`), MCP tool export (`to_mcp_tool_list()`), test invocation (registry.invoke in `test_tools.py`), and the agent's tool dispatch loop. One definition, four uses, zero duplication.

---

## 10. Conclusion

ResumeScanner demonstrates that AI agents can solve real business problems in a production-minded way — with security controls that are unconditional, privacy guarantees that are enforced in code rather than policy, deployable infrastructure that requires a single command, and a documented audit trail that any compliance team could inspect.

The two-agent architecture is not decorative. The SecurityOrchestratorAgent and FeedbackAgent have distinct roles, communicate through a clean typed interface, and together accomplish something that neither a single agent nor a static pipeline could do: safe, private, contextually-aware resume analysis at scale.

**GitHub:** https://github.com/MithunKumarRajak/ResumeScanner
**Demo Notebook:** https://github.com/MithunKumarRajak/ResumeScanner/blob/main/notebooks/kaggle_demo.ipynb
**Track:** Agents for Business
**Video:** [YouTube link — replace this before submitting]
```

---

### [7] Project links
Add this link:
```text
https://github.com/MithunKumarRajak/ResumeScanner
```
