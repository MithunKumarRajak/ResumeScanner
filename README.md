# ResumeScanner : ML-Based Resume Screening & Optimization Platform

> Intelligently analyze, score, and optimize resumes using Machine Learning and NLP

![Status](https://img.shields.io/badge/Status-In%20Progress-yellow)

---

## 📋 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [ML Model](#-ml-model)
- [Full Stack App](#-full-stack-app)
- [Contributing](#-contributing)
- [Author](#-author)

---

## 🧠 About

**ResumeScanner** is an intelligent resume screening and optimization platform that uses **Machine Learning** and **Natural Language Processing (NLP)** to:

- Automatically **analyze resumes** and extract key information
- **Score and rank** resumes based on job descriptions
- Help candidates **optimize their resumes** with actionable suggestions
- Provide a **full-stack web interface** for easy interaction

Built as a final-year project by a B.Tech CSE student at Jagran Lakecity University, Bhopal.

---

## ✨ Features

### 🤖 ML & NLP Core

- Resume parsing and text extraction
- Keyword matching with job descriptions
- Skill gap analysis
- Resume scoring using trained ML model (ResumeModel v2)
- NLP-based entity recognition (skills, education, experience)

### 📝 Resume Editor

- Real-time resume editing interface
- Suggestions based on ML analysis
- Export optimized resume

### 🌐 Full Stack Web App

- Clean and responsive UI
- Upload resume (PDF/DOCX)
- Instant scoring and feedback
- Job description input for matching

### 📊 Reports & Analytics

- Detailed analysis report generation
- Visual skill match breakdown
- Improvement recommendations

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **ML / Data Science** | Python, Scikit-Learn, Pandas, NumPy, Joblib |
| **NLP & AI** | spaCy, PyMuPDF (`fitz`), Gemini AI, Groq AI, TF-IDF |
| **Frontend** | React, Vite, JavaScript, CSS3 |
| **Backend** | Python, FastAPI, SQLAlchemy |
| **Database** | PostgreSQL |
| **Tools** | VS Code, Postman, Git |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL Server

### 1. Clone the Repository

```bash
git clone https://github.com/MithunKumarRajak/ResumeScanner.git
cd ResumeScanner
```

### 2. Setup the Backend

```bash
cd FullStackApp/backend

# Create & activate virtual environment
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate # Linux/macOS

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server (Runs on port 8000)
python -m uvicorn app.main:app --reload --port 8000
```
*(Ensure your PostgreSQL service is running and configured in your `.env` file)*

### 3. Setup the Frontend

Open a new terminal window:
```bash
cd FullStackApp/frontend
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser 🎉

---

## 🤖 ML Model

### Multi-Version Pipeline (v2, v3, v5)

The core ML pipeline is dynamically loaded and includes:

| Step | Description |
|------|-------------|
| **Parsing** | Fast, accurate PDF/DOCX extraction using PyMuPDF (`fitz`) |
| **Preprocessing** | Text cleaning, tokenization, lemmatization using spaCy |
| **Feature Extraction** | TF-IDF Vectorization & custom NLP feature arrays |
| **Model Training** | Hybrid Adaptive models (SVM, KNN, OneVsRest) |
| **Evaluation** | Accuracy, Precision, Recall, F1-Score |

### AI Integrations
- **Generative AI:** Uses Gemini 2.0 Flash and Groq (Llama-3.3-70b) for on-the-fly Job Description generation and refinement.

---

## 🌐 Full Stack App

The web application allows users to:

1. **Upload** their resume (PDF or DOCX)
2. **Enter** a job description
3. **Get instant score** and keyword match analysis
4. **Edit** resume in real-time with the Resume Editor
5. **Download** the optimized resume

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch

   ```bash
   git checkout -b feature/YourFeature
   ```

3. Commit your changes

   ```bash
   git commit -m "Add YourFeature"
   ```

4. Push to the branch

   ```bash
   git push origin feature/YourFeature
   ```

5. Open a Pull Request

---

## 👨‍💻 Author

**Mithun Kumar Rajak**

- 🎓 B.Tech CSE @ Jagran Lakecity University, Bhopal
- 🛡️ Cybersecurity Enthusiast | Full-Stack Developer | ML & NLP Explorer
- 🔗 [GitHub](https://github.com/MithunKumarRajak)
- 💼 [LinkedIn](https://www.linkedin.com/in/mithun-kumar-rajak/)
- ✍️ [Medium](https://medium.com/@MithunKumarRajak)

---

## 📊 Project Status

> 🚧 **Currently In Development** — Features are being actively added.

| Module | Status |
|--------|--------|
| ML Model (v2, v3, v5) | ✅ |
| Database Migration (PostgreSQL) | ✅ |
| AI Integration (Gemini/Groq) | ✅ |
| Full Stack App | ✅ |
| Report Generator & Analytics | ✅ |
| Deployment | ⏳ |

---

*Made with ❤️ by Mithun Kumar Rajak*
