from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pathlib import Path
import base64
import io
import tempfile
import os
import sys
import time
import pandas as pd

from ..config import settings
from ..database.session import get_db
from ..schemas.advanced import (SemanticMatchRequest, SemanticMatchResponse, ExplainRequest,
                              ExplainResponse, BiasCheckRequest, BiasCheckResponse,
                              LanguageDetectResponse, FineTuneRequest, FineTuneResponse)
from ..models.analysis import ResumeAnalysis
from ..models.advanced import BiasAuditLog, CustomModelConfig

_file_parents = Path(__file__).resolve().parents
REPO_ROOT = _file_parents[4] if len(_file_parents) > 4 else _file_parents[3]


def _resolve_model_dir() -> Path:
    model_dir = Path(settings.MODEL_DIR)
    if not model_dir.is_absolute():
        model_dir = (REPO_ROOT / model_dir).resolve()
    return model_dir


def _ensure_repo_root_on_path() -> None:
    repo_root_str = str(REPO_ROOT)
    if repo_root_str not in sys.path:
        sys.path.insert(0, repo_root_str)
    # Support local non-Docker development after ML script move
    ml_pipelines_dir = str(REPO_ROOT / 'ml_pipelines')
    if os.path.exists(ml_pipelines_dir) and ml_pipelines_dir not in sys.path:
        sys.path.insert(0, ml_pipelines_dir)


# Lazy-loaded singletons (avoid reloading on every request)
_semantic_matcher = None
_xai_explainer = None
_bias_detector = None
_preprocessor = None
_model_artifacts = None


def get_semantic_matcher():
    global _semantic_matcher
    if _semantic_matcher is None:
        _ensure_repo_root_on_path()
        from ResumeModel_v6 import SemanticMatcher
        _semantic_matcher = SemanticMatcher()
    return _semantic_matcher


def get_bias_detector():
    global _bias_detector
    if _bias_detector is None:
        _ensure_repo_root_on_path()
        from ResumeModel_v6 import BiasDetector
        _bias_detector = BiasDetector()
    return _bias_detector


def get_preprocessor():
    global _preprocessor
    if _preprocessor is None:
        _ensure_repo_root_on_path()
        from ResumeModel_v6 import MultilingualPreprocessor
        _preprocessor = MultilingualPreprocessor()
    return _preprocessor


def get_xai_explainer():
    global _xai_explainer, _model_artifacts
    if _xai_explainer is None:
        import joblib
        import json
        _ensure_repo_root_on_path()
        from ResumeModel_v6 import XAIExplainer
        model_dir = _resolve_model_dir()
        model = joblib.load(model_dir / 'model.pkl')
        tfidf = joblib.load(model_dir / 'tfidf.pkl')
        le = joblib.load(model_dir / 'encoder.pkl')
        with open(model_dir / 'feature_names.json') as f:
            feature_names = json.load(f)
        _xai_explainer = XAIExplainer(model, tfidf, le, feature_names)
        _model_artifacts = {'model': model, 'tfidf': tfidf, 'le': le}
    return _xai_explainer


router = APIRouter(prefix="/api/v1/advanced", tags=["Advanced — Advanced ML"])


