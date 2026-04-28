from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from sklearn.metrics.pairwise import cosine_similarity
import joblib
import spacy
import numpy as np
import re
import os
import json
import hashlib
import sqlite3
import secrets
from datetime import datetime, timedelta
from pathlib import Path

# Initialize FastAPI app
app = FastAPI(title="Resume Screener", version="2.0")
security = HTTPBearer(auto_error=False)

# ── SQLite Auth Database ─────────────────────────────────────────────────────
DB_PATH = Path(__file__).resolve().parent / "resume_screener.db"

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_auth_db():
    conn = get_db()
    conn.execute("""CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        token TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )""")
    conn.execute("""CREATE TABLE IF NOT EXISTS user_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        data_type TEXT NOT NULL,
        data_json TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, data_type)
    )""")
    conn.commit()
    conn.close()

def hash_password(password: str) -> str:
    salt = hashlib.sha256(os.urandom(32)).hexdigest()[:16]
    hashed = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}${hashed}"

def verify_password(password: str, stored: str) -> bool:
    parts = stored.split('$')
    if len(parts) != 2: return False
    salt, hashed = parts
    return hashlib.sha256((salt + password).encode()).hexdigest() == hashed

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    conn = get_db()
    user = conn.execute("SELECT id, name, email FROM users WHERE token = ?", (token,)).fetchone()
    conn.close()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return dict(user)

# Auth request/response models
class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class DeleteAccountRequest(BaseModel):
    password: str

class UserDataRequest(BaseModel):
    data_type: str  # 'parsed_resume' | 'resume_build' | 'job_description'
    data: dict

class JDGenerateRequest(BaseModel):
    job_title: str
    department: str = 'Engineering'
    experience_level: str = 'Senior (5-8 yrs)'
    work_mode: str = 'Hybrid'
    raw_notes: str = ''
    tone: str = 'Professional & Direct'
    focus_area: str = 'Technical Depth'

class JDRefineRequest(BaseModel):
    current_jd: dict  # the generated JD object
    instruction: str  # user's refinement instruction

# ── Gemini AI Client ─────────────────────────────────────────────────────────
_gemini_model = None

def _get_gemini():
    global _gemini_model
    if _gemini_model is not None:
        return _gemini_model
    from dotenv import load_dotenv
    load_dotenv()
    api_key = os.getenv('GEMINI_API_KEY', '').strip()
    if not api_key:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        _gemini_model = genai.GenerativeModel('gemini-2.0-flash')
        return _gemini_model
    except Exception as e:
        print(f"[WARN] Gemini init failed: {e}")
        return None


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
loaded_embedders = {}


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


# Model metadata for the /models endpoint
MODEL_REGISTRY = {
    "ResumeModel_v2": {
        "dir": "..",          # relative to backend/
        "description": "Base model — KNN + OneVsRest (TF-IDF 5K features)",
        "algorithm": "OneVsRestClassifier(KNeighborsClassifier)",
        "badge": "Active",
        "model_type": "classic_tfidf",
    },
    "ResumeModel_v3": {
        "dir": os.path.join("..", "v3"),
        "description": "Enhanced — Linear SVM + balanced classes (TF-IDF 10K features)",
        "algorithm": "OneVsRestClassifier(CalibratedClassifierCV(SGDClassifier))",
        "badge": "New",
        "model_type": "classic_tfidf",
    },
    "ResumeModel_v5": {
        "dir": os.path.join("..", "v5"),
        "description": "Final — adaptive hybrid model with semantic and feature support",
        "algorithm": "OneVsRestClassifier(CalibratedClassifierCV(SGDClassifier))",
        "badge": "Final",
        "model_type": "hybrid_adaptive",
    },
}


def _load_single_model(version_id: str, model_dir: str):
    """Load a single model's artifacts from the given directory."""
    base = Path(__file__).resolve().parent
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
        artifacts["model_dir"] = model_root
        artifacts["id"] = version_id

        embedder_file = model_root / "embedder.txt"
        if embedder_file.exists():
            artifacts["embedder_name"] = embedder_file.read_text(
                encoding="utf-8").strip()

        artifacts["input_features"] = int(
            getattr(artifacts["model"], "n_features_in_", 0) or 0)

        print(f"  [OK] {version_id} loaded from {model_dir}")
        return artifacts
    except FileNotFoundError as e:
        print(f"  [WARN] {version_id} NOT loaded ({e})")
        return None
    except Exception as e:
        print(f"  [WARN] {version_id} error: {e}")
        return None


