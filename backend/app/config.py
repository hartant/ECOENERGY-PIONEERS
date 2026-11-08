"""Chemins et réglages partagés par le pipeline et l'API."""

import base64
import gzip
import os
import tempfile
from functools import lru_cache
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
RAW_DIR = DATA_DIR / "raw"


# Clé secrète partagée avec le serveur Next.js. Vide (en local) = pas de contrôle.
# En production, toute requête /api/* sans le bon en-tête X-API-Key est refusée.
def api_key() -> str:
    return os.environ.get("ECOENERGY_API_KEY", "")


# Origines autorisées à appeler l'API depuis un navigateur (CORS), séparées par des virgules.
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get(
    "ECOENERGY_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if o.strip()]


def db_path() -> Path:
    """Base SQLite. La variable d'environnement ECOENERGY_DB permet aux tests
    d'utiliser une petite base de test au lieu des vraies données OCP.

    En hébergement, la base est fournie « emballée » en texte (voir app/pipeline/pack_db.py)
    et décodée une fois au démarrage :
    - ECOENERGY_DB_PACKED = chemin d'un fichier contenant ce texte (Render, Secret Files)
    - ECOENERGY_DB_B64    = le texte lui-même (Vercel, variable d'environnement)"""
    packed = os.environ.get("ECOENERGY_DB_PACKED")
    if packed:
        return _unpack(Path(packed).read_text())
    # Vercel n'a pas de « Secret Files » : le même texte est collé dans une variable d'environnement
    packed_text = os.environ.get("ECOENERGY_DB_B64")
    if packed_text:
        return _unpack(packed_text)
    return Path(os.environ.get("ECOENERGY_DB", DATA_DIR / "processed" / "ecoenergy.db"))


@lru_cache(maxsize=1)
def _unpack(text: str) -> Path:
    """Texte base64 d'une base gzip → fichier SQLite temporaire (une seule fois par processus).
    /tmp est le seul dossier où l'on peut écrire sur un hébergement « serverless »."""
    dest = Path(tempfile.gettempdir()) / "ecoenergy.db"
    dest.write_bytes(gzip.decompress(base64.b64decode(text.strip())))
    return dest
