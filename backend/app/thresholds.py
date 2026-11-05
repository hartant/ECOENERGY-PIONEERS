"""Plages cibles d'exploitation.

Source : feuille « R Processe Centrale » du classeur (colonne « Cible »), c'est-à-dire
les valeurs que le site utilise lui-même dans son rapport journalier.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Threshold:
    key: str
    label: str
    unit: str
    min: float | None
    max: float | None
    # Colonne de la table daily contrôlée par ce seuil. None = mesure capteur qui n'existe
    # pas en journalier (pression, température) : servira aux valeurs simulées.
    column: str | None


THRESHOLDS: list[Threshold] = [
    Threshold("cs_vhp", "Consommation spécifique VHP", "t/MWh", 6.8, 7.5, "cs_vhp_t_par_mwh"),
    Threshold("condensat", "Condensat récupéré GTA3", "m3/j", 240, 720, "condensat_gta3_m3"),
    Threshold("pression_vhp", "Pression vapeur VHP", "bar", 50, 58, None),
    Threshold("temperature_vhp", "Température vapeur VHP", "°C", 450, 500, None),
    Threshold("temperature_condensat", "Température du condensat", "°C", 40, 45, None),
    Threshold("air_comprime", "Pression d'air comprimé", "bar", 6.25, None, None),
]

# Objectif de production journalier du GTA (rapport journalier : 345,6 MWh).
# C'est un objectif, pas un seuil d'alarme : GTA3 seul ne l'atteint presque jamais.
OBJECTIF_PROD_MWH = 345.6

BY_COLUMN = {t.column: t for t in THRESHOLDS if t.column}


def status(column: str, value: float | None) -> str | None:
    """« ok » / « hors_cible » si la colonne a une plage cible, sinon None."""
    t = BY_COLUMN.get(column)
    if t is None or value is None:
        return None
    if (t.min is not None and value < t.min) or (t.max is not None and value > t.max):
        return "hors_cible"
    return "ok"
