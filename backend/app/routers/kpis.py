"""Indicateurs clés (KPI) sur une période : totaux, moyennes, taux."""

from datetime import date

import pandas as pd
from fastapi import APIRouter, HTTPException

from app.data import query
from app.routers.days import date_range
from app.schemas import Kpi, KpiReport
from app.thresholds import BY_COLUMN, OBJECTIF_PROD_MWH

router = APIRouter(prefix="/api", tags=["Indicateurs"])


def kpi(label: str, value, unit: str) -> Kpi:
    if value is None or pd.isna(value):
        return Kpi(label=label, value=None, unit=unit)
    return Kpi(label=label, value=round(float(value), 2), unit=unit)


def ratio(num: float, den: float):
    return 100 * num / den if den else None


@router.get("/kpis", response_model=KpiReport)
def get_kpis(start: date | None = None, end: date | None = None):
    """KPI de la période (par défaut : toute l'année disponible)."""
    df = query("SELECT * FROM daily WHERE date BETWEEN ? AND ? ORDER BY date", date_range(start, end))
    if df.empty:
        raise HTTPException(404, "Aucune donnée sur cette période")
    return KpiReport(start=df["date"].iloc[0], end=df["date"].iloc[-1], days=len(df), groups=compute_groups(df))


def compute_groups(df: pd.DataFrame) -> dict[str, dict[str, Kpi]]:
    """KPI par groupe pour un ensemble de jours (utilisé aussi par les rapports PDF/Excel)."""

    def total(col: str):
        return df[col].sum(min_count=1)  # min_count=1 : que des vides → None, pas 0

    # Taux de couverture : uniquement sur les jours où production ET consommation sont connues,
    # sinon on comparerait des totaux sur des jours différents.
    both = df.dropna(subset=["prod_gta3_mwh", "conso_usine_mwh"])
    cs = df["cs_vhp_t_par_mwh"].dropna()
    cible = BY_COLUMN["cs_vhp_t_par_mwh"]
    stock = df["stock_wds_sulfurique_m3"].dropna()

    groups = {
        "electricite": {
            "production": kpi("Production GTA3", total("prod_gta3_mwh"), "MWh"),
            "consommation": kpi("Consommation du site", total("conso_usine_mwh"), "MWh"),
            "achats_mc": kpi("Reçu de Maroc Chimie", total("recu_mc_mwh"), "MWh"),
            "achats_onee": kpi("Reçu de l'ONEE", total("recu_onee_mwh"), "MWh"),
            "cout_achats": kpi("Coût de l'énergie reçue", total("recu_montant_dh"), "DH"),
            "taux_couverture": kpi("Autonomie électrique",
                                   ratio(both["prod_gta3_mwh"].sum(), both["conso_usine_mwh"].sum()), "%"),
            "realisation_objectif": kpi(f"Production / objectif {OBJECTIF_PROD_MWH} MWh/j",
                                        ratio(df["prod_gta3_mwh"].mean(), OBJECTIF_PROD_MWH), "%"),
        },
        "vapeur": {
            "cs_vhp_moyenne": kpi("Consommation spécifique moyenne", cs.mean(), "t/MWh"),
            "jours_cs_dans_cible": kpi(f"Jours dans la cible {cible.min}–{cible.max} t/MWh",
                                       ratio(cs.between(cible.min, cible.max).sum(), len(cs)), "%"),
            "vhp_total": kpi("Vapeur VHP admise au GTA3", total("vhp_gta3_t"), "t"),
        },
        "eau": {
            "wds_production": kpi("Production WDS", total("wds_production_m3"), "m3"),
            "eau_dessalee": kpi("Eau dessalée reçue", total("eau_dessalee_m3"), "m3"),
            "stock_wds_fin": kpi("Stock WDS (dernier jour)", stock.iloc[-1] if len(stock) else None, "m3"),
        },
        "production": {
            "acp": kpi("Production d'acide phosphorique", total("acp_t_p2o5"), "t P2O5"),
            "facture_moyenne": kpi("Facture énergétique moyenne", df["facture_dh_par_t_p2o5"].mean(), "DH/t P2O5"),
        },
        "equipements": {
            f"dispo_gta{n}": kpi(f"Disponibilité GTA{n}", df[f"dispo_gta{n}_pct"].mean(), "%")
            for n in (1, 2, 3)
        },
    }
    return groups
