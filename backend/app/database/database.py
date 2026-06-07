from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./rag_chatbot.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations(eng=None):
    """Add new columns to existing tables without Alembic."""
    target = eng or engine
    with target.connect() as conn:
        inspector = inspect(target)
        doc_cols = {c["name"] for c in inspector.get_columns("documents")}
        if "source_type" not in doc_cols:
            conn.execute(text("ALTER TABLE documents ADD COLUMN source_type VARCHAR(10) NOT NULL DEFAULT 'file'"))
        if "keyword" not in doc_cols:
            conn.execute(text("ALTER TABLE documents ADD COLUMN keyword VARCHAR(255)"))
        if "source_url" not in doc_cols:
            conn.execute(text("ALTER TABLE documents ADD COLUMN source_url VARCHAR(2048)"))
        conn.commit()
