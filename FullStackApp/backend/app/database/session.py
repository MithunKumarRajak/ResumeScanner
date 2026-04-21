from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings

# SQLite needs check_same_thread=False for multi-threaded use
# PostgreSQL does not need this arg — we filter it out automatically
_is_sqlite = "sqlite" in settings.DATABASE_URL
connect_args = {"check_same_thread": False} if _is_sqlite else {}

# PostgreSQL benefits from connection pooling
pool_kwargs = {} if _is_sqlite else {
    "pool_size": 10,
    "max_overflow": 20,
    "pool_pre_ping": True,       # detect stale connections
    "pool_recycle": 300,         # recycle connections every 5 min
}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=settings.DEBUG,
    **pool_kwargs,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency — yields a DB session and ensures it is closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
