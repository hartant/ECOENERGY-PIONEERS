"""Simulateur « what-if » : que se passe-t-il si on change la vapeur, les turbines, le soutirage… ?"""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.simulator import GRID_TCO2_PER_MWH, GTA_CAPACITY_T_H, get_model, presets, reference_inputs, simulate

router = APIRouter(prefix="/api/simulate", tags=["Simulation"])


class SimInput(BaseModel):
    # Field(ge=…, le=…) : FastAPI refuse automatiquement une valeur hors bornes (erreur 422)
    vhp_t_h: float = Field(ge=0, le=300, description="Vapeur haute pression disponible (t/h)")
    gta: int = Field(ge=1, le=3, description="Nombre de turbo-alternateurs en service")
    bp_t_h: float = Field(ge=0, le=300, description="Vapeur basse pression demandée par les CAP (t/h)")
    conso_mw: float = Field(ge=0, le=100, description="Consommation électrique du site (MW)")
    prix_dh_mwh: float = Field(ge=0, le=5000, description="Prix d'achat de l'électricité (DH/MWh)")


@router.get("/model")
def get_simulation_model():
    """Coefficients calés sur 2025, qualité du calage, valeurs de référence et scénarios."""
    m = get_model()
    return {
        "power_model": {"c0": m.c0, "c1": m.c1, "c2": m.c2, "r2": m.r2, "mae_mw": m.mae_mw, "n_days": m.n_days,
                        "vhp_min_t_h": m.vhp_min, "vhp_max_t_h": m.vhp_max},
        "willans": {"a": m.willans_a, "b": m.willans_b},
        "constants": {"gta_capacity_t_h": GTA_CAPACITY_T_H, "grid_tco2_per_mwh": GRID_TCO2_PER_MWH},
        "reference": reference_inputs(m),
        "presets": presets(m),
    }


@router.post("")
def run_simulation(inputs: SimInput):
    """Résultat du scénario, comparé à la journée médiane 2025, + courbe puissance/vapeur."""
    m = get_model()
    result = simulate(m, **inputs.model_dump())
    ref = simulate(m, **reference_inputs(m))
    # Courbe : production selon la vapeur disponible, autres réglages inchangés
    curve = []
    for i in range(0, 41):
        vhp = inputs.gta * GTA_CAPACITY_T_H * 1.2 * i / 40
        r = simulate(m, **(inputs.model_dump() | {"vhp_t_h": vhp}))
        curve.append({"vhp_t_h": round(vhp, 1), "production_mw": round(r["production_mw"], 3)})
    return {
        "result": result,
        "reference": ref,
        "gain_dh_jour": ref["cout_achats_dh_jour"] - result["cout_achats_dh_jour"],
        "gain_dh_an": (ref["cout_achats_dh_jour"] - result["cout_achats_dh_jour"]) * 365,
        "curve": curve,
    }
