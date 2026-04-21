# 📋 ML-Based Resume Classification — Complete File Report

> This report describes **every file** in the project, organized by folder. For each file you'll find its **purpose**, **key contents**, and **role** in the overall pipeline.

---

## 🏗️ Project Overview

This is a **full-stack ML-powered resume classifier** that:
1. Trains a ML model (OneVsRest + KNN) on resume text data
2. Exports serialized model artifacts (`.pkl` files)
3. Serves predictions via a **FastAPI** backend
4. Provides a modern **React + Vite** frontend for users to upload resumes and view classification results

```
ML-Based Resume/
├── Dataset/                  ← Training data (CSVs + raw resume files)
├── FullStackApp/             ← Full-stack application
│   ├── backend/              ← FastAPI server
│   └── frontend/             ← React + Vite + Tailwind UI
├── Report/                   ← Project documentation & guides
├── ResumeModel_v2.ipynb      ← Model training notebook
└── model.pkl                 ← Root-level copy of trained model
```

---

## 1. Root-Level Files

### [ResumeModel_v2.ipynb](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/ResumeModel_v2.ipynb)
| Attribute | Detail |
|-----------|--------|
| **Type** | Jupyter Notebook |
| **Size** | ~522 KB |
| **Purpose** | **Main model training pipeline** — this is where the entire ML workflow lives |

**What it does:**
- Loads and preprocesses resume text data from CSV files
- Cleans text (removes URLs, special characters, HTML tags)
- Applies spaCy NLP preprocessing (lemmatization, stopword removal)
- Converts text to numerical features using **TF-IDF Vectorizer** (5,000 features)
- Trains a **OneVsRestClassifier with KNN** to classify resumes into 25 job categories
- Achieves **98.96% accuracy**
- Exports three serialized artifacts: `model.pkl`, `tfidf.pkl`, `encoder.pkl`

---

### [model.pkl](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/model.pkl)
| Attribute | Detail |
|-----------|--------|
| **Type** | Pickle (serialized scikit-learn model) |
| **Size** | ~365 MB |
| **Purpose** | Root-level copy of the trained OneVsRestClassifier + KNN model |

> [!NOTE]
> This is a duplicate of `FullStackApp/model.pkl`. The backend loads it from the `FullStackApp/` directory.

---

## 2. Dataset Folder

### [Dataset/Resume.csv](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/Dataset/Resume.csv)
| Attribute | Detail |
|-----------|--------|
| **Size** | ~56 MB |
| **Purpose** | **Primary dataset** — large collection of resumes with text and category labels used for model training |

### [Dataset/UpdatedResumeDataSet.csv](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/Dataset/UpdatedResumeDataSet.csv)
| Attribute | Detail |
|-----------|--------|
| **Size** | ~3 MB |
| **Purpose** | Cleaned/curated version of the resume dataset, likely used as the main training input in the notebook |

### [Dataset/resume_dataset.csv](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/Dataset/resume_dataset.csv)
| Attribute | Detail |
|-----------|--------|
| **Size** | ~339 KB |
| **Purpose** | Smaller resume dataset, potentially used for testing or as a supplementary data source |

### Dataset/data/ (24 subdirectories)
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Raw resume files organized by **job category** (e.g., `ACCOUNTANT/`, `ENGINEERING/`, `HR/`, `SALES/`, etc.) |

**Categories included:**
`ACCOUNTANT`, `ADVOCATE`, `AGRICULTURE`, `APPAREL`, `ARTS`, `AUTOMOBILE`, `AVIATION`, `BANKING`, `BPO`, `BUSINESS-DEVELOPMENT`, `CHEF`, `CONSTRUCTION`, `CONSULTANT`, `DESIGNER`, `DIGITAL-MEDIA`, `ENGINEERING`, `FINANCE`, `FITNESS`, `HEALTHCARE`, `HR`, `INFORMATION-TECHNOLOGY`, `PUBLIC-RELATIONS`, `SALES`, `TEACHER`

