# Video Recording Guide — Winning Strategy (Low Effort)

> **Goal:** Record a 4:30–5:00 min YouTube video that checks every rubric box in one take.
> **Tools needed:** OBS Studio (free) + your existing terminal + browser.
> **Estimated prep time:** 20 minutes. Recording time: 1–2 takes.

---

## PHASE 1 — SETUP (Do this BEFORE pressing Record) — 15 mins

### Step 1: Install OBS Studio (5 min)
Download free from: https://obsproject.com/download
- During setup wizard: choose **"Recording only"** mode
- Set output to **MP4**, **1920×1080**, **30fps**
- Add a single **"Screen Capture"** source (full monitor)

> **Simpler alternative:** Use **Xbox Game Bar** (Win+G → Start Recording) — already on Windows. No install needed.

---

### Step 2: Prepare Your Screen Layout (5 min)

Open and arrange these **before** recording — switch between them during video:

| Window | What it is | Shortcut |
|---|---|---|
| **Terminal 1** | Ready to run CLI pipeline | Alt+Tab |
| **Terminal 2** | Ready to run docker-compose | Alt+Tab |
| **Browser Tab 1** | `http://localhost:5173` (frontend UI) | Alt+Tab |
| **Browser Tab 2** | `http://localhost:8000/docs` (Swagger) | Alt+Tab |
| **VS Code / File Explorer** | `Report/architecture_diagram.png` open | Alt+Tab |
| **Browser Tab 3** | Your GitHub repo page | Alt+Tab |

---

### Step 3: Start the App (5 min)

```powershell
# Run this once — leave it running during the video
cd c:\VsCodeFolder\Project\ResumeScanner
docker-compose up
```

Wait for:
```
backend  | INFO:     Application startup complete.
frontend | VITE v5.x.x  ready in Xms
```

Open http://localhost:5173 in browser — confirm it loads.

---

### Step 4: Pre-type Your Commands

Open **Notepad** or a second terminal with these ready to copy-paste:

```
# Command A — CLI pipeline demo
cd c:\VsCodeFolder\Project\ResumeScanner\FullStackApp\backend
python cli_agent.py run-pipeline ..\..\..\Dataset\sample_resume.pdf

# Command B — MCP Inspector
npx @modelcontextprotocol/inspector python -m app.mcp_server

# Command C — list skills
python cli_agent.py list-skills

# Command D — redact PII demo
python cli_agent.py run SkillRedactPII --text "Contact: john.doe@gmail.com | +91-9876543210 | PAN: ABCDE1234F"
```

> If you don't have a sample PDF, use any resume PDF — or use the test text commands above.

---

## PHASE 2 — WHAT TO SAY (Word-for-word script, 5 min)

### 🎬 Segment 1: Problem (0:00–0:45)

**Show:** Your face / blank screen / or just speak over terminal

**Say:**
> "Every day, recruiters upload candidate resumes directly into AI tools like ChatGPT or Gemini. These resumes contain names, emails, phone numbers, and in India — PAN cards and Aadhaar numbers.
>
> That data flows to third-party AI APIs — often without the candidate ever knowing.
>
> For enterprise HR teams, this is a GDPR and IT Act compliance liability.
>
> The second problem: resume screening is slow. A recruiter spending 6 minutes per resume across 100 candidates wastes 10 hours — much of it on resumes that clearly don't match the role.
>
> I built ResumeScanner to solve both problems at once: a privacy-first, multi-agent resume analysis system."

---

### 🎬 Segment 2: Why Agents? (0:45–1:15)

**Show:** Architecture diagram (`Report/architecture_diagram.png` — fullscreen it)

