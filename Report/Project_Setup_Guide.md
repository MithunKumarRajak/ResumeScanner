# ML-Based Resume Project Setup Guide

This guide details how to start both the FastAPI backend and the React frontend for the ML-Based Resume application.

## Prerequisites
- **Python 3.9+** (For the backend server and ML functionality)
- **Node.js** (v16+ recommended, for the Vite React frontend)
- The ML model `.pkl` files (`model.pkl`, `tfidf.pkl`, `encoder.pkl`) must be present in the `FullStackApp` root directory.

---

## 1. Starting the Backend

The backend is built with FastAPI and runs the ML resume classification prediction model using spaCy and scikit-learn.

**Open a new terminal and run:**

1. Navigate to the backend directory:
   ```bash
   cd "FullStackApp/backend"
   ```

2. Set up and activate the Python virtual environment (recommended to isolate dependencies):
   ```bash
   python -m venv venv
   
   # For Windows:
   venv\Scripts\activate
   
   # For macOS / Linux:
   source venv/bin/activate
   ```

3. Install the required Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
   *Note: If you run into spaCy issues, you may also need to run `python -m spacy download en_core_web_sm` after the pip install.*

4. Run the FastAPI backend server:
   ```bash
   python main.py
   ```
   *(Alternatively, you can run `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`)*

**Backend Verification:** 
The backend will run on `http://localhost:8000`. You can visit `http://localhost:8000/docs` in your browser to view the interactive API playground (Swagger UI).

---

## 2. Starting the Frontend

The frontend is built efficiently with Vite, React, and TailwindCSS.

**Open a second, separate terminal and run:**

1. Navigate to the frontend directory:
   ```bash
   cd "FullStackApp/frontend"
   ```

2. Install the necessary Node packages (first-time execution only):
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

**Frontend Verification:**
The frontend app will launch and is typically accessible at `http://localhost:5173`. Make sure the backend terminal remains active so that API calls from the React UI succeed.

---

## Architecture Overview

* **ML Models:** Saved under `FullStackApp/`
* **Local SQLite DB (if used):** `resume_screener.db` kept in `frontend/backend/`
* **Vite Config `vite.config.js`:** The frontend handles CORS and port configuration via environment connections communicating to `localhost:8000`.
