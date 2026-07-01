# Resume Scanner — Agentic Security Layer

> **Kaggle AI Agents: Intensive Vibe Coding Capstone Project** (Google-sponsored)

[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)](https://www.postgresql.org/)

---

## 1. Problem

The existing Resume Scanner app sends raw resume text — including candidates' names, email addresses, phone numbers, and government ID numbers — directly to external third-party LLM APIs (Google Gemini and Groq) with no filtering. This creates a real privacy gap: every API call exposes PII to an external service the candidate never consented to share their data with.

## 2. Solution

This project adds an **agentic security layer** that sits between the file upload and any outbound LLM call. It enforces a fixed, audited pipeline:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          UPLOAD REQUEST                                    │
└──────────────────────────────┬─────────────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Security Scanner  │  ← TOOL (deterministic)
                    │  (magic-byte MIME   │    python-magic validates
                    │   validation)       │    true file type from bytes
                    └──────────┬──────────┘
                   PASS        │        FAIL → HTTP 400 (reject)
                               │
                    ┌──────────▼──────────┐
                    │    PII Redactor     │  ← TOOL (deterministic)
                    │  (regex: email,     │    regex strips PII before
                    │   phone, PAN, etc.) │    any LLM payload is built
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   ORCHESTRATOR      │  ← AGENT (LLM-driven)
                    │   (ADK-equivalent)  │    decides: is resume scoreable?
                    │                     │    calls score_resume tool
                    │   ┌─────────────┐   │    synthesizes final result
                    │   │score_resume │   │
                    │   │(local ML ✓) │   │
                    │   └─────────────┘   │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼──────────────────┐
              │                │                  │
   ┌──────────▼──────┐  ┌──────▼──────┐  ┌───────▼───────┐
   │  Gemini / Groq  │  │ ML Score    │  │  Audit Log    │
   │  (REDACTED text │  │ (original   │  │  (Postgres,   │
   │   only) ← ✓ PII │  │  text, local│  │  no raw PII)  │
   │  never leaks    │  │  offline)   │  │               │
   └─────────────────┘  └─────────────┘  └───────────────┘
```

**Key design principles:**
- Security controls (`scan_file`, `redact_pii`) are **hardcoded and always run** — no LLM can skip or re-order them.
- The LLM agent only handles decisions that genuinely require judgment (is this resume scoreable? how to synthesize results?).
- The audit log records every step with counts/categories only — **never raw PII values**.
- Redaction scope is surgical: **only the outbound LLM payload** is redacted. The DB and recruiter UI keep real contact info.

---

## 3. Rubric Concept Mapping

| Kaggle Rubric Concept | Where Implemented |
|---|---|
| **ADK Agent** | `app/agents/orchestrator.py` — ADK-equivalent tool-calling loop with LLM reasoning phase |
| **MCP Server** | `app/mcp_server.py` — exposes 4 tools (scan_file, redact_pii, score_resume, log_audit) |
| **Security Features** | `app/tools/security_scanner.py` (MIME validation) + `app/tools/pii_redactor.py` (PII redaction) |
| **Agent Skills / CLI** | `cli.py` — `scan`, `redact`, `score` commands running without a web server |
| **Deployability** | `docker-compose.yml` — one-command local deploy of backend + frontend + postgres |
| **AI Integration** | Gemini + Groq used for JD generation, resume extraction, LLM fallback classification |

---

## 4. Setup & Running

### Prerequisites
- Docker Desktop (recommended) OR Python 3.11+ and Node 20+
- A Gemini API key (free tier works) and optionally a Groq API key

### Docker Compose (recommended — zero manual setup)

```bash
# 1. Clone the repo
git clone https://github.com/MithunKumarRajak/ResumeScanner
cd ResumeScanner

# 2. Set up environment
cp FullStackApp/backend/.env.example FullStackApp/backend/.env
# Edit FullStackApp/backend/.env:
#   - Set GEMINI_API_KEY=your-key
#   - Set SECRET_KEY=any-long-random-string
#   - POSTGRES_PASSWORD=change-this (if desired)

# 3. Start everything
docker-compose up --build

# App is now at:
#   Frontend:  http://localhost:5173
#   Backend:   http://localhost:8000
#   API docs:  http://localhost:8000/docs
```

### Without Docker (local dev)

```bash
# Backend
cd FullStackApp/backend
python -m venv venv && venv\Scripts\activate   # Windows
pip install -r requirements.txt
python -m spacy download en_core_web_sm
cp .env.example .env   # then fill in your keys
uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd FullStackApp/frontend
npm install
npm run dev
```

### CLI (standalone — no web server needed)

```bash
cd FullStackApp/backend

# Validate a file's MIME type
python cli.py scan path/to/resume.pdf

# Detect and redact PII from text
python cli.py redact "Contact: john@example.com, +91-9876543210"

# Run the full security pipeline (scan + redact + score)
python cli.py score path/to/resume.pdf
```

### MCP Server (for MCP Inspector / ADK clients)

```bash
cd FullStackApp/backend
python -m app.mcp_server   # runs on stdio (MCP protocol)
```

---

## 5. File Structure (new files added by this project)

```
FullStackApp/backend/
├── app/
│   ├── agents/
│   │   └── orchestrator.py      # THE ONLY AGENT (ADK-equivalent, LLM-driven)
│   ├── tools/
│   │   ├── security_scanner.py  # TOOL: magic-byte MIME validation
│   │   ├── pii_redactor.py      # TOOL: regex PII detection + redaction
│   │   └── audit_logger.py      # TOOL: writes audit_log table rows
│   ├── models/
│   │   └── audit_log.py         # NEW: audit_log SQLAlchemy model
│   └── mcp_server.py            # MCP server (scan_file, redact_pii, score_resume, log_audit)
├── cli.py                        # CLI: scan / redact / score commands
└── Dockerfile                    # Docker image (includes libmagic)
FullStackApp/frontend/src/components/
└── SecurityBadge.jsx             # Read-only status badges (scan ✓, PII redacted ✓)
docker-compose.yml                # One-command local deploy
```

---

## 6. Known Limitations / Future Work

| Limitation | Current Approach | Future Work |
|---|---|---|
| **PII detection** | Regex patterns (email, phone, PAN, Aadhaar, SSN) | `presidio-analyzer` + spaCy NER for names/addresses |
| **Audit log encryption** | Plain text Postgres columns | AES/Fernet encryption of `detail` column |
| **File content scanning** | MIME type only (magic bytes) | `oletools` for macro detection in DOCX; AV engine for malware |
| **Name redaction** | Not implemented (regex can't detect freeform names) | NER-based entity detection |
| **LLM agent framework** | ADK-equivalent tool-calling loop | Full Google ADK `AgentRunner` + `FunctionTool` |

These limitations are documented transparently rather than hidden — this reflects engineering maturity, not a gap.

---

## 7. Security Design Notes

- **No secrets in code** — all API keys and passwords come from `.env` (gitignored).
- **Redaction scope** — only the LLM outbound payload and audit log use redacted text. DB and UI always have real candidate contact info (recruiters need it).
- **Scan-first** — files are scanned before being saved to disk. A rejected file never touches the filesystem.
- **Audit trail** — every pipeline step writes to `audit_log` with counts/categories only (no raw PII ever appears in the DB audit column).
