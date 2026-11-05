"""Simulateur « what-if » de la centrale, calé sur les données réelles 2025.

Modèle (régression linéaire sur les jours de marche stable du GTA3) :

    Puissance (MW) = c0 + c1 × VHP admise (t/h) + c2 × vapeur BP soutirée (t/h)

C'est la forme classique d'une turbine à soutirage (droite de Willans) : la puissance croît
avec la vapeur admise, et chaque tonne soutirée en BP pour les CAP ne se détend pas jusqu'au
condenseur, donc produit moins (c2 < 0).

Bilan matière : VHP admise = BP soutirée + condensat (vérifié à 99,7 % sur les données).
Prix d'achat : prix moyen réellement payé (montant / MWh reçus).
CO2 évité : facteur du réseau marocain 0,60 tCO2/MWh (AIE).
"""

import sqlite3
from contextlib import closing
from dataclasses import dataclass
from functools import lru_cache

import numpy as np
import pandas as pd

from app.config import db_path
from app.thresholds import BY_COLUMN, BY_KEY

GRID_TCO2_PER_MWH = 0.60
# Vapeur max par turbine : objectif du rapport journalier 2160 t/j = 90 t/h (max observé : 91 t/h)
GTA_CAPACITY_T_H = 90.0


@dataclass(frozen=True)
class Model:
    c0: float
    c1: float
    c2: float
    r2: float
    mae_mw: float
    n_days: int
    vhp_min: float          # domaine de validité (t/h par turbine)
    vhp_max: float
    willans_a: float        # VHP (t/h) = a + b × P (MW)
    willans_b: float
    price_dh_mwh: float
    median_vhp_t_h: float
    median_bp_t_h: float
    median_conso_mw: float
    best_day: dict
    median_mc_steam_t_h: float


def _fit(x: np.ndarray, y: np.ndarray) -> tuple[np.ndarray, float, float]:
    a = np.column_stack([np.ones(len(x)), x])
    coef, *_ = np.linalg.lstsq(a, y, rcond=None)
    pred = a @ coef
    r2 = 1 - ((y - pred) ** 2).sum() / ((y - y.mean()) ** 2).sum()
    return coef, float(r2), float(np.abs(y - pred).mean())


def fit_model(df: pd.DataFrame) -> Model:
    # Jours de marche stable : GTA3 a tourné ~24 h, toutes les mesures présentes
    s = df[(df.marche_gta3_h >= 23.5) & (df.prod_gta3_mwh > 0) & (df.vhp_gta3_t > 0)]
    s = s.dropna(subset=["soutirage_bp_t"])
    p, vhp, bp = s.prod_gta3_mwh / 24, s.vhp_gta3_t / 24, s.soutirage_bp_t / 24

    (c0, c1, c2), r2, mae = _fit(np.column_stack([vhp, bp]), p.to_numpy())
    (wa, wb), _, _ = _fit(p.to_numpy().reshape(-1, 1), vhp.to_numpy())

    priced = df.dropna(subset=["recu_montant_dh", "recu_total_mwh"])
    priced = priced[priced.recu_total_mwh > 0]
    best = s.loc[s.prod_gta3_mwh.idxmax()]
    mc = df.vapeur_recue_mc_t[df.vapeur_recue_mc_t > 0]

    return Model(
        c0=float(c0), c1=float(c1), c2=float(c2), r2=r2, mae_mw=mae, n_days=len(s),
        vhp_min=float(vhp.min()), vhp_max=float(vhp.max()), willans_a=float(wa), willans_b=float(wb),
        price_dh_mwh=float(priced.recu_montant_dh.sum() / priced.recu_total_mwh.sum()),
        median_vhp_t_h=float(vhp.median()), median_bp_t_h=float(bp.median()),
        median_conso_mw=float(df.conso_usine_mwh.median() / 24),
        best_day={"date": best.date, "vhp_t_h": float(best.vhp_gta3_t / 24), "bp_t_h": float(best.soutirage_bp_t / 24),
                  "conso_mw": float(best.conso_usine_mwh / 24)},
        median_mc_steam_t_h=float(mc.median() / 24) if len(mc) else 0.0,
    )


@lru_cache(maxsize=4)
def _cached_model(path: str, mtime: float) -> Model:
    with closing(sqlite3.connect(f"file:{path}?mode=ro", uri=True)) as con:
        return fit_model(pd.read_sql("SELECT * FROM daily", con))


def get_model() -> Model:
    """Modèle recalé automatiquement quand le pipeline réécrit la base (mtime change)."""
    path = db_path()
    return _cached_model(str(path), path.stat().st_mtime)


