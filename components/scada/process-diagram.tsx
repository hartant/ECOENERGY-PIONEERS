"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Activity, Droplets, Factory, Flame, Gauge, Recycle, TrendingDown, TrendingUp, Zap } from "lucide-react"
import { useDashboard } from "@/context/dashboard-context"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/* Simulated live process (random walk, bounded to realistic ranges)   */
/* ------------------------------------------------------------------ */

type Cap = { name: string; charge: number; power: number; temp: number; pressure: number; flow: number; ph: number; cond: number }

const walk = (v: number, step: number, min: number, max: number) => Math.min(max, Math.max(min, v + (Math.random() - 0.5) * step))
const HISTORY = 40

interface Snapshot {
  t: string
  production: number
  consommation: number
  export: number
  efficacite: number
  vhp: number
  recyclage: number
}

export function ProcessDiagram() {
  const { anomalyActive, dataMultiplier } = useDashboard()

  const [caps, setCaps] = useState<Cap[]>([
    { name: "CAP U", charge: 92, power: 11.9, temp: 78, pressure: 8.5, flow: 63.1, ph: 6.9, cond: 450 },
    { name: "CAP V", charge: 88, power: 11.4, temp: 75, pressure: 8.2, flow: 56.6, ph: 7.0, cond: 482 },
    { name: "CAP W", charge: 85, power: 11.2, temp: 76, pressure: 8.3, flow: 61.4, ph: 6.8, cond: 467 },
  ])
  const [central, setCentral] = useState({ charge: 91, power: 64.8, efficiency: 93.8, vhpTemp: 482, vhpPressure: 42.5, retourDebit: 210, retourPh: 7.4 })
  const [sulf, setSulf] = useState({ charge: 83, temp: 410, vhp: 46, vbp: 32, vhpTemp: 482, vbpTemp: 175 })
  const [ted, setTed] = useState({ charge: 86, entree: 680, sortie: 625, stock: 15125, prevision: 14097, recyclage: 92 })
  const [history, setHistory] = useState<Snapshot[]>([])
  const seeded = useRef(false)

  const leak = anomalyActive === "water-leak"
  const steam = anomalyActive === "uncomfortable-steam"

  // Derived site balance
  const consommation = caps.reduce((s, c) => s + c.power, 0) + 4.2
  const production = central.power * dataMultiplier
  const netExport = production - consommation
  const efficiency = central.efficiency * dataMultiplier
  const tedSortie = leak ? ted.entree * 0.7 : ted.sortie
  const recyclage = leak ? ted.recyclage * 0.7 : ted.recyclage
  const retour = steam ? central.retourDebit * 0.65 : central.retourDebit

  useEffect(() => {
    const id = setInterval(() => {
      setCaps((prev) =>
        prev.map((c) => ({
          ...c,
          charge: walk(c.charge, 2, 70, 100),
          power: walk(c.power, 0.4, 9.5, 13),
          temp: walk(c.temp, 1.2, 70, 86),
          pressure: walk(c.pressure, 0.2, 7.5, 9),
          flow: walk(c.flow, 1.5, 50, 70),
          ph: walk(c.ph, 0.08, 6.5, 7.4),
          cond: walk(c.cond, 6, 420, 540),
        })),
      )
      setCentral((p) => ({
        ...p,
        power: walk(p.power, 1, 60, 70),
        efficiency: walk(p.efficiency, 0.3, 92, 96),
        vhpTemp: walk(p.vhpTemp, 1.5, 478, 492),
        vhpPressure: walk(p.vhpPressure, 0.6, 40, 46),
        retourDebit: walk(p.retourDebit, 3, 195, 225),
      }))
      setSulf((p) => ({ ...p, temp: walk(p.temp, 1.5, 400, 420), vhp: walk(p.vhp, 0.8, 42, 50), vbp: walk(p.vbp, 0.6, 28, 36) }))
      setTed((p) => ({
        ...p,
        entree: walk(p.entree, 8, 640, 720),
        sortie: walk(p.sortie, 8, 600, 660),
        stock: walk(p.stock, 80, 14500, 15800),
        prevision: walk(p.prevision, 40, 13800, 14500),
      }))
    }, 2000)
    return () => clearInterval(id)
  }, [])

  // Push a snapshot into history every tick (seeded with a little backlog so charts are not empty)
  useEffect(() => {
    const snap = (d: Date, j = 0): Snapshot => ({
      t: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      production: +(production * (1 + j * 0.012)).toFixed(2),
      consommation: +(consommation * (1 + j * 0.01)).toFixed(2),
      export: +(netExport * (1 + j * 0.02)).toFixed(2),
      efficacite: +(efficiency * (1 + j * 0.002)).toFixed(2),
      vhp: +(sulf.vhp * (1 + j * 0.015)).toFixed(1),
      recyclage: +(recyclage * (1 + j * 0.004)).toFixed(1),
    })
    setHistory((h) => {
      if (!seeded.current) {
        seeded.current = true
        const now = Date.now()
        let j = 0
        return Array.from({ length: HISTORY }, (_, i) => {
          j = Math.max(-1, Math.min(1, j + (Math.random() - 0.5) * 0.6))
          return snap(new Date(now - (HISTORY - i) * 2000), i === HISTORY - 1 ? 0 : j)
        })
      }
      return [...h.slice(-(HISTORY - 1)), snap(new Date())]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caps])

  const units = useMemo(
    () => [
      ...caps.map((c) => ({
        name: c.name,
        type: "Concentration",
        icon: Factory,
        status: c.charge > 97 ? "warning" : "running",
        charge: c.charge,
        power: `${c.power.toFixed(2)} MW`,
        temp: `${c.temp.toFixed(1)} °C`,
        pressure: `${c.pressure.toFixed(2)} bar`,
        flow: `${c.flow.toFixed(1)} m³/h`,
        quality: `pH ${c.ph.toFixed(1)} · ${c.cond.toFixed(0)} µS/cm`,
      })),
      {
        name: "Centrale Thermique",
        type: "Production électrique",
        icon: Zap,
        status: steam ? "alarm" : "running",
        charge: central.charge * dataMultiplier,
        power: `${production.toFixed(2)} MW`,
        temp: `${central.vhpTemp.toFixed(1)} °C`,
        pressure: `${central.vhpPressure.toFixed(1)} bar`,
        flow: `${retour.toFixed(0)} m³/h retour`,
        quality: `pH ${central.retourPh.toFixed(1)}`,
      },
      {
        name: "Unité Sulfurique",
        type: "Source vapeur",
        icon: Flame,
        status: "running",
        charge: sulf.charge,
        power: `${(sulf.vhp + sulf.vbp).toFixed(1)} T/h vapeur`,
        temp: `${sulf.temp.toFixed(1)} °C`,
        pressure: "—",
        flow: `VHP ${sulf.vhp.toFixed(0)} · VBP ${sulf.vbp.toFixed(0)} T/h`,
        quality: "—",
      },
      {
        name: "Traitement TED",
        type: "Traitement eau",
        icon: Droplets,
        status: leak ? "alarm" : "running",
        charge: ted.charge,
        power: "2.6 MW",
        temp: "—",
        pressure: "—",
        flow: `${ted.entree.toFixed(0)} → ${tedSortie.toFixed(0)} m³/h`,
        quality: `Recyclage ${recyclage.toFixed(0)} %`,
      },
    ],
    [caps, central, sulf, ted, steam, leak, dataMultiplier, production, retour, tedSortie, recyclage],
  )

  const series = (k: keyof Snapshot) => history.map((h) => h[k] as number)
  const delta = (k: keyof Snapshot) => {
    if (history.length < 10) return 0
    const a = history[history.length - 10][k] as number
    const b = history[history.length - 1][k] as number
    return a === 0 ? 0 : ((b - a) / Math.abs(a)) * 100
  }

  const kpis = [
    { label: "Production", value: production.toFixed(1), unit: "MW", icon: Zap, color: "emerald", key: "production" as const },
    { label: "Consommation site", value: consommation.toFixed(1), unit: "MW", icon: Activity, color: "sky", key: "consommation" as const },
    { label: "Export réseau", value: `${netExport >= 0 ? "+" : ""}${netExport.toFixed(1)}`, unit: "MW", icon: TrendingUp, color: "teal", key: "export" as const },
    { label: "Efficacité IA", value: efficiency.toFixed(1), unit: "%", icon: Gauge, color: steam ? "red" : "violet", key: "efficacite" as const },
    { label: "Vapeur VHP", value: sulf.vhp.toFixed(1), unit: "T/h", icon: Flame, color: "orange", key: "vhp" as const },
    { label: "Recyclage eau", value: recyclage.toFixed(0), unit: "%", icon: Recycle, color: leak ? "red" : "cyan", key: "recyclage" as const },
  ]

  const consumers = [...caps.map((c) => ({ name: c.name, v: c.power })), { name: "Auxiliaires", v: 4.2 }]
  const statut = netExport > 0.5 ? "EXPORTATION" : netExport < -0.5 ? "IMPORTATION" : "ÉQUILIBRE"

  return (
    <div className="space-y-4">
      {/* Title row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vue d'ensemble</h1>
          <p className="text-sm text-slate-500">Production, consommation et état des unités en temps réel</p>
        </div>
        <div className="flex items-center gap-2">
          {anomalyActive !== "none" ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-semibold text-red-700">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {leak ? "Fuite d'eau détectée — TED" : "Vapeur non conforme — Centrale"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Toutes les unités en fonctionnement normal
            </span>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <KpiTile key={k.label} label={k.label} value={k.value} unit={k.unit} icon={k.icon} color={k.color} data={series(k.key)} delta={delta(k.key)} />
        ))}
      </div>

      {/* Chart + balance */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel className="xl:col-span-2" title="Production vs consommation" subtitle="Fenêtre glissante · 80 dernières secondes">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gProd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-emerald-500)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--color-emerald-500)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gCons" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-sky-500)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="var(--color-sky-500)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-200)" vertical={false} />
                <XAxis dataKey="t" tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} minTickGap={40} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} unit=" MW" width={70} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="production" name="Production" stroke="var(--color-emerald-600)" strokeWidth={2} fill="url(#gProd)" isAnimationActive={false} />
                <Area type="monotone" dataKey="consommation" name="Consommation" stroke="var(--color-sky-600)" strokeWidth={2} fill="url(#gCons)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 text-xs text-slate-600">
            <LegendDot className="bg-emerald-600" label="Production centrale" />
            <LegendDot className="bg-sky-600" label="Consommation site" />
          </div>
        </Panel>

        <Panel title="Bilan électrique" subtitle="Répartition de la consommation">
          <div className="flex items-baseline justify-between">
            <div>
              <p className={cn("text-3xl font-bold tabular", netExport >= 0 ? "text-emerald-600" : "text-amber-600")}>
                {netExport >= 0 ? "+" : ""}
                {netExport.toFixed(2)} <span className="text-base font-medium text-slate-500">MW</span>
              </p>
              <p className="text-xs text-slate-500">Bilan net vers le réseau</p>
            </div>
            <span
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-bold tracking-wide",
                statut === "EXPORTATION" ? "bg-emerald-100 text-emerald-700" : statut === "IMPORTATION" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600",
              )}
            >
              {statut}
            </span>
          </div>

          {/* stacked bar: consumers + export over production */}
          <div className="mt-4 h-3 w-full rounded-full overflow-hidden flex bg-slate-100">
            {consumers.map((c, i) => (
              <div
                key={c.name}
                className={["bg-sky-600", "bg-sky-500", "bg-sky-400", "bg-slate-400"][i]}
                style={{ width: `${(c.v / Math.max(production, consommation)) * 100}%` }}
                title={`${c.name}: ${c.v.toFixed(2)} MW`}
              />
            ))}
            {netExport > 0 && <div className="bg-emerald-500" style={{ width: `${(netExport / production) * 100}%` }} title="Export" />}
          </div>

          <ul className="mt-4 space-y-2 text-sm">
            {consumers.map((c, i) => (
              <li key={c.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className={cn("w-2.5 h-2.5 rounded-sm", ["bg-sky-600", "bg-sky-500", "bg-sky-400", "bg-slate-400"][i])} />
                  {c.name}
                </span>
                <span className="font-medium text-slate-900 tabular">{c.v.toFixed(2)} MW</span>
              </li>
            ))}
            <li className="flex items-center justify-between border-t border-slate-200 pt-2">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                Export réseau
              </span>
              <span className="font-semibold text-emerald-600 tabular">{Math.max(0, netExport).toFixed(2)} MW</span>
            </li>
          </ul>
        </Panel>
      </div>

      {/* Units table */}
      <Panel title="État des unités" subtitle="Mesures instantanées des capteurs" padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="px-4 py-2.5 font-semibold">Unité</th>
                <th className="px-4 py-2.5 font-semibold">Statut</th>
                <th className="px-4 py-2.5 font-semibold w-44">Charge</th>
                <th className="px-4 py-2.5 font-semibold">Puissance / Vapeur</th>
                <th className="px-4 py-2.5 font-semibold">Température</th>
                <th className="px-4 py-2.5 font-semibold">Pression</th>
                <th className="px-4 py-2.5 font-semibold">Débit</th>
                <th className="px-4 py-2.5 font-semibold">Qualité</th>
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
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", u.charge > 97 ? "bg-amber-500" : "bg-emerald-500")}
                            style={{ width: `${Math.min(100, u.charge)}%` }}
                          />
                        </div>
                        <span className="w-12 text-right tabular text-slate-700">{u.charge.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 tabular text-slate-900 font-medium whitespace-nowrap">{u.power}</td>
                    <td className="px-4 py-2.5 tabular text-slate-700 whitespace-nowrap">{u.temp}</td>
                    <td className="px-4 py-2.5 tabular text-slate-700 whitespace-nowrap">{u.pressure}</td>
                    <td className={cn("px-4 py-2.5 tabular whitespace-nowrap", u.status === "alarm" ? "text-red-600 font-semibold" : "text-slate-700")}>{u.flow}</td>
                    <td className="px-4 py-2.5 tabular text-slate-600 whitespace-nowrap">{u.quality}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Secondary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Panel title="Stock eau TED" subtitle="Prévision IA à 24 h">
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold text-slate-900 tabular">
              {Math.round(ted.stock).toLocaleString("fr-FR")} <span className="text-sm font-medium text-slate-500">m³</span>
            </p>
            <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
              <TrendingDown className="w-3.5 h-3.5" />
              {Math.round(ted.prevision).toLocaleString("fr-FR")} m³ dans 24 h
            </span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(ted.stock / 18000) * 100}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">Capacité 18 000 m³</p>
        </Panel>

        <Panel title="Vapeur exportée" subtitle="Unité Sulfurique → Centrale">
          <div className="grid grid-cols-2 gap-3">
            <Mini label="VHP" value={`${sulf.vhp.toFixed(1)} T/h`} hint={`${sulf.vhpTemp.toFixed(0)} °C`} accent="text-orange-600" />
            <Mini label="VBP" value={`${sulf.vbp.toFixed(1)} T/h`} hint={`${sulf.vbpTemp.toFixed(0)} °C`} accent="text-amber-600" />
          </div>
        </Panel>

        <Panel title="Retour condensat" subtitle="Vers la Centrale Thermique">
          <div className="grid grid-cols-2 gap-3">
            <Mini label="Débit" value={`${retour.toFixed(0)} m³/h`} hint={steam ? "−35 % écart" : "Nominal"} accent={steam ? "text-red-600" : "text-cyan-600"} />
            <Mini label="pH" value={central.retourPh.toFixed(2)} hint="Cible 7.0 – 7.6" accent="text-cyan-600" />
          </div>
        </Panel>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* UI pieces                                                           */
/* ------------------------------------------------------------------ */

const ACCENT: Record<string, { icon: string; line: string; bg: string }> = {
  emerald: { icon: "text-emerald-600", line: "var(--color-emerald-500)", bg: "bg-emerald-50" },
  sky: { icon: "text-sky-600", line: "var(--color-sky-500)", bg: "bg-sky-50" },
  teal: { icon: "text-teal-600", line: "var(--color-teal-500)", bg: "bg-teal-50" },
  violet: { icon: "text-violet-600", line: "var(--color-violet-500)", bg: "bg-violet-50" },
  orange: { icon: "text-orange-600", line: "var(--color-orange-500)", bg: "bg-orange-50" },
  cyan: { icon: "text-cyan-600", line: "var(--color-cyan-500)", bg: "bg-cyan-50" },
  red: { icon: "text-red-600", line: "var(--color-red-500)", bg: "bg-red-50" },
}

function KpiTile({
  label,
  value,
  unit,
  icon: Icon,
  color,
  data,
  delta,
}: {
  label: string
  value: string
  unit: string
  icon: typeof Zap
  color: string
  data: number[]
  delta: number
}) {
  const a = ACCENT[color]
  const up = delta >= 0
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center", a.bg)}>
          <Icon className={cn("w-4 h-4", a.icon)} />
        </span>
      </div>
      <p className="mt-1.5 text-2xl font-bold text-slate-900 tabular leading-none">
        {value}
        <span className="ml-1 text-sm font-medium text-slate-500">{unit}</span>
      </p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className={cn("text-[11px] font-medium tabular", Math.abs(delta) < 0.05 ? "text-slate-500" : up ? "text-emerald-600" : "text-red-600")}>
          {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)} %
        </span>
        <Sparkline data={data} color={a.line} />
      </div>
    </div>
  )
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <div className="h-7 w-24" />
  const w = 96
  const h = 28
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 2 - ((v - min) / span) * (h - 4)}`)
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts.join(" ")} fill="none" style={{ stroke: color }} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={w} cy={pts[pts.length - 1].split(",")[1]} r={2.5} style={{ fill: color }} />
    </svg>
  )
}

function Panel({
  title,
  subtitle,
  children,
  className,
  padded = true,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <section className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      <div className="px-4 pt-3.5 pb-2">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className={padded ? "px-4 pb-4" : "pb-1"}>{children}</div>
    </section>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    running: ["En marche", "bg-emerald-100 text-emerald-700"],
    warning: ["Surcharge", "bg-amber-100 text-amber-700"],
    alarm: ["Alarme", "bg-red-100 text-red-700"],
  }
  const [label, cls] = map[status] ?? map.running
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold", cls)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", status === "running" ? "bg-emerald-500" : status === "warning" ? "bg-amber-500" : "bg-red-500 animate-pulse")} />
      {label}
    </span>
  )
}

function Mini({ label, value, hint, accent }: { label: string; value: string; hint: string; accent: string }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className={cn("text-lg font-bold tabular", accent)}>{value}</p>
      <p className="text-[11px] text-slate-500">{hint}</p>
    </div>
  )
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("w-2.5 h-2.5 rounded-full", className)} />
      {label}
    </span>
  )
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-slate-900 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center justify-between gap-4 text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-medium text-slate-900 tabular">{p.value.toFixed(2)} MW</span>
        </p>
      ))}
    </div>
  )
}
