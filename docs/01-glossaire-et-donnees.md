# Step 2 — Understanding the site and the data

> Working notes. They will be merged into the final README.

## 1. The site in one picture

The Excel file is the daily dashboard of the **"Utilités"** (utilities) department of an OCP
chemical complex. "Utilités" = everything the factories need but don't sell:
steam, electricity, treated water, compressed air.

```
        Eau brute / Eau dessalée (mer)
                   │
                   ▼
        ┌─────────────────────┐   WDS (eau désilicée)   ┌───────────────────────┐
        │  TED                │ ──────────────────────▶ │  Unité Sulfurique     │
        │  traitement des     │                         │  (soufre → H2SO4)     │
        │  eaux douces        │                         │  produit de la VAPEUR │
        └─────────────────────┘                         └──────────┬────────────┘
                                                                   │ VHP (≈56 bar, ≈480 °C)
                                                                   ▼
   ONEE (réseau) ⇄  Électricité  ◀── ┌──────────────────────────────────┐
   MC / MP2 (sites voisins) ⇄        │  CENTRALE : GTA1, GTA2, GTA3     │
                                     │  vapeur → turbine → MW            │
                                     └──────────┬───────────────────────┘
                                                │ VBP (vapeur basse pression, soutirage)
                                                ▼
                                     ┌──────────────────────────────────┐
                                     │  CAP X/Y/U/V/T                   │──▶ ACP (T P2O5)
                                     │  concentration acide phosphorique │
                                     └──────────────────────────────────┘
                                                │ condensat
                                                └──────────────▶ retour vers chaudières / TED
```

This is **cogeneration**: the sulfuric acid reaction is very exothermic, its heat makes
steam, the steam first drives turbines (electricity), then the leftover low‑pressure
steam heats the phosphoric acid concentrators. One energy source → two products.

## 2. Glossary

| Code | Meaning | Where we saw it / how we know |
|---|---|---|
| **OCP** | Office Chérifien des Phosphates | — |
| **Utilités** | Utilities department (steam, power, water, air) | Sheet titles |
| **GTA** (also **TA**) | Groupe Turbo‑Alternateur: steam turbine + electric generator | "R Processe Centrale", web sources |
| **VHP** | Vapeur Haute Pression (~50–58 bar, 450–500 °C) feeding the GTAs | Target ranges in "R Processe Centrale" |
| **VBP / BP** | Vapeur Basse Pression, extracted from the turbine, used by CAP | "Consommation vapeur BP CAP" |
| **CS VHP** | Consommation Spécifique: tonnes of steam per MWh (target 6.8–7.5 T/MW). Lower = more efficient | "R Processe Centrale" |
| **TRG** | Taux de Rendement Global of a turbine (availability × performance) | "Préparation", "Centrale" |
| **Condensat** | Steam turned back into water after use, recycled | Target 240–720 m³, 40–45 °C |
| **Soutirage** | Steam extracted mid‑turbine at lower pressure | "Taux de soutirage" |
| **TED** | Traitement des Eaux Douces: fresh‑water treatment plant | "Rapport TED", web sources |
| **U27 / U28** | TED units: U27 = prétraitement (filtration), U28 = déminéralisation | "Rapport TED" |
| **WD** | Water Demineralized (intermediate) | "Données" col. J |
| **WDS** | Eau **désilicée**: final ultra‑pure water for boilers (silica removed, it damages turbines) | "Stock d'eau désilicée", "Production total WDS" |
| **WDC** | Eau décarbonatée (intermediate quality, carbonates removed) — *to confirm* | "WDC Total", "WDC sulf" |
| **LA, LB, LD, LZ, LV, LH** | Demineralization lines (chains of ion‑exchange resins) | U28 cycle table |
| **NaOH / H2SO4** | Soude / acide sulfurique, used to **regenerate** the resins | Consumption per line |
| **STEP** | Station d'Épuration (wastewater) | "Données" col. H |
| **DCI** | Défense Contre l'Incendie (fire water network, Est / Ouest) | "DCI Est", "DCI Ouest" |
| **CAP** | Concentration d'Acide Phosphorique; lines **X, Y, U, V, T** | "TED m3" sheet |
| **ACP** | Acide Phosphorique; production counted in **T P2O5** | "Production d'ACP (T P2O5)" |
| **MC** | Maroc Chimie (neighbouring OCP plant, exchanges steam/power/WDS) | Web sources |
| **MP1 / MP2** | Maroc Phosphore I / II (neighbouring OCP plants) | Web sources |
| **ONE / ONEE** | Office National de l'Électricité et de l'Eau Potable (national grid) | "Energie reçues … ONE" |
| **HP / HPL / HC** | ONEE tariff periods: heures de Pointe / Pleines / Creuses | "Energie reçues (MW)" |
| **Facture énergétique** | Energy bill, expressed in **DH per tonne P2O5** | "FACTURE (DH/TP2O5)" |
| **ZR 400 I/II/III** | Air compressors (target pressure ≥ 6.25 bar) | "R Processe Centrale" |
| **D1 / D2** | Emergency diesel generators | "Paramétres Diesel" |
| **Fuel‑oil / Gas‑oil** | Backup fuels for the boiler / diesels | "Données" stocks |

