"use client"

import { useState } from "react"
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { AlertTriangle } from "lucide-react"
import { useMeta, useSeries } from "@/lib/api"
import { ApiError } from "./data-source"
import { ChartTooltip, LegendDot, PageHeader, Panel, PeriodPicker, StatCard, dayLabel, fmt, mean, periodRange, sum, type PeriodId } from "./ui"

const FIELDS = [
  "eau_dessalee_m3", "wds_production_m3", "wds_consommation_m3", "stock_wds_sulfurique_m3",
  "wds_vers_centrale_m3", "wds_vers_mc_m3", "wds_vers_sulfurique_m3", "eau_regeneration_ted_m3",
  "soude_t", "acide_sulfurique_t", "dci_est_m3", "dci_ouest_m3", "step_m3",
]

export function WaterPanel() {
  const [period, setPeriod] = useState<PeriodId>("all")
  const { data: meta, error } = useMeta()
  const [start, end] = periodRange(period, meta?.first_date, meta?.last_date)
  const { data: series } = useSeries(FIELDS, start, end)

  if (error) return <ApiError error={error} />
  const raw = series?.rows ?? []
  const rows = raw.map((r) => ({ ...r, jour: dayLabel(r.date), dci: (r.dci_est_m3 ?? 0) + (r.dci_ouest_m3 ?? 0) }))

  const wdsProd = sum(raw, "wds_production_m3")
  const regen = sum(raw, "eau_regeneration_ted_m3")
  // Consommation spécifique de réactifs : kg par m³ de WDS produite (les réactifs sont en tonnes)
  const kgPerM3 = (key: string) => {
    const t = sum(raw, key)
    return t === null || !wdsProd ? null : (t * 1000) / wdsProd
  }

  const destinations = [
    { name: "Centrale (chaudières)", value: sum(raw, "wds_vers_centrale_m3") },
    { name: "Maroc Chimie", value: sum(raw, "wds_vers_mc_m3") },
    { name: "Unité sulfurique", value: sum(raw, "wds_vers_sulfurique_m3") },
    { name: "Régénération TED", value: regen },
  ].sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

  // Le réseau incendie (DCI) ne devrait presque rien consommer hors intervention :
  // une consommation élevée signale une fuite ou un essai. Seuil = 3 × la médiane des jours non nuls.
  const dciValues = rows.map((r) => r.dci).filter((x) => x > 0).sort((a, b) => a - b)
  const dciMedian = dciValues.length ? dciValues[Math.floor(dciValues.length / 2)] : 0
  const dciThreshold = 3 * dciMedian
  const dciHigh = rows.filter((r) => r.dci > dciThreshold)

  return (
    <div className="space-y-4">
      <PageHeader title="Eau et traitement (TED)" subtitle={`Données réelles · ${start ?? "…"} → ${end ?? "…"} · ${rows.length} jours`}>
        <PeriodPicker value={period} onChange={setPeriod} />
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Eau dessalée reçue" value={fmt(sum(raw, "eau_dessalee_m3"), 0)} unit="m³" accent="text-sky-700" />
        <StatCard label="Production WDS" value={fmt(wdsProd, 0)} unit="m³" accent="text-cyan-600" hint={`${fmt(mean(raw, "wds_production_m3"), 0)} m³/j en moyenne`} />
        <StatCard label="Consommation WDS" value={fmt(sum(raw, "wds_consommation_m3"), 0)} unit="m³" accent="text-sky-600" />
        <StatCard label="Eau de régénération" value={fmt(regen === null || !wdsProd ? null : (regen / wdsProd) * 100, 1)} unit="%" hint="de la WDS produite, consommée par le TED lui-même" />
        <StatCard label="Soude consommée" value={fmt(kgPerM3("soude_t"), 2)} unit="kg/m³" hint={`${fmt(sum(raw, "soude_t"), 1)} t sur la période`} />
        <StatCard label="Acide sulfurique" value={fmt(kgPerM3("acide_sulfurique_t"), 2)} unit="kg/m³" hint={`${fmt(sum(raw, "acide_sulfurique_t"), 1)} t sur la période`} />
      </div>

      <Panel title="Eau désilicée (WDS) : production, consommation et stock" subtitle="m³ par jour · stock en fin de journée (axe de droite)">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 8, right: 0, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-200)" vertical={false} />
              <XAxis dataKey="jour" tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis yAxisId="flux" tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} width={56} />
              <YAxis yAxisId="stock" orientation="right" tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} width={48} />
              <Tooltip content={<ChartTooltip unit="m³" />} />
              <Line yAxisId="flux" type="monotone" dataKey="wds_production_m3" name="Production WDS" stroke="var(--color-cyan-500)" strokeWidth={1.8} dot={false} isAnimationActive={false} />
              <Line yAxisId="flux" type="monotone" dataKey="wds_consommation_m3" name="Consommation WDS" stroke="var(--color-sky-700)" strokeWidth={1.2} dot={false} isAnimationActive={false} />
              <Line yAxisId="stock" type="monotone" dataKey="stock_wds_sulfurique_m3" name="Stock" stroke="var(--color-violet-500)" strokeWidth={1.2} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-600">
          <LegendDot className="bg-cyan-500" label="Production WDS" />
          <LegendDot className="bg-sky-700" label="Consommation WDS" />
          <LegendDot className="bg-violet-500" label="Stock côté sulfurique" />
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Où va l'eau désilicée ?" subtitle="m³ livrés sur la période">
          <ul className="space-y-3 pt-1">
            {destinations.map((d) => {
              const total = destinations.reduce((a, b) => a + (b.value ?? 0), 0) || 1
              const pct = ((d.value ?? 0) / total) * 100
              return (
                <li key={d.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700">{d.name}</span>
                    <span className="tabular text-slate-900">
                      <b>{fmt(d.value, 0)}</b> m³ · {fmt(pct, 1)} %
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-cyan-500" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>

        <Panel title="Réactifs de régénération" subtitle="Tonnes par jour · soude (NaOH) et acide sulfurique (H₂SO₄)">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-200)" vertical={false} />
                <XAxis dataKey="jour" tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} width={48} />
                <Tooltip content={<ChartTooltip unit="t" />} />
                <Bar dataKey="soude_t" name="Soude" stackId="r" fill="var(--color-teal-500)" isAnimationActive={false} />
                <Bar dataKey="acide_sulfurique_t" name="Acide sulfurique" stackId="r" fill="var(--color-amber-500)" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="Réseau incendie (DCI Est + Ouest)" subtitle={`m³ par jour · seuil de vigilance = 3 × la médiane (${fmt(dciThreshold, 0)} m³/j)`}>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-200)" vertical={false} />
              <XAxis dataKey="jour" tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} width={48} />
              <Tooltip content={<ChartTooltip unit="m³" />} />
              <Bar dataKey="dci" name="DCI" isAnimationActive={false} fill="var(--color-sky-500)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex items-start gap-2 text-xs text-slate-600">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p>
            Hors incendie, ce réseau ne devrait presque rien consommer. <b>{dciHigh.length} jour(s)</b> au-dessus du seuil sur la période
            {dciHigh.length > 0 && ` (max ${fmt(Math.max(...dciHigh.map((r) => r.dci)), 0)} m³ le ${dciHigh.reduce((a, b) => (b.dci > a.dci ? b : a)).jour})`} : fuite, essai ou
            intervention à vérifier. Ces jours seront des candidats pour la détection d'anomalies.
          </p>
        </div>
      </Panel>
    </div>
  )
}
