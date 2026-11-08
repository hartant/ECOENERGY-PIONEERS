"""Chemins et réglages partagés par le pipeline et l'API."""

import os
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
RAW_DIR = DATA_DIR / "raw"

# Origines autorisées à appeler l'API depuis un navigateur (CORS), séparées par des virgules.
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get(
    "ECOENERGY_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if o.strip()]


def db_path() -> Path:
    """Base SQLite. La variable d'environnement ECOENERGY_DB permet aux tests
    d'utiliser une petite base de test au lieu des vraies données OCP."""
    return Path(os.environ.get("ECOENERGY_DB", DATA_DIR / "processed" / "ecoenergy.db"))