> The web search found references to Maroc Chimie, Maroc Phosphore and CAP in OCP
> internship reports (FST Fès repository). Keep the "to confirm" mark on WDC until
> someone from the site validates it.

## 3. What the Excel workbook contains

24 sheets, but only a few hold **raw daily data**; the rest are calculations or reports
built from it.

| Sheet | Role | Use it? |
|---|---|---|
| **Données** | ~380 columns × 335 days (01/01 → 01/12/2025, no gap). Row 6 is a "selected day" summary, not a day. The real source. | ✅ main source |
| **R Processe Centrale** | Daily report with **target ranges** ("Cible") per parameter | ✅ alert thresholds |
| **Rapport TED** | Daily TED report (production WDS, stock, U28 cycles) | ✅ TED panel |
| Préparation, Calcul, Mois, Indicateurs, Centrale | Formulas / monthly summaries over "Données" | ⚠️ recompute in Python instead |
| TED m3, TED m3‑h | Water balance per destination (incl. CAP X/Y/U/V/T) | ✅ water flows |
| Stocks, Phosphorique, Pertes, A Labo, KPI Rise, … | Other reports | ⏳ later, if needed |

**Data quality issues found:**
- Headers are spread over **3 rows** (group / sub‑group / unit) → we must build clean column names.
- `#N/A`, `#VALUE!`, `#DIV/0!` are **formula errors**, not measurements → become empty values.
- A value of `0` can mean "machine stopped" *or* "not filled in" → handled case by case.
- Data is **daily**, not real‑time (see §5).

## 4. Real data available per dashboard panel

Days filled (first exploration, before cleaning; see step 3 for final numbers):

| Dashboard panel | Real columns (examples) | Coverage |
|---|---|---|
| **Centrale / Énergie** | Production énergie TA3 (MWh/j), heures d'arrêt TA1/TA2/TA3 | 275 days |
| | Énergie reçue MC + ONEE by tariff (HP/HPL/HC), montant (DH) | 335 days |
| | Consommation d'usine | 335 days |
| | Facture énergétique (DH/T P2O5) | 335 days |
| **Vapeur** | VHP to turbines, BP soutirage (SR 4,5), condensat TA3 | 250–275 days |
| **TED / Eau** | Eau dessalée, WDS produced/consumed per destination (centrale, MC, sulfurique, phosphorique) | 266–335 days |
| | NaOH / H2SO4 consumption, line running hours | 320+ days |
| **Production** | Production d'ACP (T P2O5) | 335 days |
| **Stocks** | Fuel‑oil, gas‑oil, WDS stock | 335 days |
| **Compresseurs** | ZR400 I/II/III | 335 days |

**Important real finding** (column "Heur d'arrêt pour Travaux"):

| Turbine | Average stop hours / day | Meaning |
|---|---|---|
| GTA1 (TA1) | **24 h on all 335 days** | Out of service all year |
| GTA2 (TA2) | 22.5 h | Almost always stopped |
| GTA3 (TA3) | 2 h | The only turbine really producing: avg **188 MWh/day**, max 298 |

The daily report's target is 345.6 MWh/day, so GTA3 alone covers about 54% of it on
average. The dashboard must show this truthfully. It's also a strong point for your
defense: the plant runs on one turbine out of three.

**Outlier found:** "Facture (DH/T P2O5)" has a median of ~100 but reaches 145,771 on one day.
That's a ratio divided by a near‑zero production day. Handled in step 3.

## 5. Real vs simulated: the rule we follow

The user's request: *"make every unit alive, even with fake data"*. Rule:

1. **Real first.** If a value exists in the Excel for that day, we show it.
2. **Simulated only where data doesn't exist**, for example:
   - CAP line‑by‑line steam (only the total BP is real),
   - live second‑by‑second variation (Excel is daily),
   - pH / conductivity (not in "Données").
   Simulated values are **derived from real daily totals** (e.g. a day's real MWh is
   spread over 24 hours with a realistic profile + noise), never invented from nothing.
3. **Always labelled.** Every value sent by the API carries `source: "real" | "simulated"`,
   and the UI shows a small "simulé" badge. In a PFE defense, the jury will ask
   "is this real?". The answer must be visible on screen.

**"Real‑time" in our case = replay.** We have no live sensors (IoT). The backend replays
the 335 real days as a timeline (e.g. one day = one minute, configurable). Later, a real
sensor feed (MQTT / OPC‑UA) could replace the replay without changing the frontend.
That's the architecture point to explain to the jury.

## 6. About the four small CSV files

| File | Verdict |
|---|---|
| `data_initiale.csv`, `data_analyzed.csv` (31 rows) | Pump/flow demo for the AI idea ("mode optimal"). The "optimal" value is a fixed cap at 2.1, a rule, not a trained model. |
| `training_data.csv` (20 rows, hourly) | Different scale from the others. Too small to train anything reliable. |
| `data_description.txt` | Variable definitions for the POC (phase 1). |

They show the **original AI idea** (find the optimal operating mode that minimizes
energy). We'll keep the idea but train it on the real Excel data in the AI step.
