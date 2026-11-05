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

    En hébergement, ECOENERGY_DB_PACKED pointe vers la base « emballée » en texte
    (voir app/pipeline/pack_db.py) : elle est décodée une fois au démarrage."""
    packed = os.environ.get("ECOENERGY_DB_PACKED")
    if packed:
        return _unpack(packed)
    return Path(os.environ.get("ECOENERGY_DB", DATA_DIR / "processed" / "ecoenergy.db"))


@lru_cache(maxsize=1)
def _unpack(packed: str) -> Path:
    """Texte base64 d'une base gzip → fichier SQLite temporaire (une seule fois par processus)."""
    dest = Path(tempfile.gettempdir()) / "ecoenergy.db"
    dest.write_bytes(gzip.decompress(base64.b64decode(Path(packed).read_text())))
    return dest