@app.on_event("startup")
def load_models():
    """Load all registered model versions on app startup."""
    global nlp

    # Initialize auth database tables
    init_auth_db()

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
    for fallback in ("ResumeModel_v2", "ResumeModel_v3", "ResumeModel_v5"):
        if fallback in loaded_models:
            return loaded_models[fallback]
    return None


def extract_structured_features(text: str) -> np.ndarray:
    """Extract compact numerical resume features used by hybrid models."""
    text_lower = text.lower()
    years = 0.0
    years_match = re.search(r"(\d+)\+?\s+years?", text_lower)
    if years_match:
        years = min(float(years_match.group(1)) / 30.0, 1.0)

    has_degree = 1.0 if any(kw in text_lower for kw in [
                            "bachelor", "b.s", "b.sc", "b.a"]) else 0.0
    has_masters = 1.0 if any(kw in text_lower for kw in [
                             "master", "m.s", "m.a", "mba"]) else 0.0

    technical_keywords = [
        "python", "java", "sql", "aws", "docker", "kubernetes",
        "api", "database", "developer", "engineer"
    ]
    is_technical = 1.0 if sum(
        1 for kw in technical_keywords if kw in text_lower) >= 3 else 0.0
    is_management = 1.0 if any(kw in text_lower for kw in [
                               "manager", "lead", "director", "head of", "chief"]) else 0.0
    is_sales = 1.0 if any(kw in text_lower for kw in [
                          "sales", "business development", "account executive"]) else 0.0

    return np.array([[years, has_degree, has_masters, is_technical, is_management, is_sales]], dtype=np.float32)


def _get_embedder(embedder_name: str):
    """Lazy-load and cache sentence-transformer models for inference."""
    if embedder_name in loaded_embedders:
        return loaded_embedders[embedder_name]

    try:
        from sentence_transformers import SentenceTransformer
    except ImportError as exc:
        print(
            "⚠ sentence-transformers not installed; using a lightweight fallback embedder"
        )
        loaded_embedders[embedder_name] = _FallbackEmbedder()
        return loaded_embedders[embedder_name]

    loaded_embedders[embedder_name] = SentenceTransformer(embedder_name)
    return loaded_embedders[embedder_name]


def _build_inference_vector(processed_text: str, raw_text: str, model_bundle: dict):
    """Build feature vector based on model's expected input dimensionality."""
    tfidf = model_bundle["tfidf"]
    model = model_bundle["model"]

    tfidf_vector = tfidf.transform([processed_text])
    tfidf_dim = int(tfidf_vector.shape[1])
    feature_vector = extract_structured_features(raw_text)
    feature_dim = int(feature_vector.shape[1])
    expected_dim = int(
        getattr(model, "n_features_in_", tfidf_dim) or tfidf_dim)

    if expected_dim == tfidf_dim:
        return tfidf_vector, tfidf_vector

    if expected_dim == tfidf_dim + feature_dim:
        hybrid = np.hstack([tfidf_vector.toarray(), feature_vector])
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


# Request/Response models
class ResumeInput(BaseModel):
    resume_text: str
    job_description: Optional[str] = None
    # e.g. "ResumeModel_v2" or "ResumeModel_v3"
    model_version: Optional[str] = None


class PredictionOutput(BaseModel):
    predicted_category: str
    confidence: float
    model_version: Optional[str] = None
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
            "model_type": meta.get("model_type", "classic_tfidf"),
            "available": version_id in loaded_models,
        }
        if version_id in loaded_models:
            entry["categories"] = len(
                loaded_models[version_id]["label_encoder"].classes_)
            entry["input_features"] = loaded_models[version_id].get(
                "input_features")
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

    model = resolved["model"]
    tfidf = resolved["tfidf"]
    label_encoder = resolved["label_encoder"]

    if not input_data.resume_text or len(input_data.resume_text.strip()) == 0:
        raise HTTPException(
            status_code=400, detail="Resume text cannot be empty")

    try:
        # Preprocess the input text
        processed_text = preprocess_text(input_data.resume_text)

        # Build model-specific inference vector while preserving TF-IDF for term explanation.
        model_vectorized, tfidf_vector_for_terms = _build_inference_vector(
            processed_text,
            input_data.resume_text,
            resolved,
        )

        # Make prediction
        prediction = model.predict(model_vectorized)
        prediction_proba = model.predict_proba(model_vectorized)

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
            similarity = cosine_similarity(
                tfidf_vector_for_terms, jd_vectorized)[0][0]
            match_score = round(float(similarity) * 100, 2)

            # Extract top terms from each document
            resume_top_terms = get_top_tfidf_terms(
                tfidf_vector_for_terms, tfidf, n=10)
            jd_top_terms = get_top_tfidf_terms(jd_vectorized, tfidf, n=10)

        return PredictionOutput(
            predicted_category=predicted_category,
            confidence=round(confidence, 4),
            model_version=resolved.get("id"),
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
        return {"categories": sorted(categories), "model_version": resolved.get("id")}
    return {"categories": []}


# ── Auth Endpoints ───────────────────────────────────────────────────────────
@app.post("/auth/signup")
def auth_signup(req: SignupRequest):
    if not req.name.strip() or not req.email.strip() or not req.password.strip():
        raise HTTPException(status_code=400, detail="All fields are required")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (req.email.lower(),)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=409, detail="Email already registered")
    token = secrets.token_hex(32)
    pw_hash = hash_password(req.password)
    conn.execute("INSERT INTO users (name, email, password_hash, token) VALUES (?, ?, ?, ?)",
                 (req.name.strip(), req.email.lower().strip(), pw_hash, token))
    conn.commit()
    user = conn.execute("SELECT id, name, email FROM users WHERE token = ?", (token,)).fetchone()
    conn.close()
    return {"user": {"id": user["id"], "name": user["name"], "email": user["email"], "token": token}}