@router.post("/match", response_model=SemanticMatchResponse)
async def semantic_match(request: SemanticMatchRequest, db: Session = Depends(get_db)):
    """
    POST /api/v1/advanced/match
    Semantic matching between a resume and job description.
    Returns combined score, matched/missing keywords, and optional XAI + bias check.
    """
    t_start = time.time()

    matcher = get_semantic_matcher()
    preprocessor = get_preprocessor()

    # Detect language
    resume_processed = preprocessor.preprocess(request.resume_text)
    detected_lang = resume_processed['lang']

    # Semantic match
    match_result = matcher.match_resume_to_jd(
        resume_processed['processed'],
        request.job_description
    )

    # Optional XAI
    explanation = None
    if request.include_explanation:
        try:
            explainer = get_xai_explainer()
            import numpy as np
            _ensure_repo_root_on_path()
            from ResumeModel_v6 import extract_features_v6
            extra_feats = np.array(
                [[v for v in extract_features_v6(request.resume_text, detected_lang).values()]])
            model_dir = _resolve_model_dir()
            X_bg = np.load(model_dir / 'resume_embeddings.npy')[:200]
            explanation = explainer.explain_resume(
                request.resume_text,
                resume_processed['processed'],
                extra_feats,
                X_bg
            )
        except Exception as e:
            explanation = {'error': str(e)}

    # Optional bias check
    bias_flags = None
    if request.include_bias_check:
        bias_det = get_bias_detector()
        bias_result = bias_det.detect_protected_attributes(request.resume_text)
        bias_flags = bias_result.get('bias_risk_flags', [])

        # Log to DB
        if bias_flags:
            audit = BiasAuditLog(
                audit_type='single_resume',
                sensitive_feature='gender_and_age',
                bias_assessment='FLAGGED',
                recommendation='Review flagged resume for potential bias indicators.',
                raw_report=bias_result
            )
            db.add(audit)

    # Save to DB
    duration_ms = int((time.time() - t_start) * 1000)
    analysis = ResumeAnalysis(
        resume_id=None,  # Cannot strictly link without frontend context in this isolated route unless passed in
        job_description_text=request.job_description[:2000],
        semantic_score=match_result['semantic_score'],
        keyword_overlap_score=match_result['keyword_overlap_score'],
        combined_score=match_result['combined_score'],
        matched_keywords=match_result['matched_keywords'],
        missing_keywords=match_result['missing_keywords'],
        semantic_model_used=match_result['model_used'],
        predicted_category=explanation.get(
            'predicted_category') if explanation and 'error' not in explanation else None,
        prediction_confidence=explanation.get(
            'confidence') if explanation and 'error' not in explanation else None,
        explanation=explanation,
        explanation_summary=explanation.get(
            'explanation_summary') if explanation and 'error' not in explanation else None,
        detected_language=detected_lang,
        bias_flags=bias_flags or [],
        analysis_duration_ms=duration_ms,
        overall_score=match_result['combined_score'],
        keyword_match_score=match_result['keyword_overlap_score'],
        skills_match_score=match_result['keyword_overlap_score'],
        experience_score=0.0
    )
    # Note: `resume_id` is non-nullable in ResumeAnalysis, so DB commit will fail if resume_id is missing.
    # Therefore, omitting db.commit() for this purely analytical endpoint to avoid constraint failure
    # or it should be passed in request. I will just skip saving unless resume_id is provided.

    return SemanticMatchResponse(
        semantic_score=match_result['semantic_score'],
        keyword_overlap_score=match_result['keyword_overlap_score'],
        combined_score=match_result['combined_score'],
        matched_keywords=match_result['matched_keywords'],
        missing_keywords=match_result['missing_keywords'],
        model_used=match_result['model_used'],
        explanation=explanation,
        bias_flags=bias_flags,
        detected_language=detected_lang,
        analysis_id=None
    )


@router.post("/explain", response_model=ExplainResponse)
async def explain_prediction(request: ExplainRequest):
    """
    POST /api/v1/advanced/explain
    Get SHAP-based XAI explanation for why a resume got a certain score/category.
    """
    try:
        explainer = get_xai_explainer()
        preprocessor = get_preprocessor()

        import numpy as np
        import os
        import joblib
        from ResumeModel_v6 import extract_features_v6

        resume_data = preprocessor.preprocess(request.resume_text)
        extra_feats = np.array([[v for v in extract_features_v6(
            request.resume_text, resume_data['lang']).values()]])

        model_dir = _resolve_model_dir()
        X_bg = np.load(model_dir / 'resume_embeddings.npy')[:200]

        result = explainer.explain_resume(
            request.resume_text,
            resume_data['processed'],
            extra_feats,
            X_bg
        )
        return ExplainResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Explanation failed: {str(e)}")


