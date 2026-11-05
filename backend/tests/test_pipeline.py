"""Tests des règles de nettoyage et des indicateurs calculés.

Lancer : uv run pytest
"""

import numpy as np

from app.pipeline.load_excel import clean, derive, to_number
from tests.factories import make_days


def test_excel_errors_become_nan():
    assert np.isnan(to_number("#N/A"))
    assert np.isnan(to_number("#VALUE!"))
    assert np.isnan(to_number(None))
    assert to_number(12) == 12.0


def test_negative_values_are_removed_and_logged():
    df, issues = clean(make_days(condensat_gta3_m3=[300, -5, 300, 300, 300]))
    assert np.isnan(df.at[1, "condensat_gta3_m3"])
    assert list(issues["reason"]) == ["négatif"]


def test_unusual_but_possible_values_are_kept():
    # Une journée à faible charge est une vraie donnée : elle doit rester.
    df, issues = clean(make_days(prod_gta3_mwh=[250, 250, 30, 250, 250]))
    assert df.at[2, "prod_gta3_mwh"] == 30
    assert issues.empty


def test_day_without_gta3_hours_is_marked_missing():
    df, _ = clean(make_days(prod_gta3_mwh=[250, 0, 250, 250, 250],
                            marche_gta3_h=[24, 0, 24, 24, 24]))
    assert np.isnan(df.at[1, "prod_gta3_mwh"])
    assert np.isnan(df.at[1, "marche_gta3_h"])


def test_contradictory_hours_drop_the_stop_hours():
    df, _ = clean(make_days(arret_gta3_h=[0, 24, 0, 0, 0]))
    assert np.isnan(df.at[1, "arret_gta3_h"])
    assert df.at[1, "marche_gta3_h"] == 24


def test_bill_ratio_dropped_when_production_near_zero():
    df, _ = clean(make_days(acp_t_p2o5=[1750, 1750, 0, 1750, 1750],
                            facture_dh_par_t_p2o5=[100, 100, 145771, 100, 100]))
    assert np.isnan(df.at[2, "facture_dh_par_t_p2o5"])
    assert df.at[0, "facture_dh_par_t_p2o5"] == 100


def test_derived_indicators():
    df = derive(clean(make_days())[0])
    assert df.at[0, "cs_vhp_t_par_mwh"] == 7.0          # 1750 t / 250 MWh
    assert df.at[0, "taux_couverture_pct"] == 50.0      # 250 / 500
    assert df.at[0, "dispo_gta1_pct"] == 0.0            # arrêtée 24 h
    assert df.at[0, "dispo_gta3_pct"] == 100.0          # 24 h de marche
