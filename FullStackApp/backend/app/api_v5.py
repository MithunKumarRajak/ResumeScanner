"""
V5 API — Production endpoints with confidence routing and feature extraction.
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np
import scipy.sparse as sp
from pathlib import Path
import re

from app.preprocess import clean_text, spacy_preprocess

app = FastAPI()

ARTIFACT_DIR = Path(__file__).resolve().parents[1].parents[1] / 'v5'

MODEL = None
TFIDF = None
ENCODER = None
FEATURE_STATS = None
EMBEDDINGS = None
EMBEDDER_NAME = None
SKILLS = None
PIPELINE = None
PREPROCESS_FN = None
FEATURE_FN = None
FEATURE_NAMES = None


class TextPayload(BaseModel):
    resume_text: str


class MatchPayload(BaseModel):
    resume_text: str
    job_description: str


def extract_features(text: str) -> dict:
    """Extract numerical features from resume text."""
    features = {
        'years_exp': 0.0,
        'has_degree': 0.0,
        'has_masters': 0.0,
        'is_technical': 0.0,
        'is_management': 0.0,
        'is_sales': 0.0,
    }

    text_lower = text.lower()

    # Years of experience
    year_matches = re.findall(
        r'\b(\d{1,2})\+?\s+(?:years?|yrs?)\s+(?:of\s+)?(?:professional\s+|industry\s+|work\s+)?experience\b',
        text_lower,
    )
    if year_matches:
        features['years_exp'] = min(max(int(x) for x in year_matches) / 30.0, 1.0)

    # Education
    if any(kw in text_lower for kw in ['bachelor', 'b.s', 'b.sc', 'b.a']):
        features['has_degree'] = 1.0
    if any(kw in text_lower for kw in ['master', 'm.s', 'm.a', 'mba']):
        features['has_masters'] = 1.0

    # Role type
    technical_keywords = ['python', 'java', 'sql', 'aws', 'docker',
                          'kubernetes', 'api', 'database', 'developer', 'engineer']
    if sum(1 for kw in technical_keywords if kw in text_lower) >= 3:
        features['is_technical'] = 1.0

    if any(kw in text_lower for kw in ['manager', 'lead', 'director', 'head of', 'chief']):
        features['is_management'] = 1.0

    if any(kw in text_lower for kw in ['sales', 'business development', 'account executive']):
        features['is_sales'] = 1.0

    return features


@app.on_event('startup')
def load_artifacts():
    global MODEL, TFIDF, ENCODER, FEATURE_STATS, EMBEDDINGS, EMBEDDER_NAME, SKILLS
    global PIPELINE, PREPROCESS_FN, FEATURE_FN, FEATURE_NAMES
    base = ARTIFACT_DIR
    if not base.exists():
        base = Path.cwd() / 'FullStackApp' / 'v5'

    try:
        pipeline_path = base / 'pipeline.pkl'
        if pipeline_path.exists():
            import cloudpickle
            with open(pipeline_path, 'rb') as f:
                PIPELINE = cloudpickle.load(f)
            MODEL = PIPELINE['model']
            TFIDF = PIPELINE['tfidf']
            ENCODER = PIPELINE['encoder']
            PREPROCESS_FN = PIPELINE.get('preprocess_fn')
            FEATURE_FN = PIPELINE.get('feature_fn')
            FEATURE_NAMES = PIPELINE.get('feature_names')
        else:
            MODEL = joblib.load(base / 'model.pkl')
            TFIDF = joblib.load(base / 'tfidf.pkl')
            ENCODER = joblib.load(base / 'encoder.pkl')
        FEATURE_STATS = joblib.load(base / 'feature_stats.pkl')
    except Exception as e:
        raise RuntimeError(f'Failed loading V5 artifacts from {base}: {e}')

    if (base / 'resume_embeddings.npy').exists():
        EMBEDDINGS = np.load(base / 'resume_embeddings.npy')

    if (base / 'embedder.txt').exists():
        EMBEDDER_NAME = (base / 'embedder.txt').read_text().strip()

    if (base / 'skills.txt').exists():
        SKILLS = [s.strip() for s in (
            base / 'skills.txt').read_text().splitlines() if s.strip()]


def preprocess_for_v5(text: str) -> str:
    if callable(PREPROCESS_FN):
        return PREPROCESS_FN(text)
    return spacy_preprocess(clean_text(text))


def features_for_v5(text: str) -> dict:
    if callable(FEATURE_FN):
        return FEATURE_FN(text)
    return extract_features(text)


def feature_vector_for_v5(features: dict) -> np.ndarray:
    names = FEATURE_NAMES or list(features.keys())
    return np.array([[features[name] for name in names]], dtype=np.float32)


@app.post('/v5/predict-category')
def predict(payload: TextPayload):
    """Predict resume category with confidence and low-confidence routing."""
    if MODEL is None:
        raise HTTPException(status_code=500, detail='V5 model not loaded')

    # Preprocess
    text = preprocess_for_v5(payload.resume_text)

    # Extract features
    feats = features_for_v5(payload.resume_text)
    feats_vec = feature_vector_for_v5(feats)

    # Build combined feature vector
    X_tfidf = TFIDF.transform([text])
    expected_dim = int(getattr(MODEL, 'n_features_in_', X_tfidf.shape[1] + feats_vec.shape[1]))
    if expected_dim == X_tfidf.shape[1]:
        X_combined = X_tfidf
    else:
        X_combined = sp.hstack([X_tfidf, sp.csr_matrix(feats_vec)], format='csr')

    # Predict
    pred = MODEL.predict(X_combined)[0]
    probs = MODEL.predict_proba(X_combined)[0]

    cat = ENCODER.inverse_transform([pred])[0]
    confidence = float(probs.max())

    # Top 5
    top5_idx = np.argsort(probs)[::-1][:5]
    top5 = [
        {
            "category": ENCODER.inverse_transform([int(i)])[0],
            "score": float(probs[int(i)])
        }
        for i in top5_idx
    ]

    # Low confidence check
    low_confidence = confidence < 0.6
    needs_review = "yes" if low_confidence else "no"

    # Generate explanation
    explanation = []
    if feats['years_exp'] > 0:
        explanation.append(f"~{int(feats['years_exp'] * 30)} years experience")
    if feats['has_masters']:
        explanation.append("Master's degree")
    elif feats['has_degree']:
        explanation.append("Bachelor's degree")
    if feats['is_technical']:
        explanation.append("Technical background")
    if feats['is_management']:
        explanation.append("Management experience")

    return {
        "category": cat,
        "confidence": confidence,
        "needs_human_review": needs_review,
        "top5": top5,
        "features": feats,
        "explanation": ", ".join(explanation) if explanation else "Resume processed"
    }


@app.post('/v5/match')
def match(payload: MatchPayload):
    """Resume-to-job matching with overlap analysis."""
    from sklearn.metrics.pairwise import cosine_similarity

    r = preprocess_for_v5(payload.resume_text)
    j = preprocess_for_v5(payload.job_description)

    Xr = TFIDF.transform([r])
    Xj = TFIDF.transform([j])
    score = float(cosine_similarity(Xr, Xj)[0, 0])

    # Overlap analysis
    r_tokens = set(r.split())
    j_tokens = set(j.split())
    overlap = list(r_tokens & j_tokens)[:15]
    missing = list(j_tokens - r_tokens)[:10]

    confidence = "high" if score > 0.7 else "medium" if score > 0.5 else "low"

    return {
        "score": score,
        "confidence": confidence,
        "overlapping_skills": overlap,
        "missing_in_resume": missing[:5]  # Top 5 missing skills
    }


@app.post('/v5/extract-skills')
def extract(payload: TextPayload):
    """Extract and normalize skills with context."""
    text = payload.resume_text
    tokens = preprocess_for_v5(text).split()

    # Find skills in tokens
    found_skills = []
    if SKILLS:
        for s in SKILLS:
            if s in tokens:
                found_skills.append(s)

    # Remove duplicates, keep order
    found_skills = list(dict.fromkeys(found_skills))

    # Categorize skills
    technical_skills = [s for s in found_skills if s in ['python', 'java', 'sql',
                                                         'javascript', 'docker', 'aws', 'kubernetes', 'react', 'terraform', 'git']]
    tools_skills = [s for s in found_skills if s in [
        'excel', 'tableau', 'jira', 'confluence', 'slack']]
    other_skills = [
        s for s in found_skills if s not in technical_skills and s not in tools_skills]

    return {
        "all_skills": found_skills,
        "technical_skills": technical_skills,
        "tools": tools_skills,
        "other": other_skills,
        "skill_count": len(found_skills)
    }


@app.post('/v5/quality-score')
def quality(payload: TextPayload):
    """Resume quality scoring based on multiple signals."""
    text = payload.resume_text

    # Length check
    length_score = min(len(text) / 3000, 1.0)  # 3000 chars is ideal

    # Structure check (keywords)
    structure_keywords = ['experience', 'education',
                          'skills', 'summary', 'objective']
    structure_score = sum(
        1 for kw in structure_keywords if kw in text.lower()) / 5.0

    # Keywords check
    resume_keywords = ['python', 'aws', 'sql', 'project',
                       'managed', 'developed', 'designed', 'improved']
    keyword_score = min(
        sum(1 for kw in resume_keywords if kw in text.lower()) / 3.0, 1.0)

    # Professional email/phone presence
    has_contact = bool(re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)) or bool(
        re.search(r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}', text))
    contact_score = 1.0 if has_contact else 0.5

    # Overall
    overall_score = np.mean(
        [length_score, structure_score, keyword_score, contact_score])

    # Grade
    grade = "A" if overall_score > 0.8 else "B" if overall_score > 0.6 else "C" if overall_score > 0.4 else "D"

    return {
        "overall_score": float(overall_score),
        "grade": grade,
        "metrics": {
            "length": float(length_score),
            "structure": float(structure_score),
            "keywords": float(keyword_score),
            "contact_info": float(contact_score)
        },
        "recommendations": [
            "Add more specific project details" if length_score < 0.5 else None,
            "Include clear sections (Education, Experience, Skills)" if structure_score < 0.5 else None,
            "Add technical keywords and achievements" if keyword_score < 0.5 else None,
            "Include contact information (email, phone)" if not has_contact else None,
        ]
    }


@app.get('/v5/health')
def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "version": "v5",
        "model_loaded": MODEL is not None
    }
