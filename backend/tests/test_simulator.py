"""Le simulateur doit retrouver une physique connue et respecter les bilans."""

import numpy as np
import pandas as pd
import pytest

from app.simulator import GTA_CAPACITY_T_H, fit_model, simulate


@pytest.fixture(scope="module")
def model():
    # 200 jours fabriqués avec une « vraie » loi connue : P = 0,5 + 0,15·VHP − 0,02·BP (+ petit bruit)
    rng = np.random.default_rng(0)
    vhp = rng.uniform(40, 90, 200)
    bp = vhp * rng.uniform(0.7, 0.9, 200)
    p = 0.5 + 0.15 * vhp - 0.02 * bp + rng.normal(0, 0.05, 200)
    df = pd.DataFrame({
        "date": pd.date_range("2025-01-01", periods=200).strftime("%Y-%m-%d"),
        "marche_gta3_h": 24.0, "prod_gta3_mwh": p * 24, "vhp_gta3_t": vhp * 24, "soutirage_bp_t": bp * 24,
        "conso_usine_mwh": 500.0, "recu_montant_dh": 160000.0, "recu_total_mwh": 250.0, "vapeur_recue_mc_t": 700.0,
    })
    return fit_model(df)


def test_fit_recovers_known_coefficients(model):
    assert model.c1 == pytest.approx(0.15, abs=0.005)
    assert model.c2 == pytest.approx(-0.02, abs=0.005)
    assert model.r2 > 0.99
    assert model.price_dh_mwh == pytest.approx(640)  # 160 000 DH / 250 MWh


def run(model, **kw):
    base = {"vhp_t_h": 70, "gta": 1, "bp_t_h": 55, "conso_mw": 20, "prix_dh_mwh": 640}
    return simulate(model, **(base | kw))


def test_more_steam_more_power_more_extraction_less_power(model):
    assert run(model, vhp_t_h=80)["production_mw"] > run(model)["production_mw"]
    assert run(model, bp_t_h=40)["production_mw"] > run(model)["production_mw"]


def test_mass_and_power_balances(model):
    r = run(model)
    assert r["bp_soutiree_t_h"] + r["condensat_t_h"] == pytest.approx(r["vapeur_admise_t_h"])
    assert r["production_mw"] + r["achats_mw"] - r["surplus_mw"] == pytest.approx(20)


def test_turbine_capacity_limits_steam(model):
    r = run(model, vhp_t_h=150)
    assert r["vapeur_admise_t_h"] == GTA_CAPACITY_T_H
    assert r["vapeur_non_valorisee_t_h"] == pytest.approx(60)
    assert any("non valorisée" in w for w in r["warnings"])


def test_simulation_endpoint_rejects_impossible_inputs():
    from fastapi.testclient import TestClient

    from app.main import app

    r = TestClient(app).post("/api/simulate", json={"vhp_t_h": 70, "gta": 5, "bp_t_h": 50, "conso_mw": 20, "prix_dh_mwh": 640})
    assert r.status_code == 422
