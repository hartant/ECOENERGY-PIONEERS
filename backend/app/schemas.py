"""Forme des réponses de l'API (modèles Pydantic).

FastAPI s'en sert pour valider ce qu'on renvoie et pour générer la page /docs.
Le frontend TypeScript aura les mêmes formes.
"""

from typing import Literal

from pydantic import BaseModel


class ColumnMeta(BaseModel):
    name: str
    unit: str
    group: str
    description: str
    source: str  # « Données!JB » (lu dans Excel) ou « calculé »


class Meta(BaseModel):
    first_date: str
    last_date: str
    days: int
    columns: list[ColumnMeta]


class Series(BaseModel):
    fields: list[str]
    units: dict[str, str]
    rows: list[dict[str, float | str | None]]


class Measure(BaseModel):
    value: float | None
    unit: str
    # real = lu dans Excel, computed = calculé à partir de valeurs réelles,
    # simulated = généré (pas de mesure réelle disponible)
    source: Literal["real", "computed", "simulated"]
    status: Literal["ok", "hors_cible"] | None = None


class DayDetail(BaseModel):
    date: str
    groups: dict[str, dict[str, Measure]]


class Kpi(BaseModel):
    label: str
    value: float | None
    unit: str


class KpiReport(BaseModel):
    start: str
    end: str
    days: int
    groups: dict[str, dict[str, Kpi]]


class ThresholdOut(BaseModel):
    key: str
    label: str
    unit: str
    min: float | None
    max: float | None
    column: str | None


class QualityIssue(BaseModel):
    date: str
    column: str
    value: float | None
    reason: str
