# Step 3 — Data pipeline: Excel → clean SQLite database

> Working notes. They will be merged into the final README.

## 1. Why a pipeline?

The dashboard must not read the Excel file directly:
- the file is 2.5 MB and takes several seconds to open, which is far too slow for every request;
- headers are spread over 3 rows, and cells contain `#N/A` / `#VALUE!`;
- the meaning of each column is only in people's heads.

So we read it **once**, clean it, and save a clean table. The API then reads that table
in milliseconds. This pattern is called **ETL**: *Extract, Transform, Load*.

```
data/raw/Tableau de bord Utilité 2025.xlsx            (never modified)
        │  uv run python -m app.pipeline.load_excel
        ▼
1. Extract   read sheet "Données" (computed values, not formulas)
2. Validate  check every expected header is still in its column
3. Clean     impossible values → empty, each one logged
4. Derive    compute KPIs in Python (efficiency, availability…)
5. Load      write SQLite
        ▼
data/processed/ecoenergy.db
   ├── daily           335 rows (one per day) × 49 columns
   ├── columns_meta    name, unit, group, description, Excel source of each column
   └── quality_issues  every value we removed, with its original value and the reason
```

Re-running the script rebuilds everything from the Excel file. When a new month is added to
the Excel file, run the command again.

## 2. Files

| File | Role |
|---|---|
| `backend/app/pipeline/columns.py` | **The map**: Excel letter → clean name, unit, group, description, expected header text |
| `backend/app/pipeline/load_excel.py` | The 5 ETL steps |
| `backend/tests/test_pipeline.py` | Tests of the cleaning rules (`uv run pytest`) |

### Why check the header text?
Columns are read by letter (`JB` = GTA3 production). If someone inserts a column in Excel,
every letter shifts and we would silently read the wrong data. So each column declares a text
that must appear in its header (`"TA3"`). If it doesn't, the script stops with a clear message.
**Better to fail loudly than to show wrong numbers.**

## 3. Cleaning rules, and the mistake we corrected

**First attempt:** remove statistical outliers (Tukey rule: outside Q1 − 3·IQR / Q3 + 3·IQR).
Result: **319 values removed**, including 37 production days and 36 consumption days.

Looking at them showed they were **real operation**, not errors:
- GTA3 production of 6–99 MWh → the turbine ran only part of the day;
- site consumption of 178–216 MWh in Jan–Apr → a real lower‑activity period;
- grid imports of 435–519 MWh → days when GTA3 was down and the site bought power.

**Lesson: cleaning ≠ anomaly detection.** Cleaning removes values that are *impossible*.
Values that are *unusual but possible* are exactly what the AI must detect later, so they
stay in the data.

**Final rules (deterministic, all logged in `quality_issues`):**

| # | Rule | Why | Count |
|---|---|---|---|
| 1 | Negative quantity → empty | A flow or a mass can't be negative | 3 |
| 1 | Hours > 25 in a day → empty | 25 h exists once a year (time change); more is impossible | 0 |
| 2 | GTA3 with 0 h running **and** 0 h stopped → day not filled in | Production "0" on those days is an empty cell, not a real zero | 43–46 |
| 3 | GTA3 running + stopped > 25 h → stop hours removed | Contradiction; production that day confirms the turbine ran | 2 |
| 4 | Energy bill per tonne when ACP production < 20 % of median (351 t) → empty | Dividing by ~0 gives 145,771 DH/t, a meaningless ratio | 11 |

**151 values removed in total out of ~14,000, every one traceable.**

## 4. Computed indicators (not taken from Excel formulas)

| Indicator | Formula | Median | Meaning |
|---|---|---|---|
| `recu_mc_mwh`, `recu_onee_mwh` | HP + HPL + HC | 149 / 108 MWh | Power bought from Maroc Chimie / from the grid |
| `taux_couverture_pct` | production GTA3 / consumption | **49 %** | The site produces only half of what it uses |
| `cs_vhp_t_par_mwh` | steam VHP / production | **6.9 t/MWh** | Turbine efficiency; target 6.8–7.5 |
| `dispo_gta{1,2,3}_pct` | running hours / 24 | 0 % / 0 % / 100 % | Availability of each turbine |

We recompute them in Python instead of trusting the Excel formulas: then we know exactly
how each number is made, and we can test it.

## 5. Validation: how do we know the data is right?

1. **The energy balance closes.** Production + imports − consumption = **0 MWh** (median), within
   10 % on **100 % of the 292 complete days**. If we had read a wrong column, this would fail.
2. **Values match the plant's own daily report** ("R Processe Centrale"): GTA3 ≈ 272 MWh, steam
   ≈ 1861 t, CS ≈ 6.8 on day 1.
3. **Unit tests** (7 tests) lock the cleaning rules and formulas.

## 6. First real insights

- **GTA1 out of service all year, GTA2 almost all year.** The site depends on one turbine.
- **Self‑sufficiency is only ~49 %.** The other half of the electricity is bought (MC + ONEE).
- **Turbine efficiency is out of target on 33 % of days** (CS VHP outside 6.8–7.5 t/MWh).
  These are the first candidates for the anomaly detection step.
- **Late March – April: plant shutdown period** (very low ACP production, GTA3 hours not
  filled in). Most probably the annual maintenance shutdown, to confirm with the site.

## 7. How to run

```bash
cd backend
uv run python -m app.pipeline.load_excel   # rebuild the database (~6 s)
uv run pytest                              # run the tests
```

To explore the database by hand: `sqlite3 data/processed/ecoenergy.db`, then for example
`SELECT date, prod_gta3_mwh, cs_vhp_t_par_mwh FROM daily LIMIT 10;`
