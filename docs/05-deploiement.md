# Step 6 — Deploying online (password‑protected) for the OCP group

> Working notes. They will be merged into the final README.

## 1. Architecture online: two Vercel projects from the same GitHub repo

```
 OCP colleague's browser
        │  https://ecoenergy-pioneers.vercel.app      (login: SITE_USER / SITE_PASSWORD)
        ▼
 ┌──────────────────────────────┐
 │ VERCEL project 1 — Next.js   │  proxy.ts: password on every page and every /api route
 │  Root Directory: ./          │  app/api/backend/[...path]: forwards to the backend
 └──────────────┬───────────────┘  and adds the secret header X-API-Key
                │ https://ecoenergy-api.vercel.app/api/…   (X-API-Key: BACKEND_API_KEY)
                ▼
 ┌──────────────────────────────┐
 │ VERCEL project 2 — FastAPI   │  refuses any /api/* request without the right key (401)
 │  Root Directory: backend     │  database decoded at startup from ECOENERGY_DB_B64
 └──────────────────────────────┘
```

**Why Vercel for the backend too?** Render and Hugging Face both need a payment card for a
Python/Docker server (Render: card check even on the free plan; Hugging Face: Docker Spaces
need a paid plan). Vercel runs FastAPI for free with no card: it finds `app` in
`app/main.py` (`[tool.vercel] entrypoint` in `pyproject.toml`) and installs the packages from
`uv.lock`. Our runtime packages weigh 217 MB (limit 500 MB).

**Why so many layers?**
- The data is real OCP data. **The repo is public**, so the data must never be in Git.
- The browser never sees the backend address or the key: it only talks to project 1.
- Someone who finds the backend URL gets **401**: without the key, no data.
- The email alert route is behind the password too (nobody can send spam through it).

**Tested before deployment** (local rehearsal with the same settings):

| Check | Result |
|---|---|
| Page without / with wrong / with right password | 401 / 401 / 200 |
| Relay or email route without password | 401 |
| Live data, KPIs, simulator, PDF and Excel through the relay | 200, valid files |
| Escape attempt `/api/backend/docs` | 404 |
| Backend called directly without key / with key | 401 / 200 |
| Backend with runtime packages only + database in an env variable | 335 days, reports OK |
| All 9 pages in the browser through the relay | OK, 0 failed request |

## 2. What you need

- The GitHub repo pushed (`git push`).
- A **Vercel** account (free, sign in with GitHub). No card.
- 3 secrets you choose yourself (never commit them, never send them in the same message as the link):

```bash
openssl rand -hex 32        # → the API key, used in BOTH Vercel projects
```
plus a site **username** (e.g. `ocp`) and a strong site **password**.

## 3. Prepare the data (on your PC)

```bash
cd ~/Desktop/ECOENERGY-PIONEERS/backend
uv run python -m app.pipeline.load_excel   # Excel → data/processed/ecoenergy.db
uv run python -m app.pipeline.pack_db      # → data/processed/ecoenergy.db.gz.b64 (≈ 51 KB of text)
```
An environment variable can only hold **text**, and SQLite is binary: `pack_db` compresses
it (gzip) and encodes it as text (base64). The backend decodes it once at startup into `/tmp`.

If you cloned the repo again, first copy the Excel file into `backend/data/raw/`
(it is not on GitHub, on purpose).

## 4. Project 2 first: the backend

1. vercel.com → **Add New → Project** → import `ECOENERGY-PIONEERS`.
2. **Project Name**: `ecoenergy-api`. **Root Directory** → *Edit* → choose **`backend`**.
   Framework Preset: Vercel detects **FastAPI** (otherwise choose "Other").
3. **Environment Variables**:

| Name | Value |
|---|---|
| `ECOENERGY_API_KEY` | the key generated with `openssl` |
| `ECOENERGY_DB_B64` | the whole content of `backend/data/processed/ecoenergy.db.gz.b64` (open in VS Code, Ctrl+A, Ctrl+C, paste) |

4. **Deploy.** Note the URL Vercel gives (e.g. `https://ecoenergy-api.vercel.app`).
5. Check in the browser:
   - `…/api/health` → `{"status":"ok"}`
   - `…/api/meta` → `{"detail":"Clé API manquante ou invalide"}` (good: protected)

## 5. Project 1: the frontend

1. vercel.com → **Add New → Project** → import `ECOENERGY-PIONEERS` **again**.
2. **Project Name**: `ecoenergy-pioneers`. **Root Directory**: leave `./`. Framework: Next.js.
3. **Environment Variables**:

| Name | Value |
|---|---|
| `BACKEND_URL` | the URL of project 2, e.g. `https://ecoenergy-api.vercel.app` (no trailing `/`) |
| `BACKEND_API_KEY` | the same key as `ECOENERGY_API_KEY` |
| `SITE_USER` | e.g. `ocp` |
| `SITE_PASSWORD` | your strong password |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | optional, only for email alerts |

4. **Deploy.** Open the link → the browser asks for the username and password.

Do **not** set `NEXT_PUBLIC_API_URL`: the default (`/api/backend`, the relay) is what we want.

## 6. Share with the OCP group

- Send the link, and the username/password **through a different channel** (e.g. link by
  email, password by phone or Teams).
- The first request after a quiet period takes a few seconds (the backend function starts
  and decodes the database).
- "Analytiques IA" and "Alertes" show a **"En cours de développement"** banner: the AI step
  comes next.

## 7. Updating later

| Change | What to do |
|---|---|
| Code | `git push` → both Vercel projects redeploy automatically |
| New Excel data | rerun step 3 → project 2 → Settings → Environment Variables → replace `ECOENERGY_DB_B64` → Redeploy |
| Change the password | project 1 → Settings → Environment Variables → edit → Redeploy |
| Leaked key | generate a new one, update it in **both** projects, redeploy both |

## 8. Local development is unchanged

Without these variables: no password, no key check, and the relay targets
`http://localhost:8000`. Same commands as before (`uvicorn … --reload` and `npm run dev`).

## 9. Files added for deployment

| File | Role |
|---|---|
| `proxy.ts` | Site password (HTTP Basic auth). Next.js 16 name for the old `middleware.ts` |
| `app/api/backend/[...path]/route.ts` | Relay browser → backend, adds `X-API-Key` |
| `lib/api.ts` | `API_URL` defaults to the relay; `apiUrl()` builds addresses from `location.origin` |
| `backend/app/main.py` | `X-API-Key` check (constant‑time comparison), configurable CORS |
| `backend/app/config.py` | `ECOENERGY_API_KEY`; database from `ECOENERGY_DB_B64` (or a file, `ECOENERGY_DB_PACKED`) |
| `backend/app/pipeline/pack_db.py` | database → text |
| `backend/pyproject.toml` (`[tool.vercel]`), `backend/vercel.json` | Vercel entrypoint, excluded files, 30 s max duration |
| `backend/Dockerfile`, `render.yaml` | alternative for a Docker host (Render, a VPS…) if a card is available later |
