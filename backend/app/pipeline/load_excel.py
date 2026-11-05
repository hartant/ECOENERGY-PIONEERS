"""Pipeline de données : Excel « Tableau de bord Utilité » → base SQLite propre.

Étapes (ETL) :
  1. Extract   : lire la feuille « Données » (valeurs, pas formules)
  2. Validate  : vérifier que chaque colonne attendue est bien à sa place
  3. Clean     : erreurs Excel (#N/A, #VALUE!…) → vide ; valeurs impossibles et aberrantes → vide + journalisées
  4. Derive    : calculer les indicateurs (consommation spécifique, disponibilité…)
  5. Load      : écrire les tables daily / columns_meta / quality_issues

Lancer :
    uv run python -m app.pipeline.load_excel
"""

import sqlite3
import sys
from datetime import datetime
from pathlib import Path

import numpy as np
import openpyxl
import pandas as pd
from openpyxl.utils import column_index_from_string

from app.pipeline.columns import (
    COLUMNS,
    DATE_LETTER,
    DERIVED,
    FIRST_DATA_ROW,
    HEADER_ROWS,
    SHEET,
)

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
RAW_DIR = DATA_DIR / "raw"
DB_PATH = DATA_DIR / "processed" / "ecoenergy.db"

# En dessous de 20 % de la production ACP médiane, un ratio « par tonne » n'a plus de sens.
MIN_ACP_FOR_RATIO = 0.2


def find_workbook() -> Path:
    files = sorted(RAW_DIR.glob("Tableau*.xlsx"))
    if not files:
        sys.exit(f"Aucun fichier « Tableau*.xlsx » dans {RAW_DIR}")
    return files[0]


def read_rows(path: Path) -> list[tuple]:
    # data_only=True : on lit la dernière valeur calculée par Excel, pas la formule
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    return list(wb[SHEET].iter_rows(values_only=True))


def cell(rows: list[tuple], row: int, letter: str):
    """Valeur d'une cellule avec numéros Excel (ligne 1 = première ligne)."""
    r = rows[row - 1]
    i = column_index_from_string(letter) - 1
    return r[i] if i < len(r) else None


def check_headers(rows: list[tuple]) -> None:
    errors = []
    for col in COLUMNS:
        header = " / ".join(str(cell(rows, r, col.letter) or "") for r in HEADER_ROWS)
        if col.expect not in header:
            errors.append(f"  colonne {col.letter} ({col.name}) : attendu « {col.expect} », trouvé « {header} »")
    if errors:
        sys.exit("La mise en page du fichier Excel a changé :\n" + "\n".join(errors))


def to_number(value) -> float:
    """Nombre, ou NaN pour tout le reste (vide, texte, erreurs #N/A / #VALUE! / #DIV/0!)."""
    if isinstance(value, bool):
        return np.nan
    if isinstance(value, (int, float)):
        return float(value)
    return np.nan


def extract(rows: list[tuple]) -> pd.DataFrame:
    records = []
    for row_num in range(FIRST_DATA_ROW, len(rows) + 1):
        date = cell(rows, row_num, DATE_LETTER)
        if not isinstance(date, datetime):
            continue  # lignes vides en fin de feuille
        record = {"date": date.date().isoformat()}
        for col in COLUMNS:
            record[col.name] = to_number(cell(rows, row_num, col.letter))
        records.append(record)
    return pd.DataFrame.from_records(records)


