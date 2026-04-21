# Manual PostgreSQL Setup Guide

If you prefer to configure your database manually rather than using the automated `setup_db.py` script, follow these exact steps to connect your PostgreSQL database to the ML-Based Resume application.

## Step 1: Create the Database Manually

You need to create an empty database designated for this project. The application connects to a database named `resume_screener`. You can do this using either a graphical interface like pgAdmin or the command line (psql).

### Option A: Using pgAdmin (GUI)
1. Open **pgAdmin** and connect to your local PostgreSQL server.
2. In the left-hand browser pane, expand your server node.
3. Right-click on **Databases** -> hover over **Create** -> select **Database...**
4. In the "Database" input field, type exactly: `resume_screener`
5. Click **Save**.

### Option B: Using psql (Command Line)
1. Open your terminal or command prompt.
2. Log into the PostgreSQL interactive terminal as the 'postgres' user:
   ```bash
   psql -U postgres
   ```
   *(Enter your password when prompted).*
3. Run the following SQL command to create the database:
   ```sql
   CREATE DATABASE resume_screener;
   ```
4. Verify it was created by running `\l` (lists all databases). 
5. Type `\q` to exit psql.

---

## Step 2: Configure the `.env` File

Now that the database exists, you need to point the backend's environment configuration to it.

1. Navigate to the backend folder in your workspace: `FullStackApp/backend/`.
2. Locate the `.env` file (If you do not see a `.env` file, rename `.env.example` to `.env`).
3. Open `.env` in VS Code.
4. Find the line that defines `DATABASE_URL` and change it to match your PostgreSQL credentials using this format:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/resume_screener
   ```
   - Replace `username` (typically `postgres`).
   - Replace `password` with the actual password you use to log in to PostgreSQL.
   - If your PostgreSQL is not running on port `5432`, ensure you update the port number as well.
5. Save the file.

---

## Step 3: Start the Server (Automatic Table Creation)

With the database created and the backend pointed to it, you can start the server. The application is built using SQLAlchemy, which knows how to set up the schemas automatically.

1. Make sure your Python virtual environment is activated:
   ```bash
   cd "FullStackApp/backend"
   venv\Scripts\activate
   ```
2. Start the FastAPI server:
   ```bash
   python main.py
   # Alternatively: uvicorn app.main:app --port 8000
   ```
3. Watch your terminal output. As the server boots up, SQLAlchemy will read your manual `DATABASE_URL` connection, connect to the `resume_screener` database, and automatically generate all required tables (`users`, `resumes`, `jobs`, `matches`, etc.).

Your project is now fully migrating to PostgreSQL using manual setup!
