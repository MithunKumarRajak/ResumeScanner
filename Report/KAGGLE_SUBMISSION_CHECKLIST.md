# Kaggle AI Agents Capstone — Complete Submission Guide

> **Project:** ResumeScanner — Privacy-First Multi-Agent Resume Analysis
> **Track:** Agents for Business
> **GitHub:** https://github.com/MithunKumarRajak/ResumeScanner
> **Deadline:** Jul 7, 2026 at 12:29 PM GMT+5:30
> **Last Updated:** 2026-07-05

---

## CURRENT STATUS

| Requirement | Rule | Status |
|---|---|---|
| Kaggle Writeup (draft saved) | Required | ✅ Ready — `Report/kaggle_writeup.md` |
| Kaggle Writeup (submitted, not draft) | **MANDATORY** | ⏳ Need to click Submit |
| Title set | Required | ✅ See Section 2 |
| Subtitle set | Required | ✅ See Section 2 |
| Track selected | Required | ✅ Agents for Business |
| Word count ≤ 2,500 | Required | ✅ ~2,100 words |
| Cover image in Media Gallery | **MANDATORY** | ✅ `Report/cover_image.png` ready |
| YouTube video ≤ 5 min | **MANDATORY** | ❌ Not yet recorded — DO THIS FIRST |
| Video attached to Media Gallery | **MANDATORY** | ❌ Pending video |
| Public Project Link added | **MANDATORY** | ✅ GitHub URL ready |
| YouTube link in writeup | Strongly recommended | ❌ Add after recording |
| YouTube link in README | Strongly recommended | ❌ Add after recording |

---

## STEP 1 — Record the Video (do this before anything else)

> **Why first:** The video is the only remaining hard blocker. You cannot complete the Kaggle submission without it. Everything else is ready.

### What the video must contain (≤ 5 minutes)

| Timestamp | What to show | What to say | Rubric concept ticked |
|---|---|---|---|
| 0:00 – 0:45 | Blank screen or face | "Recruiters paste resumes into AI tools every day — exposing emails, phones, PAN cards to third-party APIs. This is a GDPR compliance risk. I built ResumeScanner to solve it." | Problem ✅ |
| 0:45 – 1:15 | `Report/architecture_diagram.png` fullscreen | "Why agents? Because a static function cannot decide if garbled OCR is worth scoring. And a template cannot interpret what 87% confidence means for this specific candidate. That contextual judgment is what agents are for." | Why Agents ✅ |
| 1:15 – 1:45 | Architecture diagram (keep on screen) | "Two agents. Agent 1: security gate + ML classifier. Agent 2: LLM feedback. Five skills. One MCP server. The security steps — scan and redact — are hardcoded. No LLM can skip them." | Architecture ✅ |
| 1:45 – 2:30 | Terminal: run PII redaction then full pipeline | Run: `python cli_agent.py run SkillRedactPII --text "john@gmail.com +91-9876543210 ABCDE1234F"` then `python cli_agent.py run-pipeline resume.pdf` | Demo + Agent Skills ✅ |
| 2:30 – 3:10 | Browser: `http://localhost:5173` | Upload a resume. Point at SecurityBadge — scan status, PII count, category. | Web UI demo ✅ |
| 3:10 – 3:45 | Terminal: MCP Inspector | Run: `npx @modelcontextprotocol/inspector python -m app.mcp_server`. Show 5 tools. | MCP Server ✅ |
| 3:45 – 4:10 | Terminal: `docker-compose ps` | "One command — `docker-compose up --build` — spins up all three services." | Deployability ✅ |
| 4:10 – 5:00 | VS Code or GitHub page | "I used **Antigravity**, Google's AI coding assistant, to design the MCP fallback loop and the skill registry pattern. Three lessons learned: never let LLMs control security controls, build fallbacks first, self-describing registries pay for themselves. GitHub link in the description." | Antigravity ✅ Wrap ✅ |

### Commands to have pre-typed before recording