@app.post("/auth/login")
def auth_login(req: LoginRequest):
    if not req.email.strip() or not req.password.strip():
        raise HTTPException(status_code=400, detail="Email and password are required")
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (req.email.lower().strip(),)).fetchone()
    if not user or not verify_password(req.password, user["password_hash"]):
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = secrets.token_hex(32)
    conn.execute("UPDATE users SET token = ? WHERE id = ?", (token, user["id"]))
    conn.commit()
    conn.close()
    return {"user": {"id": user["id"], "name": user["name"], "email": user["email"], "token": token}}


@app.get("/auth/me")
def auth_me(user: dict = Depends(get_current_user)):
    conn = get_db()
    row = conn.execute("SELECT id, name, email, created_at FROM users WHERE id = ?", (user["id"],)).fetchone()
    conn.close()
    return {"user": dict(row) if row else user}


@app.put("/auth/profile")
def update_profile(req: ProfileUpdateRequest, user: dict = Depends(get_current_user)):
    conn = get_db()
    if req.email:
        existing = conn.execute("SELECT id FROM users WHERE email = ? AND id != ?",
                               (req.email.lower().strip(), user["id"])).fetchone()
        if existing:
            conn.close()
            raise HTTPException(status_code=409, detail="Email already in use by another account")
    updates = []
    params = []
    if req.name and req.name.strip():
        updates.append("name = ?")
        params.append(req.name.strip())
    if req.email and req.email.strip():
        updates.append("email = ?")
        params.append(req.email.lower().strip())
    if not updates:
        conn.close()
        raise HTTPException(status_code=400, detail="No fields to update")
    params.append(user["id"])
    conn.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
    conn.commit()
    updated = conn.execute("SELECT id, name, email FROM users WHERE id = ?", (user["id"],)).fetchone()
    token = conn.execute("SELECT token FROM users WHERE id = ?", (user["id"],)).fetchone()["token"]
    conn.close()
    return {"user": {"id": updated["id"], "name": updated["name"], "email": updated["email"], "token": token}}


@app.put("/auth/change-password")
def change_password(req: PasswordChangeRequest, user: dict = Depends(get_current_user)):
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    conn = get_db()
    row = conn.execute("SELECT password_hash FROM users WHERE id = ?", (user["id"],)).fetchone()
    if not verify_password(req.current_password, row["password_hash"]):
        conn.close()
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    new_hash = hash_password(req.new_password)
    new_token = secrets.token_hex(32)
    conn.execute("UPDATE users SET password_hash = ?, token = ? WHERE id = ?",
                 (new_hash, new_token, user["id"]))
    conn.commit()
    conn.close()
    return {"status": "password_changed", "token": new_token}


@app.delete("/auth/delete-account")
def delete_account(req: DeleteAccountRequest, user: dict = Depends(get_current_user)):
    conn = get_db()
    row = conn.execute("SELECT password_hash FROM users WHERE id = ?", (user["id"],)).fetchone()
    if not verify_password(req.password, row["password_hash"]):
        conn.close()
        raise HTTPException(status_code=401, detail="Password is incorrect")
    conn.execute("DELETE FROM user_data WHERE user_id = ?", (user["id"],))
    conn.execute("DELETE FROM users WHERE id = ?", (user["id"],))
    conn.commit()
    conn.close()
    return {"status": "account_deleted"}


