"""
AI generation routes — JD generation & refinement, resume extraction.

Endpoints:
  POST /ai/generate-jd   — generate a job description via Gemini / Groq
  POST /ai/refine-jd     — refine an existing JD
  POST /extract-resume   — extract structured data from PDF / DOCX
"""
import json
import os
import re
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

router = APIRouter(tags=["AI"])


# ── Request schemas ───────

class JDGenerateRequest(BaseModel):
    job_title: str
    department: str = "Engineering"
    experience_level: str = "Senior (5-8 yrs)"
    work_mode: str = "Hybrid"
    raw_notes: str = ""
    tone: str = "Professional & Direct"
    focus_area: str = "Technical Depth"


class JDRefineRequest(BaseModel):
    current_jd: dict      # the generated JD object
    instruction: str      # user's refinement instruction


# ── Gemini AI Client ─────

_gemini_model = None

def _get_gemini():
    global _gemini_model
    if _gemini_model is not None:
        return _gemini_model
    from dotenv import load_dotenv
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        _gemini_model = genai.GenerativeModel("gemini-2.0-flash")
        return _gemini_model
    except Exception as e:
        print(f"[WARN] Gemini init failed: {e}")
        return None


def _call_groq_api(prompt: str) -> Optional[str]:
    import requests as _requests
    from dotenv import load_dotenv
    load_dotenv()
    api_key = os.getenv("Groq_api_key", "").strip()
    if not api_key:
        return None
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    data = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
    }
    try:
        response = _requests.post(url, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"[WARN] Groq API call failed: {e}")
        return None


def _clean_ai_json(text: str) -> str:
    """Strip markdown code fences from AI responses."""
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
    if text.endswith("```"):
        text = text[:-3].strip()
    if text.startswith("json"):
        text = text[4:].strip()
    return text


# ── Endpoints ─────────────

@router.post("/ai/generate-jd")
def ai_generate_jd(req: JDGenerateRequest):
    """Generate a job description using Gemini or Groq AI."""
    prompt = f"""You are an expert HR recruiter and job description writer.
Generate a compelling, detailed job description based on these parameters:

- Job Title: {req.job_title}
- Department: {req.department}
- Experience Level: {req.experience_level}
- Work Mode: {req.work_mode}
- Tone: {req.tone}
- Focus Area: {req.focus_area}
{f'- Additional Notes/Requirements: {req.raw_notes}' if req.raw_notes.strip() else ''}

Respond ONLY with a valid JSON object (no markdown, no code blocks, no extra text) in this exact format:
{{
  "title": "the job title",
  "meta": "Department . Work Mode . Experience Level",
  "about": "A compelling 3-4 sentence paragraph about the role and its impact",
  "tasks": ["4-6 specific responsibilities as separate strings"],
  "requirements": ["4-6 requirements/qualifications as separate strings"]
}}

Make the description specific, engaging, and optimized for attracting top talent.
Use the specified tone throughout. Focus on the specified focus area.
"""

    text = None
    try:
        model = _get_gemini()
        if model is not None:
            response = model.generate_content(prompt)
            text = response.text.strip()
    except Exception as e:
        print(f"[WARN] Gemini generation failed: {e}")

    if text is None:
        text = _call_groq_api(prompt)

    if text is None:
        raise HTTPException(
            status_code=503,
            detail="Both Gemini and Groq APIs failed or are not configured. Please check your API keys.",
        )

    try:
        text = _clean_ai_json(text)
        result = json.loads(text)
        for key in ("title", "about", "tasks", "requirements"):
            if key not in result:
                raise ValueError(f"Missing field: {key}")
        return result
    except json.JSONDecodeError:
        try:
            json_match = re.search(r"\{[\s\S]*\}", text)
            if json_match:
                return json.loads(json_match.group())
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="AI returned invalid format. Please try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation error: {str(e)}")


@router.post("/ai/refine-jd")
def ai_refine_jd(req: JDRefineRequest):
    """Refine an existing job description using Gemini or Groq AI."""
    current_json = json.dumps(req.current_jd, indent=2)
    prompt = f"""You are an expert HR recruiter. Here is a current job description as JSON:

{current_json}

The user wants to refine it with this instruction:
"{req.instruction}"

Apply the user's requested changes to the job description.
Respond ONLY with the complete updated JSON object (no markdown, no code blocks, no extra text).
Keep the same JSON structure with fields: title, meta, about, tasks (array), requirements (array).
"""

    text = None
    try:
        model = _get_gemini()
        if model is not None:
            response = model.generate_content(prompt)
            text = response.text.strip()
    except Exception as e:
        print(f"[WARN] Gemini refinement failed: {e}")

    if text is None:
        text = _call_groq_api(prompt)

    if text is None:
        raise HTTPException(
            status_code=503,
            detail="Both Gemini and Groq APIs failed or are not configured. Please check your API keys.",
        )

    try:
        text = _clean_ai_json(text)
        return json.loads(text)
    except json.JSONDecodeError:
        try:
            json_match = re.search(r"\{[\s\S]*\}", text)
            if json_match:
                return json.loads(json_match.group())
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="AI returned invalid format. Please try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI refinement error: {str(e)}")


# ── Resume Extraction Endpoint (PyMuPDF) ─────────────────────────────────────

