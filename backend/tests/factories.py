"""Fabrique de données de test (jamais les vraies données OCP)."""

import pandas as pd

from app.pipeline.columns import COLUMNS


def make_days(n: int = 5, **overrides) -> pd.DataFrame:
    """n journées « normales » ; overrides = {colonne: [valeurs]} pour fabriquer un cas."""
    base = {c.name: 24.0 if c.unit == "h/j" else 100.0 for c in COLUMNS}
    base.update(prod_gta3_mwh=250.0, conso_usine_mwh=500.0, vhp_gta3_t=1750.0,
                marche_gta3_h=24.0, arret_gta3_h=0.0, arret_gta1_h=24.0, arret_gta2_h=24.0,
                acp_t_p2o5=1750.0, facture_dh_par_t_p2o5=100.0)
    df = pd.DataFrame([base] * n)
    df.insert(0, "date", [f"2025-01-0{i + 1}" for i in range(n)])
    for name, values in overrides.items():
        df[name] = values
    return df
