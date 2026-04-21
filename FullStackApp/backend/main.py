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
app = FastAPI(title="Resume Screener", version="1.0")

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

# Global variables to store model and preprocessors
model = None
tfidf = None
label_encoder = None
nlp = None


@app.on_event("startup")
def load_models():
    """Load model and preprocessors on app startup"""
    global model, tfidf, label_encoder, nlp

    try:
        # Load the model from parent directory
        model_path = os.path.join(os.path.dirname(
            __file__), "..", "model.pkl")
        model = joblib.load(model_path)
        print(f" Model loaded from {model_path}")

        # Load TF-IDF Vectorizer
        tfidf_path = os.path.join(os.path.dirname(
            __file__), "..", "tfidf.pkl")
        tfidf = joblib.load(tfidf_path)
        print(f" TF-IDF loaded")

        # Load Label Encoder
        encoder_path = os.path.join(os.path.dirname(
            __file__), "..", "encoder.pkl")
        label_encoder = joblib.load(encoder_path)
        print(f" Label Encoder loaded")

        # Load spaCy model
        nlp = spacy.load("en_core_web_sm")
        print(f" spaCy model loaded")

    except FileNotFoundError as e:
        print(f"ERROR: {e}")
        print("Make sure model.pkl, tfidf.pkl, and encoder.pkl are in the FullStackApp directory")
    except Exception as e:
        print(f"ERROR loading models: {str(e)}")
        print("This could be due to corrupted pkl files or version incompatibilities")


# Request/Response models
class ResumeInput(BaseModel):
    resume_text: str
    job_description: Optional[str] = None


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
        "endpoints": {
            "predict": "POST /predict",
            "docs": "/docs"
        }
    }


@app.post("/predict", response_model=PredictionOutput)
def predict_resume(input_data: ResumeInput):
    """
    Predict the job category from resume text

    Args:
        input_data: JSON with 'resume_text' field

    Returns:
        Predicted category and confidence score
    """

    # Validate that all models are loaded
    if model is None or tfidf is None or label_encoder is None or nlp is None:
        raise HTTPException(
            status_code=500,
            detail="Models not loaded. Please check backend logs and ensure model.pkl, tfidf.pkl, and encoder.pkl exist in the FullStackApp directory")

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
def get_categories():
    """Get all available job categories"""
    if label_encoder is not None:
        categories = label_encoder.classes_.tolist()
        return {"categories": sorted(categories)}
    return {"categories": []}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
