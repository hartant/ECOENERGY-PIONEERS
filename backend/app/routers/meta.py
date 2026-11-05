"""Référentiel : quelles données existent, leurs unités, les seuils, la qualité."""

from dataclasses import asdict

from fastapi import APIRouter

from app.data import columns_meta, query, to_records
from app.schemas import Meta, QualityIssue, ThresholdOut
from app.thresholds import THRESHOLDS

router = APIRouter(prefix="/api", tags=["Référentiel"])


@router.get("/meta", response_model=Meta)
def get_meta():
    """Période couverte et description de chaque colonne (unité, groupe, source Excel)."""
    span = query("SELECT MIN(date) AS first, MAX(date) AS last, COUNT(*) AS n FROM daily").iloc[0]
    return Meta(first_date=span["first"], last_date=span["last"], days=int(span["n"]),
                columns=to_records(columns_meta()))


@router.get("/thresholds", response_model=list[ThresholdOut])
def get_thresholds():
    """Plages cibles tirées du rapport journalier du site (« R Processe Centrale »)."""
    return [asdict(t) for t in THRESHOLDS]


@router.get("/quality", response_model=list[QualityIssue])
def get_quality(column: str | None = None):
    """Valeurs écartées par le pipeline, avec la valeur d'origine et la raison."""
    if column:
        df = query("SELECT * FROM quality_issues WHERE `column` = ? ORDER BY date", (column,))
    else:
        df = query("SELECT * FROM quality_issues ORDER BY date")
    return to_records(df)
