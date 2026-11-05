# Step 6 — Deploying online (password‑protected) for the OCP group

> Working notes. They will be merged into the final README.

## 1. Architecture online

```
 OCP colleague's browser
        │  https://<projet>.vercel.app      (login: SITE_USER / SITE_PASSWORD)
        ▼
 ┌──────────────────────────────┐
 │ VERCEL — Next.js             │  proxy.ts: password on every page and every /api route
 │  pages + relay               │  app/api/backend/[...path]: forwards to the backend
 └──────────────┬───────────────┘  and adds the secret header X-API-Key
                │ https://ecoenergy-api.onrender.com/api/…   (X-API-Key: BACKEND_API_KEY)
                ▼
 ┌──────────────────────────────┐
 │ RENDER — FastAPI (Docker)    │  refuses any /api/* request without the right key (401)
 │  database decoded at startup │  from the Secret File ecoenergy.db.gz.b64
 └──────────────────────────────┘
```

**Why so many layers?**
- The data is real OCP data. **The repo is public**, so the data must never be in Git.
- The browser never sees the backend address or the key: it only talks to Next.js.
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
| Backend started from the packed database | 335 days, reports OK |
| All 9 pages in the browser through the relay | OK, 0 failed request |

## 2. What you need

- The GitHub repo pushed (`git push`).
- A **Render** account and a **Vercel** account: free, sign in with GitHub.
- 3 secrets you choose yourself (never commit them, never send them in the same message as the link):

```bash
openssl rand -hex 32        # → the API key, used on BOTH Render and Vercel
```
plus a site **username** (e.g. `ocp`) and a strong site **password**.

## 3. Prepare the data (on your PC)

```bash
cd ~/Desktop/ECOENERGY-PIONEERS/backend
uv run python -m app.pipeline.load_excel   # Excel → data/processed/ecoenergy.db
uv run python -m app.pipeline.pack_db      # → data/processed/ecoenergy.db.gz.b64 (≈ 51 KB of text)
```
Render's Secret Files form only accepts pasted **text**, and SQLite is binary: `pack_db`
compresses it (gzip) and encodes it as text (base64). The backend decodes it at startup.

## 4. Backend on Render

1. render.com → **New → Blueprint** → choose the `ECOENERGY-PIONEERS` repo.
   Render reads `render.yaml` and proposes the service **ecoenergy-api** (Docker, free plan).
2. It asks for **`ECOENERGY_API_KEY`** → paste the key generated with `openssl`.
3. Create. The first build takes a few minutes.
4. Service **ecoenergy-api → Environment → Secret Files → Add Secret File**:
   - Filename: `ecoenergy.db.gz.b64`
   - Contents: the whole content of `backend/data/processed/ecoenergy.db.gz.b64`
     (open it in VS Code, Ctrl+A, Ctrl+C, paste).
   - Save → **Manual Deploy → Deploy latest commit**.
5. Check: open `https://ecoenergy-api.onrender.com/api/health` → `{"status":"ok"}`, and
   `…/api/meta` → `{"detail":"Clé API manquante ou invalide"}` (good: protected).
   Note the exact URL Render gives you (the name may have a suffix).

## 5. Frontend on Vercel

1. vercel.com → **Add New → Project** → import `ECOENERGY-PIONEERS` (Next.js is detected).
2. **Environment Variables**, before the first deploy:

| Name | Value |
|---|---|
| `BACKEND_URL` | the Render URL, e.g. `https://ecoenergy-api.onrender.com` (no trailing `/`) |
| `BACKEND_API_KEY` | the same key as `ECOENERGY_API_KEY` on Render |
| `SITE_USER` | e.g. `ocp` |
| `SITE_PASSWORD` | your strong password |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | optional, only for email alerts |

3. **Deploy.** Open the `.vercel.app` link → the browser asks for the username and password.

Do **not** set `NEXT_PUBLIC_API_URL`: the default (`/api/backend`, the relay) is what we want.

## 6. Share with the OCP group

- Send the link, and the username/password **through a different channel** (e.g. link by
  email, password by phone or Teams).
- Tell them the **first load can take ~50 s**: Render's free backend sleeps after 15 min
  without visits. The page says "Recharger la page dans une minute" if it isn't awake yet.
- "Analytiques IA" and "Alertes" show a **"En cours de développement"** banner: the AI step
  comes next.

## 7. Updating later

| Change | What to do |
|---|---|
| Code | `git push` → Vercel and Render redeploy automatically |
| New Excel data | rerun step 3 → replace the Secret File content on Render → Manual Deploy |
| Change the password | Vercel → Settings → Environment Variables → edit → Redeploy |
| Leaked key | generate a new one, update it on **both** Render and Vercel |

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
| `backend/app/config.py` | `ECOENERGY_API_KEY`, `ECOENERGY_DB_PACKED` (decoded once) |
| `backend/app/pipeline/pack_db.py` | database → text for Render Secret Files |
| `backend/Dockerfile`, `backend/.dockerignore` | backend image (no data inside) |
| `render.yaml` | Render Blueprint (service, health check, variables) |
