import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()

# Resolved lazily in init_db() so DB_PATH env var can be set before import
engine = None
SessionLocal = None


def _get_engine():
    global engine, SessionLocal
    if engine is None:
        db_path = os.environ.get("DB_PATH", "./cleancontact.db")
        db_dir = os.path.dirname(os.path.abspath(db_path))
        os.makedirs(db_dir, exist_ok=True)
        engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return engine


def get_db():
    _get_engine()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    _get_engine()
    Base.metadata.create_all(bind=engine)
