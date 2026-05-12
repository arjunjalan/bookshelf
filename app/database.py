import os
from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker


def _make_engine():
    url = os.environ["DATABASE_URL"]
    return create_engine(
        url,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800,
        pool_pre_ping=True,
    )


# Lazy singleton — engine is created on first access so that DATABASE_URL
# is guaranteed to be in the environment by the time it is read.
_engine = None
_SessionLocal = None


def get_engine():
    global _engine
    if _engine is None:
        _engine = _make_engine()
    return _engine


def get_session_factory():
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=get_engine(), autocommit=False, autoflush=False)
    return _SessionLocal


def get_db() -> Generator[Session, None, None]:
    db: Session = get_session_factory()()
    try:
        yield db
    finally:
        db.close()
