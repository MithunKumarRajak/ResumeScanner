import os
import pytest
from httpx import AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Override database URL before importing app modules
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

from app.main import app
from app.database.session import get_db
from app.database.base import Base

# Create a test SQLite database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create all tables before tests and drop them after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    """Returns a new database session for a test."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
async def test_client(db_session):
    """Returns an AsyncClient connected to the FastAPI app."""
    # Override the get_db dependency to use our test database
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        yield client
    app.dependency_overrides.clear()

@pytest.fixture
def sample_resume_text():
    return """
John Doe
john@example.com | +91 9876543210

Experience
Software Engineer at Tech Corp
January 2020 - Present
- Built scalable web applications.
- Worked with Python, React, PostgreSQL.

Education
Bachelor of Science in Computer Science
University of Technology
2015 - 2019

Skills
Python, React, PostgreSQL, Docker, AWS
"""
