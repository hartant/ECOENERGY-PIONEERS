"""Point d'entrée de l'API EcoEnergy Pioneers.

Lancer en développement :
    uv run uvicorn app.main:app --reload --port 8000
Documentation interactive : http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import days, kpis, live, meta, simulate

app = FastAPI(
    title="EcoEnergy Pioneers API",
    description="Supervision du site Utilités : vapeur, électricité, traitement des eaux.",
    version="0.1.0",
)

# Le frontend Next.js tourne sur un autre port (3000) : le navigateur bloque
# ses requêtes vers l'API (port 8000) sauf si l'API l'autorise explicitement.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meta.router)
app.include_router(days.router)
app.include_router(kpis.router)
app.include_router(live.router)
app.include_router(simulate.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    """Vérifie que l'API répond."""
    return {"status": "ok"}
