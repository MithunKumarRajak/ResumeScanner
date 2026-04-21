"""
Analytics API — Step 10

GET  /analytics/skill-demand          — top skills across job postings
GET  /analytics/skill-supply          — top skills across resumes
GET  /analytics/match-distribution    — match score histogram
GET  /analytics/category-breakdown    — resume count per category
GET  /analytics/experience-distribution — experience level histogram
GET  /analytics/top-candidates        — global candidate leaderboard
"""
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session   import get_db
from app.models.user         import User
from app.schemas.analytics   import (
    SkillDemand,
    SkillSupply,
    MatchDistribution,
    CategoryBreakdown,
    ExperienceDistribution,
    TopCandidate,
)
from app.services            import analytics as analytics_svc
from app.utils.auth          import get_current_active_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/skill-demand", response_model=List[SkillDemand])
def skill_demand(
    db:      Session = Depends(get_db),
    top_n:   int     = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
):
    """
    Top skills by demand across all job postings.
    
    Returns each skill with:
    - **demand_count**: number of jobs requiring it
    - **percentage**: % of total jobs that require it
    """
    return analytics_svc.get_skill_demand(db, top_n)


@router.get("/skill-supply", response_model=List[SkillSupply])
def skill_supply(
    db:      Session = Depends(get_db),
    top_n:   int     = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
):
    """
    Top skills by supply across all resumes.
    
    Returns each skill with:
    - **supply_count**: number of resumes that have it
    - **percentage**: % of total resumes with this skill
    """
    return analytics_svc.get_skill_supply(db, top_n)


@router.get("/match-distribution", response_model=List[MatchDistribution])
def match_distribution(
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
):
    """
    Distribution of match scores in 10-point buckets.
    
    Useful for understanding the overall quality of matches
    and identifying score clustering patterns.
    """
    return analytics_svc.get_match_distribution(db)


@router.get("/category-breakdown", response_model=List[CategoryBreakdown])
def category_breakdown(
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
):
    """
    Resume count per predicted job category.
    
    Shows the distribution of candidate specialisations
    based on ML classification.
    """
    return analytics_svc.get_category_breakdown(db)


@router.get("/experience-distribution", response_model=List[ExperienceDistribution])
def experience_distribution(
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_active_user),
):
    """
    Distribution of candidate experience levels.
    Grouped into: 0-1, 2-3, 4-5, 6-10, 10+ years.
    """
    return analytics_svc.get_experience_distribution(db)


@router.get("/top-candidates", response_model=List[TopCandidate])
def top_candidates(
    db:      Session = Depends(get_db),
    limit:   int     = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
):
    """
    Global candidate leaderboard by average total score.
    
    Returns top candidates across all jobs with:
    - Average composite score
    - Number of job matches
    - Best individual match score
    """
    return analytics_svc.get_top_candidates(db, limit)
