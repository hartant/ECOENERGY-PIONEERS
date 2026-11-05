"use client"

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Activity, Droplets, Factory, Flame, Gauge, PlugZap, Wind, Zap } from "lucide-react"
import { useDashboard } from "@/context/dashboard-context"
import { fmt, shiftDate, useLive, useSeries, type Measure, type Source } from "@/lib/api"
import { ApiError, ReplayChip, SimBadge } from "./data-source"
import { ChartTooltip, KpiTile, LegendDot, Mini, Panel, StatusPill, type UnitStatus } from "./ui"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/* Vue d'ensemble : jour réel rejoué (/api/live) + 30 jours d'historique */
/* ------------------------------------------------------------------ */

// Objectif journalier du GTA (rapport journalier du site) ramené en puissance moyenne
const OBJECTIF_MW = 345.6 / 24
const HISTORY_FIELDS = ["prod_gta3_mwh", "conso_usine_mwh", "recu_mc_mwh", "recu_onee_mwh", "vhp_gta3_t", "wds_production_m3", "cs_vhp_t_par_mwh"]

type Cell = { text: string; source?: Source; bad?: boolean }

export function ProcessDiagram() {
  const { anomalyActive } = useDashboard()
  const { data: live, error } = useLive()
  const date = live?.replay.date
  const { data: hist } = useSeries(HISTORY_FIELDS, date && shiftDate(date, -29), date)

  if (!live) {
    return error ? <ApiError error={error} /> : <p className="text-sm text-slate-500">Chargement des données…</p>
  }

  const v = live.values
  const val = (k: string) => v[k]?.value ?? null
  const cell = (k: string, digits = 1, unit = v[k]?.unit): Cell => ({
    text: val(k) === null ? "—" : `${fmt(val(k), digits)} ${unit}`,
    source: v[k]?.source,
    bad: v[k]?.status === "hors_cible",
  })

  const leak = anomalyActive === "water-leak"
  const steam = anomalyActive === "uncomfortable-steam"

  // Bilan électrique du jour : production propre + achats = consommation
  const prod = val("prod_gta3_mw")
  const conso = val("conso_usine_mw")
  const achats = val("recu_mc_mw") === null && val("recu_onee_mw") === null ? null : (val("recu_mc_mw") ?? 0) + (val("recu_onee_mw") ?? 0)
  const gta3Running = (val("dispo_gta3_pct") ?? 0) > 0 && (prod ?? 0) > 0

  // Historique (réel) pour graphique, sparklines et variation vs veille
  const rows = (hist?.rows ?? []).map((r) => ({
    ...r,
    jour: r.date.slice(8, 10) + "/" + r.date.slice(5, 7),
    achats: r.recu_mc_mwh === null && r.recu_onee_mwh === null ? null : (r.recu_mc_mwh ?? 0) + (r.recu_onee_mwh ?? 0),
  }))
  const series = (k: string) => rows.map((r) => r[k as keyof typeof r] as number | null).filter((x): x is number => x !== null)
  const delta = (k: string) => {
    const s = rows.slice(-2).map((r) => r[k as keyof typeof r] as number | null)
    return s.length === 2 && s[0] && s[1] !== null ? ((s[1] - s[0]) / Math.abs(s[0])) * 100 : null
  }

  const cs = v.cs_vhp_t_par_mwh
  const kpis = [
    { label: "Production GTA3", m: v.prod_gta3_mw, icon: Zap, color: "emerald", key: "prod_gta3_mwh" },
    { label: "Consommation site", m: v.conso_usine_mw, icon: Activity, color: "sky", key: "conso_usine_mwh" },
    { label: "Électricité achetée", m: { value: achats, unit: "MW", source: "real", status: null } as Measure, icon: PlugZap, color: "amber", key: "achats" },
    { label: "Conso. spécifique VHP", m: cs, icon: Gauge, color: cs?.status === "hors_cible" || steam ? "red" : "violet", key: "cs_vhp_t_par_mwh", hint: "cible 6,8 – 7,5" },
    { label: "Vapeur VHP → GTA3", m: v.vhp_gta3_t_h, icon: Flame, color: "orange", key: "vhp_gta3_t" },
    { label: "Production WDS", m: v.wds_production_m3_h, icon: Droplets, color: leak ? "red" : "cyan", key: "wds_production_m3" },
  ]

  const sources = [
    { name: "GTA3 (production propre)", v: prod, cls: "bg-emerald-500" },
    { name: "Maroc Chimie", v: val("recu_mc_mw"), cls: "bg-amber-500" },
    { name: "Réseau ONEE", v: val("recu_onee_mw"), cls: "bg-orange-400" },
  ]
  const autonomie = val("taux_couverture_pct")

  const units: { name: string; type: string; icon: typeof Zap; status: UnitStatus; charge: number | null; cells: Cell[] }[] = [
    {
      name: "GTA3",
      type: "Turbo-alternateur",
      icon: Zap,
      status: steam ? "alarm" : gta3Running ? "running" : "stopped",
      charge: gta3Running && prod !== null ? (prod / OBJECTIF_MW) * 100 : null,
      cells: [cell("prod_gta3_mw", 2), cell("temperature_vhp_c"), cell("pression_vhp_bar"), cell("vhp_gta3_t_h"), cell("cs_vhp_t_par_mwh", 2)],
    },
    ...[1, 2].map((n) => ({
      name: `GTA${n}`,
      type: "Turbo-alternateur",
      icon: Zap,
      status: ((val(`dispo_gta${n}_pct`) ?? 0) > 0 ? "running" : "stopped") as UnitStatus,
      charge: null,
      cells: [{ text: `Disponibilité ${fmt(val(`dispo_gta${n}_pct`), 0)} %`, source: "computed" as Source }, ...Array(4).fill({ text: "—" })],
    })),
    {
      name: "Unité Sulfurique",
      type: "Source de vapeur",
      icon: Flame,
      status: gta3Running ? "running" : "stopped",
      charge: null,
      cells: [cell("vhp_gta3_t_h"), cell("temperature_vhp_c"), cell("pression_vhp_bar"), cell("vapeur_recue_mc_t_h", 1, "t/h reçues MC"), { text: "—" }],
    },
    {
      name: "Concentration CAP",
      type: "Lignes X, Y, U, V, T",
      icon: Factory,
      status: (val("acp_t_p2o5") ?? 0) > 0 ? "running" : "stopped",
      charge: null,
      cells: [cell("soutirage_bp_t_h", 1, "t/h vapeur BP"), { text: "—" }, { text: "—" }, cell("acp_t_p2o5", 0), { text: "—" }],
    },
    {
      name: "Traitement TED",
      type: "Eau déminéralisée",
      icon: Droplets,
      status: leak ? "alarm" : "running",
      charge: null,
      cells: [
        cell("wds_production_m3_h", 1, "m³/h WDS"),
        { text: "—" },
        { text: "—" },
        { text: `${fmt(val("eau_dessalee_m3_h"), 0)} → ${fmt(val("wds_production_m3_h"), 0)} m³/h`, source: "real", bad: leak },
        cell("stock_wds_sulfurique_m3", 0, "m³ en stock"),
      ],
    },
    {
      name: "Air comprimé",
      type: "Compresseurs ZR 400",
      icon: Wind,
      status: "running",
      charge: null,
      cells: [{ text: "—" }, { text: "—" }, cell("air_comprime_bar", 2), { text: "—" }, { text: "—" }],
    },
  ]

  return (
    <div className="space-y-4">
      {/* Title row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vue d'ensemble</h1>
          <p className="text-sm text-slate-500">Données réelles du site rejouées jour par jour · débits moyens de la journée</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReplayChip replay={live.replay} />
          {anomalyActive !== "none" ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-semibold text-red-700">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {leak ? "Fuite d'eau détectée — TED" : "Vapeur non conforme — Centrale"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Aucune alarme active
            </span>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <KpiTile
            key={k.label}
            label={k.label}
            value={fmt(k.m?.value, k.m?.unit === "t/MWh" ? 2 : 1)}
            unit={k.m?.unit ?? ""}
            source={k.m?.source}
            hint={k.hint}
            icon={k.icon}
            color={k.color}
            data={series(k.key)}
            delta={delta(k.key)}
          />
        ))}
      </div>

      {/* Chart + balance */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel className="xl:col-span-2" title="Production, achats et consommation" subtitle="30 derniers jours réels · MWh par jour">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-200)" vertical={false} />
                <XAxis dataKey="jour" tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} width={56} />
                <Tooltip content={<ChartTooltip unit="MWh" />} />
                <Area type="monotone" dataKey="prod_gta3_mwh" name="Production GTA3" stackId="s" stroke="var(--color-emerald-600)" fill="var(--color-emerald-500)" fillOpacity={0.25} isAnimationActive={false} />
                <Area type="monotone" dataKey="achats" name="Achats (MC + ONEE)" stackId="s" stroke="var(--color-amber-600)" fill="var(--color-amber-500)" fillOpacity={0.2} isAnimationActive={false} />
                <Line type="monotone" dataKey="conso_usine_mwh" name="Consommation" stroke="var(--color-sky-600)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-600">
            <LegendDot className="bg-emerald-600" label="Production GTA3" />
            <LegendDot className="bg-amber-500" label="Achats (MC + ONEE)" />
            <LegendDot className="bg-sky-600" label="Consommation du site" />
          </div>
        </Panel>

        <Panel title="Bilan électrique du jour" subtitle="D'où vient l'électricité consommée">
          <div className="flex items-baseline justify-between">
            <div>
              <p className={cn("text-3xl font-bold tabular", (autonomie ?? 0) >= 100 ? "text-emerald-600" : "text-amber-600")}>
                {fmt(autonomie, 0)} <span className="text-base font-medium text-slate-500">%</span>
              </p>
              <p className="text-xs text-slate-500">Autonomie électrique (production / consommation)</p>
            </div>
            <span className={cn("rounded-md px-2 py-1 text-[11px] font-bold tracking-wide", achats ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
              {achats ? "IMPORTATION" : "AUTONOME"}
            </span>
          </div>

          <div className="mt-4 h-3 w-full rounded-full overflow-hidden flex bg-slate-100">
            {sources.map((s) => (
              <div key={s.name} className={s.cls} style={{ width: `${conso ? ((s.v ?? 0) / conso) * 100 : 0}%` }} title={`${s.name}: ${fmt(s.v, 2)} MW`} />
            ))}
          </div>

          <ul className="mt-4 space-y-2 text-sm">
            {sources.map((s) => (
              <li key={s.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className={cn("w-2.5 h-2.5 rounded-sm", s.cls)} />
                  {s.name}
                </span>
                <span className="font-medium text-slate-900 tabular">{fmt(s.v, 2)} MW</span>
              </li>
            ))}
            <li className="flex items-center justify-between border-t border-slate-200 pt-2">
              <span className="text-slate-600">Consommation du site</span>
              <span className="font-semibold text-sky-700 tabular">{fmt(conso, 2)} MW</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-slate-600">Coût des achats du jour</span>
              <span className="font-semibold text-amber-700 tabular">{fmt(val("recu_montant_dh"), 0)} DH</span>
            </li>
          </ul>
        </Panel>
      </div>

      {/* Units table */}
      <Panel title="État des unités" subtitle="Valeurs du jour rejoué · « simulé » = mesure absente des données réelles" padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="px-4 py-2.5 font-semibold">Unité</th>
                <th className="px-4 py-2.5 font-semibold">Statut</th>
                <th className="px-4 py-2.5 font-semibold w-44" title="Production rapportée à l'objectif journalier de 345,6 MWh">Charge / objectif</th>
                <th className="px-4 py-2.5 font-semibold">Puissance / Vapeur</th>
                <th className="px-4 py-2.5 font-semibold">Température</th>
                <th className="px-4 py-2.5 font-semibold">Pression</th>
                <th className="px-4 py-2.5 font-semibold">Débit</th>
                <th className="px-4 py-2.5 font-semibold">Qualité / Stock</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => {
                const Icon = u.icon
                return (
                  <tr key={u.name} className={cn("border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors", u.status === "alarm" && "bg-red-50")}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-slate-600" />
                        </div>
                        <div className="leading-tight">
                          <p className="font-medium text-slate-900">{u.name}</p>
                          <p className="text-[11px] text-slate-500">{u.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill status={u.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      {u.charge === null ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className={cn("h-full rounded-full", u.charge < 60 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${Math.min(100, u.charge)}%` }} />
                          </div>
                          <span className="w-12 text-right tabular text-slate-700">{u.charge.toFixed(0)}%</span>
                        </div>
                      )}
                    </td>
                    {u.cells.map((c, i) => (
                      <td
                        key={i}
                        className={cn(
                          "px-4 py-2.5 tabular whitespace-nowrap",
                          i === 0 ? "text-slate-900 font-medium" : "text-slate-700",
                          (c.bad || (i === 3 && u.status === "alarm")) && "text-red-600 font-semibold",
                        )}
                      >
                        {c.text}
                        {c.text !== "—" && <SimBadge source={c.source} />}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Secondary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Panel title="Eau désilicée (WDS)" subtitle="Production TED vs consommation du site">
          <div className="grid grid-cols-2 gap-3">
            <Mini label="Production" m={v.wds_production_m3_h} accent={leak ? "text-red-600" : "text-cyan-600"} />
            <Mini label="Consommation" m={v.wds_consommation_m3_h} accent="text-sky-600" />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Stock côté sulfurique : <span className="font-semibold text-slate-700 tabular">{fmt(val("stock_wds_sulfurique_m3"), 0)} m³</span>
          </p>
        </Panel>

        <Panel title="Circuit vapeur" subtitle="Unité Sulfurique → GTA3 → CAP">
          <div className="grid grid-cols-2 gap-3">
            <Mini label="VHP admise GTA3" m={v.vhp_gta3_t_h} accent="text-orange-600" />
            <Mini label="BP soutirée → CAP" m={v.soutirage_bp_t_h} accent="text-amber-600" />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Reçue de Maroc Chimie : <span className="font-semibold text-slate-700 tabular">{fmt(val("vapeur_recue_mc_t_h"))} t/h</span>
          </p>
        </Panel>

        <Panel title="Retour condensat" subtitle="Vers les chaudières · cible 240–720 m³/j, 40–45 °C">
          <div className="grid grid-cols-2 gap-3">
            <Mini label="Débit" m={v.condensat_gta3_m3_h} accent={steam || v.condensat_gta3_m3?.status === "hors_cible" ? "text-red-600" : "text-cyan-600"} />
            <Mini label="Température" m={v.temperature_condensat_c} accent={v.temperature_condensat_c?.status === "hors_cible" ? "text-red-600" : "text-cyan-600"} />
          </div>
        </Panel>
      </div>
    </div>
  )
}
