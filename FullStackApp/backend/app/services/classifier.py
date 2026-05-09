"""
Resume classification service.
Loads and reuses the existing model.pkl / tfidf.pkl / encoder.pkl
from the FullStackApp directory (same artifacts as the original backend).
"""
import os
import re
import logging
from typing import Dict, Any, Optional
from functools import lru_cache

logger = logging.getLogger(__name__)

# Absolute path to FullStackApp/ (3 levels up from this file)
_BASE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "..")
)

#  Lazy singletons
_model = None
_tfidf = None
_label_encoder = None
_nlp = None
_models_loaded = False


def _get_latest_predict_bundle():
    """Use the multi-version prediction registry so background classification follows the latest model."""
    try:
        from app.routes import predict as predict_routes
        if not predict_routes.loaded_models:
            predict_routes.load_predict_models()
        return predict_routes._resolve_model("ResumeModel_v6"), predict_routes
    except Exception as e:
        logger.warning(
            f"Latest predict model unavailable, using legacy classifier artifacts: {e}")
        return None, None


def _get_model_path(filename: str) -> str:
    """
    Resolve model file path — looks relative to the backend/ working dir first,
    then falls back to the FullStackApp/ parent directory.
    """
    cwd_path = os.path.join(os.getcwd(), "..", filename)
    if os.path.isfile(cwd_path):
        return os.path.abspath(cwd_path)
    # Absolute fallback
    return os.path.join(_BASE_DIR, filename)


def load_models() -> bool:
    """Load all ML artifacts. Returns True on success."""
    global _model, _tfidf, _label_encoder, _nlp, _models_loaded
    if _models_loaded:
        return True

    try:
        import joblib
        import spacy

        model_path = _get_model_path("model.pkl")
        tfidf_path = _get_model_path("tfidf.pkl")
        encoder_path = _get_model_path("encoder.pkl")

        _model = joblib.load(model_path)
        _tfidf = joblib.load(tfidf_path)
        _label_encoder = joblib.load(encoder_path)
        _nlp = spacy.load("en_core_web_sm")

        _models_loaded = True
        logger.info(" ML models loaded successfully")
        return True

    except FileNotFoundError as e:
        logger.error(f" Model file not found: {e}")
    except Exception as e:
        logger.error(f" Model load error: {e}")
    return False


#  Text preprocessing (mirrors original main.py) ─

