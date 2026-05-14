"""
Resume classification service.
Loads and reuses the existing model.pkl / tfidf.pkl / encoder.pkl
from the FullStackApp directory (same artifacts as the original backend).
"""
from app.services.common import preprocess_text as _common_preprocess
from app.services.common import clean_text as _clean_text
import os
import re
import logging
import json
from typing import Dict, Any, Optional
from functools import lru_cache
import numpy as np

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


#  Text preprocessing — delegates to app.services.common ─


def _preprocess(text: str) -> str:
    return _common_preprocess(text, _nlp)


def _build_prediction_payload(
    predicted_category: str,
    probabilities,
    label_encoder,
    model_version: str,
    model_type: Optional[str] = None,
    feature_count: Optional[int] = None,
    inference_policy: Optional[Dict[str, float]] = None,
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

    probs = np.asarray(probabilities, dtype=float)
    probs = np.clip(probs, 1e-12, 1.0)
    probs = probs / probs.sum()
    entropy = float(-np.sum(probs * np.log(probs)) /
                    np.log(len(probs))) if len(probs) > 1 else 0.0

    policy = inference_policy or {}
    conf_threshold = float(policy.get("confidence_threshold", 0.6))
    margin_threshold = float(policy.get("margin_threshold", 0.15))
    entropy_threshold = float(policy.get("entropy_threshold", 0.72))

    review_reasons = []
    if confidence < conf_threshold:
        review_reasons.append("low confidence")
    if confidence_margin < margin_threshold:
        review_reasons.append("close competition between top categories")
    if entropy > entropy_threshold:
        review_reasons.append(
            "high probability entropy (uncertain prediction)")

    reliability_score = max(
        0.0,
        min(1.0, (confidence * 0.65) + (confidence_margin *
            1.5 * 0.25) + ((1.0 - entropy) * 0.10)),
    )

    return {
        "predicted_category": predicted_category,
        "confidence": round(confidence, 4),
        "confidence_pct": round(confidence * 100, 1),
        "model_version": model_version,
        "model_type": model_type,
        "feature_count": feature_count,
        "category_count": len(label_encoder.classes_),
        "prediction_margin": confidence_margin,
        "uncertainty_entropy": round(entropy, 4),
        "reliability_score": round(float(reliability_score), 4),
        "reliable_prediction": not bool(review_reasons),
        "needs_human_review": bool(review_reasons),
        "review_reason": "; ".join(review_reasons) if review_reasons else "",
        "applied_thresholds": {
            "confidence_threshold": conf_threshold,
            "margin_threshold": margin_threshold,
            "entropy_threshold": entropy_threshold,
        },
        "top_categories": top_categories,
        "all_probabilities": {
            label: round(float(prob), 4)
            for label, prob in probability_pairs
        },
    }


def _load_inference_policy(model_dir: Optional[str]) -> Optional[Dict[str, float]]:
    if not model_dir:
        return None
    try:
        manifest_path = os.path.join(model_dir, "manifest.json")
        if not os.path.isfile(manifest_path):
            return None
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        policy = manifest.get("inference_policy") or {}
        if not isinstance(policy, dict):
            return None
        return policy
    except Exception:
        return None


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
        policy = _load_inference_policy(
            str(latest_bundle.get("model_dir") or ""))
        return _build_prediction_payload(
            predicted_category=predicted_category,
            probabilities=probabilities,
            label_encoder=label_encoder,
            model_version=latest_bundle.get("id", "ResumeModel_v6"),
            model_type=latest_bundle.get("model_type"),
            feature_count=latest_bundle.get("input_features"),
            inference_policy=policy,
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