**Say:**
> "A simple function could run a regex and return a score. But agents add something a function can't: **contextual judgment**.
>
> When a resume is uploaded, my SecurityOrchestratorAgent — Agent 1 — needs to decide: Is this extracted text actually a real resume? Or is it garbled OCR from a scanned image? That decision requires reasoning.
>
> And Agent 2, the FeedbackAgent, interprets what an 87% confidence score actually *means* for this specific candidate's skills — and gives advice that changes with every resume.
>
> That's why agents. Not because it's trendy — but because these decisions genuinely require judgment."

---

### 🎬 Segment 3: Architecture (1:15–1:45)

**Show:** Keep architecture diagram on screen

**Say:**
> "The architecture has two agents and five tools.
>
> Agent 1 — the SecurityOrchestratorAgent — runs a hardcoded security pre-pipeline: magic-byte file validation, then PII redaction. These steps are unconditional — no LLM can skip them. That's a deliberate design choice.
>
> Then the LLM decides whether to call the score_resume tool — a local, offline ML classifier. No PII ever leaves the system to the model.
>
> Agent 2 — the FeedbackAgent — receives the score result and uses Gemini or Groq to generate structured skill gap analysis and ATS improvement advice.
>
> All five skills are exposed as MCP tools, and there's a full-stack React + FastAPI + PostgreSQL frontend."

---

### 🎬 Segment 4: Live Demo — CLI (1:45–2:45)

**Show:** Terminal — run Command D first, then Command A

**Action:** Type/paste Command D:
```
python cli_agent.py run SkillRedactPII --text "john.doe@gmail.com | +91-9876543210 | PAN: ABCDE1234F"
```

**Say:**
> "Let me show you the agent pipeline live. First — PII redaction. I run SkillRedactPII on a sample text with an email, phone, and PAN card."

*(Wait for output — it shows `[REDACTED_EMAIL]`, `[REDACTED_PHONE]`, `[REDACTED_PAN]`)*

> "Three items redacted. This is what gets sent to the LLM — the original is never transmitted."

**Action:** Run Command A (full pipeline):
```
python cli_agent.py run-pipeline <path-to-resume.pdf>
```

**Say:**
> "Now the full pipeline — scan, redact, score, feedback."

*(Point at output sections as they appear)*

> "File scan: passed. PII redacted. Category predicted: Data Science, 87% confidence. And there are the skill gaps and ATS improvements from Agent 2."

---

### 🎬 Segment 5: Web UI Demo (2:45–3:15)

**Show:** Switch to browser — `http://localhost:5173`

**Action:** Upload a resume PDF using the UI

**Say:**
> "The full-stack web app gives recruiters a clean interface. I upload a resume — the same pipeline runs in the background. You can see the SecurityBadge: scan status, PII redaction count, and the predicted category. No raw PII was ever sent to the LLM."

*(If upload takes time, keep narrating)*

> "The candidate analysis page also has job description matching, cover letter generation, and a resume builder — all protected by the same privacy layer."

---

### 🎬 Segment 6: MCP Server (3:15–3:45)

**Show:** Terminal — run Command B (MCP Inspector)

```
npx @modelcontextprotocol/inspector python -m app.mcp_server
```

**Say:**
> "The five agent skills are also exposed as an MCP server — the Model Context Protocol. Any MCP-aware client — Claude Desktop, Google ADK runners — can discover and call these tools.
>
> Here in the MCP Inspector you can see all five tools: scan_file, redact_pii, score_resume, generate_feedback, and log_audit. Each has a full input schema. I can call them interactively right here."

*(Click one tool in the inspector — show the schema)*

---

### 🎬 Segment 7: Deployability (3:45–4:10)

**Show:** Show docker-compose terminal that's already running, OR switch to a terminal and show `docker-compose ps`

```
docker-compose ps
```

**Say:**
> "The entire stack — PostgreSQL, FastAPI backend, and React frontend — deploys with a single command: `docker-compose up`. One command spins up all three services with health checks and named volumes for data persistence. No manual configuration needed."

*(Show the three containers running in the output)*

---

### 🎬 Segment 8: Antigravity + Wrap (4:10–5:00)

