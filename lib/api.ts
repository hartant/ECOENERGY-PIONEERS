/**
 * Client de l'API Python (FastAPI).
 *
 * Les types ci-dessous reprennent les modèles Pydantic de backend/app/schemas.py :
 * si l'un change, l'autre doit suivre.
 */

import useSWR from "swr"

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export type Source = "real" | "computed" | "simulated"
export type Status = "ok" | "hors_cible" | null

export interface Measure {
  value: number | null
  unit: string
  source: Source
  status: Status
}

export interface Live {
  replay: { date: string; hour: number; day_index: number; days: number; seconds_per_day: number; pinned: boolean }
  values: Record<string, Measure>
}

export interface Series {
  fields: string[]
  units: Record<string, string>
  rows: ({ date: string } & Record<string, number | null>)[]
}

export interface Kpi {
  label: string
  value: number | null
  unit: string
}

export interface KpiReport {
  start: string
  end: string
  days: number
  groups: Record<string, Record<string, Kpi>>
}

export interface ColumnMeta {
  name: string
  unit: string
  group: string
  description: string
  source: string
}

export interface Meta {
  first_date: string
  last_date: string
  days: number
  columns: ColumnMeta[]
}

export interface Threshold {
  key: string
  label: string
  unit: string
  min: number | null
  max: number | null
  column: string | null
}

async function fetcher<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `HTTP ${res.status}`)
  }
  return res.json()
}

const query = (params: Record<string, string | undefined>) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][])
  return q.size ? `?${q}` : ""
}

/** État « temps réel » rejoué, rafraîchi toutes les 2 s (le rythme des capteurs simulés). */
export function useLive(day?: string) {
  return useSWR<Live>(`/api/live${query({ day })}`, fetcher, { refreshInterval: 2000 })
}

/** Série journalière. key = null → pas de requête (ex. tant qu'on ne connaît pas la date). */
export function useSeries(fields: string[], start?: string, end?: string) {
  const key = start && end ? `/api/days${query({ start, end, fields: fields.join(",") })}` : null
  return useSWR<Series>(key, fetcher, { keepPreviousData: true })
}

export function useKpis(start?: string, end?: string) {
  return useSWR<KpiReport>(start && end ? `/api/kpis${query({ start, end })}` : null, fetcher, { keepPreviousData: true })
}

export function useMeta() {
  return useSWR<Meta>("/api/meta", fetcher)
}

export function useThresholds() {
  return useSWR<Threshold[]>("/api/thresholds", fetcher)
}

/** Date ISO décalée de n jours (n négatif = dans le passé). */
export function shiftDate(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
}

/** Nombre formaté à la française, « — » si la valeur manque. */
export function fmt(v: number | null | undefined, digits = 1) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—"
  return v.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/* ------------------------------------------------------------------ */
/* Simulateur what-if (backend/app/simulator.py)                       */
/* ------------------------------------------------------------------ */

export interface SimInputs {
  vhp_t_h: number
  gta: number
  bp_t_h: number
  conso_mw: number
  prix_dh_mwh: number
}

export interface SimModel {
  power_model: { c0: number; c1: number; c2: number; r2: number; mae_mw: number; n_days: number; vhp_min_t_h: number; vhp_max_t_h: number }
  willans: { a: number; b: number }
  constants: { gta_capacity_t_h: number; grid_tco2_per_mwh: number }
  reference: SimInputs
  presets: { id: string; label: string; hint: string; inputs: SimInputs }[]
}

export interface SimResult {
  vapeur_admise_t_h: number
  vapeur_non_valorisee_t_h: number
  bp_soutiree_t_h: number
  condensat_t_h: number
  production_mw: number
  conso_specifique_t_mwh: number | null
  achats_mw: number
  surplus_mw: number
  autonomie_pct: number | null
  cout_achats_dh_jour: number
  co2_evite_t_jour: number
  warnings: string[]
}

export interface SimRun {
  result: SimResult
  reference: SimResult
  gain_dh_jour: number
  gain_dh_an: number
  curve: { vhp_t_h: number; production_mw: number }[]
}

export function useSimModel() {
  return useSWR<SimModel>("/api/simulate/model", fetcher)
}

async function postSimulation([, inputs]: [string, SimInputs]): Promise<SimRun> {
  const res = await fetch(`${API_URL}/api/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputs),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** Relance la simulation à chaque changement de réglage (SWR garde l'ancien résultat entre-temps). */
export function useSimulation(inputs: SimInputs | null) {
  return useSWR<SimRun, Error, [string, SimInputs] | null>(inputs ? ["/api/simulate", inputs] : null, postSimulation, { keepPreviousData: true })
}
