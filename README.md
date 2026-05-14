# ResumeScanner: ML-Based Resume Screening & Optimization

A full-stack platform designed to analyze, score, and optimize resumes using Machine Learning and Natural Language Processing (NLP). The system evaluates candidate resumes against job descriptions, identifies skill gaps, and provides actionable feedback.

![Status](https://img.shields.io/badge/Status-Active%20Development-green)

---

## Key Features

### Core ML & NLP

- **Resume Parsing:** Automated text extraction from PDF and DOCX files.
- **Matching Engine:** TF-IDF and Cosine Similarity for keyword-based relevance scoring.
- **Skill Extraction:** NLP-based entity recognition to identify technical and soft skills.
- **Predictive Scoring:** Multi-version model pipeline (up to v6) for candidate classification.

### Advanced AI Capabilities

- **Semantic Matching:** Uses Sentence Transformer embeddings for deep contextual analysis (multilingual support).
- **Explainable AI (XAI):** Integrated SHAP support to visualize features influencing the model's scoring.
- **Bias Auditing:** Fairness engine to monitor demographic parity in scoring.
- **LLM Integration:** Utilizes Google Gemini and Groq (api) for resume summarization and JD refinement.

### System Features

- **ATS Compatibility Checker:** Detects formatting issues like multi-column layouts and tables.
- **Bulk Processing:** Support for batch uploading and scoring multiple resumes simultaneously.
- **Candidate Comparison:** Side-by-side matrix view for comparing multiple candidates.
- **Analytics Dashboard:** Visual breakdowns of skill matches and candidate performance.
- **Automated Notifications:** Email integration for status updates via SendGrid.

### Real-time Editor

- Embedded `/editor` page inside `FullStackApp/frontend` to refine resumes based on system suggestions.
- Live re-scoring through `POST /api/rescore` after edits are saved.
- Native PDF export functionality for optimized documents.

---

## Tech Stack

| Component | Technologies |
| :--- | :--- |
| **Backend** | Python, FastAPI, SQLAlchemy, Alembic, PostgreSQL |
| **Frontend** | React (Vite), Tailwind CSS, Zustand, React Query |
| **ML** | Scikit-learn, Pandas, NumPy, Joblib, SHAP |
| **NLP** | spaCy, Sentence-Transformers, PyMuPDF, python-docx |
| **AI** | Google Gemini API, Groq Cloud API |
| **Utilities** | SendGrid, JWT Auth, Pydantic |

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL

### 1. Clone & Setup

```bash
git clone https://github.com/MithunKumarRajak/ResumeScanner.git
cd ResumeScanner
```

### 2. Backend Installation

```bash
cd FullStackApp/backend
python -m venv venv
source venv/bin/activate # Windows: venv\Scripts\activate
pip install -r requirements.txt
# Configure your .env file with DATABASE_URL and API keys.
# A root .env.example and FullStackApp/backend/.env.example are provided.
python -m uvicorn app.main:app --reload
```

### 3. Frontend Installation

```bash
cd FullStackApp/frontend
npm install
npm run dev
```

---

## Project Structure

- `FullStackApp/backend`: FastAPI application, models, and ML service layers.
- `FullStackApp/frontend`: React application with Tailwind styling, including the embedded resume editor at `/editor`.
- `FullStackApp/model.pkl`: Serialized scikit-learn model artifacts.
- `FullStackApp/v5/pipeline.pkl`: Preferred unified v5 artifact when retrained; bundles model, vectorizer, encoder, preprocessing, and feature extraction.
- `Resume_Editor`: Legacy standalone editor source kept for reference only; the maintained product path is the embedded FullStackApp editor.
- `notebooks/experiments`: Archived exploratory notebooks such as v2/v4.

## ML Artifact Contract

Training and inference must use the same preprocessing. For v5, retrain with:

```bash
python ResumeModel_v5.py --data-dir Dataset --out-dir FullStackApp/v5
```

The script writes both legacy artifacts and `pipeline.pkl`. Backend loading prefers `pipeline.pkl` when present, preventing TF-IDF preprocessing mismatch between training and live inference.

## Model Performance

The following table summarizes the performance of the various model versions integrated into the system. The latest version (**v6**) leverages advanced semantic embeddings and expanded feature sets.

| Model Version | Accuracy | Macro F1 | Categories | Samples |
| :--- | :--- | :--- | :--- | :--- |
| v1 (Original) | 98.96% | — | 25 | 962 |
| v2 (Master) | 57.88% | 0.52 | 48 | 2,824 |
| v3 | 71.50% | 0.68 | 48 | 2,824 |
| v4 | 71.50% | 0.70 | 48 | 2,824 |
| v5 | 69.20% | 0.73 | 42 | 2,824 |
| **v6 (Latest)** | **76.28%** | **0.782** | **46** | **2,824** |

> Note: V1 is not directly comparable to the later versions because it was trained on a much smaller 25-category dataset. For the final project demo and submission, use V6 as the recommended model.

---

## Author

**Mithun Kumar Rajak**

- [GitHub](https://github.com/MithunKumarRajak)
- [LinkedIn](https://www.linkedin.com/in/mithun-kumar-rajak/)

---
*Developed as a B.Tech(CSE) Project at Jagran Lakecity University, Bhopal.*
