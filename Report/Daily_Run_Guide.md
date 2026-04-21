# Daily Run Guide

This guide covers the day-to-day operations for launching the ML-Based Resume application.

**Important:** You **never** need to run `setup_db.py` again unless you manually delete your PostgreSQL database and want to start completely from scratch. 

To run your project normally each day, you just need to start the two servers.

## 1. Start the Backend

Open a terminal and:
```bash
cd "FullStackApp/backend"
venv\Scripts\activate
python main.py
```
*(The backend will run on `http://localhost:8000`. PostgreSQL will automatically connect using the `.env` settings).*

## 2. Start the Frontend

Open a second terminal and:
```bash
cd "FullStackApp/frontend"
npm run dev
```
*(The frontend will run on `http://localhost:5173`).*

That's it! Your entire project is live.
