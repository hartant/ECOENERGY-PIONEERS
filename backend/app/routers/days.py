"""Données journalières : séries pour les graphiques, détail d'une journée."""

from datetime import date

from fastapi import APIRouter, HTTPException, Query

from app.data import columns_meta, known_columns, query, to_records
from app.schemas import DayDetail, Measure, Series
from app.thresholds import status

router = APIRouter(prefix="/api/days", tags=["Données journalières"])


def date_range(start: date | None, end: date | None) -> tuple[str, str]:
    if start and end and start > end:
        raise HTTPException(422, "start doit être avant end")
    return (start or date.min).isoformat(), (end or date.max).isoformat()


def parse_fields(fields: str | None) -> list[str]:
    known = known_columns()
    if not fields:
        return list(columns_meta()["name"])
    asked = [f.strip() for f in fields.split(",") if f.strip()]
    unknown = [f for f in asked if f not in known]
    if unknown:
        raise HTTPException(422, f"Colonnes inconnues : {', '.join(unknown)} (liste dans /api/meta)")
    return asked


@router.get("", response_model=Series)
def get_days(
    start: date | None = None,
    end: date | None = None,
    fields: str | None = Query(None, description="Colonnes séparées par des virgules, ex. prod_gta3_mwh,conso_usine_mwh"),
):
    """Série temporelle jour par jour, pour les graphiques."""
    cols = parse_fields(fields)
    # Un nom de colonne ne peut pas être passé en paramètre SQL (« ? ») : on l'écrit dans
    # la requête, mais SEULEMENT après l'avoir vérifié contre la liste connue.
    # Sinon ?fields=1;DROP TABLE daily serait une injection SQL.
    select = ", ".join(f'"{c}"' for c in cols)
    df = query(f"SELECT date, {select} FROM daily WHERE date BETWEEN ? AND ? ORDER BY date",
               date_range(start, end))
    units = columns_meta().set_index("name")["unit"]
    return Series(fields=cols, units={c: units[c] for c in cols}, rows=to_records(df))


@router.get("/{day}", response_model=DayDetail)
def get_day(day: date):
    """Une journée complète, rangée par groupe, chaque valeur avec sa source et son état."""
    df = query("SELECT * FROM daily WHERE date = ?", (day.isoformat(),))
    if df.empty:
        raise HTTPException(404, f"Pas de données pour le {day}")
    row = to_records(df)[0]
    groups: dict[str, dict[str, Measure]] = {}
    for m in to_records(columns_meta()):
        value = row[m["name"]]
        groups.setdefault(m["group"], {})[m["name"]] = Measure(
            value=value,
            unit=m["unit"],
            source="computed" if m["source"] == "calculé" else "real",
            status=status(m["name"], value),
        )
    return DayDetail(date=row["date"], groups=groups)
