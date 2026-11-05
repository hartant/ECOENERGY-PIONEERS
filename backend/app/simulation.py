"""Rejeu « temps réel » des données journalières + capteurs simulés.

Les données Excel sont JOURNALIÈRES. Pour un tableau de bord vivant :
- on rejoue les 335 jours comme une vidéo : 1 jour réel = SECONDS_PER_DAY secondes ;
- les quantités réelles de la journée sont converties en débit moyen (MWh/j ÷ 24 = MW) :
  ce sont de vraies valeurs, pas des inventions ;
- les capteurs absents de l'Excel (pression, température…) sont SIMULÉS dans les plages
  cibles du rapport journalier, et marqués « simulated ».

La simulation tourne côté serveur : tous les écrans voient les mêmes valeurs, et la future
détection d'anomalies pourra les lire.
"""

import math
import os

import numpy as np

from app.thresholds import BY_KEY, Threshold

SECONDS_PER_DAY = float(os.environ.get("ECOENERGY_REPLAY_SECONDS_PER_DAY", 60))
TICK_SECONDS = 2  # les capteurs simulés changent toutes les 2 s

# Débits moyens : nom dans /api/live → (colonne journalière, unité)
RATES: dict[str, tuple[str, str]] = {
    "prod_gta3_mw":          ("prod_gta3_mwh", "MW"),
    "conso_usine_mw":        ("conso_usine_mwh", "MW"),
    "recu_mc_mw":            ("recu_mc_mwh", "MW"),
    "recu_onee_mw":          ("recu_onee_mwh", "MW"),
    "vhp_gta3_t_h":          ("vhp_gta3_t", "t/h"),
    "soutirage_bp_t_h":      ("soutirage_bp_t", "t/h"),
    "vapeur_recue_mc_t_h":   ("vapeur_recue_mc_t", "t/h"),
    "condensat_gta3_m3_h":   ("condensat_gta3_m3", "m3/h"),
    "wds_production_m3_h":   ("wds_production_m3", "m3/h"),
    "wds_consommation_m3_h": ("wds_consommation_m3", "m3/h"),
    "eau_dessalee_m3_h":     ("eau_dessalee_m3", "m3/h"),
    "wds_vers_centrale_m3_h":   ("wds_vers_centrale_m3", "m3/h"),
    "wds_vers_sulfurique_m3_h": ("wds_vers_sulfurique_m3", "m3/h"),
    "wds_vers_mc_m3_h":         ("wds_vers_mc_m3", "m3/h"),
}

# Valeurs de la journée affichées telles quelles
DAY_VALUES = [
    "stock_wds_sulfurique_m3", "acp_t_p2o5", "recu_montant_dh", "taux_couverture_pct",
    "cs_vhp_t_par_mwh", "condensat_gta3_m3", "dispo_gta1_pct", "dispo_gta2_pct", "dispo_gta3_pct",
]

# Répartition (simulée) de la vapeur BP entre les lignes de concentration CAP
CAP_SHARES = {"x": 0.22, "y": 0.22, "u": 0.20, "v": 0.20, "t": 0.16}


def position(now: float, n_days: int) -> tuple[int, float]:
    """Instant présent → (index du jour rejoué, heure dans ce jour 0–24)."""
    t = now / SECONDS_PER_DAY
    return int(t) % n_days, (t % 1) * 24


def _rng(tick: int, salt: int) -> np.random.Generator:
    # Graine = numéro de tick : deux appels pendant le même tick donnent les mêmes valeurs.
    return np.random.default_rng([tick, salt])


def _sensor(t: Threshold, hour: float, tick: int, salt: int, center: float | None = None) -> float:
    """Valeur réaliste dans la plage cible : légère vague journalière + bruit."""
    if center is None:
        center = (t.min + t.max) / 2
    half = (t.max - t.min) / 2 if t.max is not None else 0.1 * center
    wave = 0.35 * half * math.sin(2 * math.pi * hour / 24)
    noise = _rng(tick, salt).normal(0, 0.2 * half)
    return round(center + wave + noise, 2)


def simulated_sensors(gta3_running: bool, bp_t_h: float | None, hour: float, tick: int) -> dict[str, tuple[float | None, str, str]]:
    """{nom: (valeur, unité, clé de seuil ou "")}. Turbine arrêtée → pas de mesure vapeur."""
    out: dict[str, tuple[float | None, str, str]] = {}
    turbine = {"pression_vhp_bar": "pression_vhp", "temperature_vhp_c": "temperature_vhp",
               "temperature_condensat_c": "temperature_condensat"}
    for i, (name, key) in enumerate(turbine.items()):
        t = BY_KEY[key]
        out[name] = (_sensor(t, hour, tick, i) if gta3_running else None, t.unit, key)

    air = BY_KEY["air_comprime"]
    out["air_comprime_bar"] = (_sensor(air, hour, tick, 10, center=6.8), air.unit, "air_comprime")

    for i, (line, share) in enumerate(CAP_SHARES.items()):
        value = None
        if bp_t_h:
            value = round(bp_t_h * share * (1 + _rng(tick, 20 + i).normal(0, 0.03)), 1)
        out[f"cap_{line}_bp_t_h"] = (value, "t/h", "")
    return out
