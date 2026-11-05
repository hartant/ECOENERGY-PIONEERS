"use client"

/* Pièces d'interface partagées par les pages de supervision. */

import type { Zap } from "lucide-react"
import { fmt, type Measure, type Source } from "@/lib/api"
import { SimBadge } from "./data-source"
import { cn } from "@/lib/utils"

export type UnitStatus = "running" | "stopped" | "warning" | "alarm"

export const ACCENT: Record<string, { icon: string; line: string; bg: string }> = {
  emerald: { icon: "text-emerald-600", line: "var(--color-emerald-500)", bg: "bg-emerald-50" },
  sky: { icon: "text-sky-600", line: "var(--color-sky-500)", bg: "bg-sky-50" },
  amber: { icon: "text-amber-600", line: "var(--color-amber-500)", bg: "bg-amber-50" },
  violet: { icon: "text-violet-600", line: "var(--color-violet-500)", bg: "bg-violet-50" },
  orange: { icon: "text-orange-600", line: "var(--color-orange-500)", bg: "bg-orange-50" },
  cyan: { icon: "text-cyan-600", line: "var(--color-cyan-500)", bg: "bg-cyan-50" },
  red: { icon: "text-red-600", line: "var(--color-red-500)", bg: "bg-red-50" },
}

export function KpiTile({
  label,
  value,
  unit,
  source,
  hint,
  icon: Icon,
  color,
  data,
  delta,
}: {
  label: string
  value: string
  unit: string
  source?: Source
  hint?: string
  icon: typeof Zap
  color: string
  data: number[]
  delta: number | null
}) {
  const a = ACCENT[color]
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">
          {label}
          <SimBadge source={source} />
        </span>
        <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center", a.bg)}>
          <Icon className={cn("w-4 h-4", a.icon)} />
        </span>
      </div>
      <p className="mt-1.5 text-2xl font-bold text-slate-900 tabular leading-none">
        {value}
        <span className="ml-1 text-sm font-medium text-slate-500">{unit}</span>
      </p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className="text-[11px] font-medium tabular text-slate-500" title="Variation par rapport à la veille">
          {hint ?? (delta === null ? "—" : `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(1)} % vs veille`)}
        </span>
        <Sparkline data={data} color={a.line} />
      </div>
    </div>
  )
}

export function Sparkline({ data, color }: { data: number[]; color: string }) {
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

export function Panel({
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

export function StatusPill({ status }: { status: UnitStatus }) {
  const map: Record<UnitStatus, [string, string, string]> = {
    running: ["En marche", "bg-emerald-100 text-emerald-700", "bg-emerald-500"],
    stopped: ["À l'arrêt", "bg-slate-100 text-slate-600", "bg-slate-400"],
    warning: ["Surcharge", "bg-amber-100 text-amber-700", "bg-amber-500"],
    alarm: ["Alarme", "bg-red-100 text-red-700", "bg-red-500 animate-pulse"],
  }
  const [label, cls, dot] = map[status]
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold", cls)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
      {label}
    </span>
  )
}

export function Mini({ label, m, accent }: { label: string; m?: Measure; accent: string }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
      <p className="text-[11px] font-medium text-slate-500">
        {label}
        <SimBadge source={m?.source} />
      </p>
      <p className={cn("text-lg font-bold tabular", accent)}>
        {fmt(m?.value)} <span className="text-xs font-medium text-slate-500">{m?.unit}</span>
      </p>
    </div>
  )
}

export function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("w-2.5 h-2.5 rounded-full", className)} />
      {label}
    </span>
  )
}

export function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { name: string; value: number | null; color: string }[]; label?: string; unit: string }) {
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
          <span className="font-medium text-slate-900 tabular">
            {fmt(p.value, 0)} {unit}
          </span>
        </p>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Choix de la période (relative au dernier jour disponible)           */
/* ------------------------------------------------------------------ */

export const PERIODS = [
  { id: "30", label: "30 j", days: 30 },
  { id: "90", label: "90 j", days: 90 },
  { id: "all", label: "Année", days: null },
] as const
export type PeriodId = (typeof PERIODS)[number]["id"]

export function PeriodPicker({ value, onChange }: { value: PeriodId; onChange: (p: PeriodId) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold">
      {PERIODS.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={cn("rounded-md px-3 py-1.5 transition-colors", value === p.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

/** [start, end] ISO pour une période, à partir des bornes des données (/api/meta). */
export function periodRange(id: PeriodId, first?: string, last?: string): [string | undefined, string | undefined] {
  if (!first || !last) return [undefined, undefined]
  const days = PERIODS.find((p) => p.id === id)?.days
  if (!days) return [first, last]
  const d = new Date(`${last}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - (days - 1))
  const start = d.toISOString().slice(0, 10)
  return [start < first ? first : start, last]
}

/** En-tête de page : titre, sous-titre, contrôles à droite. */
export function PageHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

/** Petite carte KPI sans sparkline, pour les totaux d'une période. */
export function StatCard({ label, value, unit, hint, accent = "text-slate-900", source }: { label: string; value: string; unit?: string; hint?: string; accent?: string; source?: Source }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <p className="text-xs font-medium text-slate-500">
        {label}
        <SimBadge source={source} />
      </p>
      <p className={cn("mt-1.5 text-2xl font-bold tabular leading-none", accent)}>
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-slate-500">{unit}</span>}
      </p>
      {hint && <p className="mt-1.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  )
}

/** Libellé d'axe : « 2025-06-14 » → « 14/06 ». */
export const dayLabel = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

/** Somme d'une colonne en ignorant les vides (null si tout est vide). */
export function sum(rows: Record<string, unknown>[], key: string): number | null {
  const v = rows.map((r) => r[key]).filter((x): x is number => typeof x === "number")
  return v.length ? v.reduce((a, b) => a + b, 0) : null
}

export function mean(rows: Record<string, unknown>[], key: string): number | null {
  const v = rows.map((r) => r[key]).filter((x): x is number => typeof x === "number")
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

export { fmt }
