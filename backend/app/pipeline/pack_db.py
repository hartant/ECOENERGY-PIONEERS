"""Emballe la base SQLite en texte pour l'hébergement.

Une variable d'environnement (Vercel) ou un « Secret File » (Render) n'accepte que du texte.
La base (binaire) est donc compressée (gzip) puis encodée en base64. Le backend la décode au
démarrage (config.db_path).

Lancer (après le pipeline) :
    uv run python -m app.pipeline.pack_db
Puis coller le contenu de data/processed/ecoenergy.db.gz.b64 dans la variable
d'environnement ECOENERGY_DB_B64 du projet Vercel du backend (voir docs/05-deploiement.md).
"""

import base64
import gzip

from app.config import DATA_DIR


def main() -> None:
    src = DATA_DIR / "processed" / "ecoenergy.db"
    dest = src.with_name("ecoenergy.db.gz.b64")
    dest.write_text(base64.b64encode(gzip.compress(src.read_bytes(), 9)).decode())
    print(f"{src.name} ({src.stat().st_size / 1024:.0f} Ko) → {dest} ({dest.stat().st_size / 1024:.0f} Ko de texte)")


if __name__ == "__main__":
    main()