> Each subfolder contains individual resume files for that category, useful for category-wise analysis.

---

## 3. FullStackApp — Root-Level Files

### [FullStackApp/.gitignore](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/.gitignore)
| Purpose | Specifies files/folders to exclude from Git version control |
|---------|------|
| **Excludes** | `node_modules/`, `.env`, `build/`, `dist/`, `__pycache__/`, `*.pkl`, `venv/`, `.vscode/`, `*.log` |

### [FullStackApp/START_HERE.md](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/START_HERE.md)
| Purpose | **Quick-start guide** — the main entry-point documentation for setting up and running the project |
|---------|------|
| **Contains** | 3-step setup instructions, API endpoint reference, model capabilities summary, troubleshooting tips, file structure overview |

### [FullStackApp/model.pkl](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/model.pkl)
| Purpose | The trained **OneVsRestClassifier + KNN** model, loaded by the backend at startup |
|---------|------|
| **Size** | ~365 MB |
| **Used by** | `backend/main.py` — loaded via `joblib.load()` |

### [FullStackApp/tfidf.pkl](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/tfidf.pkl)
| Purpose | Serialized **TF-IDF Vectorizer** — converts raw resume text into 5,000-dimensional numerical feature vectors |
|---------|------|
| **Size** | ~200 KB |
| **Used by** | `backend/main.py` — transforms input text before prediction |

### [FullStackApp/encoder.pkl](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/encoder.pkl)
| Purpose | Serialized **Label Encoder** — maps numeric model outputs back to human-readable category names |
|---------|------|
| **Size** | ~1.2 KB |
| **Used by** | `backend/main.py` — converts prediction indices to category strings like "Data Science", "HR", etc. |

### [FullStackApp/save_preprocessing.py](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/save_preprocessing.py)
| Purpose | Helper script for **exporting preprocessing artifacts** after model training |
|---------|------|
| **What it does** | Contains commented-out `joblib.dump()` calls for saving `tfidf.pkl` and `encoder.pkl`. Also verifies that all three required `.pkl` files exist in the project directory. |

### [FullStackApp/test_model_quick.py](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/test_model_quick.py)
| Purpose | **Standalone test script** to validate the trained model's predictions |
|---------|------|
| **What it does** | Loads all three `.pkl` files + spaCy, defines the same `clean_text()` and `spacy_preprocess()` pipeline used by the backend, runs 3 test cases (Data Science, Java Developer, HR resumes), and writes results to `test_out.txt`. |

---

## 4. FullStackApp/backend — FastAPI Server

### [backend/main.py](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/backend/main.py)
| Attribute | Detail |
|-----------|--------|
| **Lines** | 174 |
| **Purpose** | **The core API server** — a FastAPI application that serves resume classification predictions |

**Key functionality:**
| Section | Description |
|---------|-------------|
| **Startup** | Loads `model.pkl`, `tfidf.pkl`, `encoder.pkl` from the parent directory and the spaCy `en_core_web_sm` model |
| **CORS** | Allows requests from `localhost:3000`, `localhost:5173`, `localhost:5174` for frontend dev servers |
| **`clean_text()`** | Strips URLs, mentions, hashtags, HTML tags, and non-alphabetic characters from resume text |
| **`preprocess_text()`** | Applies spaCy lemmatization and stopword removal to cleaned text |
| **`POST /predict`** | Accepts `resume_text`, preprocesses it, vectorizes with TF-IDF, predicts category, returns `predicted_category` + `confidence` score |
| **`GET /categories`** | Returns all 25 available job categories |
| **`GET /`** | Health check endpoint |

### [backend/requirements.txt](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/backend/requirements.txt)
| Purpose | Lists Python dependencies for the backend |
|---------|------|
| **Dependencies** | `fastapi 0.104.1`, `uvicorn 0.24.0`, `pydantic 2.5.0`, `joblib 1.5.3`, `scikit-learn 1.7.2`, `spacy 3.8.11`, `python-multipart 0.0.6` |

