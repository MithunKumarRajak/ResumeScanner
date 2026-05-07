"""
ML prediction routes — wraps the legacy /predict and /models endpoints.

Endpoints:
  POST /predict   — classify resume, optionally match against JD
  GET  /models    — list available model versions
"""
import re
import hashlib
import logging
import sys
from typing import Optional, List

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ML Prediction"])
MODEL_PRIORITY = ("ResumeModel_v6", "ResumeModel_v5", "ResumeModel_v3", "ResumeModel_v2")


#  Request / Response ─

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


#  Multi-model support (same as original main.py) 

import joblib
import spacy
import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]

loaded_models = {}     # { "ResumeModel_v2": {...}, ... }
loaded_embedders = {}
loaded_preprocessors = {}
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
    "ResumeModel_v6": {
        "dir": os.path.join("..", "v6"),
        "description": "Final Advanced model with multilingual semantic matching, bias checks, and SHAP support",
        "algorithm": "Calibrated SGD/SVM with transformer embeddings + TF-IDF + 15 structured features",
        "badge": "Latest Model",
        "model_type": "advanced_v6",
    },
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
        "badge": "Production Model",
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


def get_nlp():
    global nlp
    if nlp is None:
        nlp = spacy.load("en_core_web_sm")
        logger.info("spaCy model loaded lazily")
    return nlp

def load_predict_models():
    """Backward compatibility dummy function, unused with lazy loading."""
    pass


def _resolve_model(version_id: Optional[str] = None):
    target_id = version_id if (version_id and version_id in MODEL_REGISTRY) else MODEL_PRIORITY[0]
    
    if target_id not in loaded_models:
        meta = MODEL_REGISTRY[target_id]
        arts = _load_single_model(target_id, meta["dir"])
        if arts is not None:
            loaded_models[target_id] = arts

    if target_id in loaded_models:
        return loaded_models[target_id]

    # Fallback
    for fallback in MODEL_PRIORITY:
        if fallback not in loaded_models:
            meta = MODEL_REGISTRY[fallback]
            arts = _load_single_model(fallback, meta["dir"])
            if arts is not None:
                loaded_models[fallback] = arts
        if fallback in loaded_models:
            return loaded_models[fallback]
    return None


#  Text helpers ─

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
    doc = get_nlp()(cleaned.lower())
    return " ".join(token.lemma_ for token in doc if not token.is_stop)


def _ensure_repo_root_on_path() -> None:
    repo_root_str = str(REPO_ROOT)
    if repo_root_str not in sys.path:
        sys.path.insert(0, repo_root_str)


def _preprocess_v6_text(text: str) -> tuple[str, str]:
    """Use ResumeModel_v6 preprocessing when available; fall back safely."""
    try:
        if "v6" not in loaded_preprocessors:
            _ensure_repo_root_on_path()
            from ResumeModel_v6 import MultilingualPreprocessor
            loaded_preprocessors["v6"] = MultilingualPreprocessor()
        result = loaded_preprocessors["v6"].preprocess(text)
        return result["processed"], result["lang"]
    except Exception as exc:
        logger.warning("V6 preprocessing unavailable; using legacy preprocessing: %s", exc)
        return _preprocess_text(text), "en"


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


def _extract_v6_structured_features(text: str, lang: str = "en") -> np.ndarray:
    """Return V6's 15 structured features in training order."""
    try:
        _ensure_repo_root_on_path()
        from ResumeModel_v6 import extract_features_v6
        features = extract_features_v6(text, lang)
        return np.array([[v for v in features.values()]], dtype=np.float32)
    except Exception as exc:
        logger.warning("V6 feature extraction unavailable; using zero features: %s", exc)
        return np.zeros((1, 15), dtype=np.float32)


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

    if model_bundle.get("model_type") == "advanced_v6":
        processed_v6, lang = _preprocess_v6_text(raw_text)
        tfidf_vector = tfidf.transform([processed_v6])
        tfidf_dim = int(tfidf_vector.shape[1])
        v6_features = _extract_v6_structured_features(raw_text, lang)
        v6_feature_dim = int(v6_features.shape[1])
        embedder_name = model_bundle.get("embedder_name", "paraphrase-multilingual-MiniLM-L12-v2")
        embedder = _get_embedder(embedder_name)
        embedding = embedder.encode([processed_v6], convert_to_numpy=True, show_progress_bar=False)

        embedding_dim = int(embedding.shape[1])
        if expected_dim == embedding_dim + tfidf_dim + v6_feature_dim:
            hybrid = np.hstack([embedding, tfidf_vector.toarray(), v6_features])
            return hybrid, tfidf_vector
        if expected_dim == tfidf_dim + v6_feature_dim:
            hybrid = np.hstack([tfidf_vector.toarray(), v6_features])
            return hybrid, tfidf_vector
        if expected_dim == embedding_dim + v6_feature_dim:
            hybrid = np.hstack([embedding, v6_features])
            return hybrid, tfidf_vector
        if expected_dim == embedding_dim:
            return embedding, tfidf_vector

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


#  Endpoints ─

@router.post("/predict", response_model=PredictionOutput)
def predict_resume(input_data: ResumeInput):
    """
    Predict the job category from resume text.
    Optionally compute cosine similarity match score against a job description.
    """
    resolved = _resolve_model(input_data.model_version)
    if resolved is None:
        get_nlp() # ensure loaded
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
            if resolved.get("model_type") == "advanced_v6":
                processed_jd, _ = _preprocess_v6_text(input_data.job_description)
            else:
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
    ordered_ids = [model_id for model_id in MODEL_PRIORITY if model_id in MODEL_REGISTRY]
    ordered_ids.extend(model_id for model_id in MODEL_REGISTRY if model_id not in ordered_ids)
    for version_id in ordered_ids:
        meta = MODEL_REGISTRY[version_id]
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
