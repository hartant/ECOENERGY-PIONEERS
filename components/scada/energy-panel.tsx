"use client"

import { useState } from "react"
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Leaf, Lightbulb } from "lucide-react"
import { useKpis, useMeta, useSeries } from "@/lib/api"
import { ApiError } from "./data-source"
import { ChartTooltip, LegendDot, PageHeader, Panel, PeriodPicker, StatCard, dayLabel, fmt, mean, periodRange, sum, type PeriodId } from "./ui"

// Facteur d'émission du réseau marocain (AIE, 2024) : 0,60 tCO2 par MWh.
// La vapeur du GTA vient de la chaleur récupérée sur l'unité sulfurique : chaque MWh produit
// sur place évite d'acheter un MWh au réseau.
const GRID_TCO2_PER_MWH = 0.6

const FIELDS = [
  "prod_gta3_mwh", "conso_usine_mwh", "recu_mc_mwh", "recu_onee_mwh", "recu_total_mwh", "recu_montant_dh",
  "recu_mc_hp_mwh", "recu_mc_hpl_mwh", "recu_mc_hc_mwh", "recu_onee_hp_mwh", "recu_onee_hpl_mwh", "recu_onee_hc_mwh",
  "dispo_gta1_pct", "dispo_gta2_pct", "dispo_gta3_pct",
]

const COLORS = { gta3: "var(--color-emerald-500)", mc: "var(--color-amber-500)", onee: "var(--color-orange-400)", conso: "var(--color-sky-600)" }

