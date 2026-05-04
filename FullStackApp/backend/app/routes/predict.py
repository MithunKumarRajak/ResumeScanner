"""
ML prediction routes — wraps the legacy /predict and /models endpoints.

Endpoints:
  POST /predict   — classify resume, optionally match against JD
  GET  /models    — list available model versions
"""
import re
import hashlib
import logging
from typing import Optional, List

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ML Prediction"])


# ── Request / Response ─────────────

class ResumeInput(BaseModel):
    resume_text: str
    job_description: Optional[str] = None
    model_version: Optional[str] = None


class PredictionOutput(BaseModel):
    predicted_category: str
    confidence: float
    model_version: Optional[str] = None
    match_score: Optional[float] = None
    resume_top_terms: Optional[List[str]] = None
    jd_top_terms: Optional[List[str]] = None


# ── Multi-model support (same as original main.py) ──

import joblib
import spacy
import os
from pathlib import Path

loaded_models = {}     # { "ResumeModel_v2": {...}, ... }
loaded_embedders = {}
nlp = None


class _FallbackEmbedder:
    """Lightweight local embedding fallback when sentence-transformers is unavailable."""

    def __init__(self, dimension: int = 384):
        self.dimension = dimension

    def encode(self, texts, convert_to_numpy=True, show_progress_bar=False):
        vectors = []
        for text in texts:
            vector = np.zeros(self.dimension, dtype=np.float32)
            tokens = re.findall(r"[a-z0-9]+", str(text).lower())
            for token in tokens:
                digest = hashlib.sha256(token.encode("utf-8")).digest()
                index = int.from_bytes(digest[:4], "little") % self.dimension
                weight = 1.0 + (digest[4] / 255.0)
                vector[index] += weight

            norm = float(np.linalg.norm(vector))
            if norm > 0:
                vector /= norm
            vectors.append(vector)

        return np.vstack(vectors) if convert_to_numpy else vectors


MODEL_REGISTRY = {
    "ResumeModel_v2": {
        "dir": "..",
        "description": "KNN + OneVsRest (TF-IDF 5K features)",
        "algorithm": "OneVsRestClassifier(KNeighborsClassifier)",
        "badge": "Base Model",
        "model_type": "classic_tfidf",
    },
    "ResumeModel_v3": {
        "dir": os.path.join("..", "v3"),
        "description": "Linear SVM + balanced classes (TF-IDF 10K features)",
        "algorithm": "OneVsRestClassifier(CalibratedClassifierCV(SGDClassifier))",
        "badge": "Updated Model",
        "model_type": "classic_tfidf",
    },
    "ResumeModel_v5": {
        "dir": os.path.join("..", "v5"),
        "description": "Adaptive hybrid model with semantic and feature support",
        "algorithm": "OneVsRestClassifier(CalibratedClassifierCV(SGDClassifier))",
        "badge": "Latest Model",
        "model_type": "hybrid_adaptive",
    },
}


def _load_single_model(version_id: str, model_dir: str):
    """Load a single model's artifacts from the given directory."""
    base = Path(__file__).resolve().parent.parent.parent   # backend/
    artifacts = {}
    try:
        model_root = (base / model_dir).resolve()
        model_path = model_root / "model.pkl"
        tfidf_path = model_root / "tfidf.pkl"
        encoder_path = model_root / "encoder.pkl"

        artifacts["model"] = joblib.load(model_path)
        artifacts["tfidf"] = joblib.load(tfidf_path)
        artifacts["label_encoder"] = joblib.load(encoder_path)
        artifacts["model_type"] = MODEL_REGISTRY[version_id].get("model_type", "classic_tfidf")
        artifacts["model_dir"] = model_root
        artifacts["id"] = version_id

        embedder_file = model_root / "embedder.txt"
        if embedder_file.exists():
            artifacts["embedder_name"] = embedder_file.read_text(encoding="utf-8").strip()

        artifacts["input_features"] = int(
            getattr(artifacts["model"], "n_features_in_", 0) or 0
        )

        logger.info(f"  [OK] {version_id} loaded from {model_dir}")
        return artifacts
    except FileNotFoundError as e:
        logger.warning(f"  [WARN] {version_id} NOT loaded ({e})")
        return None
    except Exception as e:
        logger.warning(f"  [WARN] {version_id} error: {e}")
        return None


