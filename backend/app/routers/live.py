"""Instantané « temps réel » : jour réel rejoué + capteurs simulés."""

import time
from datetime import date

from fastapi import APIRouter, HTTPException

from app.data import columns_meta, query, to_records
from app.schemas import Live, Measure, Replay
from app.simulation import DAY_VALUES, RATES, SECONDS_PER_DAY, TICK_SECONDS, position, simulated_sensors
from app.thresholds import BY_KEY, check, status

router = APIRouter(prefix="/api", tags=["Temps réel (rejeu)"])


@router.get("/live", response_model=Live)
def get_live(day: date | None = None):
    """État du site « maintenant ».

    Sans paramètre : le jour rejoué avance tout seul (1 jour réel = 60 s par défaut).
    Avec `?day=2025-03-29` : on fige ce jour-là (utile pour une démonstration).
    """
    dates = query("SELECT date FROM daily ORDER BY date")["date"].tolist()
    now = time.time()
    index, hour = position(now, len(dates))
    if day is not None:
        if day.isoformat() not in dates:
            raise HTTPException(404, f"Pas de données pour le {day}")
        index = dates.index(day.isoformat())

    row = to_records(query("SELECT * FROM daily WHERE date = ?", (dates[index],)))[0]
    units = columns_meta().set_index("name")["unit"]
    values: dict[str, Measure] = {}

    for name, (col, unit) in RATES.items():
        v = row[col]
        values[name] = Measure(value=None if v is None else round(v / 24, 2), unit=unit, source="real")

    for col in DAY_VALUES:
        source = "computed" if col in ("taux_couverture_pct", "cs_vhp_t_par_mwh") or col.startswith("dispo_") else "real"
        values[col] = Measure(value=row[col], unit=units[col], source=source, status=status(col, row[col]))

    gta3_running = bool(row["prod_gta3_mwh"]) and bool(row["marche_gta3_h"])
    sensors = simulated_sensors(gta3_running, values["soutirage_bp_t_h"].value, hour, int(now // TICK_SECONDS))
    for name, (v, unit, key) in sensors.items():
        values[name] = Measure(value=v, unit=unit, source="simulated", status=check(BY_KEY.get(key), v))

    return Live(
        replay=Replay(date=dates[index], hour=round(hour, 2), day_index=index, days=len(dates),
                      seconds_per_day=SECONDS_PER_DAY, pinned=day is not None),
        values=values,
    )