# ── User Data Endpoints ──────────────────────────────────────────────────────
@app.post("/user/data")
def save_user_data(req: UserDataRequest, user: dict = Depends(get_current_user)):
    """Save user data (parsed_resume, resume_build, job_description, etc.)"""
    conn = get_db()
    conn.execute("""INSERT INTO user_data (user_id, data_type, data_json, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, data_type) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at""",
        (user["id"], req.data_type, json.dumps(req.data), datetime.now().isoformat()))
    conn.commit()
    conn.close()
    return {"status": "saved", "data_type": req.data_type}


@app.get("/user/data/{data_type}")
def get_user_data(data_type: str, user: dict = Depends(get_current_user)):
    """Load user data by type."""
    conn = get_db()
    row = conn.execute("SELECT data_json, updated_at FROM user_data WHERE user_id = ? AND data_type = ?",
                       (user["id"], data_type)).fetchone()
    conn.close()
    if not row:
        return {"data": None}
    return {"data": json.loads(row["data_json"]), "updated_at": row["updated_at"]}


@app.get("/user/data")
def get_all_user_data(user: dict = Depends(get_current_user)):
    """Load all saved data for the user."""
    conn = get_db()
    rows = conn.execute("SELECT data_type, data_json, updated_at FROM user_data WHERE user_id = ?",
                        (user["id"],)).fetchall()
    conn.close()
    result = {}
    for row in rows:
        result[row["data_type"]] = {"data": json.loads(row["data_json"]), "updated_at": row["updated_at"]}
    return result


# ── AI Generation Endpoints ──────────────────────────────────────────────────
@app.post("/ai/generate-jd")
def ai_generate_jd(req: JDGenerateRequest):
    """Generate a job description using Gemini AI."""
    model = _get_gemini()
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key not configured. Add GEMINI_API_KEY to backend/.env file. Get a free key at https://aistudio.google.com/apikey"
        )

    prompt = f"""You are an expert HR recruiter and job description writer.
Generate a compelling, detailed job description based on these parameters:

- Job Title: {req.job_title}
- Department: {req.department}
- Experience Level: {req.experience_level}
- Work Mode: {req.work_mode}
- Tone: {req.tone}
- Focus Area: {req.focus_area}
{f'- Additional Notes/Requirements: {req.raw_notes}' if req.raw_notes.strip() else ''}

Respond ONLY with a valid JSON object (no markdown, no code blocks, no extra text) in this exact format:
{{
  "title": "the job title",
  "meta": "Department . Work Mode . Experience Level",
  "about": "A compelling 3-4 sentence paragraph about the role and its impact",
  "tasks": ["4-6 specific responsibilities as separate strings"],
  "requirements": ["4-6 requirements/qualifications as separate strings"]
}}

Make the description specific, engaging, and optimized for attracting top talent.
Use the specified tone throughout. Focus on the specified focus area.
"""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Clean markdown code blocks if present
        if text.startswith('```'):
            text = text.split('\n', 1)[1] if '\n' in text else text[3:]
        if text.endswith('```'):
            text = text[:-3].strip()
        if text.startswith('json'):
            text = text[4:].strip()

        result = json.loads(text)
        # Validate required fields
        for key in ('title', 'about', 'tasks', 'requirements'):
            if key not in result:
                raise ValueError(f"Missing field: {key}")
        return result
    except json.JSONDecodeError:
        # If Gemini didn't return valid JSON, try to extract it
        try:
            json_match = re.search(r'\{[\s\S]*\}', text)
            if json_match:
                return json.loads(json_match.group())
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="AI returned invalid format. Please try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation error: {str(e)}")


@app.post("/ai/refine-jd")
def ai_refine_jd(req: JDRefineRequest):
    """Refine an existing job description using Gemini AI."""
    model = _get_gemini()
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key not configured. Add GEMINI_API_KEY to backend/.env file."
        )

    current_json = json.dumps(req.current_jd, indent=2)
    prompt = f"""You are an expert HR recruiter. Here is a current job description as JSON:

{current_json}

The user wants to refine it with this instruction:
"{req.instruction}"

Apply the user's requested changes to the job description.
Respond ONLY with the complete updated JSON object (no markdown, no code blocks, no extra text).
Keep the same JSON structure with fields: title, meta, about, tasks (array), requirements (array).
"""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith('```'):
            text = text.split('\n', 1)[1] if '\n' in text else text[3:]
        if text.endswith('```'):
            text = text[:-3].strip()
        if text.startswith('json'):
            text = text[4:].strip()

        result = json.loads(text)
        return result
    except json.JSONDecodeError:
        try:
            json_match = re.search(r'\{[\s\S]*\}', text)
            if json_match:
                return json.loads(json_match.group())
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="AI returned invalid format. Please try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI refinement error: {str(e)}")


if __name__ == "__main__":
    init_auth_db()
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

