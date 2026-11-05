"""Tests de l'API sur une petite base de test (5 jours fabriqués).

TestClient appelle l'API comme le ferait le navigateur, sans lancer de serveur.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.pipeline.load_excel import clean, columns_meta, derive, load
from tests.factories import make_days


@pytest.fixture
def client(tmp_path, monkeypatch):
    # Jour 3 : vapeur anormale → consommation spécifique 2000/250 = 8 t/MWh (cible 6,8–7,5)
    df, issues = clean(make_days(vhp_gta3_t=[1750, 1750, 2000, 1750, 1750]))
    db = tmp_path / "test.db"
    load(derive(df), columns_meta(), issues, db)
    monkeypatch.setenv("ECOENERGY_DB", str(db))
    return TestClient(app)


def test_meta(client):
    body = client.get("/api/meta").json()
    assert (body["first_date"], body["last_date"], body["days"]) == ("2025-01-01", "2025-01-05", 5)
    prod = next(c for c in body["columns"] if c["name"] == "prod_gta3_mwh")
    assert (prod["unit"], prod["source"]) == ("MWh/j", "Données!JB")


def test_series_with_selected_fields(client):
    body = client.get("/api/days", params={"start": "2025-01-02", "end": "2025-01-03",
                                           "fields": "prod_gta3_mwh,cs_vhp_t_par_mwh"}).json()
    assert body["units"] == {"prod_gta3_mwh": "MWh/j", "cs_vhp_t_par_mwh": "t/MWh"}
    assert [r["date"] for r in body["rows"]] == ["2025-01-02", "2025-01-03"]
    assert body["rows"][1]["cs_vhp_t_par_mwh"] == 8.0


def test_unknown_field_is_rejected(client):
    r = client.get("/api/days", params={"fields": "prod_gta3_mwh,1;DROP TABLE daily"})
    assert r.status_code == 422
    assert client.get("/api/meta").status_code == 200  # la table existe toujours


def test_day_detail_marks_source_and_status(client):
    vapeur = client.get("/api/days/2025-01-03").json()["groups"]["vapeur"]
    assert vapeur["vhp_gta3_t"]["source"] == "real"
    assert vapeur["cs_vhp_t_par_mwh"] == {"value": 8.0, "unit": "t/MWh",
                                          "source": "computed", "status": "hors_cible"}


def test_unknown_day_is_404(client):
    assert client.get("/api/days/2024-01-01").status_code == 404


def test_kpis(client):
    groups = client.get("/api/kpis").json()["groups"]
    assert groups["electricite"]["production"]["value"] == 1250.0       # 5 × 250
    assert groups["electricite"]["taux_couverture"]["value"] == 50.0    # 250 / 500
    assert groups["vapeur"]["jours_cs_dans_cible"]["value"] == 80.0     # 4 jours sur 5


def test_reversed_period_is_rejected(client):
    assert client.get("/api/kpis", params={"start": "2025-01-05", "end": "2025-01-01"}).status_code == 422


def test_live_converts_daily_totals_to_rates(client):
    values = client.get("/api/live", params={"day": "2025-01-02"}).json()["values"]
    assert values["prod_gta3_mw"] == {"value": round(250 / 24, 2), "unit": "MW", "source": "real", "status": None}


def test_live_simulated_sensors_are_labelled_and_in_range(client):
    body = client.get("/api/live", params={"day": "2025-01-02"}).json()
    assert body["replay"] == body["replay"] | {"date": "2025-01-02", "pinned": True, "days": 5}
    pression = body["values"]["pression_vhp_bar"]
    assert pression["source"] == "simulated"
    assert 45 < pression["value"] < 63  # autour de la plage cible 50–58 bar


def test_live_without_day_replays_a_known_date(client):
    replay = client.get("/api/live").json()["replay"]
    assert replay["date"].startswith("2025-01-0") and not replay["pinned"]


def test_reports_catalog_and_downloads(client):
    import io

    from openpyxl import load_workbook

    ids = [r["id"] for r in client.get("/api/reports").json()]
    assert "synthese" in ids and "qualite" in ids
    for report_id in ids:
        pdf = client.get(f"/api/reports/{report_id}.pdf")
        assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")
        assert "attachment" in pdf.headers["content-disposition"]
        xlsx = client.get(f"/api/reports/{report_id}.xlsx")
        wb = load_workbook(io.BytesIO(xlsx.content))
        assert wb.sheetnames[0] == "Synthèse"
    data = load_workbook(io.BytesIO(client.get("/api/reports/energie.xlsx").content))["Données journalières"]
    assert data.max_row == 1 + 5  # en-tête + 5 jours


def test_unknown_report_is_404(client):
    assert client.get("/api/reports/nope.pdf").status_code == 404


def test_api_key_required_when_configured(client, monkeypatch):
    monkeypatch.setenv("ECOENERGY_API_KEY", "secret-de-test")
    assert client.get("/api/meta").status_code == 401
    assert client.get("/api/meta", headers={"X-API-Key": "mauvaise"}).status_code == 401
    assert client.get("/api/meta", headers={"X-API-Key": "secret-de-test"}).status_code == 200
    assert client.get("/api/health").status_code == 200  # la sonde de santé reste ouverte


def test_packed_database_is_decoded(client, tmp_path, monkeypatch):
    import base64
    import gzip
    import os

    from app import config

    packed = tmp_path / "db.gz.b64"
    packed.write_text(base64.b64encode(gzip.compress(open(os.environ["ECOENERGY_DB"], "rb").read())).decode())
    config._unpack.cache_clear()
    monkeypatch.setenv("ECOENERGY_DB_PACKED", str(packed))
    assert client.get("/api/meta").json()["days"] == 5
    config._unpack.cache_clear()
