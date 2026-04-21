"""
Analytics service — SQL-based aggregation queries for the dashboard.
"""
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, case, desc

from app.models.resume import Resume
from app.models.job    import Job
from app.models.match  import Match
from app.models.skill  import Skill, ResumeSkill, JobSkill


def get_platform_summary(db: Session) -> Dict[str, Any]:
    """
    High-level platform statistics.
    """
    total_resumes = db.query(func.count(Resume.id)).scalar() or 0
    total_jobs    = db.query(func.count(Job.id)).scalar() or 0
    active_jobs   = db.query(func.count(Job.id)).filter(Job.is_active == True).scalar() or 0
    total_matches = db.query(func.count(Match.id)).scalar() or 0
    avg_score     = db.query(func.avg(Match.match_score)).scalar()
    avg_total     = db.query(func.avg(Match.total_score)).scalar()

    return {
        "total_resumes":     total_resumes,
        "total_jobs":        total_jobs,
        "active_jobs":       active_jobs,
        "total_matches":     total_matches,
        "avg_match_score":   round(float(avg_score), 2) if avg_score else 0.0,
        "avg_total_score":   round(float(avg_total), 2) if avg_total else 0.0,
    }


def get_skill_demand(db: Session, top_n: int = 20) -> List[Dict[str, Any]]:
    """
    Top skills by demand across all job postings.
    Returns skill name, demand count, and percentage.
    """
    total_jobs = db.query(func.count(Job.id)).scalar() or 1

    rows = (
        db.query(
            Skill.name,
            func.count(JobSkill.id).label("demand_count"),
        )
        .join(JobSkill, JobSkill.skill_id == Skill.id)
        .group_by(Skill.name)
        .order_by(desc("demand_count"))
        .limit(top_n)
        .all()
    )

    return [
        {
            "skill":      r.name,
            "demand_count": r.demand_count,
            "percentage":   round((r.demand_count / total_jobs) * 100, 1),
        }
        for r in rows
    ]


def get_skill_supply(db: Session, top_n: int = 20) -> List[Dict[str, Any]]:
    """
    Top skills by supply across all resumes.
    """
    total_resumes = db.query(func.count(Resume.id)).scalar() or 1

    rows = (
        db.query(
            Skill.name,
            func.count(ResumeSkill.id).label("supply_count"),
        )
        .join(ResumeSkill, ResumeSkill.skill_id == Skill.id)
        .group_by(Skill.name)
        .order_by(desc("supply_count"))
        .limit(top_n)
        .all()
    )

    return [
        {
            "skill":        r.name,
            "supply_count": r.supply_count,
            "percentage":   round((r.supply_count / total_resumes) * 100, 1),
        }
        for r in rows
    ]


def get_match_distribution(db: Session) -> List[Dict[str, Any]]:
    """
    Histogram of match scores in 10-point buckets.
    Returns: [{range: "0-10", count: 5}, ...]
    """
    buckets = []
    for low in range(0, 100, 10):
        high = low + 10
        count = (
            db.query(func.count(Match.id))
            .filter(Match.match_score >= low, Match.match_score < high)
            .scalar()
        ) or 0
        buckets.append({
            "range":   f"{low}-{high}",
            "low":     low,
            "high":    high,
            "count":   count,
        })

    # Count 100 separately
    perfect = (
        db.query(func.count(Match.id))
        .filter(Match.match_score == 100)
        .scalar()
    ) or 0
    if perfect > 0:
        buckets[-1]["count"] += perfect  # merge into 90-100 bucket

    return buckets


def get_category_breakdown(db: Session) -> List[Dict[str, Any]]:
    """
    Resume count per predicted category.
    """
    rows = (
        db.query(
            Resume.predicted_category,
            func.count(Resume.id).label("count"),
        )
        .filter(Resume.predicted_category != None)
        .group_by(Resume.predicted_category)
        .order_by(desc("count"))
        .all()
    )

    return [
        {"category": r.predicted_category, "count": r.count}
        for r in rows
    ]


def get_experience_distribution(db: Session) -> List[Dict[str, Any]]:
    """
    Distribution of candidate experience levels.
    """
    ranges = [
        ("0-1 years", 0, 1),
        ("2-3 years", 2, 3),
        ("4-5 years", 4, 5),
        ("6-10 years", 6, 10),
        ("10+ years", 10, 100),
    ]
    result = []
    for label, low, high in ranges:
        count = (
            db.query(func.count(Resume.id))
            .filter(Resume.experience_years >= low, Resume.experience_years <= high)
            .scalar()
        ) or 0
        result.append({"range": label, "count": count})
    return result


def get_top_candidates(db: Session, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Global top candidates by average total_score across all matches.
    """
    rows = (
        db.query(
            Match.resume_id,
            func.avg(Match.total_score).label("avg_score"),
            func.count(Match.id).label("match_count"),
            func.max(Match.match_score).label("best_match"),
        )
        .group_by(Match.resume_id)
        .order_by(desc("avg_score"))
        .limit(limit)
        .all()
    )

    result = []
    for r in rows:
        resume = db.query(Resume).filter(Resume.id == r.resume_id).first()
        result.append({
            "resume_id":          r.resume_id,
            "candidate_name":     resume.parsed_name if resume else "Unknown",
            "predicted_category": resume.predicted_category if resume else None,
            "experience_years":   resume.experience_years if resume else 0,
            "avg_score":          round(float(r.avg_score or 0), 2),
            "match_count":        r.match_count,
            "best_match_score":   round(float(r.best_match or 0), 2),
        })
    return result