---

## 5. FullStackApp/frontend — React + Vite App

### 5.1 Configuration Files

#### [frontend/package.json](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/package.json)
| Purpose | NPM project configuration — defines dependencies and scripts |
|---------|------|
| **App name** | `resumescanner` |
| **Scripts** | `dev` (Vite dev server), `build` (production build), `preview` |
| **Key dependencies** | React 18, React Router 6, Zustand (state), React Query (data fetching), Axios (HTTP), Lucide React (icons), pdfjs-dist (PDF parsing), Mammoth (DOCX parsing), Radix UI (dialog/tabs) |
| **Dev dependencies** | Vite 5, Tailwind CSS 3, PostCSS, Autoprefixer |

#### [frontend/vite.config.js](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/vite.config.js)
| Purpose | Vite build tool configuration |
|---------|------|
| **What it configures** | Enables the React plugin, pre-bundles `pdfjs-dist` for optimization, sets dev server to port `5173` |

#### [frontend/tailwind.config.js](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/tailwind.config.js)
| Purpose | Tailwind CSS configuration — defines the project's design system |
|---------|------|
| **Custom colors** | Navy palette (`950` through `500`) for dark theme |
| **Font family** | Inter (Google Font) as primary sans-serif |
| **Custom animations** | `fade-in`, `slide-up`, `float`, `pulse-glow`, `spin-slow` |

#### [frontend/postcss.config.js](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/postcss.config.js)
| Purpose | PostCSS configuration — registers Tailwind CSS and Autoprefixer as PostCSS plugins |

#### [frontend/index.html](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/index.html)
| Purpose | **HTML entry point** — the shell page that Vite injects the React app into |
|---------|------|
| **SEO** | Includes meta description for ATS resume screening; loads Inter font from Google Fonts |
| **Title** | "ResumeScanner" |

#### [frontend/.env](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/.env)
| Purpose | Environment variables for the frontend |
|---------|------|
| **`VITE_API_URL`** | `http://localhost:8000` — points to the FastAPI backend |

---

### 5.2 Source Code — Entry & Configuration

#### [src/main.jsx](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/src/main.jsx)
| Purpose | **Application entry point** — bootstraps the React app |
|---------|------|
| **What it does** | Wraps `<App>` in `React.StrictMode`, `QueryClientProvider` (for React Query), and `BrowserRouter` (for routing). Renders into the `#root` div. |

#### [src/App.jsx](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/src/App.jsx)
| Purpose | **Root component** — defines the app shell layout and routing |
|---------|------|
| **Layout** | Full-height flex column with `<Navbar>` at top, `<main>` content area, and `<AuthModal>` overlay |
| **Routes** | `/` → `LandingPage`, `/results` → `ResultsPage` |

#### [src/index.css](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/src/index.css)
| Purpose | **Global stylesheet** — base resets, design system tokens, and reusable CSS classes |
|---------|------|
| **Tailwind directives** | `@tailwind base`, `components`, `utilities` |
| **Body styling** | Dark gradient background (`#0f172a` → `#111827`), radial overlay glow, custom scrollbar |
| **Component classes** | `.glass-card` (glassmorphism card), `.glass-card-hover` (with hover effects), `.gradient-text`, `.btn-primary`, `.btn-secondary` |
| **Animations** | `ringFill` (score ring), `skeletonPulse` (loading skeletons), `fadeIn`, `slideUp`, `.dropzone-active` |

#### [src/queryClient.js](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/src/queryClient.js)
| Purpose | Configures **React Query** client with default options |
|---------|------|
| **Settings** | 5-minute stale time, 1 retry, no refetch on window focus |