def clean(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Remplace les valeurs IMPOSSIBLES par NaN et journalise chaque remplacement.

    On ne retire pas les valeurs simplement inhabituelles (une journée à faible charge,
    un arrêt de maintenance…) : ce sont de vraies données d'exploitation, et les repérer
    est le travail de la détection d'anomalies, pas du nettoyage.
    """
    issues = []

    def drop(mask: pd.Series, name: str, reason: str) -> None:
        for idx in df.index[mask]:
            issues.append({"date": df.at[idx, "date"], "column": name,
                           "value": df.at[idx, name], "reason": reason})
        df.loc[mask, name] = np.nan

    # 1) Bornes physiques : une quantité ne peut pas être négative,
    #    une journée a au plus 25 h (passage à l'heure d'hiver).
    for col in COLUMNS:
        s = df[col.name]
        drop(s < 0, col.name, "négatif")
        if col.unit == "h/j":
            drop(s > 25, col.name, "plus de 25 h dans une journée")
        if col.unit == "%":
            drop(s > 100, col.name, "pourcentage > 100")

    # 2) Heures GTA3 non saisies : ni marche ni arrêt → on ne sait rien de la journée,
    #    et une production à 0 ces jours-là est une case vide, pas une vraie production nulle.
    hours_missing = (df["marche_gta3_h"] == 0) & (df["arret_gta3_h"] == 0)
    drop(hours_missing & (df["prod_gta3_mwh"] == 0), "prod_gta3_mwh", "GTA3 : journée non saisie")
    drop(hours_missing.copy(), "arret_gta3_h", "GTA3 : journée non saisie")
    drop(hours_missing.copy(), "marche_gta3_h", "GTA3 : journée non saisie")

    # 3) Marche + arrêt > 25 h est contradictoire. La marche est confirmée par la
    #    production ce jour-là, donc c'est l'arrêt qui est faux.
    contradictory = (df["marche_gta3_h"] + df["arret_gta3_h"] > 25) & (df["prod_gta3_mwh"] > 0)
    drop(contradictory, "arret_gta3_h", "marche + arrêt > 25 h (production confirme la marche)")

    # 4) Facture en DH par tonne de P2O5 : quand l'usine produit presque rien, on divise
    #    par un nombre proche de zéro et le ratio explose (jusqu'à 145 771 DH/t).
    min_acp = MIN_ACP_FOR_RATIO * df["acp_t_p2o5"].median()
    low_prod = ~(df["acp_t_p2o5"] >= min_acp)  # inclut les jours sans production saisie
    drop(low_prod & df["facture_dh_par_t_p2o5"].notna(), "facture_dh_par_t_p2o5",
         f"ratio non significatif : production ACP < {min_acp:.0f} t")

    return df, pd.DataFrame(issues, columns=["date", "column", "value", "reason"])


def derive(df: pd.DataFrame) -> pd.DataFrame:
    df["recu_mc_mwh"] = df[["recu_mc_hp_mwh", "recu_mc_hpl_mwh", "recu_mc_hc_mwh"]].sum(axis=1, min_count=1)
    df["recu_onee_mwh"] = df[["recu_onee_hp_mwh", "recu_onee_hpl_mwh", "recu_onee_hc_mwh"]].sum(axis=1, min_count=1)

    conso = df["conso_usine_mwh"].where(df["conso_usine_mwh"] > 0)
    df["taux_couverture_pct"] = 100 * df["prod_gta3_mwh"] / conso

    prod = df["prod_gta3_mwh"].where(df["prod_gta3_mwh"] > 0)
    df["cs_vhp_t_par_mwh"] = df["vhp_gta3_t"].where(df["vhp_gta3_t"] > 0) / prod

    # GTA1/GTA2 : seules les heures d'arrêt sont saisies. GTA3 : les heures de marche
    # sont plus fiables (cohérentes avec la production), on les préfère.
    for n in (1, 2):
        df[f"dispo_gta{n}_pct"] = 100 * (24 - df[f"arret_gta{n}_h"].clip(0, 24)) / 24
    df["dispo_gta3_pct"] = 100 * df["marche_gta3_h"].clip(0, 24) / 24

    return df.round(3)


def columns_meta() -> pd.DataFrame:
    rows = [{"name": c.name, "unit": c.unit, "group": c.group, "description": c.description,
             "source": f"{SHEET}!{c.letter}"} for c in COLUMNS]
    rows += [{"name": n, "unit": u, "group": g, "description": d, "source": "calculé"}
             for n, (u, g, d) in DERIVED.items()]
    return pd.DataFrame(rows)


def load(df: pd.DataFrame, meta: pd.DataFrame, issues: pd.DataFrame) -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as con:
        df.to_sql("daily", con, if_exists="replace", index=False)
        meta.to_sql("columns_meta", con, if_exists="replace", index=False)
        issues.to_sql("quality_issues", con, if_exists="replace", index=False)
        con.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_date ON daily(date)")


def report(df: pd.DataFrame, issues: pd.DataFrame) -> None:
    print(f"\n{len(df)} jours chargés : {df['date'].min()} → {df['date'].max()}")
    print(f"{len(issues)} valeurs écartées (détail dans la table quality_issues)")
    if len(issues):
        print(issues.groupby(["column", "reason"]).size().to_string())
    print("\nCouverture (jours avec une valeur) :")
    for name in df.columns[1:]:
        n = df[name].notna().sum()
        print(f"  {name:28} {n:4} / {len(df)}")
    print(f"\nBase écrite : {DB_PATH}")


def main() -> None:
    path = find_workbook()
    print(f"Lecture de {path.name} …")
    rows = read_rows(path)
    check_headers(rows)
    df = extract(rows)
    df, issues = clean(df)
    df = derive(df)
    load(df, columns_meta(), issues)
    report(df, issues)


if __name__ == "__main__":
    main()
