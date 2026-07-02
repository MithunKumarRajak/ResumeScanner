# Resume Scanner — Complete Setup & Operations Guide

> **Kaggle AI Agents: Intensive Vibe Coding Capstone Project** (Google-sponsored)
>
> Full-stack AI resume scanner with an **agentic security layer** — magic-byte file validation,
> regex PII redaction, LLM-driven resume scoring, MCP server, and a complete audit trail.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](https://www.python.org/)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Prerequisites](#3-prerequisites)
4. [First-Time Setup](#4-first-time-setup)
5. [Running with Docker (Recommended)](#5-running-with-docker-recommended)
6. [Running Without Docker (Local Dev)](#6-running-without-docker-local-dev)
7. [CLI Tools (No Web Server Needed)](#7-cli-tools-no-web-server-needed)
8. [MCP Server](#8-mcp-server)
9. [Development Workflow](#9-development-workflow)
10. [Testing](#10-testing)
11. [API Reference (Key Endpoints)](#11-api-reference-key-endpoints)
12. [Troubleshooting](#12-troubleshooting)
13. [Security Architecture](#13-security-architecture)
14. [File Structure](#14-file-structure)
15. [Known Limitations and Future Work](#15-known-limitations-and-future-work)
16. [Dataset Note](#16-dataset-note)

---

## 1. Project Overview

The app is a full-stack resume scanner. A recruiter uploads a candidate's PDF/DOCX resume; the backend:

1. **Validates** the file's true type using magic bytes (rejects renamed executables)
2. **Redacts** PII (email, phone, PAN, Aadhaar) before any text leaves the system to an LLM
3. **Scores** the resume using a local offline ML model (no PII risk)
4. **Synthesizes** results using an LLM agent (Gemini/Groq), sending only redacted text
5. **Logs** every step to an immutable audit trail in Postgres

The frontend provides a React UI for resume upload, job description generation, match analysis, cover letter generation, and a resume builder.

---

## 2. Architecture

```
Upload Request
      |
      v
+------------------+
| Security Scanner |  <- TOOL: magic-byte MIME validation (always runs first)
+--------+---------+
    PASS |   FAIL --> HTTP 400 -- file rejected, never touches disk
         v
+------------------+
|  PII Redactor    |  <- TOOL: regex strips email/phone/PAN before LLM payloads
+--------+---------+
         v
+------------------+
|  ORCHESTRATOR    |  <- AGENT: LLM decides is this scoreable? -> calls score_resume tool
|  (ADK-equiv.)    |
+--------+---------+
    +----+----+-----------+
    v         v           v
Gemini/Groq  ML Score   Audit Log
(redacted    (original   (Postgres,
 text only)   text,       no raw PII)
              local)
```

**Stack:**

| Layer | Technology |
|---|---|
| Backend API | FastAPI + Uvicorn |
| Database | PostgreSQL 15 |
| ORM / Migrations | SQLAlchemy 2 + Alembic |
| ML Model | scikit-learn (TF-IDF + classifier) |
| LLM Integration | Google Gemini, Groq (llama-3.3-70b) |
| Agent Protocol | MCP SDK + ADK-equivalent tool loop |
| Frontend | React 18 + Vite + Zustand + TanStack Query |

---

## 3. Prerequisites

### For Docker (recommended path)

| Tool | Minimum Version | Check |
|---|---|---|
| Docker Desktop | 4.x | `docker --version` |
| Docker Compose | v2 (bundled with Docker Desktop) | `docker compose version` |

### For local dev (without Docker)

| Tool | Minimum Version | Check |
|---|---|---|
| Python | 3.11 | `python --version` |
| pip | 23+ | `pip --version` |
| Node.js | 20 LTS | `node --version` |
| npm | 9+ | `npm --version` |
| PostgreSQL | 15 | `psql --version` |

### API Keys (at least one recommended for LLM features)

- **Google Gemini** (free tier works): https://aistudio.google.com/app/apikey
- **Groq** (free tier works): https://console.groq.com/keys

> The app works without API keys. The ML scorer is fully local/offline. JD generation, cover letters, and LLM-enhanced scoring will show fallback messages without keys.

---

## 4. First-Time Setup

### Step 1: Clone the repository

```bash
git clone https://github.com/MithunKumarRajak/ResumeScanner.git
cd ResumeScanner
```

### Step 2: Configure environment variables

The backend needs a `.env` file. The example file has all keys with comments:

```bash
# Copy the example
cp FullStackApp/backend/.env.example FullStackApp/backend/.env
```

Open `FullStackApp/backend/.env` and set these values:

```dotenv
# REQUIRED: Change to any long random string (32+ characters)
SECRET_KEY=replace-this-with-a-long-random-string-at-least-32-chars

# REQUIRED: Docker Compose database credentials
POSTGRES_USER=resume_user
POSTGRES_PASSWORD=choose-a-strong-password-here
POSTGRES_DB=resume_scanner

# RECOMMENDED: Google Gemini API key (free tier)
# Get it at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your-gemini-api-key-here

# OPTIONAL: Groq fallback LLM (free tier)
# Get it at: https://console.groq.com/keys
Groq_api_key=your-groq-api-key-here

# Leave these as-is for Docker -- Docker sets DATABASE_URL automatically
APP_NAME="Resume Screener API"
DEBUG=false
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
MODEL_PATH=../model.pkl
TFIDF_PATH=../tfidf.pkl
ENCODER_PATH=../encoder.pkl
```

> CAUTION: Never commit `.env` to git. The `.gitignore` already excludes it.

---

## 5. Running with Docker (Recommended)

Docker gives a fully reproducible environment with zero manual dependency management.

### 5a. Build and start

From the **repository root** (where `docker-compose.yml` lives):

```bash
docker-compose up --build
```

This single command:

1. Builds the Python backend image (installs `libmagic1`, all pip packages, spaCy model)
2. Builds the Node/Vite frontend image
3. Starts PostgreSQL 15
4. Starts the FastAPI backend (waits for Postgres health check first)
5. Starts the React frontend dev server

**First build takes 5-15 minutes** (pip packages + spaCy model download). Subsequent starts are instant.

Watch for these lines to confirm success:

```
backend  | INFO:     Application startup complete.
frontend | VITE v5.x.x  ready in Xms
```

**Access the app:**

| Service | URL |
|---|---|
| React Frontend | http://localhost:5173 |
| FastAPI Backend | http://localhost:8000 |
| Swagger API Docs | http://localhost:8000/docs |
| ReDoc API Docs | http://localhost:8000/redoc |

### 5b. Apply database migrations (REQUIRED on first run)

This step is required on first run and after any schema change. In a **new terminal**:

```bash
# Open a shell inside the backend container
docker-compose exec backend bash

# Inside the container -- run all pending migrations
alembic upgrade head

# Expected output:
# INFO  [alembic.runtime.migration] Running upgrade  -> 97a323ec476e ...
# INFO  [alembic.runtime.migration] Running upgrade 97a323ec476e -> 46b39fab543a ...
# INFO  [alembic.runtime.migration] Running upgrade 46b39fab543a -> 7f0b2a1c4c9d ...
# INFO  [alembic.runtime.migration] Running upgrade 7f0b2a1c4c9d -> a1b2c3d4e5f6 ...

exit
```

Verify the migrations applied:

```bash
docker-compose exec postgres psql -U resume_user -d resume_scanner \
  -c "SELECT column_name FROM information_schema.columns WHERE table_name='resumes' ORDER BY ordinal_position;"
```

You should see `pii_redaction_count` and `pii_types_found` in the list.

### 5c. Verify everything is running

```bash
# Check all three containers are healthy
docker-compose ps

# Tail backend logs (Ctrl+C to stop)
docker-compose logs -f backend

# Check the API is responding
curl http://localhost:8000/status

# Check audit_log table exists
docker-compose exec postgres psql -U resume_user -d resume_scanner \
  -c "SELECT COUNT(*) FROM audit_log;"
```

### 5d. Stop and restart

```bash
# Stop all containers (data is preserved in named volumes)
docker-compose down

# Start again (no rebuild needed)
docker-compose up

# Stop AND delete all data (database + uploads -- use with caution)
docker-compose down -v

# Rebuild and restart (after changing requirements.txt or Dockerfile)
docker-compose up --build
```

---

## 6. Running Without Docker (Local Dev)

### 6a. Backend setup

```bash
# Step 1: Navigate to backend
cd FullStackApp/backend

# Step 2: Create a virtual environment
python -m venv venv

# Step 3: Activate it
# Windows (PowerShell):
venv\Scripts\Activate.ps1
# Windows (CMD):
venv\Scripts\activate.bat
# macOS/Linux:
source venv/bin/activate

# Step 4: Install all dependencies
pip install -r requirements.txt

# Step 5: Download the spaCy language model (one-time)
python -m spacy download en_core_web_sm

# Step 6: Set up environment variables
cp .env.example .env
# Edit .env -- set GEMINI_API_KEY, SECRET_KEY
# Also set DATABASE_URL to point to your local Postgres:
#   DATABASE_URL=postgresql://your_user:your_pass@localhost:5432/resume_scanner

# Step 7: Apply database migrations
alembic upgrade head

# Step 8: Start the backend
uvicorn app.main:app --reload --port 8000
```

Backend is now live at http://localhost:8000 with live reload.

> **Tip:** If you don't have a local PostgreSQL instance, run just the database container from Docker while running everything else locally:
>
> ```bash
> docker-compose up postgres
> ```
>
> Then set `DATABASE_URL=postgresql://resume_user:resume_pass@localhost:5432/resume_scanner` in your `.env`.

### 6b. Frontend setup

In a **separate terminal**:

```bash
# Step 1: Navigate to frontend
cd FullStackApp/frontend

# Step 2: Install dependencies
npm install

# Step 3: Start the dev server
npm run dev
```

Frontend is now at http://localhost:5173 with hot-module replacement.

---

## 7. CLI Tools (No Web Server Needed)

The CLI wraps the security pipeline for quick testing and demonstration without starting the web server.

```bash
# From the backend directory (activate venv first if not using Docker)
cd FullStackApp/backend
```

### Scan a file's MIME type

```bash
python cli.py scan path/to/resume.pdf
```

What it does: Reads the file's magic bytes and validates the true MIME type against the allowlist. Catches renamed files (e.g., `malware.exe` renamed to `resume.pdf`).

Expected output for a valid file:

```json
{
  "passed": true,
  "detected_type": "application/pdf",
  "reason": null
}
OK  Security scan PASSED
```

Expected output for a rejected file:

```json
{
  "passed": false,
  "detected_type": "application/x-dosexec",
  "reason": "Detected file type 'application/x-dosexec' is not allowed."
}
FAIL  Security scan FAILED
```

### Redact PII from text

```bash
# Inline text
python cli.py redact "Contact: john.doe@gmail.com or +91-9876543210"

# From a text file
python cli.py redact path/to/resume.txt

# Show the full redacted text
python cli.py redact "john.doe@gmail.com" --show-text
```

Expected output:

```json
{
  "redaction_count": 2,
  "types_found": ["email", "phone"]
}
LOCK  2 PII item(s) redacted (types: email, phone)
```

### Run the full security pipeline

```bash
python cli.py score path/to/resume.pdf
```

What it does: Runs the complete agentic pipeline:

1. `scan_file` -- validate MIME type
2. Extract text from PDF/DOCX
3. `redact_pii` -- strip email/phone/PAN before LLM call
4. LLM reasoning -- agent assesses scoreability, calls `score_resume` tool
5. `score_resume` -- local ML classifier (offline, no API needed)

Expected output:

```
Running security pipeline on: resume.pdf

{
  "scan_passed": true,
  "pii_redaction_count": 3,
  "pii_types_found": ["email", "phone"],
  "score": {
    "predicted_category": "Data Science",
    "confidence": 0.87
  }
}

==================================================
OK   File scan: PASSED
LOCK PII redacted: 3 item(s) -- email, phone
TAG  Predicted category: Data Science (87.0% confidence)
==================================================
```

> The CLI runs without a database connection. Audit steps go to the console only. This is by design so it works fully offline.

---

## 8. MCP Server

The MCP server exposes the security pipeline tools so any MCP-aware client (Claude Desktop, MCP Inspector, ADK agents) can discover and call them.

```bash
cd FullStackApp/backend
python -m app.mcp_server
```

The server reads JSON-RPC requests from stdin (stdio transport).

To use the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector python -m app.mcp_server
```

**Tools exposed:**

| Tool | Description |
|---|---|
| `scan_file` | Validate file MIME type from base64-encoded bytes |
| `redact_pii` | Detect and redact PII from resume text |
| `score_resume` | ML-classify a resume (local, offline) |
| `log_audit` | Write a step to the `audit_log` DB table |

> Note: Only stdio transport is implemented. HTTP transport is not supported. Any command-line flags passed to `python -m app.mcp_server` are silently ignored.

---

## 9. Development Workflow

### 9a. Making backend changes

The backend runs with `--reload` in both Docker and local dev, so Python source changes are picked up automatically without restart.

Exceptions that require a restart:

- Changes to `requirements.txt`
- Changes to `Dockerfile`
- Changes to environment variables in `.env`

```bash
# After changing requirements.txt -- Docker
docker-compose up --build backend

# After changing requirements.txt -- local
pip install -r requirements.txt
# Then restart uvicorn (Ctrl+C, re-run)
```

### 9b. Making frontend changes

The Vite dev server has hot-module replacement. React component changes appear in the browser instantly with no reload needed.

```bash
# After changing package.json dependencies
npm install
# Vite picks up new packages automatically
```

### 9c. Adding a database migration

Whenever you add or modify a SQLAlchemy model column:

**Step 1:** Update the model in `app/models/<model>.py`

**Step 2:** Generate a migration

```bash
# Docker
docker-compose exec backend alembic revision --autogenerate -m "describe your change"

# Local (venv active)
alembic revision --autogenerate -m "describe your change"
```

**Step 3:** Review the generated file in `alembic/versions/`. Always verify the SQL before applying -- autogenerate can get FK ordering wrong on complex schemas.

**Step 4:** Apply the migration

```bash
# Docker
docker-compose exec backend alembic upgrade head

# Local
alembic upgrade head
```

**Step 5:** To roll back one migration

```bash
alembic downgrade -1
```

**Check current migration state:**

```bash
alembic current    # shows current applied revision
alembic history    # shows full migration chain
```

---

## 10. Testing

### Run the backend test suite

```bash
# Docker
docker-compose exec backend pytest -v

# Local (venv active)
cd FullStackApp/backend
pytest -v
```

### Manual end-to-end verification checklist

| Check | Steps | Expected |
|---|---|---|
| Valid resume upload | Upload a PDF via the UI | Accepted; status becomes "classified" within a few seconds |
| Bad file rejected | Rename any `.exe` to `.pdf`, try to upload | HTTP 400 with "Security scan failed" message |
| PII badge in builder | Resume Builder -> upload a PDF with `john@example.com` in it | Badge shows "1 PII field redacted" |
| Analyze badge | Candidate page -> paste resume + JD -> click Analyze | SecurityBadge shows PII redaction count |
| Audit trail | Upload a resume then query the DB | Both `scan` and `redact` rows present for that `resume_id` |
| CLI score | `python cli.py score resume.pdf` | JSON output with scan, redaction, and score |
| Cover letter | Generate a cover letter | Output text does NOT contain `REDACTED_EMAIL` or `REDACTED_PHONE` |

**Verify the audit trail:**

```bash
docker-compose exec postgres psql -U resume_user -d resume_scanner \
  -c "SELECT resume_id, step_name, status, detail FROM audit_log ORDER BY id DESC LIMIT 20;"
```

You should see `scan`, `redact`, `llm_call`, and `score` rows for recent uploads.

---

## 11. API Reference (Key Endpoints)

Full interactive docs at **http://localhost:8000/docs** (Swagger UI).

### Resume endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/upload-resume` | Upload PDF/DOCX; security pipeline runs in background |
| `GET` | `/resumes` | List current user's resumes |
| `GET` | `/resume/{id}` | Get single resume with PII stats |
| `PUT` | `/resume/{id}` | Update editable fields |
| `DELETE` | `/resume/{id}` | Delete resume and file |

### Analysis endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/analyze` | Classify + skill-match + ATS + security pipeline |
| `POST` | `/predict` | ML-only classification |
| `POST` | `/extract-resume` | Extract structured fields from PDF/DOCX via LLM |

### AI generation endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/ai/generate-jd` | Generate a job description |
| `POST` | `/ai/refine-jd` | Refine an existing JD |
| `POST` | `/ai/explain-match` | LLM explains why a candidate matches |
| `POST` | `/ai/generate-cover-letter` | Generate a tailored cover letter |

### Auth endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Create an account |
| `POST` | `/auth/login` | Get a JWT token |
| `GET` | `/auth/me` | Current user info |

---

## 12. Troubleshooting

### `docker-compose up --build` fails during pip install

Check which package is failing:

```bash
docker-compose build backend 2>&1 | grep -E "ERROR|error|Could not"
```

Common fixes:

- `scipy` vs `fairlearn` conflict: confirm `requirements.txt` has `scipy>=1.9.3,<1.16.0` (not `==1.16.3`)
- `python-magic-bin` on Linux: confirm the line ends with `; sys_platform == "win32"`
- `mcp` vs `anyio` conflict: confirm `fastapi==0.115.12` (not `0.104.1`)

### Backend starts but `/docs` returns 500

Step 1 -- Check logs:

```bash
docker-compose logs backend | tail -50
```

Step 2 -- Check DB connectivity:

```bash
docker-compose exec backend python -c "
from app.database.session import engine
from sqlalchemy import text
with engine.connect() as c:
    print(c.execute(text('SELECT 1')).scalar())
print('DB OK')
"
```

Step 3 -- Check migrations:

```bash
docker-compose exec backend alembic current
```

If it does not say `(head)`, run `alembic upgrade head`.

### File upload fails with "Security scan failed" for a real PDF

Test the file directly:

```bash
python cli.py scan path/to/resume.pdf
```

The output shows the detected MIME type. If it shows `application/octet-stream`, the file may be corrupted. Re-export the PDF from the source application.

### `python-magic` ImportError on Windows (local dev)

```
ImportError: failed to find libmagic
```

Fix:

```bash
pip install python-magic-bin
```

The `requirements.txt` installs this automatically on Windows via the `sys_platform == "win32"` marker.

### `alembic upgrade head` fails -- "column already exists"

The column was added manually before the migration ran. Fix by marking it as already applied:

```bash
alembic stamp head
```

### Frontend shows blank page or "Network Error"

1. Confirm backend is running: `curl http://localhost:8000/status`
2. Check browser console for CORS errors
3. Confirm `FullStackApp/frontend/.env` has `VITE_API_URL=http://localhost:8000`

### LLM features return "AI Explanation unavailable"

- No API key set: open `FullStackApp/backend/.env`, set `GEMINI_API_KEY`
- Wrong API key: test it with `curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY"`
- Rate limit: wait a minute and retry

The ML scorer and security pipeline work without any API key.

### Audit log is empty after upload

1. Confirm migrations: `alembic current` should show `a1b2c3d4e5f6`
2. Check backend logs: `docker-compose logs backend | grep audit_log`
3. If you see "Failed to write audit row", there is a DB connection issue -- restart the backend container

---

## 13. Security Architecture

### How the pipeline is enforced

The security pre-pipeline is hardcoded and unconditional -- no LLM can skip or re-order steps 1-3:

```python
# orchestrator.py -- this order is fixed in code, not configurable by any LLM
scan_result   = scan_file(file_bytes, filename)  # Step 1: always
redact_result = redact_pii(raw_text)             # Step 2: always
# Only then does the LLM agent run
```

### Redaction scope

| Where | Redacted? | Reason |
|---|---|---|
| Outbound LLM payload (Gemini/Groq) | YES | PII must not leave to third-party APIs |
| Audit log `detail` column | Counts only | Never raw PII -- only "2 emails, 1 phone" |
| `resumes.raw_text` DB column | NO | Recruiters need real contact info |
| Frontend UI | NO | Recruiters need real contact info |
| Local ML model (score_resume) | NO | Fully offline, no privacy risk |

### PII types detected

| Type | Pattern | Example |
|---|---|---|
| Email | Standard RFC-5321 | `john@example.com` -> `[REDACTED_EMAIL]` |
| Indian mobile | 10-digit, optional +91 prefix | `+91-9876543210` -> `[REDACTED_PHONE]` |
| PAN card | AAAAA9999A | `ABCDE1234F` -> `[REDACTED_PAN]` |
| Aadhaar | 12 digits | `1234 5678 9012` -> `[REDACTED_AADHAAR]` |
| SSN | NNN-NN-NNNN | `123-45-6789` -> `[REDACTED_SSN]` |

Names and addresses are not detected by regex. For production, use `presidio-analyzer` + spaCy NER.

### Audit trail

Every pipeline step writes one row to `audit_log`. The `detail` column contains counts and categories only -- never raw PII values.

```sql
SELECT step_name, status, detail, resume_id, timestamp
FROM audit_log
ORDER BY timestamp DESC
LIMIT 5;
```

Steps recorded: `scan` | `redact` | `llm_call` | `score`

---

## 14. File Structure

```
ResumeScanner/
|-- docker-compose.yml           # One-command local deploy
|-- requirements.txt             # Root ML training dependencies
|-- .gitignore
|-- README.md                    # This file
|
+-- FullStackApp/
    |-- backend/
    |   |-- Dockerfile           # Python 3.11 + libmagic1
    |   |-- requirements.txt     # Backend pip dependencies
    |   |-- alembic.ini          # Alembic config
    |   |-- cli.py               # CLI: scan / redact / score
    |   |-- main.py              # uvicorn entrypoint
    |   |
    |   +-- alembic/
    |   |   +-- versions/        # All DB migration files
    |   |       |-- 97a323ec476e_add_phase2_tables.py
    |   |       |-- 46b39fab543a_advanced_models_multilingual_bias_.py
    |   |       |-- 7f0b2a1c4c9d_add_password_changed_at.py
    |   |       +-- a1b2c3d4e5f6_add_pii_redaction_fields_to_resumes.py
    |   |
    |   +-- app/
    |       |-- agents/
    |       |   +-- orchestrator.py      # THE ONLY AGENT -- LLM reasoning loop
    |       |-- tools/
    |       |   |-- security_scanner.py  # TOOL: magic-byte MIME validation
    |       |   |-- pii_redactor.py      # TOOL: regex PII detection + redaction
    |       |   +-- audit_logger.py      # TOOL: writes audit_log rows
    |       |-- models/
    |       |   |-- audit_log.py         # AuditLog SQLAlchemy model
    |       |   |-- resume.py            # Resume model (pii_redaction_count, pii_types_found)
    |       |   +-- ...
    |       |-- routes/
    |       |   |-- resume.py            # /upload-resume (orchestrator wired here)
    |       |   |-- analyze.py           # /analyze (PII redaction + badge data)
    |       |   |-- ai.py                # /extract-resume, /explain-match, /cover-letter
    |       |   |-- predict.py           # /predict (ML classification)
    |       |   +-- ...
    |       |-- schemas/
    |       |   +-- resume.py            # ResumeOut (includes pii fields)
    |       +-- mcp_server.py            # MCP server (4 tools, stdio transport)
    |
    +-- frontend/
        |-- Dockerfile
        |-- package.json
        +-- src/
            |-- components/
            |   |-- SecurityBadge.jsx    # Read-only scan/PII status badges
            |   +-- ...
            |-- hooks/
            |   +-- useMatch.js          # /analyze data + security field mappings
            +-- pages/
                |-- ResumeBuildPage.jsx  # Resume builder (badge after extraction)
                +-- CandidatePage.jsx    # Candidate analysis page (badge in results)
```

---

## 15. Known Limitations and Future Work

| Limitation | Current Approach | Future Improvement |
|---|---|---|
| PII detection scope | Regex: email, phone, PAN, Aadhaar, SSN | `presidio-analyzer` + spaCy NER for names/addresses |
| Audit log encryption | Plaintext Postgres columns | AES/Fernet encryption of the `detail` column |
| DOCX macro scanning | MIME type only | `oletools` for VBA macro detection |
| Malware scanning | Not implemented | ClamAV or AV engine |
| Name redaction | Not implemented | NER entity detection |
| LLM agent framework | ADK-equivalent tool-calling loop (manual) | Full Google ADK `AgentRunner` + `FunctionTool` |

These limitations are documented transparently rather than hidden.

---

## 16. Dataset Note

The `Dataset/` directory (~121 MB of raw training PDFs) is excluded from git. It is **not needed to run the app** -- the trained model artifacts (`model.pkl`, `tfidf.pkl`, `encoder.pkl`, `v5/`, `v6/`) are already committed and loaded at startup.

If you want to retrain the models:

1. Obtain a dataset of labeled resumes by job category
2. Place PDFs in `Dataset/<category>/` subdirectories
3. Run `python ResumeModel_v6.py` from the repo root

The app uses the pre-trained artifacts from `FullStackApp/model.pkl` and `FullStackApp/v6/`.