```powershell
# Terminal 1 — start the app (do this before recording)
cd C:\VsCodeFolder\Project\ResumeScanner
docker-compose up

# Terminal 2 — CLI demos (run during recording)
cd C:\VsCodeFolder\Project\ResumeScanner\FullStackApp\backend

# PII redaction demo
python cli_agent.py run SkillRedactPII --text "john.doe@gmail.com | +91-9876543210 | PAN: ABCDE1234F"

# Full pipeline (use any real resume PDF)
python cli_agent.py run-pipeline <path-to-resume.pdf>

# MCP server
npx @modelcontextprotocol/inspector python -m app.mcp_server

# Show running containers
docker-compose ps
```

### Recording tools (choose one)
- **Xbox Game Bar** — Win + G → Start Recording. Zero install. Already on Windows.
- **OBS Studio** — https://obsproject.com/download. Choose "Recording only" mode.
- **Loom** — https://loom.com. Records + uploads in one step.

### YouTube upload
1. Go to https://studio.youtube.com → Upload video
2. **Title:** `ResumeScanner — Privacy-First Multi-Agent Resume Analysis | Kaggle AI Agents Capstone`
3. **Description:**
```
ResumeScanner — Kaggle AI Agents Capstone Project (Google-sponsored, Agents for Business track)

A privacy-first, multi-agent resume scanner that never sends raw PII to an external LLM.

Features demonstrated:
- 2 AI agents: SecurityOrchestratorAgent + FeedbackAgent
- 5 agent skills (scan, redact, score, feedback, audit log)
- MCP server — 5 tools over stdio transport
- PII redaction before every LLM call (email, phone, PAN, Aadhaar, SSN)
- Magic-byte file validation (catches renamed executables)
- Docker Compose one-command deploy
- Built with Antigravity (Google AI coding assistant)

GitHub: https://github.com/MithunKumarRajak/ResumeScanner
Track: Agents for Business
```
4. **Visibility:** Unlisted (judges can reach it via link — does not appear in public search)
5. Click **Publish** → copy the full URL

---

## STEP 2 — Add the YouTube URL to the writeup and README

### In `Report/kaggle_writeup.md`

Find this line (near the top):
```
**Video:** [YouTube link — replace this before submitting]
```
Replace with:
```
**Video:** https://youtu.be/YOUR_VIDEO_ID
```

Also find the line near the bottom:
```
**Video:** [YouTube link — replace this before submitting]
```
Replace with the same URL.

### In `README.md`

Add a Demo badge/link to the top section (after the four existing badges):
```markdown
[![Demo Video](https://img.shields.io/badge/Demo-YouTube-red?logo=youtube)](https://youtu.be/YOUR_VIDEO_ID)
```

### Commit and push
```powershell
cd C:\VsCodeFolder\Project\ResumeScanner
git add Report/kaggle_writeup.md README.md
git commit -m "docs: add YouTube video link to writeup and README"
git push origin main
```

---

## STEP 3 — Create and Submit the Kaggle Writeup

### 3a. Create the Writeup

1. Go to the hackathon page on Kaggle
2. Click **"New Writeup"** button
3. You will see a form with: Title, Subtitle, Content (rich text editor), Track selector, Media Gallery

### 3b. Fill in the Writeup form

**Title** (copy exactly):
```
ResumeScanner: Privacy-First Multi-Agent Resume Analysis
```

**Subtitle** (copy exactly):
```
A two-agent system that scans, redacts, classifies, and gives actionable feedback on resumes — without ever sending a candidate's raw personal data to an external LLM.
```

**Track:** Select **Agents for Business**

**Content:** Copy the entire contents of `Report/kaggle_writeup.md` and paste into the editor.

> The writeup is ~2,100 words — comfortably under the 2,500-word limit. Do not add extra content that would push it over.

### 3c. Attach the Cover Image

1. In the Media Gallery section of the Writeup form, click **Add Image**
2. Upload `Report/cover_image.png` from your local machine
3. Set it as the **cover image** (Kaggle requires a cover image to submit)

### 3d. Attach the YouTube Video

1. In the Media Gallery section, click **Add Video** (or there may be a YouTube URL field)
2. Paste the full YouTube URL: `https://youtu.be/YOUR_VIDEO_ID`
3. Confirm it shows a preview

### 3e. Add the Public Project Link

1. Find the **"Public Project Link"** field in the Writeup form
2. Enter: `https://github.com/MithunKumarRajak/ResumeScanner`
3. This satisfies the "publicly accessible, no login required" requirement

### 3f. Save as Draft first — then Submit

