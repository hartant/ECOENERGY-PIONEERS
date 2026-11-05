"use client"

import { useState } from "react"
import useSWR from "swr"
import { BarChart3, Droplets, FileSpreadsheet, FileText, Flame, ShieldCheck, Zap } from "lucide-react"
import { API_URL, useKpis, useMeta } from "@/lib/api"
import { ApiError } from "./data-source"
import { PageHeader, PeriodPicker, StatCard, fmt, periodRange, type PeriodId } from "./ui"

/* ------------------------------------------------------------------ */
/* Rapports : PDF et Excel générés par le backend à partir des données */
/* réelles nettoyées, pour la période choisie.                         */
/* ------------------------------------------------------------------ */

const ICONS: Record<string, typeof Zap> = { synthese: BarChart3, energie: Zap, eau: Droplets, production: Flame, qualite: ShieldCheck }

interface ReportInfo {
  id: string
  title: string
  description: string
}

export function ReportsPanel() {
  const { data: meta, error } = useMeta()
  const { data: reports } = useSWR<ReportInfo[]>(`${API_URL}/api/reports`, (url: string) => fetch(url).then((r) => r.json()))
  const [period, setPeriod] = useState<PeriodId | "custom">("all")
  const [custom, setCustom] = useState<[string, string] | null>(null)

  const [start, end] = period === "custom" && custom ? custom : periodRange(period === "custom" ? "all" : period, meta?.first_date, meta?.last_date)
  const { data: kpis } = useKpis(start, end)

  if (error) return <ApiError error={error} />
  const e = kpis?.groups.electricite
  const url = (id: string, fmtExt: "pdf" | "xlsx") => `${API_URL}/api/reports/${id}.${fmtExt}?start=${start}&end=${end}`

  const setDate = (i: 0 | 1, v: string) => {
    const next: [string, string] = [start ?? "", end ?? ""]
    next[i] = v
    setCustom(next)
    setPeriod("custom")
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Rapports" subtitle="Fichiers PDF et Excel générés à la demande à partir des données réelles nettoyées">
        <PeriodPicker value={period === "custom" ? ("" as PeriodId) : period} onChange={(p) => setPeriod(p)} />
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <input
            type="date"
            value={start ?? ""}
            min={meta?.first_date}
            max={end}
            onChange={(ev) => setDate(0, ev.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 tabular"
          />
          →
          <input
            type="date"
            value={end ?? ""}
            min={start}
            max={meta?.last_date}
            onChange={(ev) => setDate(1, ev.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 tabular"
          />
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Jours couverts" value={fmt(kpis?.days, 0)} hint={`${start ?? "…"} → ${end ?? "…"}`} />
        <StatCard label="Production GTA3" value={fmt(e?.production.value, 0)} unit="MWh" accent="text-emerald-600" />
        <StatCard label="Coût des achats d'électricité" value={fmt(e?.cout_achats.value == null ? null : e.cout_achats.value / 1e6, 2)} unit="M DH" accent="text-amber-700" />
        <StatCard label="Autonomie électrique" value={fmt(e?.taux_couverture.value, 1)} unit="%" accent="text-violet-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(reports ?? []).map((r) => {
          const Icon = ICONS[r.id] ?? FileText
          return (
            <section key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col">
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-slate-600" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">{r.title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>
                </div>
              </div>
              <div className="mt-auto flex gap-2 pt-4">
                <a
                  href={start && end ? url(r.id, "pdf") : undefined}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  <FileText className="w-4 h-4" /> PDF
                </a>
                <a
                  href={start && end ? url(r.id, "xlsx") : undefined}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Excel
                </a>
              </div>
            </section>
          )
        })}
      </div>

      <p className="text-xs text-slate-500">
        Chaque rapport contient les indicateurs de la période, les données jour par jour avec leurs unités, et la source de chaque colonne dans le
        classeur Excel d'origine. Les valeurs impossibles écartées par le nettoyage sont listées dans « Qualité des données ».
      </p>
    </div>
  )
}
