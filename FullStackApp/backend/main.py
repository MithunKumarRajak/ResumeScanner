from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from sklearn.metrics.pairwise import cosine_similarity
import joblib
import spacy
import numpy as np
import re
import os

# Initialize FastAPI app
app = FastAPI(title="Resume Screener", version="2.0")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000",
                   "http://localhost:5173", "http://127.0.0.1:5173",
                   "http://localhost:5174", "http://127.0.0.1:5174"
                   
                   ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Multi-model support ──────────────────────────────────────────────────────
# Each model version stores its own (model, tfidf, label_encoder) tuple
loaded_models = {}   # { "v2": {...}, "v3": {...} }
nlp = None

# Model metadata for the /models endpoint
MODEL_REGISTRY = {
    "ResumeModel_v2": {
        "dir": "..",          # relative to backend/
        "description": "Base model — KNN + OneVsRest (TF-IDF 5K features)",
        "algorithm": "OneVsRestClassifier(KNeighborsClassifier)",
        "badge": "Active",
    },
    "ResumeModel_v3": {
        "dir": os.path.join("..", "v3"),
        "description": "Enhanced — Linear SVM + balanced classes (TF-IDF 10K features)",
        "algorithm": "OneVsRestClassifier(CalibratedClassifierCV(SGDClassifier))",
        "badge": "New",
    },
}


def _load_single_model(version_id: str, model_dir: str):
    """Load a single model's artifacts from the given directory."""
    base = os.path.dirname(__file__)
    artifacts = {}
    try:
        model_path   = os.path.join(base, model_dir, "model.pkl")
        tfidf_path   = os.path.join(base, model_dir, "tfidf.pkl")
        encoder_path = os.path.join(base, model_dir, "encoder.pkl")

        artifacts["model"]         = joblib.load(model_path)
        artifacts["tfidf"]         = joblib.load(tfidf_path)
        artifacts["label_encoder"] = joblib.load(encoder_path)

        print(f"  ✓ {version_id} loaded from {model_dir}")
        return artifacts
    except FileNotFoundError as e:
        print(f"  ⚠ {version_id} NOT loaded ({e})")
        return None
    except Exception as e:
        print(f"  ⚠ {version_id} error: {e}")
        return None


@app.on_event("startup")
def load_models():
    """Load all registered model versions on app startup."""
    global nlp

    # Load spaCy (shared across all models)
    nlp = spacy.load("en_core_web_sm")
    print("spaCy model loaded")

    # Load each registered model version
    for version_id, meta in MODEL_REGISTRY.items():
        arts = _load_single_model(version_id, meta["dir"])
        if arts is not None:
            loaded_models[version_id] = arts

    if not loaded_models:
        print("ERROR: No model versions could be loaded!")
    else:
        print(f"Loaded model versions: {list(loaded_models.keys())}")


def _resolve_model(version_id: Optional[str] = None):
    """
    Return the (model, tfidf, label_encoder) dict for the requested version.
    Falls back to ResumeModel_v2 when version_id is None or unavailable.
    """
    if version_id and version_id in loaded_models:
        return loaded_models[version_id]
    # fallback
    for fallback in ("ResumeModel_v2", "ResumeModel_v3"):
        if fallback in loaded_models:
            return loaded_models[fallback]
    return None


# Request/Response models
class ResumeInput(BaseModel):
    resume_text: str
    job_description: Optional[str] = None
    model_version: Optional[str] = None   # e.g. "ResumeModel_v2" or "ResumeModel_v3"


class PredictionOutput(BaseModel):
    predicted_category: str
    confidence: float
    match_score: Optional[float] = None
    resume_top_terms: Optional[List[str]] = None
    jd_top_terms: Optional[List[str]] = None


