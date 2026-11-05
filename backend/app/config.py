"""Chemins et réglages partagés par le pipeline et l'API."""

import os
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
RAW_DIR = DATA_DIR / "raw"


def db_path() -> Path:
    """Base SQLite. La variable d'environnement ECOENERGY_DB permet aux tests
    d'utiliser une petite base de test au lieu des vraies données OCP."""
    return Path(os.environ.get("ECOENERGY_DB", DATA_DIR / "processed" / "ecoenergy.db"))
