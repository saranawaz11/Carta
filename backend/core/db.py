from functools import lru_cache
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from core import config


@lru_cache
def get_engine() -> Engine:
    database_url = config.DATABASE_URL
    if not database_url:
        raise RuntimeError("DATABASE_URL must be set before accessing the database")
    if database_url.startswith("postgres://"):
        database_url = database_url.replace(
            "postgres://", "postgresql+psycopg://", 1
        )
    elif database_url.startswith("postgresql://"):
        database_url = database_url.replace(
            "postgresql://", "postgresql+psycopg://", 1
        )
    return create_engine(database_url, pool_pre_ping=True)


def get_db() -> Generator[Session, None, None]:
    session_factory = sessionmaker(bind=get_engine(), autoflush=False)
    with session_factory() as session:
        yield session


def new_session() -> Session:
    return sessionmaker(bind=get_engine(), autoflush=False)()
