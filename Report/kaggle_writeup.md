# Kaggle Writeup — ResumeScanner: AI-Powered Resume Analysis with Privacy-First Multi-Agent Architecture

**Track:** Agents for Business  
**Subtitle:** A multi-agent resume scanner that classifies candidates, generates structured feedback, and enforces PII privacy — without ever sending raw personal data to an LLM.

**GitHub:** https://github.com/MithunKumarRajak/ResumeScanner  
**Demo Notebook:** [notebooks/kaggle_demo.ipynb](../notebooks/kaggle_demo.ipynb)  
**Video:** [YouTube link — TO BE ADDED before submitting]  
**Track:** Agents for Business

---

## The Problem: Recruiters Are Leaking Candidate PII to LLMs

Every day, recruiters upload resumes to AI-powered tools. They paste a candidate's PDF into ChatGPT, Gemini, or a custom API. The resume contains the candidate's email, phone number, PAN card (in India), Aadhaar, and sometimes a home address. This data flows directly to third-party AI services — often without the candidate's knowledge or consent.

For enterprise HR teams, this is not just a privacy concern. It is a compliance risk (GDPR, IT Act 2000), an audit liability, and a trust problem. If an applicant tracking system is processing 500 resumes a day and each one exposes PII to an external API, the cumulative risk is enormous.

The second problem is consistency. Resume screening is cognitively expensive. A recruiter spending 6 minutes per resume on 100 candidates wastes 10 hours — much of it on candidates whose resumes clearly do not match the role. An automated pre-screening layer that gives a structured category prediction, skill gap analysis, and actionable improvement feedback can reclaim that time.

These are the two problems this project sets out to solve.

---

## Why Agents? Why Not Just a Pipeline Function?

A simple function could scan a file and run a regex. A simple function could call an ML model and return a category. But a simple function cannot do this:

> "Given this resume text, decide whether it is actually scoreable, determine which model version will give the most accurate result, and synthesize the ML prediction with the PII redaction summary into a structured recruiter report."

That decision requires **contextual judgment**. The LLM needs to reason about whether the extracted text looks like a real resume or a corrupted extraction, whether the confidence score is meaningful given the redaction summary, and what the score actually means for this particular candidate. This is where agents add genuine value.

In this project, agents are not a buzzword. They are the mechanism by which the system adapts to the specific content of each document — something a hardcoded pipeline cannot do.

---

## Solution: ResumeScanner — Multi-Agent Resume Analysis

ResumeScanner is a full-stack application with a React frontend, FastAPI backend, PostgreSQL database, and a two-agent orchestration layer. Recruiters upload a PDF or DOCX resume, and the system:

1. **Validates** the file's true type using magic bytes (catches renamed malware)
2. **Redacts** PII (email, phone, PAN, Aadhaar, SSN) before any text touches an LLM
3. **Classifies** the resume using a local, offline ML model (no PII risk)
4. **Reasons** about the result using LLM agent logic
5. **Generates** structured feedback: skill gaps, improvement priorities, ATS score estimates
6. **Logs** every step to an immutable audit trail in PostgreSQL

The app also provides job description generation, cover letter writing, resume extraction, and a side-by-side candidate comparison view.

---

## Architecture: Two Agents, Five Skills, One MCP Server

### Agent 1: SecurityOrchestratorAgent

The first agent (`orchestrator.py`) is the security gate and ML classifier. Its architecture deliberately separates two concerns:

**Layer 1 — Deterministic pre-pipeline (no LLM, hardcoded order):**
- `SkillScanFile`: Validates true MIME type from file bytes using libmagic. An `.exe` renamed to `.pdf` is caught here and rejected immediately (HTTP 400).
- `SkillRedactPII`: Applies regex patterns to strip email, Indian phone numbers, PAN card, Aadhaar, and SSN before any text leaves the system.

These two steps are unconditional. No LLM call can skip or reorder them. This is a deliberate security design choice — the "LLM decides" pattern should never apply to security controls.