#### [src/store.js](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/src/store.js)
| Purpose | **Global state management** using Zustand |
|---------|------|
| **Auth state** | `user` (persisted in localStorage), `isAuthModalOpen`, `login()`, `signup()`, `logout()`, `openAuthModal()`, `closeAuthModal()` |
| **Analysis state** | `resumeFile`, `resumeText`, `jobDescription`, `analysisResult`, `isAnalyzing` with corresponding setters and a `clearAnalysis()` reset |

---

### 5.3 Source Code — Services & Hooks

#### [src/services/api.js](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/src/services/api.js)
| Purpose | **Axios HTTP client** — centralized API communication layer |
|---------|------|
| **Base URL** | Reads from `VITE_API_URL` env var (defaults to `http://localhost:8000`) |
| **Timeout** | 30 seconds |
| **Request interceptor** | Automatically attaches `Authorization: Bearer <token>` header if user is logged in |
| **Response interceptor** | On 401 errors, clears the stored user session (auto-logout) |

#### [src/hooks/useAnalyze.js](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/src/hooks/useAnalyze.js)
| Purpose | **React Query mutation hook** — encapsulates the resume analysis API call |
|---------|------|
| **What it does** | Posts resume text to `POST /predict`, manages loading state (`isAnalyzing`), stores the result in Zustand, and navigates to `/results` on success |

---

### 5.4 Source Code — Utility Files

#### [src/utils/keywords.js](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/src/utils/keywords.js)
| Purpose | **ATS keyword matching & optimization suggestions** engine |
|---------|------|
| **`CATEGORY_KEYWORDS`** | A dictionary mapping all 25 job categories to 15 high-value keywords each (e.g., Data Science → `machine learning`, `python`, `tensorflow`, etc.) |
| **`analyzeKeywords()`** | Compares a job description against a category's keywords; returns `found` and `missing` keyword lists |
| **`getOptimizationSuggestions()`** | Generates 6 actionable resume improvement suggestions based on category, confidence, and keyword analysis (missing keywords, quantifying achievements, ATS format tips, action verbs, skills section, resume length) |

---

### 5.5 Source Code — Components

#### [src/components/Navbar.jsx](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/src/components/Navbar.jsx)
| Purpose | **Top navigation bar** |
|---------|------|
| **Features** | Sticky header with backdrop blur, "ResumeScanner" branded logo (ScanLine icon), user dropdown menu with sign-out option, or sign-in button for unauthenticated users. Clicking the logo resets analysis and navigates home. |

#### [src/components/DropZone.jsx](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/src/components/DropZone.jsx)
| Purpose | **Resume file upload component** with drag-and-drop support |
|---------|------|
| **Accepted formats** | PDF (`.pdf`) and DOCX (`.docx`) |
| **Max file size** | 5 MB |
| **Text extraction** | Uses `pdfjs-dist` for PDF text extraction and `mammoth` for DOCX extraction — all done **client-side** |
| **UI states** | Empty dropzone → file selected (shows name + size) → error state |

#### [src/components/JobDescriptionInput.jsx](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/src/components/JobDescriptionInput.jsx)
| Purpose | **Optional job description textarea** for enhanced keyword matching |
|---------|------|
| **What it does** | Lets users paste a target job posting; stored in Zustand for use in keyword analysis |

#### [src/components/AuthModal.jsx](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/src/components/AuthModal.jsx)
| Purpose | **Authentication dialog** using Radix UI Dialog |
|---------|------|
| **Features** | Modal overlay with tabbed interface (Sign In / Sign Up), branded header with ScanLine icon. Renders `LoginForm` or `SignupForm` based on active tab. |

#### [src/components/LoginForm.jsx](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/src/components/LoginForm.jsx)
| Purpose | **Sign-in form** component |
|---------|------|
| **Fields** | Email, Password |
| **Auth** | Currently uses **mock authentication** — simulates an 800ms API delay, then stores user data with a mock token in localStorage |

