"""
Composite resume scoring engine.

Combines multiple signals into a single 0–100 score:
  - Skill match:       40% weight
  - Experience fit:    30% weight
  - Education quality: 15% weight
  - Category match:    15% weight
"""
from typing import Dict, Any, List, Optional


# ── Weight configuration ──────────────────────────────────
WEIGHTS = {
    "skill":      0.40,
    "experience": 0.30,
    "education":  0.15,
    "category":   0.15,
}

# Education tier mapping (higher = better)
EDUCATION_TIERS = {
    "phd":       100,
    "ph.d":      100,
    "doctorate":  100,
    "master":     80,
    "m.sc":       80,
    "m.tech":     80,
    "msc":        80,
    "mtech":      80,
    "mba":        80,
    "bachelor":   60,
    "b.sc":       60,
    "b.tech":     60,
    "b.e.":       60,
    "bsc":        60,
    "btech":      60,
    "diploma":    40,
    "degree":     50,
}


def _compute_skill_score(
    matched_skills: List[str],
    required_skills: List[str],
) -> float:
    """
    Skill score = (matched / required) * 100.
    Returns 100 if no required skills specified (don't penalise).
    """
    if not required_skills:
        return 100.0
    if not matched_skills:
        return 0.0
    ratio = len(matched_skills) / len(required_skills)
    return min(ratio * 100, 100.0)


def _compute_experience_score(
    candidate_years: int,
    exp_min: int,
    exp_max: int,
) -> float:
    """
    100 if within range, decays proportionally outside.
    """
    if exp_min <= candidate_years <= exp_max:
        return 100.0

    if candidate_years < exp_min:
        # Under-experienced: partial credit
        if exp_min == 0:
            return 80.0
        ratio = candidate_years / exp_min
        return max(ratio * 100, 0.0)

    # Over-experienced: slight penalty (still valuable)
    if exp_max == 0:
        return 70.0
    overshoot = (candidate_years - exp_max) / max(exp_max, 1)
    return max(100 - (overshoot * 30), 40.0)


def _compute_education_score(education_text: Optional[str]) -> float:
    """
    Score based on highest education keyword found.
    Returns 30 (baseline) if nothing detected.
    """
    if not education_text:
        return 30.0

    lower = education_text.lower()
    best = 30.0
    for keyword, score in EDUCATION_TIERS.items():
        if keyword in lower:
            best = max(best, score)
    return best


def _compute_category_score(
    predicted_category: Optional[str],
    job_role_category: Optional[str],
) -> float:
    """
    100 if predicted category matches the job's role category.
    50 baseline if either is missing.
    0 if mismatch.
    """
    if not predicted_category or not job_role_category:
        return 50.0

    if predicted_category.lower().strip() == job_role_category.lower().strip():
        return 100.0

    # Partial match — check if one contains the other
    p = predicted_category.lower().strip()
    j = job_role_category.lower().strip()
    if p in j or j in p:
        return 70.0

    return 0.0


def compute_resume_score(
    matched_skills: List[str],
    required_skills: List[str],
    candidate_experience: int,
    exp_min: int,
    exp_max: int,
    education_text: Optional[str],
    predicted_category: Optional[str],
    job_role_category: Optional[str],
) -> Dict[str, Any]:
    """
    Compute a composite resume score.

    Returns:
        {
            skill_score:      float (0–100),
            experience_score: float (0–100),
            education_score:  float (0–100),
            category_score:   float (0–100),
            total_score:      float (0–100, weighted),
            breakdown: {
                skill_weight:      float,
                experience_weight: float,
                education_weight:  float,
                category_weight:   float,
            }
        }
    """
    skill_score = _compute_skill_score(matched_skills, required_skills)
    exp_score   = _compute_experience_score(candidate_experience, exp_min, exp_max)
    edu_score   = _compute_education_score(education_text)
    cat_score   = _compute_category_score(predicted_category, job_role_category)

    total = (
        skill_score * WEIGHTS["skill"]
        + exp_score * WEIGHTS["experience"]
        + edu_score * WEIGHTS["education"]
        + cat_score * WEIGHTS["category"]
    )

    return {
        "skill_score":      round(skill_score, 2),
        "experience_score": round(exp_score, 2),
        "education_score":  round(edu_score, 2),
        "category_score":   round(cat_score, 2),
        "total_score":      round(total, 2),
        "breakdown": {
            "skill_weight":      WEIGHTS["skill"],
            "experience_weight": WEIGHTS["experience"],
            "education_weight":  WEIGHTS["education"],
            "category_weight":   WEIGHTS["category"],
        },
    }