export function EnergyPanel() {
  const [period, setPeriod] = useState<PeriodId>("all")
  const { data: meta, error } = useMeta()
  const [start, end] = periodRange(period, meta?.first_date, meta?.last_date)
  const { data: series } = useSeries(FIELDS, start, end)
  const { data: kpis } = useKpis(start, end)

  if (error) return <ApiError error={error} />
  const rows = (series?.rows ?? []).map((r) => ({
    ...r,
    jour: dayLabel(r.date),
    achats: r.recu_mc_mwh === null && r.recu_onee_mwh === null ? null : (r.recu_mc_mwh ?? 0) + (r.recu_onee_mwh ?? 0),
  }))
  const k = kpis?.groups.electricite
  const prod = k?.production.value ?? null
  const achatsMc = k?.achats_mc.value ?? null
  const achatsOnee = k?.achats_onee.value ?? null
  const cout = k?.cout_achats.value ?? null

  // Prix moyen réellement payé = coût total / MWh reçus (sur les jours où les deux sont connus)
  const priced = (series?.rows ?? []).filter((r) => r.recu_montant_dh !== null && r.recu_total_mwh)
  const prix = priced.length ? (sum(priced, "recu_montant_dh") ?? 0) / (sum(priced, "recu_total_mwh") ?? 1) : null

  const origine = [
    { name: "GTA3 (production propre)", value: prod ?? 0, fill: COLORS.gta3 },
    { name: "Maroc Chimie", value: achatsMc ?? 0, fill: COLORS.mc },
    { name: "Réseau ONEE", value: achatsOnee ?? 0, fill: COLORS.onee },
  ]
  const totalOrigine = origine.reduce((a, b) => a + b.value, 0)

  const tranches = [
    { name: "Heures de pointe", mc: sum(rows, "recu_mc_hp_mwh"), onee: sum(rows, "recu_onee_hp_mwh") },
    { name: "Heures pleines", mc: sum(rows, "recu_mc_hpl_mwh"), onee: sum(rows, "recu_onee_hpl_mwh") },
    { name: "Heures creuses", mc: sum(rows, "recu_mc_hc_mwh"), onee: sum(rows, "recu_onee_hc_mwh") },
  ]

  const dispo = [1, 2, 3].map((n) => ({ name: `GTA${n}`, value: mean(rows, `dispo_gta${n}_pct`) ?? 0 }))

  return (
    <div className="space-y-4">
      <PageHeader title="Énergie électrique" subtitle={`Données réelles · ${start ?? "…"} → ${end ?? "…"} · ${rows.length} jours`}>
        <PeriodPicker value={period} onChange={setPeriod} />
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Production GTA3" value={fmt(prod, 0)} unit="MWh" accent="text-emerald-600" />
        <StatCard label="Consommation du site" value={fmt(k?.consommation.value, 0)} unit="MWh" accent="text-sky-700" />
        <StatCard label="Électricité achetée" value={fmt((achatsMc ?? 0) + (achatsOnee ?? 0), 0)} unit="MWh" accent="text-amber-600" hint={`MC ${fmt(achatsMc, 0)} · ONEE ${fmt(achatsOnee, 0)}`} />
        <StatCard label="Coût des achats" value={fmt(cout === null ? null : cout / 1e6, 2)} unit="M DH" accent="text-amber-700" />
        <StatCard label="Prix moyen payé" value={fmt(prix, 0)} unit="DH/MWh" hint="Tarif ONEE THT : 481 – 745 DH/MWh" />
        <StatCard label="Autonomie électrique" value={fmt(k?.taux_couverture.value, 1)} unit="%" accent="text-violet-600" hint={`Objectif GTA atteint à ${fmt(k?.realisation_objectif.value, 0)} %`} />
      </div>

      <Panel title="Production, achats et consommation" subtitle="MWh par jour · production + achats = consommation">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-200)" vertical={false} />
              <XAxis dataKey="jour" tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} width={56} />
              <Tooltip content={<ChartTooltip unit="MWh" />} />
              <Area type="monotone" dataKey="prod_gta3_mwh" name="Production GTA3" stackId="s" stroke="var(--color-emerald-600)" fill={COLORS.gta3} fillOpacity={0.25} isAnimationActive={false} />
              <Area type="monotone" dataKey="achats" name="Achats (MC + ONEE)" stackId="s" stroke="var(--color-amber-600)" fill={COLORS.mc} fillOpacity={0.2} isAnimationActive={false} />
              <Line type="monotone" dataKey="conso_usine_mwh" name="Consommation" stroke={COLORS.conso} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-600">
          <LegendDot className="bg-emerald-500" label="Production GTA3" />
          <LegendDot className="bg-amber-500" label="Achats (MC + ONEE)" />
          <LegendDot className="bg-sky-600" label="Consommation du site" />
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Origine de l'électricité consommée" subtitle="Part de chaque source sur la période">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={origine} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} isAnimationActive={false}>
                  {origine.map((o) => (
                    <Cell key={o.name} fill={o.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${fmt(Number(v), 0)} MWh (${fmt((Number(v) / (totalOrigine || 1)) * 100, 1)} %)`} />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Achats par tranche horaire ONEE" subtitle="MWh achetés · la pointe est la tranche la plus chère">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tranches} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-200)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} width={56} />
                <Tooltip content={<ChartTooltip unit="MWh" />} />
                <Bar dataKey="mc" name="Maroc Chimie" stackId="t" fill={COLORS.mc} isAnimationActive={false} />
                <Bar dataKey="onee" name="Réseau ONEE" stackId="t" fill={COLORS.onee} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Disponibilité des turbo-alternateurs" subtitle="Moyenne sur la période · heures de marche / 24 h">
          <ul className="space-y-3 pt-1">
            {dispo.map((d) => (
              <li key={d.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">{d.name}</span>
                  <span className="tabular font-semibold text-slate-900">{fmt(d.value, 1)} %</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className={d.value > 50 ? "h-full bg-emerald-500" : "h-full bg-slate-400"} style={{ width: `${d.value}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">GTA1 est hors service toute l'année et GTA2 presque toute l'année : le site dépend d'une seule turbine.</p>
        </Panel>

        <Panel title="Ce que vaut 1 MW de production en plus" subtitle="Calculé avec le prix réellement payé sur la période">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700">
                1 MW produit en continu par le GTA évite d'acheter <b>24 MWh/jour</b>, soit{" "}
                <b className="text-amber-700">{fmt(prix === null ? null : prix * 24, 0)} DH/jour</b> et{" "}
                <b className="text-amber-700">{fmt(prix === null ? null : (prix * 24 * 365) / 1e6, 2)} M DH/an</b>.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Leaf className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700">
                La production du GTA sur la période a évité environ{" "}
                <b className="text-emerald-700">{fmt(prod === null ? null : prod * GRID_TCO2_PER_MWH, 0)} t de CO₂</b> (réseau marocain : 0,60 tCO₂/MWh, AIE).
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