#### [src/components/SignupForm.jsx](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/src/components/SignupForm.jsx)
| Purpose | **Sign-up form** component |
|---------|------|
| **Fields** | Full name, Email, Password (min 6 characters) |
| **Auth** | Also uses **mock authentication** — same simulated delay and localStorage approach as LoginForm |

#### [src/components/ScoreRing.jsx](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/src/components/ScoreRing.jsx)
| Purpose | **Animated circular score indicator** (SVG ring) |
|---------|------|
| **Features** | Animated count-up from 0 to target score, color-coded by score range (green ≥80, yellow ≥60, orange ≥40, red <40), glow shadow effect, configurable size and stroke width |

#### [src/components/Skeleton.jsx](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/src/components/Skeleton.jsx)
| Purpose | **Loading placeholder components** for a polished UX during data fetching |
|---------|------|
| **Exports** | `SkeletonLine` (single shimmering line), `SkeletonCard` (card with multiple skeleton lines), `SkeletonResults` (full results page skeleton with score ring + cards) |

---

### 5.6 Source Code — Pages

#### [src/pages/LandingPage.jsx](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/src/pages/LandingPage.jsx)
| Purpose | **Home page** — the main interface users interact with |
|---------|------|
| **Layout** | Centered card with headline, `DropZone` for file upload, `JobDescriptionInput` for optional job posting, and "Analyze Resume" button |
| **Behavior** | Button is disabled until resume text is extracted; shows loading spinner during analysis; displays API errors inline |

#### [src/pages/ResultsPage.jsx](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/src/pages/ResultsPage.jsx)
| Purpose | **Results display page** — shows prediction after analysis |
|---------|------|
| **What it shows** | Success icon, "Analysis complete" heading, predicted category name, animated confidence progress bar with percentage |
| **Navigation** | Redirects to `/` if no analysis result exists; "Analyze another resume" button resets state and goes back |

---

## 6. Report Folder — Documentation

### [Report/Resume_Classification_v2_Report.md](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/Report/Resume_Classification_v2_Report.md)
| Purpose | Detailed technical report on the ML model (v2), covering data preprocessing, feature engineering, model selection, and evaluation metrics |

### [Report/Model_Reuse_Guide.md](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/Report/Model_Reuse_Guide.md)
| Purpose | Guide explaining how to reuse the exported `.pkl` model artifacts in new applications |

### [Report/Frontend_Architecture_Report.md](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/Report/Frontend_Architecture_Report.md)
| Purpose | Documents the frontend architecture decisions, component structure, and design system |

### [Report/Cleaned_Frontend_Structure.md](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/Report/Cleaned_Frontend_Structure.md)
| Purpose | Documents the simplified/cleaned frontend folder structure after refactoring |

### [Report/Django_React_Integration_Guide.md](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/Report/Django_React_Integration_Guide.md)
| Purpose | Guide for integrating the React frontend with a Django backend (alternative to FastAPI) |

### [Report/Resume_Optimization_Roadmap.md](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/Report/Resume_Optimization_Roadmap.md)
| Purpose | Roadmap for future features — keyword-based resume optimization, ATS scoring, and suggestion engine |

---

## 📊 Summary Table

| Layer | Files | Tech Stack |
|-------|-------|------------|
| **ML Training** | `ResumeModel_v2.ipynb` | Python, scikit-learn, spaCy, TF-IDF, KNN |
| **Model Artifacts** | `model.pkl`, `tfidf.pkl`, `encoder.pkl` | joblib serialization |
| **Datasets** | 3 CSVs + 24 category folders | Raw resume text data |
| **Backend API** | `main.py`, `requirements.txt` | FastAPI, Uvicorn, spaCy, scikit-learn |
| **Frontend UI** | 18 source files | React 18, Vite 5, Tailwind CSS 3, Zustand, React Query, Axios |
| **Documentation** | 7 markdown files | Project guides and reports |

**Total project file count:** ~35 source files (excluding `node_modules`, `venv`, `__pycache__`, and raw data files)
