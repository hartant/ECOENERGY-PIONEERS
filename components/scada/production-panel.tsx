"use client"

import { useState } from "react"
import { Area, AreaChart, Bar, CartesianGrid, ComposedChart, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useKpis, useMeta, useSeries } from "@/lib/api"
import { ApiError } from "./data-source"
import { ChartTooltip, LegendDot, PageHeader, Panel, PeriodPicker, StatCard, dayLabel, fmt, mean, periodRange, sum, type PeriodId } from "./ui"

const FIELDS = [
  "acp_t_p2o5", "facture_dh_par_t_p2o5", "vhp_gta3_t", "soutirage_bp_t", "condensat_gta3_m3", "cs_vhp_t_par_mwh",
  "vapeur_recue_mc_t", "marche_zr400_1_h", "marche_zr400_2_h", "marche_zr400_3_h", "stock_fuel_t", "stock_gasoil_m3",
]

// Plage cible du rapport journalier (« R Processe Centrale »)
const CS_MIN = 6.8
const CS_MAX = 7.5

export function ProductionPanel() {
  const [period, setPeriod] = useState<PeriodId>("all")
  const { data: meta, error } = useMeta()
  const [start, end] = periodRange(period, meta?.first_date, meta?.last_date)
  const { data: series } = useSeries(FIELDS, start, end)
  const { data: kpis } = useKpis(start, end)

  if (error) return <ApiError error={error} />
  const raw = series?.rows ?? []
  const rows = raw.map((r) => ({ ...r, jour: dayLabel(r.date) }))
  const vapeur = kpis?.groups.vapeur

  // Bilan matière de la turbine : vapeur entrée = vapeur BP soutirée + condensat (1 m³ d'eau ≈ 1 t)
  const vhp = sum(raw, "vhp_gta3_t")
  const sortie = (sum(raw, "soutirage_bp_t") ?? 0) + (sum(raw, "condensat_gta3_m3") ?? 0)
  const balanced = raw.filter((r) => r.vhp_gta3_t && r.soutirage_bp_t !== null && r.condensat_gta3_m3 !== null)
  const bilanPct = balanced.length
    ? (((sum(balanced, "soutirage_bp_t") ?? 0) + (sum(balanced, "condensat_gta3_m3") ?? 0)) / (sum(balanced, "vhp_gta3_t") || 1)) * 100
    : null

  const compressors = [1, 2, 3].map((n) => ({ name: `ZR 400 ${"I".repeat(n)}`, h: mean(raw, `marche_zr400_${n}_h`) }))

  return (
    <div className="space-y-4">
      <PageHeader title="Production et vapeur" subtitle={`Données réelles · ${start ?? "…"} → ${end ?? "…"} · ${rows.length} jours`}>
        <PeriodPicker value={period} onChange={setPeriod} />
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Acide phosphorique (ACP)" value={fmt(sum(raw, "acp_t_p2o5"), 0)} unit="t P2O5" accent="text-emerald-600" hint={`${fmt(mean(raw, "acp_t_p2o5"), 0)} t/j en moyenne`} />
        <StatCard label="Facture énergétique" value={fmt(mean(raw, "facture_dh_par_t_p2o5"), 1)} unit="DH/t P2O5" hint="moyenne des jours significatifs" />
        <StatCard label="Vapeur VHP → GTA3" value={fmt(vhp, 0)} unit="t" accent="text-orange-600" />
        <StatCard label="Conso. spécifique moyenne" value={fmt(vapeur?.cs_vhp_moyenne.value, 2)} unit="t/MWh" accent="text-violet-600" hint="cible 6,8 – 7,5 t/MWh" />
        <StatCard
          label="Jours dans la cible"
          value={fmt(vapeur?.jours_cs_dans_cible.value, 0)}
          unit="%"
          accent={(vapeur?.jours_cs_dans_cible.value ?? 100) < 80 ? "text-amber-600" : "text-emerald-600"}
          hint="consommation spécifique entre 6,8 et 7,5"
        />
        <StatCard label="Bilan matière turbine" value={fmt(bilanPct, 1)} unit="%" hint={`(BP + condensat) / VHP · ${fmt(sortie, 0)} t sorties`} />
      </div>

      <Panel title="Production d'acide phosphorique et facture énergétique" subtitle="t P2O5 par jour (barres) · DH par tonne (ligne, axe de droite)">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 8, right: 0, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-200)" vertical={false} />
              <XAxis dataKey="jour" tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis yAxisId="acp" tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} width={56} />
              <YAxis yAxisId="dh" orientation="right" tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} width={48} />
              <Tooltip content={<ChartTooltip unit="" />} />
              <Bar yAxisId="acp" dataKey="acp_t_p2o5" name="ACP (t P2O5)" fill="var(--color-emerald-500)" fillOpacity={0.7} isAnimationActive={false} />
              <Line yAxisId="dh" type="monotone" dataKey="facture_dh_par_t_p2o5" name="Facture (DH/t)" stroke="var(--color-amber-600)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-600">
          <LegendDot className="bg-emerald-500" label="Production ACP" />
          <LegendDot className="bg-amber-600" label="Facture énergétique par tonne" />
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Efficacité de la turbine GTA3" subtitle="Consommation spécifique (t de vapeur par MWh) · bande verte = cible 6,8 – 7,5">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-200)" vertical={false} />
                <XAxis dataKey="jour" tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis domain={[5, 10]} allowDataOverflow tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} width={40} />
                <ReferenceArea y1={CS_MIN} y2={CS_MAX} fill="var(--color-emerald-500)" fillOpacity={0.12} />
                <Tooltip content={<ChartTooltip unit="t/MWh" />} />
                <Line type="monotone" dataKey="cs_vhp_t_par_mwh" name="Consommation spécifique" stroke="var(--color-violet-500)" strokeWidth={1.4} dot={{ r: 1.5 }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-slate-500">Au-dessus de la bande : la turbine consomme trop de vapeur pour chaque MWh (perte de rendement). Ces jours sont les premiers candidats de la détection d'anomalies.</p>
        </Panel>

        <Panel title="Bilan vapeur de la turbine" subtitle="t par jour · ce qui entre (VHP) = ce qui sort (BP vers CAP + condensat)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-200)" vertical={false} />
                <XAxis dataKey="jour" tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} width={48} />
                <Tooltip content={<ChartTooltip unit="t" />} />
                <Area type="monotone" dataKey="soutirage_bp_t" name="BP soutirée → CAP" stackId="o" stroke="var(--color-amber-600)" fill="var(--color-amber-500)" fillOpacity={0.25} isAnimationActive={false} />
                <Area type="monotone" dataKey="condensat_gta3_m3" name="Condensat" stackId="o" stroke="var(--color-cyan-600)" fill="var(--color-cyan-500)" fillOpacity={0.25} isAnimationActive={false} />
                <Line type="monotone" dataKey="vhp_gta3_t" name="VHP admise" stroke="var(--color-orange-600)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-600">
            <LegendDot className="bg-orange-600" label="VHP admise" />
            <LegendDot className="bg-amber-500" label="BP soutirée" />
            <LegendDot className="bg-cyan-500" label="Condensat" />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Stocks de combustibles de secours" subtitle="Fuel-oil (t) et gas-oil (m³) en fin de journée">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-200)" vertical={false} />
                <XAxis dataKey="jour" tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} width={48} />
                <Tooltip content={<ChartTooltip unit="" />} />
                <Area type="stepAfter" dataKey="stock_fuel_t" name="Fuel-oil (t)" stroke="var(--color-slate-600)" fill="var(--color-slate-400)" fillOpacity={0.2} isAnimationActive={false} />
                <Area type="stepAfter" dataKey="stock_gasoil_m3" name="Gas-oil (m³)" stroke="var(--color-orange-500)" fill="var(--color-orange-400)" fillOpacity={0.15} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Compresseurs d'air" subtitle="Heures de marche moyennes par jour">
          <ul className="space-y-3 pt-1">
            {compressors.map((c) => (
              <li key={c.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">{c.name}</span>
                  <span className="tabular font-semibold text-slate-900">{fmt(c.h, 1)} h/j</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-sky-500" style={{ width: `${((c.h ?? 0) / 24) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">Pression d'air comprimé cible ≥ 6,25 bar (mesure simulée sur la vue d'ensemble).</p>
        </Panel>
      </div>
    </div>
  )
}
