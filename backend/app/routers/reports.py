"""Rapports téléchargeables : catalogue + fichiers PDF / Excel générés à la demande."""

from datetime import date
from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.data import columns_meta, query
from app.reports import BY_ID, REPORTS, build_excel, build_pdf
from app.routers.days import date_range

router = APIRouter(prefix="/api/reports", tags=["Rapports"])

MEDIA = {
    "pdf": "application/pdf",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


@router.get("")
def list_reports():
    """Rapports disponibles."""
    return [{"id": r.id, "title": r.title, "description": r.description} for r in REPORTS]


@router.get("/{report_id}.{fmt}")
def download_report(report_id: str, fmt: Literal["pdf", "xlsx"], start: date | None = None, end: date | None = None):
    """Génère le rapport sur la période et le renvoie en pièce jointe."""
    report = BY_ID.get(report_id)
    if report is None:
        raise HTTPException(404, f"Rapport inconnu : {report_id}")
    df = query("SELECT * FROM daily WHERE date BETWEEN ? AND ? ORDER BY date", date_range(start, end))
    if df.empty:
        raise HTTPException(404, "Aucune donnée sur cette période")
    issues = query("SELECT * FROM quality_issues WHERE date BETWEEN ? AND ? ORDER BY date", date_range(start, end))

    content = build_pdf(report, df, issues) if fmt == "pdf" else build_excel(report, df, columns_meta().set_index("name"), issues)
    filename = f"ecoenergy_{report.id}_{df.date.min()}_{df.date.max()}.{fmt}"
    # Content-Disposition: attachment → le navigateur télécharge le fichier au lieu de l'afficher
    return Response(content, media_type=MEDIA[fmt], headers={"Content-Disposition": f'attachment; filename="{filename}"'})