# Helper functions
def clean_text(text: str) -> str:
    """Clean resume text using regex"""
    text = re.sub(r'http\S+|www\S+|https\S+', ' ', text, flags=re.MULTILINE)
    text = re.sub(r'\bRT\b|\bcc\b', ' ', text)
    text = re.sub(r'#\S+', ' ', text)
    text = re.sub(r'@\S+', ' ', text)
    text = re.sub(r'<.*?>', ' ', text)
    text = re.sub(r'[^a-zA-Z\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def preprocess_text(text: str) -> str:
    """Preprocess text with spaCy lemmatization and stopword removal"""
    cleaned = clean_text(text)
    doc = nlp(cleaned.lower())
    tokens = [token.lemma_ for token in doc if not token.is_stop]
    return " ".join(tokens)


def get_top_tfidf_terms(tfidf_vector, vectorizer, n: int = 10) -> list:
    """Extract the top N TF-IDF terms from a vectorized document"""
    feature_names = vectorizer.get_feature_names_out()
    scores = tfidf_vector.toarray().flatten()
    sorted_indices = np.argsort(scores)[::-1][:n]
    return [feature_names[i] for i in sorted_indices if scores[i] > 0]


# API Endpoints
@app.get("/")
def read_root():
    """Health check endpoint"""
    return {
        "message": "Resume Classification API",
        "status": "running",
        "loaded_models": list(loaded_models.keys()),
        "endpoints": {
            "predict": "POST /predict",
            "models": "GET /models",
            "categories": "GET /categories",
            "docs": "/docs"
        }
    }


@app.get("/models")
def get_models():
    """Return metadata about all registered model versions."""
    result = []
    for version_id, meta in MODEL_REGISTRY.items():
        entry = {
            "id": version_id,
            "description": meta["description"],
            "algorithm": meta["algorithm"],
            "badge": meta["badge"],
            "available": version_id in loaded_models,
        }
        if version_id in loaded_models:
            entry["categories"] = len(loaded_models[version_id]["label_encoder"].classes_)
        result.append(entry)
    return {"models": result}


@app.post("/predict", response_model=PredictionOutput)
def predict_resume(input_data: ResumeInput):
    """
    Predict the job category from resume text

    Args:
        input_data: JSON with 'resume_text' field

    Returns:
        Predicted category and confidence score
    """

    # Resolve the requested model version
    resolved = _resolve_model(input_data.model_version)
    if resolved is None or nlp is None:
        raise HTTPException(
            status_code=500,
            detail="No model versions loaded. Please check backend logs.")

    model         = resolved["model"]
    tfidf         = resolved["tfidf"]
    label_encoder = resolved["label_encoder"]

    if not input_data.resume_text or len(input_data.resume_text.strip()) == 0:
        raise HTTPException(
            status_code=400, detail="Resume text cannot be empty")

    try:
        # Preprocess the input text
        processed_text = preprocess_text(input_data.resume_text)

        # Vectorize using TF-IDF
        text_vectorized = tfidf.transform([processed_text])

        # Make prediction
        prediction = model.predict(text_vectorized)
        prediction_proba = model.predict_proba(text_vectorized)

        # Get the predicted category
        predicted_category = label_encoder.inverse_transform(prediction)[0]

        # Get confidence (max probability across all classifiers)
        confidence = float(max(prediction_proba[0]))

        # --- TF-IDF + Cosine Similarity matching ---
        match_score = None
        resume_top_terms = None
        jd_top_terms = None

        if input_data.job_description and len(input_data.job_description.strip()) > 0:
            # Preprocess the job description through the same pipeline
            processed_jd = preprocess_text(input_data.job_description)
            jd_vectorized = tfidf.transform([processed_jd])

            # Compute cosine similarity
            similarity = cosine_similarity(text_vectorized, jd_vectorized)[0][0]
            match_score = round(float(similarity) * 100, 2)

            # Extract top terms from each document
            resume_top_terms = get_top_tfidf_terms(text_vectorized, tfidf, n=10)
            jd_top_terms = get_top_tfidf_terms(jd_vectorized, tfidf, n=10)

        return PredictionOutput(
            predicted_category=predicted_category,
            confidence=round(confidence, 4),
            match_score=match_score,
            resume_top_terms=resume_top_terms,
            jd_top_terms=jd_top_terms
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Prediction error: {str(e)}")


@app.get("/categories")
def get_categories(model_version: Optional[str] = None):
    """Get all available job categories for the specified model version."""
    resolved = _resolve_model(model_version)
    if resolved is not None:
        categories = resolved["label_encoder"].classes_.tolist()
        return {"categories": sorted(categories), "model_version": model_version or "default"}
    return {"categories": []}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
