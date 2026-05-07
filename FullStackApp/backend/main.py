"""
Legacy entry-point — now simply re-exports the unified app from app.main.

Start: uvicorn main:app --reload --port 8000
       OR
       uvicorn app.main:app --reload --port 8000

Both point to the same FastAPI app backed by PostgreSQL.
"""
from app.main import app   # noqa: F401  — re-export the unified app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="localhost", port=8000, reload=True)