**Show:** Switch to VS Code or GitHub repo page

**Say:**
> "I built this project using **Antigravity** — Google's AI coding assistant — which was genuinely useful for designing the MCP server's JSON-RPC fallback loop, structuring the agent skill registry pattern, and drafting the security architecture documentation.
>
> Three things I learned building this:
>
> One: Never let an LLM control security controls. Hardcode them.
>
> Two: Build the fallback first. Gemini → Groq → deterministic fallback means the app works anywhere, without any API key.
>
> Three: Self-describing skill registries pay for themselves. The SKILL_REGISTRY drove the MCP tools, the CLI, and the test structure — all from one source of truth.
>
> The full code is on GitHub — link in the description. Docker setup takes one command. Thank you."

---

## PHASE 3 — RECORDING (1–2 takes, 5 min)

### Recording Checklist (do before pressing record)

```
[ ] OBS/Xbox Game Bar open and tested (record 10 seconds, play back)
[ ] docker-compose running — UI loads at localhost:5173
[ ] Terminal with commands pre-typed
[ ] architecture_diagram.png open fullscreen
[ ] Browser tabs ready: UI, Swagger, GitHub
[ ] Microphone tested (speak, check levels)
[ ] Notifications silenced (Win+A → Focus Assist ON)
[ ] Script visible on phone or second monitor (don't read it — glance at it)
```

---

### One-Take Strategy

1. **Don't aim for perfect.** Judges watch many videos. Authentic > polished.
2. **Speak confidently, not fast.** Slow is better than rushed.
3. **Keep the terminal output the star.** Real code running > slide decks.
4. **If you stumble** — pause 2 seconds and continue. Edit in the YouTube editor later (trim option).
5. **Worst case:** Record in segments, combine in the YouTube editor or any free tool (Clipchamp is built into Windows 11).

---

## PHASE 4 — UPLOAD TO YOUTUBE (5 min)

1. Go to https://studio.youtube.com → **Upload video**
2. Title: `ResumeScanner — AI Agents Capstone | Privacy-First Multi-Agent Resume Analysis`
3. Description: Paste this:
```
ResumeScanner — Kaggle AI Agents Capstone Project (Google-sponsored)

A privacy-first, multi-agent resume scanner built with Google Gemini, MCP, and a local ML classifier.

Features:
- 2 AI agents (SecurityOrchestratorAgent + FeedbackAgent)
- 5 agent skills (scan, redact, score, feedback, audit)
- MCP server (5 tools, stdio transport)
- PII redaction before every LLM call
- Magic-byte file validation
- Docker Compose one-command deploy

GitHub: https://github.com/MithunKumarRajak/ResumeScanner
Track: Agents for Business
```
4. Visibility: **Unlisted** (judges can access via link, but it won't appear publicly)
5. Click **Publish** → copy the URL
6. Paste the URL into `kaggle_writeup.md` (replace the placeholder)
7. Add URL to README.md top section

---

## PHASE 5 — SUBMIT ON KAGGLE (5 min)

1. Go to the hackathon Writeup page → click **New Writeup**
2. Paste content from `Report/kaggle_writeup.md`
3. Set title, subtitle, track
4. Upload `Report/cover_image.png` as cover
5. Attach YouTube video link to Media Gallery
6. Add GitHub URL as Public Project Link
7. Click **Submit** (not Save Draft)

---

## Summary — Total Time Budget

| Phase | Time |
|---|---|
| Setup + app start | 15 min |
| One recording take | 5 min |
| YouTube upload | 5 min |
| Kaggle writeup submit | 5 min |
| **Total** | **~30 minutes** |

> [!TIP]
> The most impactful 30 seconds of your video is the CLI demo (`python cli_agent.py run-pipeline resume.pdf`) showing real JSON output with scan + redact + score + feedback all flowing. Make sure that part is clean and readable on screen.
