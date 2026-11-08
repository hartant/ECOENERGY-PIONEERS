"""Point d'entrée de l'API EcoEnergy Pioneers.

Lancer en développement :
    uv run uvicorn app.main:app --reload --port 8000
Documentation interactive : http://localhost:8000/docs
"""

import secrets

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import ALLOWED_ORIGINS, api_key
from app.routers import days, kpis, live, meta, reports, simulate

app = FastAPI(
    title="EcoEnergy Pioneers API",
    description="Supervision du site Utilités : vapeur, électricité, traitement des eaux.",
    version="0.1.0",
)



@app.middleware("http")
async def require_api_key(request: Request, call_next):
    """En production, seules les requêtes portant la clé secrète accèdent aux données.

    Le navigateur ne parle jamais directement à cette API : il passe par le serveur Next.js
    (protégé par mot de passe), qui ajoute l'en-tête X-API-Key. Quelqu'un qui trouverait l'URL
    de l'API ne pourrait donc rien lire.
    """
    key = api_key()
    path = request.url.path
    if key and path.startswith("/api/") and path != "/api/health" and request.method != "OPTIONS":
        # compare_digest : comparaison en temps constant (évite de deviner la clé caractère par caractère)
        # On compare des octets : compare_digest plante sur du texte non ASCII (ex. « … » collé).
        if not secrets.compare_digest(request.headers.get("x-api-key", "").encode(), key.encode()):
            return JSONResponse({"detail": "Clé API manquante ou invalide"}, status_code=401)
    return await call_next(request)


# Le frontend Next.js tourne sur un autre port (3000) : le navigateur bloque
# ses requêtes vers l'API (port 8000) sauf si l'API l'autorise explicitement.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],  # le frontend peut lire le nom du fichier téléchargé
)

app.include_router(meta.router)
app.include_router(days.router)
app.include_router(kpis.router)
app.include_router(live.router)
app.include_router(simulate.router)
app.include_router(reports.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    """Vérifie que l'API répond."""
    return {"status": "ok"}