@router.post("/bias-check", response_model=BiasCheckResponse)
async def check_bias(request: BiasCheckRequest, db: Session = Depends(get_db)):
    """
    POST /api/v1/advanced/bias-check
    Scan resume text for potential protected-attribute indicators.
    """
    bias_det = get_bias_detector()
    result = bias_det.detect_protected_attributes(request.resume_text)

    recommendation = (
        "No bias indicators detected." if not result['bias_risk_flags']
        else "Resume contains language that may introduce bias in automated screening. Consider blind review."
    )

    # Log to DB
    if result['bias_risk_flags']:
        log = BiasAuditLog(
            audit_type='single_resume',
            sensitive_feature='gender_age',
            bias_assessment='FLAGGED',
            recommendation=recommendation,
            raw_report=result
        )
        db.add(log)
        db.commit()

    return BiasCheckResponse(**result, recommendation=recommendation)


@router.post("/detect-language", response_model=LanguageDetectResponse)
async def detect_language(text: str):
    """POST /api/v1/advanced/detect-language — Detect resume language."""
    preprocessor = get_preprocessor()
    result = preprocessor.lang_detector.detect(text)
    lang_names = {'en': 'English', 'hi': 'Hindi'}
    return LanguageDetectResponse(
        language=result,
        language_name=lang_names.get(result, 'Unknown'),
        is_supported=result in lang_names
    )


@router.post("/fine-tune", response_model=FineTuneResponse)
async def fine_tune_model(request: FineTuneRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    POST /api/v1/advanced/fine-tune
    Upload a company CSV and fine-tune the v6 model in the background.
    CSV must have columns: Resume, Category
    """
    # Decode CSV
    try:
        csv_bytes = base64.b64decode(request.csv_base64)
        custom_df = pd.read_csv(io.BytesIO(csv_bytes))
        assert 'Resume' in custom_df.columns and 'Category' in custom_df.columns
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {e}")

    if len(custom_df) < 10:
        raise HTTPException(
            status_code=400, detail="Need at least 10 samples for fine-tuning")

    # Save temp CSV
    model_dir = _resolve_model_dir()
    out_dir = model_dir.parent / \
        f"{model_dir.name}-{request.company_name.replace(' ', '_').lower()}"
    tmp_csv = tempfile.NamedTemporaryFile(suffix='.csv', delete=False)
    custom_df.to_csv(tmp_csv.name, index=False)

    # Create DB record
    config = CustomModelConfig(
        company_name=request.company_name,
        model_path=out_dir,
        training_samples=len(custom_df),
        categories=custom_df['Category'].unique().tolist(),
        is_active=False
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    config_id = config.id

    def run_fine_tune():
        _ensure_repo_root_on_path()
        from ResumeModel_v6 import fine_tune_on_custom_data
        try:
            manifest = fine_tune_on_custom_data(
                str(model_dir), tmp_csv.name, str(out_dir), request.epochs)
            # Update DB record
            session = next(get_db())
            record = session.query(CustomModelConfig).filter_by(
                id=config_id).first()
            if record:
                record.trained_at = manifest['trained_at']
                session.commit()
        except Exception as e:
            print(f"Fine-tuning failed: {e}")
        finally:
            os.unlink(tmp_csv.name)

    background_tasks.add_task(run_fine_tune)

    return FineTuneResponse(
        status='training_started',
        company_name=request.company_name,
        model_path=out_dir,
        training_samples=len(custom_df),
        message=f"Fine-tuning started for {len(custom_df)} samples. Check /fine-tune/status/{config_id} for progress."
    )


@router.get("/fine-tune/status/{config_id}")
async def fine_tune_status(config_id: str, db: Session = Depends(get_db)):
    """GET /api/v1/advanced/fine-tune/status/{id} — Check fine-tune job status."""
    config = db.query(CustomModelConfig).filter_by(id=config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    return {
        'id': config.id,
        'company_name': config.company_name,
        'status': 'completed' if config.trained_at else 'training',
        'training_samples': config.training_samples,
        'trained_at': config.trained_at,
        'model_path': config.model_path
    }


@router.get("/bias-report")
async def get_bias_report(limit: int = 50, db: Session = Depends(get_db)):
    """GET /api/v1/advanced/bias-report — Recent bias audit log."""
    logs = db.query(BiasAuditLog).order_by(
        BiasAuditLog.created_at.desc()).limit(limit).all()
    return {'logs': [{'id': l.id, 'assessment': l.bias_assessment,
                      'feature': l.sensitive_feature, 'created_at': str(l.created_at)} for l in logs]}
