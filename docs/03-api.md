# Step 4 — The REST API (FastAPI)

> Working notes. They will be merged into the final README.

## 1. Role

The database holds clean data, but a browser can't read SQLite. The API exposes it as
**URLs that return JSON**. The frontend will only ever talk to these URLs.

```
Next.js (browser, port 3000) ──HTTP GET──▶ FastAPI (port 8000) ──SQL (read‑only)──▶ ecoenergy.db
                              ◀──JSON────
```

Run it, then open http://127.0.0.1:8000/docs to try every endpoint from the browser:
```bash
cd backend && uv run uvicorn app.main:app --reload --port 8000
```

## 2. Endpoints

| Method & URL | Returns | For which panel |
|---|---|---|
| `GET /api/health` | `{"status":"ok"}` | monitoring |
| `GET /api/meta` | period covered + every column (unit, group, Excel source) | whole frontend |
| `GET /api/days?start=&end=&fields=` | time series, one row per day, with units | charts |
| `GET /api/days/{date}` | one day, grouped (eau, electricite, vapeur…), each value with `source` and `status` | process diagram |
| `GET /api/kpis?start=&end=` | totals / averages / rates for the period | KPI cards |
| `GET /api/thresholds` | target ranges from the plant's daily report | alerts |
| `GET /api/quality?column=` | values removed by the pipeline and why | transparency |

Examples:
```
/api/days?start=2025-11-01&end=2025-11-30&fields=prod_gta3_mwh,conso_usine_mwh
/api/days/2025-06-14
/api/kpis?start=2025-06-01&end=2025-06-30
```

### Each value says where it comes from
```json
"cs_vhp_t_par_mwh": { "value": 6.209, "unit": "t/MWh", "source": "computed", "status": "hors_cible" }
```
- `source`: `real` (read from Excel), `computed` (calculated from real values), `simulated` (generated, used later)
- `status`: `ok` / `hors_cible` when the value has a target range, otherwise `null`

## 3. Code structure

| File | Role |
|---|---|
| `app/main.py` | Creates the app, CORS, plugs in the routers |
| `app/config.py` | Database path (overridable with `ECOENERGY_DB` for tests) |
| `app/data.py` | Read‑only SQLite access; NaN → `null` (JSON has no NaN) |
| `app/schemas.py` | Pydantic models = the shape of every response. FastAPI validates against them and documents them in `/docs` |
| `app/thresholds.py` | Target ranges from "R Processe Centrale" + `status()` |
| `app/routers/meta.py` | `/api/meta`, `/api/thresholds`, `/api/quality` |
| `app/routers/days.py` | `/api/days`, `/api/days/{date}` |
| `app/routers/kpis.py` | `/api/kpis` |

**Router** = a group of related endpoints in its own file. Each router is a section in `/docs`.

## 4. Security and robustness choices

- **Read‑only database.** The API opens SQLite with `mode=ro`, so it physically can't modify data.
  Only the pipeline writes.
- **SQL injection.** `fields` contains column names, and SQL can't take column names as
  parameters (`?`). So every requested name is checked against the known list first.
  `?fields=1;DROP TABLE daily` → **422 "Colonnes inconnues"**, and the table is untouched (tested).
- **Automatic input validation.** `day: date` in the function signature means FastAPI rejects
  `/api/days/hello` with a 422 before our code runs. `start > end` → 422.
- **Clear errors.** Unknown day → 404. Database not built yet → 503 with the command to run.
- **CORS** only allows `http://localhost:3000` (the Next.js dev server).

## 5. Tests

`tests/test_api.py` builds a **5‑day fake database** (day 3 has abnormal steam), points the API
at it with `ECOENERGY_DB`, and calls the endpoints with FastAPI's `TestClient`. The tests never
need the confidential OCP file, so they can run anywhere (e.g. on GitHub).

```bash
cd backend && uv run pytest     # 14 tests: 7 pipeline + 7 API
```

## 6. What the KPIs show for 2025 (01/01 → 01/12)

| KPI | Value |
|---|---|
| GTA3 production | 62,951 MWh |
| Site consumption | 152,092 MWh |
| Bought from Maroc Chimie / ONEE | 48,766 / 40,412 MWh |
| **Cost of bought electricity** | **≈ 59.8 million DH** |
| Electrical self‑sufficiency | 44.9 % |
| GTA3 production vs 345.6 MWh/day target | 62.4 % |

Check: 62,951 + 48,766 + 40,412 = 152,129 MWh ≈ 152,092 MWh consumed (0.02 % gap). The
balance closes over the whole year too.

**The defense argument in one sentence:** the site buys about 60 M DH of electricity a year
while two of its three turbines are stopped, and every point of turbine efficiency or
availability gained directly reduces that bill.
