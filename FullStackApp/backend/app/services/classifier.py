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

# ── Lazy singletons ───────────────────────────────────────
_model         = None
_tfidf         = None
_label_encoder = None
_nlp           = None
_models_loaded = False


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

        model_path   = _get_model_path("model.pkl")
        tfidf_path   = _get_model_path("tfidf.pkl")
        encoder_path = _get_model_path("encoder.pkl")

        _model         = joblib.load(model_path)
        _tfidf         = joblib.load(tfidf_path)
        _label_encoder = joblib.load(encoder_path)
        _nlp           = spacy.load("en_core_web_sm")

        _models_loaded = True
        logger.info("✅ ML models loaded successfully")
        return True

    except FileNotFoundError as e:
        logger.error(f"❌ Model file not found: {e}")
    except Exception as e:
        logger.error(f"❌ Model load error: {e}")
    return False


# ── Text preprocessing (mirrors original main.py) ─────────

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


# ── Public API ────────────────────────────────────────────

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
    if not _models_loaded:
        load_models()

    if _model is None or _tfidf is None or _label_encoder is None:
        raise RuntimeError(
            "ML models not available. Check that model.pkl, tfidf.pkl, "
            "and encoder.pkl exist in the FullStackApp directory."
        )

    import numpy as np

    processed      = _preprocess(text)
    vectorized     = _tfidf.transform([processed])
    prediction     = _model.predict(vectorized)
    probabilities  = _model.predict_proba(vectorized)[0]

    predicted_category = _label_encoder.inverse_transform(prediction)[0]
    confidence         = float(max(probabilities))

    all_probs = {
        label: round(float(prob), 4)
        for label, prob in zip(_label_encoder.classes_, probabilities)
    }

    return {
        "predicted_category": predicted_category,
        "confidence":         round(confidence, 4),
        "all_probabilities":  all_probs,
    }


def get_tfidf_vectorizer():
    """Return the loaded TF-IDF vectorizer (used by matcher service)."""
    if not _models_loaded:
        load_models()
    return _tfidf


def get_categories() -> list:
    """Return sorted list of all known job categories."""
    if not _models_loaded:
        load_models()
    if _label_encoder is None:
        return []
    return sorted(_label_encoder.classes_.tolist())


def preprocess_text(text: str) -> str:
    """Public wrapper used by matcher service."""
    if not _models_loaded:
        load_models()
    return _preprocess(text)
