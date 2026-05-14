from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
import uuid

from app.database.session import get_db
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.resume import Resume
from app.models.job import Job
from app.models.match import Match
from app.utils.auth import get_optional_current_user

from app.services.classifier import classify_resume
from app.services.skill_extractor import extract_skills, compute_skill_gaps
from app.services.ats_checker import ats_checker_service
from app.routes.ai import _get_gemini, _call_groq_api

router = APIRouter(tags=["Analysis"])

class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    resume_id: Optional[str] = None
    job_id: Optional[str] = None
    resume_text: Optional[str] = None
    job_description: Optional[str] = None
    model_version: Optional[str] = "ResumeModel_v6"

class SummarizeRequest(BaseModel):
    resume_text: str

@router.post("/analyze")
def unified_analyze(
    req: AnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_current_user)
):
    """Unified endpoint to analyze resume against a job description."""
    res_text = req.resume_text
    jd_text = req.job_description
    
    resume_obj = None
    job_obj = None

    if req.resume_id:
        resume_obj = db.query(Resume).filter(Resume.id == req.resume_id).first()
        if not resume_obj:
            raise HTTPException(status_code=404, detail="Resume not found")
        res_text = resume_obj.raw_text or res_text

    if req.job_id:
        job_obj = db.query(Job).filter(Job.id == req.job_id).first()
        if not job_obj:
            raise HTTPException(status_code=404, detail="Job not found")
        jd_text = job_obj.description or jd_text

    if not res_text:
        raise HTTPException(status_code=400, detail="Resume text is required")
    
    # 1. Classification & ML Guidance
    try:
        from app.routes.predict import predict_resume, ResumeInput
        prediction_output = predict_resume(ResumeInput(
            resume_text=res_text,
            job_description=jd_text,
            model_version=req.model_version
        ))
        pred_dict = prediction_output.model_dump()
        category = pred_dict.get("predicted_category", "Unknown")
        confidence = pred_dict.get("confidence", 0.0)
    except Exception as e:
        pred_dict = {}
        category = "Unknown"
        confidence = 0.0
        
    # 2. ATS Score
    ats_res = ats_checker_service.check(res_text)
    ats_score = ats_res.get("ats_score", 0)
    suggestions = [issue["suggestion"] for issue in ats_res.get("issues", [])]
    
    # 3. Skill Extraction & Gap Computation
    match_score = 0.0
    matched_skills = []
    missing_skills = []
    
    if jd_text:
        r_skills = extract_skills(res_text)
        j_skills = extract_skills(jd_text)
        gaps = compute_skill_gaps(r_skills, j_skills)
        match_score = gaps["match_pct"]
        matched_skills = gaps["matched"]
        missing_skills = gaps["missing"]
    else:
        # Just extract skills from resume
        matched_skills = extract_skills(res_text)
        
    # 4. Save results if IDs provided
    match_id = None
    if resume_obj and job_obj:
        existing_match = db.query(Match).filter(
            Match.resume_id == req.resume_id,
            Match.job_id == req.job_id
        ).first()
        
        if existing_match:
            existing_match.match_score = match_score
            existing_match.matched_skills = matched_skills
            existing_match.missing_skills = missing_skills
            match_id = existing_match.id
            db.commit()
        else:
            new_match = Match(
                resume_id=req.resume_id,
                job_id=req.job_id,
                match_score=match_score,
                matched_skills=matched_skills,
                missing_skills=missing_skills,
                total_score=match_score
            )
            db.add(new_match)
            db.commit()
            db.refresh(new_match)
            match_id = new_match.id
            
    response = {
        "analysis_id": match_id or str(uuid.uuid4()),
        "category": category,
        "confidence": confidence,
        "match_score": pred_dict.get("match_score") if pred_dict.get("match_score") is not None else match_score,
        "skill_match_score": match_score,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "ats_score": ats_score,
        "suggestions": suggestions
    }
    
    # Merge rich ML analytics (guidance, LLM fallback, etc.)
    for k, v in pred_dict.items():
        if k not in response and v is not None:
            response[k] = v

    return response

@router.post("/summarize")
def summarize_resume(req: SummarizeRequest):
    """Generate a quick summary of a resume."""
    prompt = f"Summarize the following resume in 3-4 concise professional sentences:\n\n{req.resume_text[:4000]}"
    text = "Summary unavailable."
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
        text = f"Summary generation failed: {str(e)}"
        
    return {"summary": text}