def simulate(m: Model, vhp_t_h: float, gta: int, bp_t_h: float, conso_mw: float, prix_dh_mwh: float) -> dict:
    warnings: list[str] = []

    admitted = min(vhp_t_h, gta * GTA_CAPACITY_T_H)
    if vhp_t_h > admitted:
        warnings.append(f"{vhp_t_h - admitted:.1f} t/h de vapeur non valorisée : capacité des turbines en service atteinte ({gta} × {GTA_CAPACITY_T_H:.0f} t/h).")
    bp = min(bp_t_h, admitted)
    if bp_t_h > admitted:
        warnings.append(f"Les CAP demandent {bp_t_h:.1f} t/h de BP mais seulement {admitted:.1f} t/h entrent dans les turbines : soutirage limité.")

    per_vhp, per_bp = (admitted / gta, bp / gta) if gta else (0.0, 0.0)
    if per_vhp and not (m.vhp_min <= per_vhp <= m.vhp_max):
        warnings.append(f"{per_vhp:.1f} t/h par turbine est hors du domaine observé en 2025 ({m.vhp_min:.0f}–{m.vhp_max:.0f} t/h) : résultat extrapolé, moins fiable.")
    p_one = max(0.0, m.c0 + m.c1 * per_vhp + m.c2 * per_bp) if per_vhp > 0 else 0.0
    power = gta * p_one

    condensat = admitted - bp                      # t/h ≈ m³/h
    cs = admitted / power if power else None
    achats = max(0.0, conso_mw - power)
    surplus = max(0.0, power - conso_mw)
    cout_jour = achats * 24 * prix_dh_mwh

    cible_cs = BY_KEY["cs_vhp"]
    if cs is not None and cs > cible_cs.max:
        warnings.append(f"Consommation spécifique {cs:.2f} t/MWh au-dessus de la cible ({cible_cs.min}–{cible_cs.max}) : rendement dégradé.")
    elif cs is not None and cs < cible_cs.min:
        warnings.append(f"Consommation spécifique {cs:.2f} t/MWh sous la plage habituelle ({cible_cs.min}–{cible_cs.max}) : "
                        "plus de vapeur va au condenseur (soutirage faible). Bon rendement, à confirmer sur site.")
    cible_cond = BY_COLUMN["condensat_gta3_m3"]
    cond_jour_turbine = condensat * 24 / gta if gta else 0
    if admitted and not (cible_cond.min <= cond_jour_turbine <= cible_cond.max):
        warnings.append(f"Condensat {cond_jour_turbine:.0f} m³/j par turbine hors cible ({cible_cond.min:.0f}–{cible_cond.max:.0f}) : soutirage trop {'fort' if cond_jour_turbine < cible_cond.min else 'faible'}.")
    if surplus > 0:
        warnings.append(f"Excédent de {surplus:.1f} MW : le site pourrait exporter de l'électricité.")

    return {
        "vapeur_admise_t_h": admitted,
        "vapeur_non_valorisee_t_h": vhp_t_h - admitted,
        "bp_soutiree_t_h": bp,
        "condensat_t_h": condensat,
        "production_mw": power,
        "conso_specifique_t_mwh": cs,
        "achats_mw": achats,
        "surplus_mw": surplus,
        "autonomie_pct": 100 * power / conso_mw if conso_mw else None,
        "cout_achats_dh_jour": cout_jour,
        "co2_evite_t_jour": power * 24 * GRID_TCO2_PER_MWH,
        "warnings": warnings,
    }


def reference_inputs(m: Model) -> dict:
    """Journée médiane 2025 : point de comparaison des scénarios."""
    return {"vhp_t_h": round(m.median_vhp_t_h, 1), "gta": 1, "bp_t_h": round(m.median_bp_t_h, 1),
            "conso_mw": round(m.median_conso_mw, 2), "prix_dh_mwh": round(m.price_dh_mwh, 0)}


def presets(m: Model) -> list[dict]:
    ref = reference_inputs(m)
    b = m.best_day
    return [
        {"id": "median", "label": "Journée médiane 2025", "hint": "Point de référence", "inputs": ref},
        {"id": "best", "label": f"Meilleure journée ({b['date']})", "hint": "Production GTA3 maximale observée",
         "inputs": ref | {"vhp_t_h": round(b["vhp_t_h"], 1), "bp_t_h": round(b["bp_t_h"], 1), "conso_mw": round(b["conso_mw"], 2)}},
        {"id": "objectif", "label": "Objectif rapport journalier", "hint": "GTA à 2160 t/j de VHP (90 t/h)",
         "inputs": ref | {"vhp_t_h": GTA_CAPACITY_T_H, "bp_t_h": round(GTA_CAPACITY_T_H * ref["bp_t_h"] / ref["vhp_t_h"], 1)}},
        {"id": "gta2", "label": "GTA2 remis en service", "hint": f"+ vapeur reçue de MC (médiane {m.median_mc_steam_t_h:.0f} t/h)",
         "inputs": ref | {"gta": 2, "vhp_t_h": round(ref["vhp_t_h"] + m.median_mc_steam_t_h, 1)}},
        {"id": "cap", "label": "CAP à 70 %", "hint": "Soutirage BP réduit de 30 %",
         "inputs": ref | {"bp_t_h": round(ref["bp_t_h"] * 0.7, 1)}},
    ]
