from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class SemanticMatchRequest(BaseModel):
    resume_text: str = Field(..., min_length=50, description="Full resume text")
    job_description: str = Field(..., min_length=20, description="Job description text")
    include_explanation: bool = Field(default=True)
    include_bias_check: bool = Field(default=True)

class SemanticMatchResponse(BaseModel):
    semantic_score: float
    keyword_overlap_score: float
    combined_score: float
    matched_keywords: List[str]
    missing_keywords: List[str]
    model_used: str
    explanation: Optional[Dict[str, Any]] = None
    bias_flags: Optional[List[str]] = None
    detected_language: Optional[str] = None
    analysis_id: Optional[str] = None  # DB ID for later retrieval, using str to support UUID

class ExplainRequest(BaseModel):
    resume_text: str
    job_description: Optional[str] = None

class ExplainResponse(BaseModel):
    predicted_category: str
    confidence: float
    confidence_pct: float
    top_positive_features: List[Dict[str, Any]]
    top_negative_features: List[Dict[str, Any]]
    explanation_summary: str
    model_version: str

class BiasCheckRequest(BaseModel):
    resume_text: str

class BiasCheckResponse(BaseModel):
    gender_indicators_found: List[str]
    age_indicators_found: List[str]
    name_origin_detected: Optional[str]
    bias_risk_flags: List[str]
    recommendation: str

class LanguageDetectResponse(BaseModel):
    language: str
    language_name: str
    is_supported: bool

class FineTuneRequest(BaseModel):
    company_name: str
    csv_base64: str          # base64-encoded CSV file content
    epochs: int = Field(default=5, ge=1, le=20)

class FineTuneResponse(BaseModel):
    status: str
    company_name: str
    model_path: str
    training_samples: int
    message: str