def load_predict_models():
    """Called during startup to load multi-model prediction artifacts."""
    global nlp
    nlp = spacy.load("en_core_web_sm")
    logger.info("spaCy model loaded for prediction routes")

    for version_id, meta in MODEL_REGISTRY.items():
        arts = _load_single_model(version_id, meta["dir"])
        if arts is not None:
            loaded_models[version_id] = arts

    if not loaded_models:
        logger.error("ERROR: No model versions could be loaded!")
    else:
        logger.info(f"Loaded model versions: {list(loaded_models.keys())}")


def _resolve_model(version_id: Optional[str] = None):
    if version_id and version_id in loaded_models:
        return loaded_models[version_id]
    for fallback in ("ResumeModel_v2", "ResumeModel_v3", "ResumeModel_v5"):
        if fallback in loaded_models:
            return loaded_models[fallback]
    return None


# ── Text helpers ─────────────

def _clean_text(text: str) -> str:
    text = re.sub(r"http\S+|www\S+|https\S+", " ", text, flags=re.MULTILINE)
    text = re.sub(r"\bRT\b|\bcc\b", " ", text)
    text = re.sub(r"#\S+", " ", text)
    text = re.sub(r"@\S+", " ", text)
    text = re.sub(r"<.*?>", " ", text)
    text = re.sub(r"[^a-zA-Z\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _preprocess_text(text: str) -> str:
    cleaned = _clean_text(text)
    doc = nlp(cleaned.lower())
    return " ".join(token.lemma_ for token in doc if not token.is_stop)


def _get_top_tfidf_terms(tfidf_vector, vectorizer, n: int = 10) -> list:
    feature_names = vectorizer.get_feature_names_out()
    scores = tfidf_vector.toarray().flatten()
    sorted_indices = np.argsort(scores)[::-1][:n]
    return [feature_names[i] for i in sorted_indices if scores[i] > 0]


def _extract_structured_features(text: str) -> np.ndarray:
    text_lower = text.lower()
    years = 0.0
    years_match = re.search(r"(\d+)\+?\s+years?", text_lower)
    if years_match:
        years = min(float(years_match.group(1)) / 30.0, 1.0)

    has_degree = 1.0 if any(kw in text_lower for kw in ["bachelor", "b.s", "b.sc", "b.a"]) else 0.0
    has_masters = 1.0 if any(kw in text_lower for kw in ["master", "m.s", "m.a", "mba"]) else 0.0

    technical_keywords = [
        "python", "java", "sql", "aws", "docker", "kubernetes",
        "api", "database", "developer", "engineer",
    ]
    is_technical = 1.0 if sum(1 for kw in technical_keywords if kw in text_lower) >= 3 else 0.0
    is_management = 1.0 if any(kw in text_lower for kw in ["manager", "lead", "director", "head of", "chief"]) else 0.0
    is_sales = 1.0 if any(kw in text_lower for kw in ["sales", "business development", "account executive"]) else 0.0

    return np.array([[years, has_degree, has_masters, is_technical, is_management, is_sales]], dtype=np.float32)


def _get_embedder(embedder_name: str):
    if embedder_name in loaded_embedders:
        return loaded_embedders[embedder_name]
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        logger.warning("⚠ sentence-transformers not installed; using fallback embedder")
        loaded_embedders[embedder_name] = _FallbackEmbedder()
        return loaded_embedders[embedder_name]
    loaded_embedders[embedder_name] = SentenceTransformer(embedder_name)
    return loaded_embedders[embedder_name]


def _build_inference_vector(processed_text: str, raw_text: str, model_bundle: dict):
    tfidf = model_bundle["tfidf"]
    model = model_bundle["model"]

    tfidf_vector = tfidf.transform([processed_text])
    tfidf_dim = int(tfidf_vector.shape[1])
    feature_vector = _extract_structured_features(raw_text)
    feature_dim = int(feature_vector.shape[1])
    expected_dim = int(getattr(model, "n_features_in_", tfidf_dim) or tfidf_dim)

    if expected_dim == tfidf_dim:
        return tfidf_vector, tfidf_vector

    if expected_dim == tfidf_dim + feature_dim:
        hybrid = np.hstack([tfidf_vector.toarray(), feature_vector])
        return hybrid, tfidf_vector

    if expected_dim in (384, 390):
        embedder_name = model_bundle.get("embedder_name", "all-MiniLM-L6-v2")
        embedder = _get_embedder(embedder_name)
        embedding = embedder.encode([processed_text], convert_to_numpy=True, show_progress_bar=False)
        if expected_dim == 384:
            return embedding, tfidf_vector
        hybrid = np.hstack([embedding, feature_vector])
        return hybrid, tfidf_vector

    if expected_dim == feature_dim:
        return feature_vector, tfidf_vector

    raise RuntimeError(
        f"Unsupported feature shape for model '{model_bundle.get('id', 'unknown')}': "
        f"expected {expected_dim}, tfidf {tfidf_dim}, feature {feature_dim}"
    )


# ── Endpoints ─────────────────

@router.post("/predict", response_model=PredictionOutput)
def predict_resume(input_data: ResumeInput):
    """
    Predict the job category from resume text.
    Optionally compute cosine similarity match score against a job description.
    """
    resolved = _resolve_model(input_data.model_version)
    if resolved is None or nlp is None:
        raise HTTPException(
            status_code=500,
            detail="No model versions loaded. Please check backend logs.",
        )

    model = resolved["model"]
    tfidf = resolved["tfidf"]
    label_encoder = resolved["label_encoder"]

    if not input_data.resume_text or len(input_data.resume_text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Resume text cannot be empty")

    try:
        processed_text = _preprocess_text(input_data.resume_text)
        model_vectorized, tfidf_vector_for_terms = _build_inference_vector(
            processed_text, input_data.resume_text, resolved
        )

        prediction = model.predict(model_vectorized)
        prediction_proba = model.predict_proba(model_vectorized)

        predicted_category = label_encoder.inverse_transform(prediction)[0]
        confidence = float(max(prediction_proba[0]))

        match_score = None
        resume_top_terms = None
        jd_top_terms = None

        if input_data.job_description and len(input_data.job_description.strip()) > 0:
            processed_jd = _preprocess_text(input_data.job_description)
            jd_vectorized = tfidf.transform([processed_jd])

            similarity = cosine_similarity(tfidf_vector_for_terms, jd_vectorized)[0][0]
            match_score = round(float(similarity) * 100, 2)

            resume_top_terms = _get_top_tfidf_terms(tfidf_vector_for_terms, tfidf, n=10)
            jd_top_terms = _get_top_tfidf_terms(jd_vectorized, tfidf, n=10)

        return PredictionOutput(
            predicted_category=predicted_category,
            confidence=round(confidence, 4),
            model_version=resolved.get("id"),
            match_score=match_score,
            resume_top_terms=resume_top_terms,
            jd_top_terms=jd_top_terms,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@router.get("/models")
def get_models():
    """Return metadata about all registered model versions."""
    result = []
    for version_id, meta in MODEL_REGISTRY.items():
        entry = {
            "id": version_id,
            "description": meta["description"],
            "algorithm": meta["algorithm"],
            "badge": meta["badge"],
            "model_type": meta.get("model_type", "classic_tfidf"),
            "available": version_id in loaded_models,
        }
        if version_id in loaded_models:
            entry["categories"] = len(loaded_models[version_id]["label_encoder"].classes_)
            entry["input_features"] = loaded_models[version_id].get("input_features")
        result.append(entry)
    return {"models": result}
