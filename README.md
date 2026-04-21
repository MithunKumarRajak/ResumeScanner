# 📄 ResumeScanner — ML-Based Resume Screening & Optimization Platform

> **Intelligently analyze, score, and optimize resumes using Machine Learning and NLP**

![Python](https://img.shields.io/badge/Python-3670A0?style=flat&logo=python&logoColor=ffdd54)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Jupyter](https://img.shields.io/badge/Jupyter-F37626?style=flat&logo=jupyter&logoColor=white)
![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-F7931E?style=flat&logo=scikit-learn&logoColor=white)
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
| **ML / Data Science** | Python, Jupyter Notebook, Scikit-Learn, Pandas, Matplotlib, Seaborn |
| **NLP** | NLTK / spaCy, Text Preprocessing, TF-IDF, ML Pipeline |
| **Frontend** | TypeScript, JavaScript, HTML5, CSS3 |
| **Backend** | Python, FastAPI / Django |
| **Tools** | VS Code, Postman, Jupyter Notebook, Git |

---

## 📁 Project Structure

```
ResumeScanner/
│
├── 📂 Dataset/                  # Training data & resume datasets
│   ├── resumes/                 # Sample resumes for training
│   └── job_descriptions/        # JD datasets for matching
│
├── 📂 FullStackApp/             # Web application (TypeScript + JS)
│   ├── src/
│   │   ├── components/          # UI components
│   │   ├── pages/               # App pages
│   │   └── api/                 # API calls
│   ├── public/
│   └── package.json
│
├── 📂 Resume_Editor/            # Resume editing module
│   ├── editor.ts                # Core editor logic
│   └── templates/               # Resume templates
│
├── 📂 Report/                   # Report generation module
│   └── report_generator.py      # Analysis report generator
│
├── 📄 ResumeModel_v2.ipynb      # Main ML model (Jupyter Notebook)
├── 📄 .gitignore
└── 📄 README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- pip & npm

### 1. Clone the Repository

```bash
git clone https://github.com/MithunKumarRajak/ResumeScanner.git
cd ResumeScanner
```

### 2. Setup ML Environment

```bash
# Create virtual environment
python -m venv env
source env/bin/activate   # Linux/macOS
env\Scripts\activate      # Windows

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Run the ML Model

```bash
# Open Jupyter Notebook
jupyter notebook ResumeModel_v2.ipynb
```

### 4. Setup Full Stack App

```bash
cd FullStackApp
npm install
npm run dev
```

Visit `http://localhost:3000` in your browser 🎉

---

## 🤖 ML Model

### ResumeModel v2 (`ResumeModel_v2.ipynb`)

The core ML pipeline includes:

| Step | Description |
|------|-------------|
| **Data Collection** | Resume dataset with labeled categories |
| **Preprocessing** | Text cleaning, tokenization, stopword removal |
| **Feature Extraction** | TF-IDF Vectorization |
| **Model Training** | Scikit-Learn classification algorithms |
| **Evaluation** | Accuracy, Precision, Recall, F1-Score |
| **Pipeline** | End-to-end ML Pipeline for deployment |

### Libraries Used

```python
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
```

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

- 🎓 B.Tech CSE @ Jagran Lakecity University, Bhopal (Class of 2027)
- 🛡️ Cybersecurity Enthusiast | Full-Stack Developer | ML & NLP Explorer
- 🔗 [GitHub](https://github.com/MithunKumarRajak)
- 💼 [LinkedIn](https://www.linkedin.com/in/mithun-kumar-rajak/)
- ✍️ [Medium](https://medium.com/@MithunKumarRajak)

---

## 📊 Project Status

> 🚧 **Currently In Development** — Features are being actively added.

| Module | Status |
|--------|--------|
| ML Model (v2) | ✅ In Progress |
| Dataset | ✅ Ready |
| Full Stack App | 🔄 In Progress |
| Resume Editor | 🔄 In Progress |
| Report Generator | 🔄 In Progress |
| Deployment | ⏳ Planned |

---

*Made with ❤️ by Mithun Kumar Rajak*
