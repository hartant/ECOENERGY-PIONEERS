"""Génération des rapports téléchargeables (Excel et PDF) à partir des données nettoyées.

Chaque rapport = une liste de groupes de KPI + une liste de colonnes journalières + un graphique.
Les KPI viennent de la même fonction que /api/kpis : les chiffres du PDF, de l'Excel et du
tableau de bord sont toujours identiques.
"""

import io
import os
from dataclasses import dataclass, field
from datetime import datetime

import matplotlib

matplotlib.use("Agg")  # pas d'écran sur un serveur : on dessine en mémoire
import matplotlib.pyplot as plt  # noqa: E402
import pandas as pd  # noqa: E402
from fpdf import FPDF  # noqa: E402
from openpyxl import Workbook  # noqa: E402
from openpyxl.styles import Alignment, Font, PatternFill  # noqa: E402
from openpyxl.utils import get_column_letter  # noqa: E402

from app.routers.kpis import compute_groups  # noqa: E402

GROUP_TITLES = {"electricite": "Électricité", "vapeur": "Vapeur", "eau": "Eau", "production": "Production",
                "equipements": "Équipements"}


@dataclass(frozen=True)
class Report:
    id: str
    title: str
    description: str
    groups: list[str]
    columns: list[str]
    chart: list[tuple[str, str, str]] = field(default_factory=list)  # (colonne, légende, couleur)


REPORTS: list[Report] = [
    Report("synthese", "Rapport de synthèse", "Tous les indicateurs clés du site sur la période.",
           ["electricite", "vapeur", "eau", "production", "equipements"],
           ["prod_gta3_mwh", "conso_usine_mwh", "recu_mc_mwh", "recu_onee_mwh", "recu_montant_dh", "taux_couverture_pct",
            "cs_vhp_t_par_mwh", "wds_production_m3", "acp_t_p2o5", "facture_dh_par_t_p2o5"],
           [("prod_gta3_mwh", "Production GTA3 (MWh)", "#10b981"), ("conso_usine_mwh", "Consommation (MWh)", "#0284c7")]),
    Report("energie", "Bilan énergétique", "Production GTA, achats MC/ONEE par tranche horaire, coût et autonomie.",
           ["electricite", "equipements"],
           ["prod_gta3_mwh", "conso_usine_mwh", "recu_mc_hp_mwh", "recu_mc_hpl_mwh", "recu_mc_hc_mwh", "recu_onee_hp_mwh",
            "recu_onee_hpl_mwh", "recu_onee_hc_mwh", "recu_total_mwh", "recu_montant_dh", "taux_couverture_pct",
            "dispo_gta1_pct", "dispo_gta2_pct", "dispo_gta3_pct"],
           [("prod_gta3_mwh", "Production GTA3 (MWh)", "#10b981"), ("recu_total_mwh", "Achats (MWh)", "#f59e0b"),
            ("conso_usine_mwh", "Consommation (MWh)", "#0284c7")]),
    Report("eau", "Traitement des eaux (TED)", "Production et distribution de WDS, stock, réactifs, réseau incendie.",
           ["eau"],
           ["eau_dessalee_m3", "wds_production_m3", "wds_consommation_m3", "wds_vers_centrale_m3", "wds_vers_mc_m3",
            "wds_vers_sulfurique_m3", "eau_regeneration_ted_m3", "stock_wds_sulfurique_m3", "soude_t", "acide_sulfurique_t",
            "dci_est_m3", "dci_ouest_m3"],
           [("wds_production_m3", "Production WDS (m³)", "#06b6d4"), ("wds_consommation_m3", "Consommation WDS (m³)", "#0369a1")]),
    Report("production", "Production et vapeur", "ACP, facture énergétique, consommation spécifique, bilan vapeur turbine.",
           ["production", "vapeur"],
           ["acp_t_p2o5", "facture_dh_par_t_p2o5", "vhp_gta3_t", "soutirage_bp_t", "condensat_gta3_m3", "cs_vhp_t_par_mwh",
            "vapeur_recue_mc_t", "stock_fuel_t", "stock_gasoil_m3"],
           [("cs_vhp_t_par_mwh", "Consommation spécifique (t/MWh)", "#8b5cf6")]),
    Report("qualite", "Qualité des données", "Valeurs écartées par le pipeline de nettoyage, avec la raison.",
           [], []),
]
BY_ID = {r.id: r for r in REPORTS}


