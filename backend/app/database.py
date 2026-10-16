import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

POSTGRES_DEFAULT_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/campusflow"
)
SQLITE_FALLBACK_URL = os.environ.get(
    "SQLITE_FALLBACK_URL",
    "sqlite:///./campusflow.db"
)

Base = declarative_base()

db_status = {
    "intended_db": "PostgreSQL",
    "configured_url": POSTGRES_DEFAULT_URL.split("@")[-1] if "@" in POSTGRES_DEFAULT_URL else POSTGRES_DEFAULT_URL,
    "active_db": None,
    "is_fallback": False,
    "is_connected": False,
    "connection_error": None
}

engine = None
SessionLocal = None

def init_db_connection():
    global engine, SessionLocal, db_status
    postgres_url = os.environ.get("DATABASE_URL", POSTGRES_DEFAULT_URL).strip()
    
    # Try connecting to PostgreSQL if a valid URL scheme is present
    if postgres_url.startswith("postgresql://") or postgres_url.startswith("postgres://"):
        try:
            pg_engine = create_engine(postgres_url, pool_pre_ping=True, connect_args={"connect_timeout": 3})
            with pg_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            engine = pg_engine
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            db_status["active_db"] = "PostgreSQL"
            db_status["is_fallback"] = False
            db_status["is_connected"] = True
            db_status["connection_error"] = None
            print(f"Connected to PostgreSQL database: {db_status['configured_url']}")
            return engine
        except Exception as e:
            error_msg = f"PostgreSQL connection failed ({str(e)})."
            print(f"WARNING: {error_msg}")
            db_status["connection_error"] = error_msg
    else:
        db_status["connection_error"] = f"Configured DATABASE_URL is not a valid postgresql:// URI ({postgres_url})."

    # Explicit labeled fallback to SQLite for local development
    print(f"Activating explicitly labeled SQLite local fallback at: {SQLITE_FALLBACK_URL}")
    sqlite_engine = create_engine(
        SQLITE_FALLBACK_URL,
        connect_args={"check_same_thread": False}
    )
    engine = sqlite_engine
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db_status["active_db"] = "SQLite (Local Evaluation Fallback)"
    db_status["is_fallback"] = True
    db_status["is_connected"] = True
    return engine

# Initialize on import
init_db_connection()

def get_db():
    if SessionLocal is None:
        init_db_connection()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
