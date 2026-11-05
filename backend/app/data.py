"""Accès en lecture à la base SQLite produite par le pipeline."""

import sqlite3
from contextlib import closing

import pandas as pd
from fastapi import HTTPException

from app.config import db_path


def query(sql: str, params: tuple = ()) -> pd.DataFrame:
    path = db_path()
    if not path.exists():
        raise HTTPException(503, "Base de données absente : lancer `uv run python -m app.pipeline.load_excel`")
    # mode=ro : l'API ne peut jamais modifier les données, seul le pipeline écrit.
    with closing(sqlite3.connect(f"file:{path}?mode=ro", uri=True)) as con:
        return pd.read_sql(sql, con, params=params)


def columns_meta() -> pd.DataFrame:
    return query("SELECT * FROM columns_meta")


def known_columns() -> set[str]:
    return set(columns_meta()["name"])


def to_records(df: pd.DataFrame) -> list[dict]:
    """DataFrame → liste de dicts JSON. NaN n'existe pas en JSON : il devient null."""
    return df.astype(object).where(df.notna(), None).to_dict("records")