def _kpi_rows(report: Report, df: pd.DataFrame) -> list[tuple[str, str, float | None, str]]:
    groups = compute_groups(df)
    return [(GROUP_TITLES[g], k.label, k.value, k.unit) for g in report.groups for k in groups[g].values()]


def _header(name: str, meta: pd.DataFrame) -> str:
    m = meta.loc[name]
    return f"{m['description']} ({m['unit']})"


def _fmt(v: float | None, digits: int = 1) -> str:
    if v is None or pd.isna(v):
        return "—"
    return f"{v:,.{digits}f}".replace(",", " ").replace(".", ",")


def _digits(unit: str) -> int:
    """Décimales selon l'unité : pas de virgule pour des DH ou des MWh cumulés."""
    if unit == "t/MWh":
        return 2
    return 0 if unit in ("DH", "MWh", "m3", "t", "t P2O5") else 1


# --------------------------------------------------------------------------- Excel

def build_excel(report: Report, df: pd.DataFrame, meta: pd.DataFrame, issues: pd.DataFrame) -> bytes:
    wb = Workbook()
    bold, head_fill = Font(bold=True), PatternFill("solid", fgColor="E2E8F0")

    ws = wb.active
    ws.title = "Synthèse"
    ws.append([report.title])
    ws["A1"].font = Font(bold=True, size=14)
    ws.append([f"Période : {df.date.min()} → {df.date.max()} ({len(df)} jours)"])
    ws.append([f"Généré le {datetime.now():%d/%m/%Y %H:%M} · source : Tableau de bord Utilité 2025 (données réelles nettoyées)"])
    ws.append([])
    if report.groups:
        ws.append(["Groupe", "Indicateur", "Valeur", "Unité"])
        for c in ws[ws.max_row]:
            c.font, c.fill = bold, head_fill
        for row in _kpi_rows(report, df):
            ws.append([row[0], row[1], None if row[2] is None else round(row[2], 2), row[3]])
            ws.cell(ws.max_row, 3).number_format = "#,##0.00"
    for col, width in zip("ABCD", (16, 48, 18, 12)):
        ws.column_dimensions[col].width = width

    if report.columns:
        ds = wb.create_sheet("Données journalières")
        ds.append(["Date"] + [_header(c, meta) for c in report.columns])
        for c in ds[1]:
            c.font, c.fill = bold, head_fill
            c.alignment = Alignment(wrap_text=True, vertical="top")
        for r in df[["date"] + report.columns].itertuples(index=False):
            ds.append([None if pd.isna(v) else v for v in r])
        ds.freeze_panes = "B2"  # en-tête et dates restent visibles quand on défile
        ds.row_dimensions[1].height = 45
        ds.column_dimensions["A"].width = 12
        for i in range(2, len(report.columns) + 2):
            ds.column_dimensions[get_column_letter(i)].width = 18

        src = wb.create_sheet("Colonnes")
        src.append(["Colonne", "Description", "Unité", "Source"])
        for c in src[1]:
            c.font, c.fill = bold, head_fill
        for c in report.columns:
            m = meta.loc[c]
            src.append([c, m["description"], m["unit"], m["source"]])
        for col, width in zip("ABCD", (28, 60, 12, 16)):
            src.column_dimensions[col].width = width

    if report.id == "qualite":
        qs = wb.create_sheet("Valeurs écartées")
        qs.append(["Date", "Colonne", "Valeur d'origine", "Raison"])
        for c in qs[1]:
            c.font, c.fill = bold, head_fill
        for r in issues.itertuples(index=False):
            qs.append([r.date, r.column, None if pd.isna(r.value) else r.value, r.reason])
        for col, width in zip("ABCD", (12, 28, 16, 70)):
            qs.column_dimensions[col].width = width

    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


