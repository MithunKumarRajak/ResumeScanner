from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np
from pathlib import Path

from .preprocess import clean_text, spacy_preprocess

app = FastAPI()

ARTIFACT_DIR = Path(__file__).resolve().parents[1].parents[1] / 'v4'
# ARTIFACT_DIR -> FullStackApp/v4 (we expect train script to save there)

MODEL = None
TFIDF = None
ENCODER = None
EMBEDDINGS = None
EMBEDDER_NAME = None
SKILLS = None


class TextPayload(BaseModel):
    resume_text: str


class MatchPayload(BaseModel):
    resume_text: str
    job_description: str


@app.on_event('startup')
def load_artifacts():
    global MODEL, TFIDF, ENCODER, EMBEDDINGS, EMBEDDER_NAME, SKILLS
    base = ARTIFACT_DIR
    if not base.exists():
        # try repo root path
        base = Path.cwd() / 'FullStackApp' / 'v4'
    try:
        MODEL = joblib.load(base / 'model.pkl')
        TFIDF = joblib.load(base / 'tfidf.pkl')
        ENCODER = joblib.load(base / 'encoder.pkl')
    except Exception as e:
        raise RuntimeError(f'Failed loading artifacts from {base}: {e}')
    if (base / 'resume_embeddings.npy').exists():
        EMBEDDINGS = np.load(base / 'resume_embeddings.npy')
    if (base / 'embedder.txt').exists():
        EMBEDDER_NAME = (base / 'embedder.txt').read_text().strip()
    if (base / 'skills.txt').exists():
        SKILLS = [s.strip() for s in (
            base / 'skills.txt').read_text().splitlines() if s.strip()]


@app.post('/v4/predict-category')
def predict(payload: TextPayload):
    if MODEL is None or TFIDF is None or ENCODER is None:
        raise HTTPException(
            status_code=500, detail='Model artifacts not loaded')
    text = spacy_preprocess(clean_text(payload.resume_text))
    try:
        X = TFIDF.transform([text])
        pred = MODEL.predict(X)[0]
        probs = MODEL.predict_proba(X)[0]
    except Exception:
        # fallback: try using TF-IDF only
        X = TFIDF.transform([text])
        pred = MODEL.predict(X)[0]
        probs = MODEL.predict_proba(X)[0]
    cat = ENCODER.inverse_transform([pred])[0]
    top5_idx = np.argsort(probs)[::-1][:5]
    top5 = [{"category": ENCODER.inverse_transform(
        [int(i)])[0], "score": float(probs[int(i)])} for i in top5_idx]
    return {"category": cat, "confidence": float(probs.max()), "top5": top5}


@app.post('/v4/match')
def match(payload: MatchPayload):
    if EMBEDDINGS is None:
        # fallback to TF-IDF cosine similarity on the fly
        from sklearn.metrics.pairwise import cosine_similarity
        r = spacy_preprocess(clean_text(payload.resume_text))
        j = spacy_preprocess(clean_text(payload.job_description))
        Xr = TFIDF.transform([r])
        Xj = TFIDF.transform([j])
        score = float(cosine_similarity(Xr, Xj)[0, 0])
        overlap = list(set(r.split()) & set(j.split()))[:10]
        return {"score": score, "overlap": overlap}

    # If embeddings available, compute with sentence-transformers if installed
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(EMBEDDER_NAME)
        r_emb = model.encode(spacy_preprocess(clean_text(payload.resume_text)))
        j_emb = model.encode(spacy_preprocess(
            clean_text(payload.job_description)))
        score = float(np.dot(r_emb, j_emb) /
                      (np.linalg.norm(r_emb) * np.linalg.norm(j_emb)))
    except Exception:
        score = 0.0
    overlap = list(set(spacy_preprocess(clean_text(payload.resume_text)).split()) & set(
        spacy_preprocess(clean_text(payload.job_description)).split()))[:10]
    return {"score": score, "overlap": overlap}


@app.post('/v4/extract-skills')
def extract(payload: TextPayload):
    text = payload.resume_text
    tokens = spacy_preprocess(clean_text(text)).split()
    found = [s for s in SKILLS if s in tokens] if SKILLS is not None else []
    return {"skills": found}
