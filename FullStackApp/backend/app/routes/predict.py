"""
ML prediction routes — wraps the legacy /predict and /models endpoints.

Endpoints:
  POST /predict   — classify resume, optionally match against JD
  GET  /models    — list available model versions
"""
from app.services.common import get_top_tfidf_terms as _get_top_tfidf_terms
from app.services.common import preprocess_text as _common_preprocess
from app.services.common import clean_text as _clean_text
from pathlib import Path
import json
import os
import spacy
import joblib
import re
import hashlib
import logging
import sys
from typing import Optional, List, Dict

# Import PII redaction tool — used before resume text is sent to Gemini/Groq
# in the LLM fallback judge. The local ML scoring (classify_with_bundle) is
# fully offline and does NOT require redacted text.
from app.tools.pii_redactor import redact_pii as _redact_pii

import numpy as np
import scipy.sparse as sp
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict
from sklearn.metrics.pairwise import cosine_similarity

from app.services import classifier as classifier_svc

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ML Prediction"])
DEFAULT_MODEL_ID = "ResumeModel_v6"
MODEL_PRIORITY = (DEFAULT_MODEL_ID, "ResumeModel_v5",
                  "ResumeModel_v3", "ResumeModel_v2")


#  Request / Response ─

class ResumeInput(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    resume_text: str
    job_description: Optional[str] = None
    model_version: Optional[str] = None


class RescoreInput(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    edited_resume_text: str
    job_description: Optional[str] = None
    model_version: Optional[str] = None


class CategoryScore(BaseModel):
    category: str
    score: float


class PredictionOutput(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    predicted_category: str
    confidence: float
    confidence_pct: float
    model_version: Optional[str] = None
    model_type: Optional[str] = None
    category_count: Optional[int] = None
    feature_count: Optional[int] = None
    prediction_margin: Optional[float] = None
    uncertainty_entropy: Optional[float] = None
    reliability_score: Optional[float] = None
    reliable_prediction: Optional[bool] = None
    prediction_status: Optional[str] = None
    display_prediction: Optional[str] = None
    needs_human_review: Optional[bool] = None
    review_reason: Optional[str] = None
    applied_thresholds: Optional[Dict[str, float]] = None
    all_probabilities: Optional[Dict[str, float]] = None
    top_categories: Optional[List[CategoryScore]] = None
    top_recommendations: Optional[List[CategoryScore]] = None
    role_suggestions: Optional[List[str]] = None
    resume_gaps: Optional[List[Dict[str, str]]] = None
    apply_now_readiness: Optional[Dict[str, object]] = None
    improvement_tips: Optional[List[str]] = None
    match_score: Optional[float] = None
    resume_top_terms: Optional[List[str]] = None
    jd_top_terms: Optional[List[str]] = None
    llm_fallback: Optional[Dict[str, object]] = None
    llm_category: Optional[str] = None
    llm_reason: Optional[str] = None


#  Multi-model support (same as original main.py)


_file_parents = Path(__file__).resolve().parents
REPO_ROOT = _file_parents[4] if len(_file_parents) > 4 else _file_parents[3]

loaded_models = {}     # { "ResumeModel_v2": {...}, ... }
loaded_embedders = {}
loaded_preprocessors = {}
nlp = None
_v6_preprocessor = None


def _ensure_repo_root_on_path() -> None:
    repo_root_str = str(REPO_ROOT)
    if repo_root_str not in sys.path:
        sys.path.insert(0, repo_root_str)


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

        artifacts["model_type"] = MODEL_REGISTRY[version_id].get(
            "model_type", "classic_tfidf")
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
    target_id = version_id if (
        version_id and version_id in MODEL_REGISTRY) else MODEL_PRIORITY[0]

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


#  Text helpers — delegates to app.services.common ─


def _preprocess_text(text: str) -> str:
    return _common_preprocess(text, get_nlp())


def _preprocess_for_model(text: str, model_bundle: dict) -> str:
    preprocess_fn = model_bundle.get("preprocess_fn")
    if callable(preprocess_fn):
        return preprocess_fn(text)
    return _preprocess_text(text)


def _preprocess_v6_text(text: str):
    """Return the v6-cleaned text plus detected language."""
    global _v6_preprocessor
    _ensure_repo_root_on_path()
    if _v6_preprocessor is None:
        from ResumeModel_v6 import MultilingualPreprocessor
        _v6_preprocessor = MultilingualPreprocessor()

    processed = _v6_preprocessor.preprocess(text)
    return processed["processed"], processed["lang"]


def _build_candidate_guidance(classification: Dict[str, object], resume_terms: list[str], jd_terms: list[str], match_score: Optional[float]) -> Dict[str, object]:
    top_categories = classification.get("top_categories") or []
    predicted_category = str(classification.get(
        "predicted_category") or "Unknown")
    confidence_pct = float(classification.get("confidence_pct") or 0.0)
    needs_review = bool(classification.get("needs_human_review"))

    role_suggestions = [predicted_category]
    for item in top_categories:
        category = item.get("category") if isinstance(item, dict) else None
        if category and category not in role_suggestions:
            role_suggestions.append(category)
        if len(role_suggestions) >= 4:
            break

    role_aliases = {
        "ENGINEER": ["Software Engineer", "Backend Developer", "Full Stack Developer"],
        "INFORMATION-TECHNOLOGY": ["IT Analyst", "Systems Engineer", "Support Engineer"],
        "FINANCE": ["Financial Analyst", "Accounting Associate", "FP&A Analyst"],
        "HR": ["HR Executive", "Talent Acquisition Specialist", "People Operations Associate"],
        "SALES": ["Sales Executive", "Business Development Associate", "Account Manager"],
        "DESIGNER": ["UI/UX Designer", "Product Designer", "Visual Designer"],
        "TEACHER": ["Teacher", "Instructional Coordinator", "Academic Tutor"],
        "BANKING": ["Banking Associate", "Credit Analyst", "Relationship Manager"],
        "CONSULTANT": ["Business Consultant", "Strategy Analyst", "Operations Consultant"],
    }
    for alias in role_aliases.get(predicted_category.upper(), []):
        if alias not in role_suggestions:
            role_suggestions.append(alias)

    resume_term_set = {term.lower() for term in (resume_terms or [])}
    jd_term_set = {term.lower() for term in (jd_terms or [])}
    missing_terms = [term for term in jd_terms if term.lower()
                     not in resume_term_set]

    resume_gaps = []
    for term in missing_terms[:8]:
        resume_gaps.append({
            "type": "job-keyword",
            "item": term,
            "priority": "high" if len(resume_gaps) < 3 else "medium",
            "suggestion": f"Add evidence of {term} in your summary, projects, or experience bullets.",
        })

    if confidence_pct < 60:
        resume_gaps.append({
            "type": "category-confidence",
            "item": predicted_category,
            "priority": "medium",
            "suggestion": "Tailor the resume with role-specific achievements to improve classification confidence.",
        })

    if match_score is not None and match_score < 60:
        resume_gaps.append({
            "type": "match-score",
            "item": f"{match_score}% match",
            "priority": "medium",
            "suggestion": "Rework the resume to mirror the target job description more closely.",
        })

    readiness_score = round(
        (confidence_pct * 0.45)
        + (float(match_score or 0.0) * 0.45)
        + (max(0.0, 100.0 - min(len(missing_terms) * 6.0, 30.0)) * 0.10),
        1,
    )
    if needs_review:
        readiness_score = max(0.0, readiness_score - 10.0)

    if readiness_score >= 80:
        readiness_label = "Ready to apply"
        readiness_detail = "Strong category confidence and solid job alignment."
    elif readiness_score >= 60:
        readiness_label = "Almost ready"
        readiness_detail = "Good fit, but a few job-specific edits will improve the outcome."
    else:
        readiness_label = "Needs tailoring"
        readiness_detail = "The resume should be edited before applying to this role."

    improvement_tips = []
    if missing_terms:
        improvement_tips.append(
            f"Use the job description language for: {', '.join(missing_terms[:3])}.")
    if confidence_pct < 70:
        improvement_tips.append(
            "Add concrete achievements and tools to strengthen category confidence.")
    if len(resume_terms or []) < 5:
        improvement_tips.append(
            "Add more role-specific keywords and measurable outcomes.")
    if match_score is not None and match_score < 70:
        improvement_tips.append(
            "Mirror the target role's responsibilities in your experience bullets.")
    if not improvement_tips:
        improvement_tips.append(
            "Keep the resume concise and continue tailoring it for each job.")

    return {
        "role_suggestions": role_suggestions[:4],
        "resume_gaps": resume_gaps,
        "apply_now_readiness": {
            "score": readiness_score,
            "label": readiness_label,
            "detail": readiness_detail,
            "should_apply": readiness_score >= 70,
        },
        "improvement_tips": improvement_tips[:5],
    }


def _llm_fallback_judge(resume_text: str, classification: Dict[str, object]) -> Optional[Dict[str, object]]:
    """Ask Gemini/Groq to choose among low-confidence model alternatives."""
    enabled = os.getenv("RESUME_SCANNER_ENABLE_LLM_FALLBACK", "false").strip().lower()
    if enabled not in {"1", "true", "yes", "on"}:
        return None

    top_categories = classification.get("top_categories") or []
    if not top_categories:
        return None

    allowed = [str(item.get("category")) for item in top_categories[:5] if item.get("category")]
    if not allowed:
        return None

    # PII redaction happens here — before any text leaves the system to a third-party LLM.
    # Only the LLM fallback payload is redacted; local ML scoring uses original text.
    _redact_result = _redact_pii(resume_text)
    _redacted_for_llm = _redact_result["redacted_text"]

    prompt_with_redacted = f"""You are a senior resume classifier. The ML model is uncertain.
Choose the best category from this allowed list only:
{json.dumps(allowed)}

Return ONLY valid JSON:
{{
  "category": "one allowed category",
  "confidence": 0.0,
  "reason": "short reason using resume evidence"
}}

Resume text:
{_redacted_for_llm[:3500]}
"""


    text = None
    try:
        from app.routes import ai as ai_routes
        model = ai_routes._get_gemini()
        if model is not None:
            response = model.generate_content(prompt_with_redacted)
            text = response.text.strip()
        if not text:
            text = ai_routes._call_groq_api(prompt_with_redacted)
        if not text:
            return None

        cleaned = ai_routes._clean_ai_json(text)
        result = json.loads(cleaned)
        category = str(result.get("category", "")).strip()
        if category not in allowed:
            return None
        return {
            "category": category,
            "confidence": float(result.get("confidence") or 0.0),
            "reason": str(result.get("reason") or "").strip(),
            "allowed_categories": allowed,
        }
    except Exception as exc:
        logger.warning("LLM fallback judge unavailable: %s", exc)
        return None


def _extract_structured_features(text: str) -> np.ndarray:
    text_lower = text.lower()
    years = 0.0
    year_matches = re.findall(
        r"\b(\d{1,2})\+?\s+(?:years?|yrs?)\s+(?:of\s+)?(?:professional\s+|industry\s+|work\s+)?experience\b",
        text_lower,
    )
    if year_matches:
        years = min(max(int(x) for x in year_matches) / 30.0, 1.0)

    has_degree = 1.0 if any(kw in text_lower for kw in [
                            "bachelor", "b.s", "b.sc", "b.a"]) else 0.0
    has_masters = 1.0 if any(kw in text_lower for kw in [
                             "master", "m.s", "m.a", "mba"]) else 0.0

    technical_keywords = [
        "python", "java", "sql", "aws", "docker", "kubernetes",
        "api", "database", "developer", "engineer",
    ]
    is_technical = 1.0 if sum(
        1 for kw in technical_keywords if kw in text_lower) >= 3 else 0.0
    is_management = 1.0 if any(kw in text_lower for kw in [
                               "manager", "lead", "director", "head of", "chief"]) else 0.0
    is_sales = 1.0 if any(kw in text_lower for kw in [
                          "sales", "business development", "account executive"]) else 0.0

    return np.array([[years, has_degree, has_masters, is_technical, is_management, is_sales]], dtype=np.float32)


def _extract_v6_structured_features(text: str, lang: str = "en") -> np.ndarray:
    """Return V6's 15 structured features in training order."""
    try:
        _ensure_repo_root_on_path()
        from ResumeModel_v6 import extract_features_v6
        features = extract_features_v6(text, lang)
        return np.array([[v for v in features.values()]], dtype=np.float32)
    except Exception as exc:
        logger.warning(
            "V6 feature extraction unavailable; using zero features: %s", exc)
        return np.zeros((1, 15), dtype=np.float32)


def _get_embedder(embedder_name: str):
    if embedder_name in loaded_embedders:
        return loaded_embedders[embedder_name]
    use_hf_embedder = os.getenv(
        "RESUME_SCANNER_USE_HF_EMBEDDER", "false").lower() == "true"
    if not use_hf_embedder:
        logger.warning(
            "Using local fallback embedder for %s to avoid runtime HF downloads",
            embedder_name,
        )
        loaded_embedders[embedder_name] = _FallbackEmbedder()
        return loaded_embedders[embedder_name]

    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        logger.warning(
            "sentence-transformers not installed; using fallback embedder")
        loaded_embedders[embedder_name] = _FallbackEmbedder()
        return loaded_embedders[embedder_name]

    loaded_embedders[embedder_name] = SentenceTransformer(embedder_name)
    return loaded_embedders[embedder_name]


def _build_inference_vector(processed_text: str, raw_text: str, model_bundle: dict):
    tfidf = model_bundle["tfidf"]
    model = model_bundle["model"]

    tfidf_vector = tfidf.transform([processed_text])
    tfidf_dim = int(tfidf_vector.shape[1])
    feature_fn = model_bundle.get("feature_fn")
    if callable(feature_fn):
        feature_values = feature_fn(raw_text)
        feature_names = model_bundle.get("feature_names") or list(feature_values.keys())
        feature_vector = np.array(
            [[feature_values[name] for name in feature_names]],
            dtype=np.float32,
        )
    else:
        feature_vector = _extract_structured_features(raw_text)
    feature_dim = int(feature_vector.shape[1])
    expected_dim = int(
        getattr(model, "n_features_in_", tfidf_dim) or tfidf_dim)

    if model_bundle.get("model_type") == "advanced_v6":
        processed_v6, lang = _preprocess_v6_text(raw_text)
        tfidf_vector = tfidf.transform([processed_v6])
        tfidf_dim = int(tfidf_vector.shape[1])
        v6_features = _extract_v6_structured_features(raw_text, lang)
        v6_feature_dim = int(v6_features.shape[1])
        embedder_name = model_bundle.get(
            "embedder_name", "paraphrase-multilingual-MiniLM-L12-v2")
        embedder = _get_embedder(embedder_name)
        embedding = embedder.encode(
            [processed_v6], convert_to_numpy=True, show_progress_bar=False)

        embedding_dim = int(embedding.shape[1])
        if expected_dim == embedding_dim + tfidf_dim + v6_feature_dim:
            hybrid = np.hstack(
                [embedding, tfidf_vector.toarray(), v6_features])
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
        hybrid = sp.hstack([tfidf_vector, sp.csr_matrix(feature_vector)], format="csr")
        return hybrid, tfidf_vector

    if expected_dim in (384, 390):
        embedder_name = model_bundle.get("embedder_name", "all-MiniLM-L6-v2")
        embedder = _get_embedder(embedder_name)
        embedding = embedder.encode(
            [processed_text], convert_to_numpy=True, show_progress_bar=False)
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


def _classify_with_bundle(text: str, model_bundle: dict) -> Dict[str, object]:
    processed = _preprocess_for_model(text, model_bundle)
    model_vectorized, _ = _build_inference_vector(processed, text, model_bundle)
    model = model_bundle["model"]
    label_encoder = model_bundle["label_encoder"]
    prediction = model.predict(model_vectorized)
    probabilities = model.predict_proba(model_vectorized)[0]
    predicted_category = label_encoder.inverse_transform(prediction)[0]
    policy = model_bundle.get("inference_policy")
    if not policy:
        policy = classifier_svc._load_inference_policy(
            str(model_bundle.get("model_dir") or ""))
    return classifier_svc._build_prediction_payload(
        predicted_category=predicted_category,
        probabilities=probabilities,
        label_encoder=label_encoder,
        model_version=model_bundle.get("id", "unknown"),
        model_type=model_bundle.get("model_type"),
        feature_count=model_bundle.get("input_features"),
        inference_policy=policy,
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
        get_nlp()  # ensure loaded
        raise HTTPException(
            status_code=500,
            detail="No model versions loaded. Please check backend logs.",
        )

    if not input_data.resume_text or len(input_data.resume_text.strip()) == 0:
        raise HTTPException(
            status_code=400, detail="Resume text cannot be empty")

    try:
        classification = _classify_with_bundle(input_data.resume_text, resolved)

        match_score = None
        resume_top_terms = None
        jd_top_terms = None

        if input_data.job_description and len(input_data.job_description.strip()) > 0:
            tfidf = resolved["tfidf"]
            processed_text = _preprocess_for_model(input_data.resume_text, resolved)
            _, tfidf_vector_for_terms = _build_inference_vector(
                processed_text, input_data.resume_text, resolved
            )
            if resolved.get("model_type") == "advanced_v6":
                processed_jd, _ = _preprocess_v6_text(
                    input_data.job_description)
            else:
                processed_jd = _preprocess_for_model(input_data.job_description, resolved)
            jd_vectorized = tfidf.transform([processed_jd])

            similarity = cosine_similarity(
                tfidf_vector_for_terms, jd_vectorized)[0][0]
            match_score = round(float(similarity) * 100, 2)

            resume_top_terms = _get_top_tfidf_terms(
                tfidf_vector_for_terms, tfidf, n=10)
            jd_top_terms = _get_top_tfidf_terms(jd_vectorized, tfidf, n=10)

        guidance = _build_candidate_guidance(
            classification=classification,
            resume_terms=resume_top_terms or [],
            jd_terms=jd_top_terms or [],
            match_score=match_score,
        )

        response_data = dict(classification)
        response_data["model_version"] = resolved.get(
            "id") or classification.get("model_version")
        response_data["model_type"] = resolved.get(
            "model_type") or classification.get("model_type")
        response_data["feature_count"] = classification.get(
            "feature_count") or resolved.get("input_features")
        response_data.update(guidance)
        response_data["match_score"] = match_score
        response_data["resume_top_terms"] = resume_top_terms
        response_data["jd_top_terms"] = jd_top_terms

        # Safeguard: avoid treating uncertain top-1 category as final.
        is_reliable = bool(response_data.get("reliable_prediction", True))
        top_categories = response_data.get("top_categories") or []
        response_data["top_recommendations"] = top_categories[:3]

        if is_reliable:
            response_data["prediction_status"] = "final"
            response_data["display_prediction"] = response_data.get(
                "predicted_category")
        else:
            llm_fallback = _llm_fallback_judge(input_data.resume_text, response_data)
            if llm_fallback:
                response_data["llm_fallback"] = llm_fallback
                response_data["llm_category"] = llm_fallback["category"]
                response_data["llm_reason"] = llm_fallback.get("reason")
                response_data["display_prediction"] = llm_fallback["category"]
                response_data["prediction_status"] = "llm_reviewed"
                response_data["review_reason"] = (
                    f"{response_data.get('review_reason') or 'low reliability prediction'}. "
                    f"LLM fallback selected {llm_fallback['category']}."
                )
            else:
                response_data["prediction_status"] = "review_required"
                response_data["display_prediction"] = "Manual review required"
        if not is_reliable and not response_data.get("llm_fallback"):
            if top_categories:
                suggestions = ", ".join(
                    [str(item.get("category"))
                     for item in top_categories[:3] if item.get("category")]
                )
                if suggestions:
                    reason = response_data.get(
                        "review_reason") or "low reliability prediction"
                    response_data["review_reason"] = f"{reason}. Top alternatives: {suggestions}"

        return PredictionOutput(
            **response_data,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Prediction error: {str(e)}")


@router.post("/api/rescore", response_model=PredictionOutput)
def rescore_resume(input_data: RescoreInput):
    """Re-score edited resume text from the embedded editor."""
    return predict_resume(
        ResumeInput(
            resume_text=input_data.edited_resume_text,
            job_description=input_data.job_description,
            model_version=input_data.model_version,
        )
    )


@router.get("/models")
def get_models():
    """Return metadata about all registered model versions."""
    result = []
    ordered_ids = [
        model_id for model_id in MODEL_PRIORITY if model_id in MODEL_REGISTRY]
    ordered_ids.extend(
        model_id for model_id in MODEL_REGISTRY if model_id not in ordered_ids)
    base = Path(__file__).resolve().parent.parent.parent
    for version_id in ordered_ids:
        meta = MODEL_REGISTRY[version_id]
        model_root = (base / meta["dir"]).resolve()
        is_available = (
            (model_root / "pipeline.pkl").exists()
            or ((model_root / "model.pkl").exists() and (model_root / "tfidf.pkl").exists())
        )

        entry = {
            "id": version_id,
            "description": meta["description"],
            "algorithm": meta["algorithm"],
            "badge": meta["badge"],
            "model_type": meta.get("model_type", "classic_tfidf"),
            "available": is_available,
        }
        if version_id in loaded_models:
            entry["categories"] = len(
                loaded_models[version_id]["label_encoder"].classes_)
            entry["input_features"] = loaded_models[version_id].get(
                "input_features")

        # Load metrics.json if exists
        metrics_file = model_root / "metrics.json"
        if metrics_file.exists():
            try:
                import json
                with open(metrics_file, "r") as f:
                    entry["metrics"] = json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load metrics for {version_id}: {e}")
                entry["metrics"] = None
        else:
            entry["metrics"] = None

        result.append(entry)
    return {"default_model": DEFAULT_MODEL_ID, "models": result}
