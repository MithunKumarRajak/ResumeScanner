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

# Import PII redaction tool — used before sending any resume text to external LLMs.
# Redaction applies ONLY to outbound LLM payloads. It is NOT applied to:
#   - The raw_text stored in the resumes DB table (recruiters need real contact info).
#   - The frontend UI (candidates' real names/emails shown to recruiters).
# This boundary is enforced here at the call sites.
from app.tools.pii_redactor import redact_pii as _redact_pii
from app.tools.audit_logger import log_step as _log_step, build_redact_detail as _build_redact_detail

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from pydantic import BaseModel
from app.models import User
from app.utils.auth import get_current_active_user, get_optional_current_user

router = APIRouter(tags=["AI"])


#  Request schemas ─

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

class CoverLetterRequest(BaseModel):
    resume_text: str
    job_description: str
    tone: str = "Professional & Confident"


#  Gemini AI Client ─

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


#  Endpoints ─

@router.post("/ai/generate-jd")
def ai_generate_jd(req: JDGenerateRequest, current_user: User = Depends(get_current_active_user)):
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
def ai_refine_jd(req: JDRefineRequest, current_user: User = Depends(get_current_active_user)):
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


#  Resume Extraction Endpoint (PyMuPDF) ─

@router.post("/extract-resume")
async def extract_resume(file: UploadFile = File(...), current_user: User = Depends(get_optional_current_user)):
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

    # PII redaction happens here — before any text leaves the system to a third-party LLM.
    # `text` (original) is returned to the frontend and stored in DB so recruiters keep
    # real contact info. Only `text_for_llm` (redacted) goes to Gemini/Groq.
    _redact_result = _redact_pii(text)
    text_for_llm = _redact_result["redacted_text"]
    # Audit: log the redact step for this endpoint.
    try:
        from app.database.session import SessionLocal as _SessionLocal
        _audit_db = _SessionLocal()
        try:
            _log_step(
                db_session=_audit_db,
                step_name="redact",
                status="passed",
                detail=_build_redact_detail(_redact_result),
                resume_id=None,
            )
        finally:
            _audit_db.close()
    except Exception as _exc:
        import logging as _log
        _log.getLogger(__name__).warning("[ai/extract-resume] audit log failed: %s", _exc)

    #  Structured field extraction via Gemini (V7 Upgrade)
    prompt = f"""You are an expert HR parser. Extract the following information from the resume text below.
Respond ONLY with a valid JSON object matching this schema:
{{
  "name": "Full Name",
  "email": "Email Address",
  "phone": "Phone Number",
  "linkedin": "LinkedIn URL",
  "github": "Github URL",
  "education": "Highest Degree",
  "experience": <integer years of experience>,
  "skills": ["Skill 1", "Skill 2"],
  "role": "Inferred Job Title",
  "summary": "Short 2 sentence professional summary",
  "projects": "List of notable projects",
  "certifications": "List of certifications"
}}

Resume Text:
{text_for_llm}
"""
    parsed_json = None
    try:
        model = _get_gemini()
        if model is not None:
            res = model.generate_content(prompt)
            parsed_json = json.loads(_clean_ai_json(res.text))
    except Exception as e:
        print(f"[WARN] Gemini extraction failed: {e}")

    if not parsed_json:
        groq_text = _call_groq_api(prompt)
        if groq_text:
            try:
                parsed_json = json.loads(_clean_ai_json(groq_text))
            except Exception:
                pass
                
    if not parsed_json:
        # Fallback to basic empty if AI fails completely
        parsed_json = {
            "name": "Unknown", "email": "", "phone": "", "linkedin": "", "github": "",
            "education": "", "experience": 0, "skills": [], "role": "",
            "summary": "", "projects": "", "certifications": ""
        }

    return {
        "raw_text": text,  # Original text (real PII preserved for recruiter use)
        "parsed": parsed_json,
        "pii_redaction_count": _redact_result["redaction_count"],
        "pii_types_found": _redact_result["types_found"],
    }