@router.post("/extract-resume")
async def extract_resume(file: UploadFile = File(...)):
    """Extract structured resume data from PDF or DOCX using PyMuPDF."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ("pdf", "docx"):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")

    content = await file.read()
    text = ""

    try:
        if ext == "pdf":
            import fitz  # PyMuPDF
            doc = fitz.open(stream=content, filetype="pdf")
            for page in doc:
                text += page.get_text("text") + "\n"
            doc.close()
        else:
            import docx
            import io
            doc = docx.Document(io.BytesIO(content))
            text = "\n".join(p.text for p in doc.paragraphs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File parsing error: {str(e)}")

    text = text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Could not extract text from this file")

    # ── Structured field extraction ──
    lower = text.lower()

    # Name – first short line that looks like a person's name
    name = ""
    for line in text.split("\n")[:12]:
        line = line.strip()
        words = line.split()
        if 2 <= len(words) <= 5 and len(line) <= 50 and re.match(r"^[A-Za-z ,.'-]+$", line):
            skip_words = [
                "summary", "objective", "education", "experience", "skills",
                "projects", "certifications", "phone", "email", "linkedin",
                "github", "portfolio", "resume", "cv",
            ]
            if not any(sw in line.lower() for sw in skip_words):
                name = line
                break

    # Contact info
    email_m = re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", text)
    email = email_m.group(0) if email_m else ""
    phone_m = re.search(r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", text)
    phone = phone_m.group(0).strip() if phone_m else ""
    linkedin_m = re.search(r"linkedin\.com/in/[\w-]+", text, re.I)
    linkedin = f"https://{linkedin_m.group(0)}" if linkedin_m else ""
    github_m = re.search(r"github\.com/[\w-]+", text, re.I)
    github = f"https://{github_m.group(0)}" if github_m else ""

    # Education
    edu_m = re.search(
        r"((?:B\.?\s?Tech|B\.?S\.?c?|B\.?E|M\.?\s?Tech|M\.?S\.?c?|M\.?CA|MBA|"
        r"Bachelor'?s?|Master'?s?|Ph\.?D|Diploma)\b[^\n]{0,120})",
        text, re.I,
    )
    education = edu_m.group(1).strip()[:150] if edu_m else ""

    # Experience years
    exp_m = re.search(r"(\d+)\s*\+?\s*years?", lower)
    experience = min(int(exp_m.group(1)), 20) if exp_m else 0

    # Skills
    skill_keywords = [
        "python", "javascript", "typescript", "react", "node", "angular", "vue",
        "java", "sql", "mysql", "postgresql", "mongodb", "aws", "azure", "docker",
        "kubernetes", "git", "linux", "machine learning", "deep learning",
        "tensorflow", "pytorch", "flask", "django", "fastapi", "c++", "c#",
        "html", "css", "rest api", "rest", "api", "figma", "kotlin", "swift",
        "go", "rust", "redis", "graphql", "next.js", "express",
    ]
    matched_skills = []
    for kw in skill_keywords:
        pattern = re.compile(r"(?:^|[\s,;|/])" + re.escape(kw) + r"(?:$|[\s,;|/])", re.I)
        if pattern.search(lower):
            matched_skills.append(kw)

    # Role
    role_keywords = [
        "software engineer", "full stack", "frontend", "backend", "java developer",
        "python developer", "web developer", "mobile developer", "data scientist",
        "data analyst", "machine learning", "devops", "qa engineer", "product manager",
        "project manager", "business analyst", "ui ux designer",
    ]
    role = ""
    for line in text.split("\n")[:15]:
        if len(line.strip()) < 80:
            for rk in role_keywords:
                if rk in line.lower():
                    role = line.strip()
                    break
        if role:
            break

    # Summary
    summary_m = re.search(
        r"(?:SUMMARY|OBJECTIVE|ABOUT\s*ME|PROFILE)\s*[:\s\n]+([\s\S]+?)"
        r"(?=\s*(?:SKILLS?|EDUCATION|EXPERIENCE|PROJECTS?|CERTIF|TECHNI|LANGUAGES?\b))",
        text, re.I,
    )
    summary = re.sub(r"\s+", " ", summary_m.group(1)).strip()[:500] if summary_m else ""

    # Projects
    proj_m = re.search(
        r"(?:PROJECTS?)\s*[:\s\n]+([\s\S]+?)"
        r"(?=\s*(?:EDUCATION|CERTIF|SKILLS?|ACHIEVEMENTS?\b|$))",
        text, re.I,
    )
    projects = proj_m.group(1).strip()[:800] if proj_m else ""

    # Certifications
    cert_m = re.search(
        r"(?:CERTIFICATIONS?|CERTIFICATES?)\s*[:\s\n]+([\s\S]+?)"
        r"(?=\s*(?:PROJECTS?|EDUCATION|SKILLS?|ACHIEVEMENTS?\b|$))",
        text, re.I,
    )
    certifications = cert_m.group(1).strip()[:500] if cert_m else ""

    return {
        "raw_text": text,
        "parsed": {
            "name": name,
            "email": email,
            "phone": phone,
            "linkedin": linkedin,
            "github": github,
            "education": education,
            "experience": experience,
            "skills": matched_skills,
            "role": role,
            "summary": summary,
            "projects": projects,
            "certifications": certifications,
        },
    }