1. Click **Save** (creates a draft)
2. Review the preview — check title, subtitle, track, cover image, video, GitHub link all appear
3. **Click "Submit"** in the top-right corner

> **CRITICAL:** Clicking Save creates a draft. Drafts are NOT counted by judges. You MUST click the separate "Submit" button. The submission deadline is Jul 7, 2026 at 12:29 PM GMT+5:30.

---

## STEP 4 — Verify the Submission

After clicking Submit, verify:

1. The Writeup page shows **"Submitted"** status (not "Draft")
2. Your submission appears under "My Submissions" on the hackathon page
3. The cover image, video, and GitHub link are all visible in the public view
4. The track shows "Agents for Business"

---

## Pre-Submit Final Checklist

```
[ ] Video recorded (≤5 min, screen recording with CLI + UI + MCP + Docker + Antigravity)
[ ] Video published to YouTube (Unlisted is fine)
[ ] YouTube link added to Report/kaggle_writeup.md (both placeholder lines replaced)
[ ] YouTube link added to README.md (badge or link in top section)
[ ] Changes committed and pushed to GitHub
[ ] Kaggle Writeup created (NOT just saved as draft)
[ ] Title: "ResumeScanner: Privacy-First Multi-Agent Resume Analysis"
[ ] Subtitle: "A two-agent system..." (see Section 3b)
[ ] Track selected: Agents for Business
[ ] Cover image attached: Report/cover_image.png
[ ] YouTube video attached to Media Gallery
[ ] GitHub URL added as Public Project Link: https://github.com/MithunKumarRajak/ResumeScanner
[ ] Word count verified: ≤ 2,500 words
[ ] "Submit" button clicked (not just Save)
[ ] Submission shows "Submitted" status on Kaggle
[ ] Deadline not passed: Jul 7, 2026 12:29 PM GMT+5:30
```

---

## What Is Already Ready (No Action Needed)

| Item | File / Location |
|---|---|
| Writeup text (~2,100 words) | `Report/kaggle_writeup.md` |
| Cover image | `Report/cover_image.png` |
| Architecture diagram | `Report/architecture_diagram.png` |
| Demo notebook | `notebooks/kaggle_demo.ipynb` |
| GitHub repo (public) | https://github.com/MithunKumarRajak/ResumeScanner |
| README (16 sections, setup + API + troubleshooting) | `README.md` |
| All code (agents, MCP, skills, tests) | `FullStackApp/backend/app/` |
| Docker Compose deploy | `docker-compose.yml` |
| 21 passing tests | `FullStackApp/backend/tests/test_tools.py` |

---

## Rubric Coverage Confirmation

| Criterion | Max pts | Evidence | Status |
|---|---|---|---|
| Core Concept & Value | 10 | Privacy-first multi-agent HR tool, specific business problem | ✅ |
| YouTube Video | 10 | Script above covers all 8 sub-criteria in one take | ❌ Record it |
| Writeup | 10 | `kaggle_writeup.md` — problem, solution, architecture, journey | ✅ |
| Technical Implementation | 50 | 2 agents, 5 skills, MCP, security, CLI, fallbacks, 21 tests | ✅ |
| Documentation | 20 | README 16 sections + inline docstrings + known limitations | ✅ |
| **Total** | **100** | **81–88 projected (with video)** | ❌ Video only |

---

## Key Concept Coverage

| Concept | Where demonstrated | Status |
|---|---|---|
| Agent / Multi-agent (ADK) | `orchestrator.py` + `feedback_agent.py` | ✅ Code |
| MCP Server | `app/mcp_server.py` — 5 tools, SDK + fallback | ✅ Code |
| Antigravity | Video — say "I used Antigravity to design the MCP fallback loop" | ❌ Video needed |
| Security features | `security_scanner.py` + `pii_redactor.py` + audit trail | ✅ Code |
| Deployability | `docker-compose.yml` — show `docker-compose ps` in video | ❌ Video needed |
| Agent skills (CLI) | `cli_agent.py` + `agent_skills.py` | ✅ Code |

**5 of 6 confirmed in code. All 6 confirmed once the video is recorded.**

---

> **The only thing standing between this project and a top score is a 5-minute screen recording.**
> Everything else — code, docs, writeup, cover image, GitHub link — is ready to submit.