# Remove legacy regex block

class ExplainMatchRequest(BaseModel):
    resume_text: str
    job_description: str
    match_score: float

@router.post("/ai/explain-match")
def explain_match(req: ExplainMatchRequest, current_user: User = Depends(get_current_active_user)):
    """Generate a conversational explanation of why a candidate matches the JD."""
    # PII redaction happens here — before any text leaves the system to a third-party LLM.
    _redact_for_explain = _redact_pii(req.resume_text)
    _resume_text_for_llm = _redact_for_explain["redacted_text"]
    # Audit: log the redact step for explain-match.
    try:
        from app.database.session import SessionLocal as _SessionLocal
        _audit_db = _SessionLocal()
        try:
            _log_step(
                db_session=_audit_db,
                step_name="redact",
                status="passed",
                detail=_build_redact_detail(_redact_for_explain),
                resume_id=None,
            )
        finally:
            _audit_db.close()
    except Exception as _exc:
        import logging as _log
        _log.getLogger(__name__).warning("[ai/explain-match] audit log failed: %s", _exc)

    prompt = f"""You are an expert technical recruiter. You just scored a candidate's resume an {req.match_score}% match against a job description.
Write a 3-4 sentence professional summary explaining EXACTLY why they are or aren't a good fit. Focus on specific skills overlapping or missing.
Tone: Professional, direct, encouraging.

Resume:
{_resume_text_for_llm[:2000]}

Job Description:
{req.job_description[:2000]}
"""
    
    text = "AI Explanation unavailable."
    try:
        model = _get_gemini()
        if model:
            res = model.generate_content(prompt)
            text = res.text.strip()
        else:
            groq_text = _call_groq_api(prompt)
            if groq_text:
                text = groq_text.strip()
    except Exception as e:
        text = f"Explanation generation failed: {str(e)}"
        
    return {"explanation": text}


@router.post("/ai/generate-cover-letter")
def generate_cover_letter(req: CoverLetterRequest, current_user: User = Depends(get_current_active_user)):
    """Generate a highly tailored cover letter based on resume and JD."""
    # PII redaction happens here — before any text leaves the system to a third-party LLM.
    _redact_for_cover = _redact_pii(req.resume_text)
    _resume_for_cover_llm = _redact_for_cover["redacted_text"]
    # Audit: log the redact step for cover letter generation.
    try:
        from app.database.session import SessionLocal as _SessionLocal
        _audit_db = _SessionLocal()
        try:
            _log_step(
                db_session=_audit_db,
                step_name="redact",
                status="passed",
                detail=_build_redact_detail(_redact_for_cover),
                resume_id=None,
            )
        finally:
            _audit_db.close()
    except Exception as _exc:
        import logging as _log
        _log.getLogger(__name__).warning("[ai/cover-letter] audit log failed: %s", _exc)

    prompt = f"""You are an expert career coach and professional copywriter. 
Write a compelling, concise cover letter for the following candidate applying for the following job.
Keep it under 300 words. Highlight the overlapping skills and experiences that make the candidate a great fit.
Tone: {req.tone}. Do NOT include placeholder brackets like [Your Name] if the information is missing from the resume, just write it smoothly or invent a generic sign-off.
Respond with ONLY the text of the cover letter.

Candidate Resume:
{_resume_for_cover_llm[:3000]}

Job Description:
{req.job_description[:3000]}
"""
    text = None
    try:
        model = _get_gemini()
        if model is not None:
            response = model.generate_content(prompt)
            text = response.text.strip()
    except Exception as e:
        print(f"[WARN] Gemini cover letter generation failed: {e}")

    if not text:
        groq_text = _call_groq_api(prompt)
        if groq_text:
            text = groq_text.strip()

    if not text:
        raise HTTPException(
            status_code=503,
            detail="Failed to generate cover letter. Please check your API keys."
        )

    return {"cover_letter": text}

