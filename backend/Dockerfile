# Image du backend (API FastAPI) pour l'hébergement (Render).
# Les données ne sont PAS dans l'image : la base SQLite est fournie au démarrage, emballée en
# texte, comme « secret file » Render (ECOENERGY_DB_PACKED=/etc/secrets/ecoenergy.db.gz.b64).

FROM python:3.12-slim

# uv : même gestionnaire de paquets qu'en local, versions figées par uv.lock
COPY --from=ghcr.io/astral-sh/uv:0.12.23 /uv /bin/uv

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    MPLCONFIGDIR=/tmp/matplotlib \
    PATH="/app/.venv/bin:$PATH"

# Dépendances d'abord (couche mise en cache tant que uv.lock ne change pas)
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --frozen --no-dev --no-install-project

COPY app ./app

# Render fournit le port dans $PORT
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