# --------------------------------------------------------------------------- PDF

FONT_DIR = os.path.join(matplotlib.get_data_path(), "fonts", "ttf")


def _chart_png(report: Report, df: pd.DataFrame) -> bytes | None:
    if not report.chart:
        return None
    fig, ax = plt.subplots(figsize=(10, 3.4), dpi=150)
    dates = pd.to_datetime(df.date)
    for col, label, color in report.chart:
        ax.plot(dates, df[col], label=label, color=color, linewidth=1.2)
    if report.id == "production":
        ax.axhspan(6.8, 7.5, color="#10b981", alpha=0.12, label="Cible 6,8 – 7,5")
        ax.set_ylim(5, 10)
    ax.grid(axis="y", alpha=0.3)
    ax.spines[["top", "right"]].set_visible(False)
    ax.legend(loc="upper left", fontsize=8, frameon=False, ncol=len(report.chart) + 1)
    fig.autofmt_xdate()
    fig.tight_layout()
    out = io.BytesIO()
    fig.savefig(out, format="png")
    plt.close(fig)
    return out.getvalue()


class _Pdf(FPDF):
    def footer(self):
        self.set_y(-12)
        self.set_font("dejavu", size=7)
        self.set_text_color(120)
        self.cell(0, 6, f"EcoEnergy Pioneers · Utilités OCP · page {self.page_no()}", align="C")


def build_pdf(report: Report, df: pd.DataFrame, issues: pd.DataFrame) -> bytes:
    pdf = _Pdf(format="A4")
    # Police Unicode (DejaVu, livrée avec matplotlib) : les polices PDF de base ne gèrent pas « → », « ³ », « ₂ »…
    pdf.add_font("dejavu", "", os.path.join(FONT_DIR, "DejaVuSans.ttf"))
    pdf.add_font("dejavu", "B", os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf"))
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    pdf.set_font("dejavu", "B", 16)
    pdf.cell(0, 9, report.title, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("dejavu", size=9)
    pdf.set_text_color(90)
    pdf.cell(0, 5, f"Période : {df.date.min()} → {df.date.max()} ({len(df)} jours) · généré le {datetime.now():%d/%m/%Y %H:%M}",
             new_x="LMARGIN", new_y="NEXT")
    pdf.multi_cell(0, 5, report.description + " Source : Tableau de bord Utilité 2025, données réelles nettoyées "
                   "(les valeurs impossibles sont écartées et listées dans le rapport « Qualité des données »).")
    pdf.set_text_color(0)
    pdf.ln(3)

    if report.groups:
        pdf.set_font("dejavu", "B", 9)
        pdf.set_fill_color(226, 232, 240)
        for text, w in (("Groupe", 30), ("Indicateur", 100), ("Valeur", 35), ("Unité", 25)):
            pdf.cell(w, 7, text, border=0, fill=True)
        pdf.ln()
        pdf.set_font("dejavu", size=9)
        for i, (g, label, value, unit) in enumerate(_kpi_rows(report, df)):
            pdf.set_fill_color(248, 250, 252)
            fill = i % 2 == 1
            pdf.cell(30, 6, g, fill=fill)
            pdf.cell(100, 6, label, fill=fill)
            pdf.cell(35, 6, _fmt(value, _digits(unit)), align="R", fill=fill)
            pdf.cell(25, 6, "  " + unit, fill=fill)
            pdf.ln()
        pdf.ln(4)

    png = _chart_png(report, df)
    if png:
        pdf.image(io.BytesIO(png), w=pdf.epw)

    if report.id == "qualite":
        pdf.set_font("dejavu", "B", 11)
        pdf.cell(0, 8, f"{len(issues)} valeurs écartées", new_x="LMARGIN", new_y="NEXT")
        summary = issues.groupby(["column", "reason"]).size().reset_index(name="n")
        pdf.set_font("dejavu", size=8)
        for r in summary.itertuples(index=False):
            pdf.multi_cell(0, 5, f"• {r.column} — {r.reason} : {r.n}", new_x="LMARGIN", new_y="NEXT")

    return bytes(pdf.output())