def _clean_text(text: str) -> str:
    text = re.sub(r"http\S+|www\S+|https\S+", " ", text, flags=re.MULTILINE)
    text = re.sub(r"\bRT\b|\bcc\b", " ", text)
    text = re.sub(r"#\S+", " ", text)
    text = re.sub(r"@\S+", " ", text)
    text = re.sub(r"<.*?>", " ", text)
    text = re.sub(r"[^a-zA-Z\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _preprocess(text: str) -> str:
    if _nlp is None:
        return _clean_text(text).lower()
    cleaned = _clean_text(text)
    doc = _nlp(cleaned.lower())
    return " ".join(token.lemma_ for token in doc if not token.is_stop)


def _build_prediction_payload(
    predicted_category: str,
    probabilities,
    label_encoder,
    model_version: str,
    model_type: Optional[str] = None,
    feature_count: Optional[int] = None,
) -> Dict[str, Any]:
    probability_pairs = list(zip(label_encoder.classes_, probabilities))
    sorted_pairs = sorted(
        probability_pairs, key=lambda item: item[1], reverse=True)
    top_categories = [
        {"category": label, "score": round(float(score), 4)}
        for label, score in sorted_pairs[:5]
    ]

    confidence = float(sorted_pairs[0][1]) if sorted_pairs else 0.0
    runner_up = float(sorted_pairs[1][1]) if len(sorted_pairs) > 1 else 0.0
    confidence_margin = round(confidence - runner_up, 4)

    review_reasons = []
    if confidence < 0.6:
        review_reasons.append("low confidence")
    if confidence_margin < 0.15:
        review_reasons.append("close competition between top categories")

    return {
        "predicted_category": predicted_category,
        "confidence": round(confidence, 4),
        "confidence_pct": round(confidence * 100, 1),
        "model_version": model_version,
        "model_type": model_type,
        "feature_count": feature_count,
        "category_count": len(label_encoder.classes_),
        "prediction_margin": confidence_margin,
        "needs_human_review": bool(review_reasons),
        "review_reason": "; ".join(review_reasons) if review_reasons else "",
        "top_categories": top_categories,
        "all_probabilities": {
            label: round(float(prob), 4)
            for label, prob in probability_pairs
        },
    }


#  Public API

def classify_resume(text: str) -> Dict[str, Any]:
    """
    Classify resume text using the trained ML model.

    Returns:
        {
            predicted_category: str,
            confidence: float,
            all_probabilities: dict[str, float]
        }

    Raises RuntimeError if models are not loaded.
    """
    latest_bundle, predict_routes = _get_latest_predict_bundle()
    if latest_bundle is not None and predict_routes is not None:
        processed = predict_routes._preprocess_text(text)
        model_vectorized, _ = predict_routes._build_inference_vector(
            processed, text, latest_bundle
        )
        model = latest_bundle["model"]
        label_encoder = latest_bundle["label_encoder"]
        prediction = model.predict(model_vectorized)
        probabilities = model.predict_proba(model_vectorized)[0]
        predicted_category = label_encoder.inverse_transform(prediction)[0]
        return _build_prediction_payload(
            predicted_category=predicted_category,
            probabilities=probabilities,
            label_encoder=label_encoder,
            model_version=latest_bundle.get("id", "ResumeModel_v6"),
            model_type=latest_bundle.get("model_type"),
            feature_count=latest_bundle.get("input_features"),
        )

    if not _models_loaded:
        load_models()

    if _model is None or _tfidf is None or _label_encoder is None:
        raise RuntimeError(
            "ML models not available. Check that model.pkl, tfidf.pkl, "
            "and encoder.pkl exist in the FullStackApp directory."
        )

    import numpy as np

    processed = _preprocess(text)
    vectorized = _tfidf.transform([processed])
    prediction = _model.predict(vectorized)
    probabilities = _model.predict_proba(vectorized)[0]

    predicted_category = _label_encoder.inverse_transform(prediction)[0]
    return _build_prediction_payload(
        predicted_category=predicted_category,
        probabilities=probabilities,
        label_encoder=_label_encoder,
        model_version="legacy",
        model_type="classic_tfidf",
        feature_count=int(getattr(_tfidf, "vocabulary_", {}).__len__()),
    )


def get_tfidf_vectorizer():
    """Return the loaded TF-IDF vectorizer (used by matcher service)."""
    latest_bundle, _ = _get_latest_predict_bundle()
    if latest_bundle is not None:
        return latest_bundle["tfidf"]
    if not _models_loaded:
        load_models()
    return _tfidf


def get_categories() -> list:
    """Return sorted list of all known job categories."""
    latest_bundle, _ = _get_latest_predict_bundle()
    if latest_bundle is not None:
        return sorted(latest_bundle["label_encoder"].classes_.tolist())
    if not _models_loaded:
        load_models()
    if _label_encoder is None:
        return []
    return sorted(_label_encoder.classes_.tolist())


def preprocess_text(text: str) -> str:
    """Public wrapper used by matcher service."""
    latest_bundle, predict_routes = _get_latest_predict_bundle()
    if latest_bundle is not None and predict_routes is not None:
        if latest_bundle.get("model_type") == "advanced_v6":
            processed, _ = predict_routes._preprocess_v6_text(text)
            return processed
        return predict_routes._preprocess_text(text)
    if not _models_loaded:
        load_models()
    return _preprocess(text)