**Layer 2 — Agent reasoning (LLM-driven):**
After redaction, the agent sends the redacted text to Gemini (or Groq as a fallback) with a structured prompt asking it to assess: Is this resume actually scoreable? Is the text a real resume or a corrupted extraction? The LLM then decides whether to call the `score_resume` tool.

This is the agentic part — the LLM makes a judgment that a hardcoded function cannot.

### Agent 2: FeedbackAgent

The second agent (`feedback_agent.py`) receives the ML score result from Agent 1 and uses LLM reasoning to produce structured, actionable feedback. It identifies the top skill gaps between the resume and the predicted job category, prioritizes improvements by estimated ATS impact, and writes a one-line recruiter summary.

The two agents are loosely coupled — Agent 1 hands off a `score_result` dict and a `redacted_text` string. Agent 2 does not know or care how they were produced.

### Agent Skills Registry (ADK Pattern)

All capabilities are registered in `agent_skills.py` as self-describing `Skill` objects — the ADK `FunctionTool` equivalent. Each skill has a name, description, input/output schema, handler, category, and example. The CLI agent can discover and invoke any skill without knowing its internal implementation.

Five registered skills:
- `SkillScanFile` (Security)
- `SkillRedactPII` (Security)
- `SkillScoreResume` (Analysis)
- `SkillGenerateFeedback` (Analysis)
- `SkillLogAudit` (Audit)

### MCP Server

`mcp_server.py` exposes all 5 skills as MCP tools over stdio transport, using the official MCP Python SDK with a fallback JSON-RPC loop for environments where the SDK is not installed. Any MCP-aware client (Claude Desktop, MCP Inspector, ADK runners) can discover and call these tools.

```bash
# Start MCP server
python -m app.mcp_server

# Use MCP Inspector
npx @modelcontextprotocol/inspector python -m app.mcp_server
```

### Agent Skills CLI

`cli_agent.py` provides a command-line interface to the full multi-agent system without a web server. It demonstrates every skill individually and runs the complete 2-agent pipeline end-to-end:

```bash
python cli_agent.py list-skills
python cli_agent.py run SkillRedactPII --text "Contact: john@example.com"
python cli_agent.py run-pipeline resume.pdf --jd job_desc.txt
python cli_agent.py architecture
```

---

## Course Concepts Applied

### 1. Agent / Multi-agent system (ADK)

Two coordinated agents with distinct roles. Agent 1 handles security and classification. Agent 2 handles feedback and recruiter insight. Both use the ADK tool-calling pattern: define tools with schemas, have the LLM reason about which tool to call, execute the tool, feed the result back, synthesize a final response.

### 2. MCP Server

`mcp_server.py` implements the full MCP protocol (stdio transport) with both the official SDK and a manual JSON-RPC fallback. Five tools are exposed with complete `inputSchema` definitions compatible with the MCP spec.

### 3. Security Features

Four security layers working together:
- Magic-byte file validation (not extension-based)
- Regex PII redaction before every LLM call
- Immutable audit trail in PostgreSQL (counts/categories only — no raw PII ever in the log)
- Redaction scope policy documented in every relevant file

### 4. Agent Skills (Agents CLI)

The `SKILL_REGISTRY` in `agent_skills.py` is the central registry for all agent capabilities. The `cli_agent.py` exposes every skill as a CLI command. Skills are self-describing, discoverable, and testable without a web server.

### 5. Deployability

One-command Docker Compose deployment:
```bash
docker-compose up --build
```
Spins up PostgreSQL 15, FastAPI backend, and React frontend. Includes health checks, named volumes for data persistence, and live-reload for development.

### 6. Antigravity

Antigravity (the Google AI coding assistant) was used during development to design the MCP server fallback loop, draft the agent prompts, and structure the skill registry pattern. A demonstration of Antigravity in action is shown in the video submission.

---

## Security Architecture: The Privacy Contract

The most important design decision in this project is the **redaction boundary**:

| Data | Where | Redacted? |
|---|---|---|
| Outbound LLM payload (Gemini/Groq) | External API | YES — always |
| Audit log detail column | PostgreSQL | Counts only — never raw PII |
| resumes.raw_text | PostgreSQL | NO — recruiters need it |
| Frontend UI | Browser | NO — recruiters need real contact info |
| Local ML model (score_resume) | Local, offline | NO — no privacy risk |

This boundary is enforced in code, not just policy. The `orchestrator.py` module docstring contains the single source of truth for the redaction scope, and every call site documents which text it is passing.

---

## Technical Implementation Notes

**ML Model:** The classifier is a TF-IDF vectorizer + ensemble classifier trained on a labeled dataset of resumes by job category (v6 is the production model). It runs fully offline with no external API calls. Model artifacts are pre-committed and loaded at startup.

**Fallback chain:** Every LLM call follows the same pattern: try Gemini → try Groq → use deterministic fallback. The app works completely without API keys — the ML scorer, security scanner, and PII redactor are all local.

**Audit trail:** Every pipeline step (scan, redact, llm_call, score, feedback) writes one row to `audit_log`. The `detail` column contains only counts and categories — never raw PII values. This is enforced by convention and documented at every call site.

**Multi-version ML:** The backend supports multiple model versions (v3, v5, v6) and the agent can select the version dynamically. The Agents CLI's `SkillScoreResume` accepts an optional `model_version` parameter.

**Tests:** A test suite (`tests/test_tools.py`) covers all three deterministic tools with 20 test cases including edge cases (empty input, renamed file, multiple PII types).

---

## Demo Walkthrough

1. A recruiter uploads `candidate_resume.pdf` via the React frontend
2. The backend's `SecurityOrchestratorAgent` runs in a background task:
   - `SkillScanFile` detects `application/pdf` (PASS)
   - `SkillRedactPII` finds 2 items (email, phone) — strips them
   - LLM reasoning: "This looks like a real Data Science resume — call score_resume"
   - `SkillScoreResume`: `predicted_category=Data Science, confidence=0.87`
3. `FeedbackAgent` runs with the redacted text + score:
   - Returns 3 skill gaps, 3 prioritized improvements, ATS summary
4. The React UI shows a `SecurityBadge` with PII redaction count, scan status, category, and feedback
5. The audit log in PostgreSQL has 4 rows: `scan/passed`, `redact/passed`, `llm_call/passed`, `score/passed`

The CLI version of the same pipeline:
```bash
python cli_agent.py run-pipeline resume.pdf
```

---

## What I Learned

Building this project reinforced three insights about agent design:

**1. Agents should not control security controls.** The temptation to let the LLM decide the order of the security pipeline is real — but it is wrong. Hardcode the controls. Let the agent do what agents are actually good at: contextual judgment.

**2. Fallbacks are not an afterthought.** The Gemini → Groq → deterministic fallback chain made the app resilient enough to demo anywhere, without API keys, without internet access. Build the fallback first.

**3. Self-describing skills pay for themselves.** The time spent building the `SKILL_REGISTRY` was recovered immediately — it drove the MCP tool definitions, the CLI discovery, and the test structure. Don't hardcode tool lists; build a registry.

---

## Conclusion

ResumeScanner demonstrates that AI agents can solve real business problems — not just as a demonstration of capability, but as a production-minded implementation with security controls, privacy guarantees, deployable infrastructure, and a documented audit trail.

The multi-agent architecture is not decorative. The two agents have distinct roles, communicate through a clean interface, and together accomplish something neither could do alone: safe, private, contextually-aware resume analysis at scale.

**Links:**
- GitHub: https://github.com/MithunKumarRajak/ResumeScanner
- Demo Notebook: `notebooks/kaggle_demo.ipynb` (runnable end-to-end pipeline demo)
- Video: [YouTube link — TO BE ADDED before submitting]
- Cover Image: `Report/cover_image.png` (attach to Media Gallery)
- Track: Agents for Business
