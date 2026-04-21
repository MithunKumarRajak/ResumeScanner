"""
Resume–Job matching service using TF-IDF + cosine similarity.
Reuses the same TF-IDF vectorizer as the classifier for consistency.
"""
import numpy as np
from typing import Dict, Any, List, Set

from sklearn.metrics.pairwise import cosine_similarity as sklearn_cosine

from app.services.classifier import get_tfidf_vectorizer, preprocess_text


def _get_top_terms(vector, vectorizer, n: int = 10) -> List[str]:
    """Return top-N terms by TF-IDF score from a sparse vector."""
    feature_names = vectorizer.get_feature_names_out()
    scores        = vector.toarray().flatten()
    sorted_idx    = np.argsort(scores)[::-1][:n]
    return [feature_names[i] for i in sorted_idx if scores[i] > 0]


def _derive_skill_sets(
    resume_terms: List[str],
    jd_terms:     List[str],
    required_skills: List[str] = None,
) -> Dict[str, List[str]]:
    """
    Compute matching / missing skills.
    Priority: use required_skills from job record if provided;
    fallback to JD top TF-IDF terms.
    """
    resume_set = {t.lower() for t in resume_terms}

    if required_skills:
        jd_set = {s.lower() for s in required_skills}
    else:
        jd_set = {t.lower() for t in jd_terms}

    matching = sorted(resume_set & jd_set)
    missing  = sorted(jd_set  - resume_set)
    return {"matching": matching, "missing": missing}


def compute_match(
    resume_text:     str,
    job_text:        str,
    required_skills: List[str] = None,
) -> Dict[str, Any]:
    """
    Compute cosine similarity between resume and job description.

    Args:
        resume_text:     Full or preprocessed resume text.
        job_text:        Job description text.
        required_skills: Explicit required skills from the job record.

    Returns:
        {
            match_score:      float (0–100),
            matched_skills:   List[str],
            missing_skills:   List[str],
            resume_top_terms: List[str],
            jd_top_terms:     List[str],
        }
    """
    tfidf = get_tfidf_vectorizer()
    if tfidf is None:
        raise RuntimeError("TF-IDF vectorizer not loaded. Start the app first.")

    # Preprocess
    proc_resume = preprocess_text(resume_text)
    proc_jd     = preprocess_text(job_text)

    # Vectorise
    resume_vec = tfidf.transform([proc_resume])
    jd_vec     = tfidf.transform([proc_jd])

    # Cosine similarity → percentage
    sim_score  = float(sklearn_cosine(resume_vec, jd_vec)[0][0])
    match_score = round(sim_score * 100, 2)

    # Top terms
    resume_top_terms = _get_top_terms(resume_vec, tfidf, n=12)
    jd_top_terms     = _get_top_terms(jd_vec,     tfidf, n=12)

    # Skill sets
    skills = _derive_skill_sets(resume_top_terms, jd_top_terms, required_skills)

    return {
        "match_score":      match_score,
        "matched_skills":   skills["matching"],
        "missing_skills":   skills["missing"],
        "resume_top_terms": resume_top_terms,
        "jd_top_terms":     jd_top_terms,
    }


def rank_matches(matches: list) -> List[Dict[str, Any]]:
    """Sort a list of match dicts by match_score descending."""
    return sorted(matches, key=lambda m: m.get("match_score", 0), reverse=True)
