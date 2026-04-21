# PostgreSQL Database Setup Guide

This guide details how to install, configure, and connect a PostgreSQL database from scratch to the ML-Based Resume project, replacing the default SQLite database.

## Prerequisites
- **PostgreSQL**: Download and install locally or have Docker installed.
- The project backend environment fully set up (as outlined in `Project_Setup_Guide.md`).

---

## Step 1: Install PostgreSQL

**Option A: Local Windows Installation**
1. Visit the [PostgreSQL Windows Download Page](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads).
2. Download the interactive installer for version 15 or 16.
3. Run the installer. **Crucial:** Remember the password you set for the default `postgres` superuser during installation!
4. Keep the default port as `5432`.

**Option B: Docker Setup (Fastest)**
If you prefer not to install PostgreSQL directly on your OS and have Docker Desktop running:
```bash
docker run --name resume-postgres -e POSTGRES_PASSWORD=yourpassword -p 5432:5432 -d postgres
```

---

## Step 2: Configure the Project

Your project codebase already contains an automated built-in script (`setup_db.py`) to handle creating the database and updating credentials!

1. Open a terminal and navigate to the backend folder:
   ```bash
   cd "FullStackApp/backend"
   ```

2. Activate your Virtual Environment:
   ```bash
   venv\Scripts\activate   # specific to Windows
   ```

3. Ensure PostgreSQL Python drivers are installed (`psycopg2-binary` is already in your `requirements.txt`):
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Automated Database Installer**:
   ```bash
   python setup_db.py
   ```
   - When the script runs, it will prompt you for your PostgreSQL password (the one you set in Step 1). 
   - Type your password and hit Enter.

**What the Python script does instantly:**
- Connects to your local PostgreSQL server on port 5432.
- Creates a new dedicated database named `resume_screener`.
- Edits your `FullStackApp/backend/.env` file to inject the secure connection string (`DATABASE_URL=postgresql://...`).
- Tests the connection to verify it works.

---

## Step 3: Verify the DB Tables

With the PostgreSQL database created and the `.env` holding the `DATABASE_URL`, SQLALchemy needs to create the schemas.

1. Ensure the `.env` file reflects your changes (it should no longer use `sqlite:///` by default). 
2. Start the FastAPI server:
   ```bash
   python main.py
   # Alternatively: uvicorn app.main:app --port 8000
   ```
3. Because your `session.py` configuration has built-in connection pooling for PostgreSQL, SQLAlchemy will connect to the `resume_screener` database and safely create all tables (`resumes`, `jobs`, `matches`, `resume_skills`, etc.) asynchronously on the first API request.

Your application is now successfully running on an enterprise-grade SQL database!
