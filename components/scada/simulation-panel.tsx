"use client"

import { useMemo, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { AlertTriangle, Beaker, CheckCircle2, Droplets, Factory, Flame, Leaf, RotateCcw, Wallet, Zap } from "lucide-react"
import { useDashboard } from "@/context/dashboard-context"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/* Model                                                                */
/* ------------------------------------------------------------------ */

type CapKey = "capU" | "capV" | "capW"
interface CapInput {
  active: boolean
  steamFlow: number // T/h vapeur BP envoyée à la centrale
  condensate: number // m³/h retour condensat
  temperature: number // °C
  pressure: number // bar
}
interface Inputs {
  capU: CapInput
  capV: CapInput
  capW: CapInput
  central: { active: boolean; targetTemp: number; pressure: number }
  sulfuric: { active: boolean; productionRate: number }
  ted: { active: boolean; treatmentCapacity: number; recycleTarget: number }
}

const cap = (o: Partial<CapInput> = {}): CapInput => ({ active: true, steamFlow: 90, condensate: 110, temperature: 75, pressure: 4.5, ...o })

const NOMINAL: Inputs = {
  capU: cap(),
  capV: cap({ steamFlow: 85, condensate: 104 }),
  capW: cap({ steamFlow: 88, condensate: 106 }),
  central: { active: true, targetTemp: 480, pressure: 42 },
  sulfuric: { active: true, productionRate: 83 },
  ted: { active: true, treatmentCapacity: 680, recycleTarget: 92 },
}

const PRESETS: { id: string; label: string; hint: string; value: Inputs }[] = [
  { id: "nominal", label: "Nominal", hint: "Régime de référence", value: NOMINAL },
  {
    id: "eco",
    label: "Éco",
    hint: "Charge réduite, recyclage max",
    value: {
      capU: cap({ steamFlow: 70, condensate: 88 }),
      capV: cap({ steamFlow: 68, condensate: 85 }),
      capW: cap({ steamFlow: 70, condensate: 88 }),
      central: { active: true, targetTemp: 460, pressure: 38 },
      sulfuric: { active: true, productionRate: 70 },
      ted: { active: true, treatmentCapacity: 560, recycleTarget: 97 },
    },
  },
  {
    id: "full",
    label: "Pleine charge",
    hint: "Production maximale",
    value: {
      capU: cap({ steamFlow: 125, condensate: 150, temperature: 82, pressure: 5.2 }),
      capV: cap({ steamFlow: 120, condensate: 145, temperature: 82, pressure: 5.2 }),
      capW: cap({ steamFlow: 122, condensate: 147, temperature: 82, pressure: 5.2 }),
      central: { active: true, targetTemp: 520, pressure: 52 },
      sulfuric: { active: true, productionRate: 98 },
      ted: { active: true, treatmentCapacity: 850, recycleTarget: 90 },
    },
  },
  {
    id: "maint",
    label: "Maintenance CAP W",
    hint: "CAP W à l'arrêt",
    value: { ...NOMINAL, capW: { ...NOMINAL.capW, active: false } },
  },
]

// Engineering-style simplified model (illustrative coefficients, not plant data)
function simulate(p: Inputs, multiplier = 1) {
  const caps = (["capU", "capV", "capW"] as CapKey[]).map((k) => ({ key: k, ...p[k] }))
  const activeCaps = caps.filter((c) => c.active)

  const capSteam = activeCaps.reduce((s, c) => s + c.steamFlow, 0)
  const sulfSteam = p.sulfuric.active ? p.sulfuric.productionRate * 0.55 : 0 // T/h VHP
  const steamToTurbine = capSteam + sulfSteam

  const tempF = Math.max(0, Math.min(1, (p.central.targetTemp - 200) / 350))
  const pressF = Math.max(0, Math.min(1, (p.central.pressure - 10) / 50))
  const turbineEff = (0.75 + 0.25 * tempF) * (0.85 + 0.15 * pressF) // 0..1
  const production = p.central.active ? steamToTurbine * 0.229 * turbineEff * multiplier : 0

  const capPower = activeCaps.reduce((s, c) => s + 6 + c.steamFlow * 0.06 + Math.max(0, c.pressure - 4) * 0.4, 0)
  const tedPower = p.ted.active ? p.ted.treatmentCapacity * 0.0038 : 0
  const consumption = capPower + tedPower + 4.2
  const net = production - consumption

  const waterIn = activeCaps.reduce((s, c) => s + c.condensate, 0)
  const recycled = p.ted.active ? (waterIn * p.ted.recycleTarget) / 100 : 0
  const makeup = Math.max(0, waterIn - recycled) + (p.ted.active ? p.ted.treatmentCapacity * 0.05 : 0)

  const efficiency = p.central.active ? (turbineEff * 100 * 0.7 + (p.ted.active ? p.ted.recycleTarget : 0) * 0.3) * multiplier : 0

  // condensate return should be ~1.2 m³ per T of steam; below 0.8 means losses
  const returnRatio = capSteam > 0 ? waterIn / capSteam : 0

  const exportMWh = Math.max(0, net) * 24
  const importMWh = Math.max(0, -net) * 24
  const revenue = exportMWh * 900 - importMWh * 1200 - makeup * 24 * 12 // DH/jour
  const co2Avoided = exportMWh * 0.7 // tCO2/jour (facteur réseau ≈ 0.7)

  const ph = 7.0 + (p.ted.active ? p.ted.treatmentCapacity / 2000 : 0) - (p.sulfuric.active ? p.sulfuric.productionRate / 400 : 0)
  const conductivity = 350 + waterIn * 0.25 - (p.ted.active ? p.ted.recycleTarget * 1.5 : 0)

  return {
    capSteam,
    sulfSteam,
    steamToTurbine,
    turbineEff: turbineEff * 100,
    production,
    capPower,
    tedPower,
    consumption,
    net,
    waterIn,
    recycled,
    makeup,
    efficiency,
    returnRatio,
    revenue,
    co2Avoided,
    ph,
    conductivity,
  }
}

type Result = ReturnType<typeof simulate>

function checks(p: Inputs, r: Result): { unit: string; ok: boolean; msg: string }[] {
  const out: { unit: string; ok: boolean; msg: string }[] = []
  for (const k of ["capU", "capV", "capW"] as CapKey[]) {
    const c = p[k]
    const name = `CAP ${k.slice(-1)}`
    if (!c.active) continue
    if (c.temperature > 90) out.push({ unit: name, ok: false, msg: `Température ${c.temperature} °C > 90 °C` })
    if (c.pressure < 3 || c.pressure > 6) out.push({ unit: name, ok: false, msg: `Pression ${c.pressure} bar hors plage 3–6 bar` })
    if (c.steamFlow > 0 && c.condensate / c.steamFlow < 0.8) out.push({ unit: name, ok: false, msg: "Retour condensat insuffisant (pertes vapeur)" })
  }
  if (p.central.active && p.central.targetTemp < 400) out.push({ unit: "Centrale", ok: false, msg: "Température VHP basse : rendement turbine dégradé" })
  if (p.central.active && p.central.pressure > 55) out.push({ unit: "Centrale", ok: false, msg: "Pression > 55 bar : proche de la limite soupape" })
  if (!p.central.active) out.push({ unit: "Centrale", ok: false, msg: "Centrale à l'arrêt : aucune production électrique" })
  if (p.ted.active && p.ted.recycleTarget < 60) out.push({ unit: "TED", ok: false, msg: "Taux de recyclage < 60 %" })
  if (r.ph < 6.5 || r.ph > 7.8) out.push({ unit: "Qualité eau", ok: false, msg: `pH estimé ${r.ph.toFixed(2)} hors plage 6.5–7.8` })
  if (r.net < 0) out.push({ unit: "Réseau", ok: false, msg: `Import de ${Math.abs(r.net).toFixed(1)} MW nécessaire` })
  return out
}

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export function SimulationPanel() {
  const { dataMultiplier, anomalyActive } = useDashboard()
  const [inputs, setInputs] = useState<Inputs>(NOMINAL)
  const [preset, setPreset] = useState("nominal")

  const result = useMemo(() => simulate(inputs, dataMultiplier), [inputs, dataMultiplier])
  const reference = useMemo(() => simulate(NOMINAL, 1), [])
  const issues = useMemo(() => checks(inputs, result), [inputs, result])

  const set = <K extends keyof Inputs>(unit: K, patch: Partial<Inputs[K]>) => {
    setPreset("custom")
    setInputs((prev) => ({ ...prev, [unit]: { ...prev[unit], ...patch } }))
  }

  const applyPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)
    if (!p) return
    setPreset(id)
    setInputs(structuredClone(p.value))
  }

  const unitOk = (name: string) => !issues.some((i) => i.unit === name)

  return (
    <div className="space-y-4">
      {/* Title + presets */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Simulation du procédé</h1>
          <p className="text-sm text-slate-500">Modifiez les paramètres : les résultats sont recalculés instantanément.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                title={p.hint}
                onClick={() => applyPreset(p.id)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                  preset === p.id ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => applyPreset("nominal")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser
          </button>
        </div>
      </div>

      {anomalyActive !== "none" && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Anomalie active sur le site : la production simulée est réduite à {(dataMultiplier * 100).toFixed(0)} %.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* ---------------- INPUTS ---------------- */}
        <div className="xl:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
          {(["capU", "capV", "capW"] as CapKey[]).map((k) => {
            const name = `CAP ${k.slice(-1)}`
            const c = inputs[k]
            return (
              <UnitCard key={k} title={name} subtitle="Ligne de concentration" icon={Factory} active={c.active} ok={unitOk(name)} onToggle={(v) => set(k, { active: v })}>
                <Field label="Débit vapeur BP" unit="T/h" value={c.steamFlow} min={0} max={150} step={1} disabled={!c.active} onChange={(v) => set(k, { steamFlow: v })} />
                <Field label="Retour condensat" unit="m³/h" value={c.condensate} min={0} max={200} step={1} disabled={!c.active} onChange={(v) => set(k, { condensate: v })} />
                <Field label="Température" unit="°C" value={c.temperature} min={40} max={100} step={1} warnAbove={90} disabled={!c.active} onChange={(v) => set(k, { temperature: v })} />
                <Field label="Pression" unit="bar" value={c.pressure} min={2} max={8} step={0.1} warnBelow={3} warnAbove={6} disabled={!c.active} onChange={(v) => set(k, { pressure: v })} />
              </UnitCard>
            )
          })}

          <UnitCard
            title="Centrale Thermique"
            subtitle="Turbine vapeur"
            icon={Zap}
            active={inputs.central.active}
            ok={unitOk("Centrale")}
            onToggle={(v) => set("central", { active: v })}
          >
            <Field label="Température VHP" unit="°C" value={inputs.central.targetTemp} min={200} max={550} step={5} warnBelow={400} disabled={!inputs.central.active} onChange={(v) => set("central", { targetTemp: v })} />
            <Field label="Pression VHP" unit="bar" value={inputs.central.pressure} min={10} max={60} step={1} warnAbove={55} disabled={!inputs.central.active} onChange={(v) => set("central", { pressure: v })} />
            <Readout label="Rendement turbine" value={`${result.turbineEff.toFixed(1)} %`} />
          </UnitCard>

          <UnitCard
            title="Unité Sulfurique"
            subtitle="Source de vapeur VHP"
            icon={Flame}
            active={inputs.sulfuric.active}
            ok
            onToggle={(v) => set("sulfuric", { active: v })}
          >
            <Field label="Taux de production" unit="%" value={inputs.sulfuric.productionRate} min={0} max={100} step={1} disabled={!inputs.sulfuric.active} onChange={(v) => set("sulfuric", { productionRate: v })} />
            <Readout label="Vapeur VHP exportée" value={`${result.sulfSteam.toFixed(1)} T/h`} />
          </UnitCard>

          <UnitCard
            title="Traitement TED"
            subtitle="Traitement et recyclage de l'eau"
            icon={Droplets}
            active={inputs.ted.active}
            ok={unitOk("TED") && unitOk("Qualité eau")}
            onToggle={(v) => set("ted", { active: v })}
          >
            <Field label="Capacité de traitement" unit="m³/h" value={inputs.ted.treatmentCapacity} min={0} max={1000} step={10} disabled={!inputs.ted.active} onChange={(v) => set("ted", { treatmentCapacity: v })} />
              <Field label="Objectif de recyclage" unit="%" value={inputs.ted.recycleTarget} min={0} max={100} step={1} warnBelow={60} disabled={!inputs.ted.active} onChange={(v) => set("ted", { recycleTarget: v })} />
          </UnitCard>
        </div>

        {/* ---------------- OUTPUTS ---------------- */}
        <div className="xl:col-span-5 space-y-4 xl:sticky xl:top-20">
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Résultats du scénario</h2>
              <span className="text-[11px] text-slate-500">Écart vs nominal</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Kpi icon={Zap} label="Production" value={result.production} ref_={reference.production} unit="MW" accent="text-emerald-600" />
              <Kpi icon={Factory} label="Consommation" value={result.consumption} ref_={reference.consumption} unit="MW" accent="text-sky-600" invert />
              <Kpi
                icon={Zap}
                label={result.net >= 0 ? "Export réseau" : "Import réseau"}
                value={result.net}
                ref_={reference.net}
                unit="MW"
                accent={result.net >= 0 ? "text-teal-600" : "text-amber-600"}
                signed
              />
              <Kpi icon={CheckCircle2} label="Efficacité globale" value={result.efficiency} ref_={reference.efficiency} unit="%" accent="text-violet-600" />
              <Kpi icon={Wallet} label="Bilan financier" value={result.revenue / 1000} ref_={reference.revenue / 1000} unit="k DH/j" accent={result.revenue >= 0 ? "text-emerald-600" : "text-red-600"} signed />
              <Kpi icon={Leaf} label="CO₂ évité" value={result.co2Avoided} ref_={reference.co2Avoided} unit="t/j" accent="text-green-600" />
            </div>

            {/* Energy balance bar */}
            <div className="mt-4">
              <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                <span>Bilan électrique</span>
                <span className="tabular">
                  {result.production.toFixed(1)} MW produits · {result.consumption.toFixed(1)} MW consommés
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden flex">
                {(() => {
                  const total = Math.max(result.production, result.consumption, 1)
                  return (
                    <>
                      <div className="bg-sky-500" style={{ width: `${(Math.min(result.consumption, result.production) / total) * 100}%` }} />
                      {result.net > 0 && <div className="bg-emerald-500" style={{ width: `${(result.net / total) * 100}%` }} />}
                      {result.net < 0 && <div className="bg-amber-500" style={{ width: `${(-result.net / total) * 100}%` }} />}
                    </>
                  )
                })()}
              </div>
              <div className="flex gap-4 mt-1.5 text-[11px] text-slate-600">
                <Dot className="bg-sky-500" label="Autoconsommation" />
                <Dot className="bg-emerald-500" label="Export" />
                <Dot className="bg-amber-500" label="Import" />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
            <h2 className="text-sm font-semibold text-slate-900">Vapeur & eau</h2>
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <Row label="Vapeur vers turbine" value={`${result.steamToTurbine.toFixed(0)} T/h`} />
              <Row label="dont CAP (BP)" value={`${result.capSteam.toFixed(0)} T/h`} />
              <Row label="Retour condensat" value={`${result.waterIn.toFixed(0)} m³/h`} />
              <Row label="Ratio retour / vapeur" value={result.returnRatio.toFixed(2)} warn={result.returnRatio > 0 && result.returnRatio < 0.8} />
              <Row label="Eau recyclée" value={`${result.recycled.toFixed(0)} m³/h`} />
              <Row label="Appoint eau" value={`${result.makeup.toFixed(0)} m³/h`} />
              <Row label="pH estimé" value={result.ph.toFixed(2)} warn={result.ph < 6.5 || result.ph > 7.8} />
              <Row label="Conductivité" value={`${result.conductivity.toFixed(0)} µS/cm`} />
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Contrôles de cohérence</h2>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  issues.length ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700",
                )}
              >
                {issues.length ? `${issues.length} point(s) d'attention` : "Scénario valide"}
              </span>
            </div>
            {issues.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">Tous les paramètres sont dans les plages d'exploitation.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {issues.map((i, n) => (
                  <li key={n} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
                    <span className="text-slate-700">
                      <span className="font-semibold text-slate-900">{i.unit} :</span> {i.msg}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-500">
              <Beaker className="w-3.5 h-3.5 mt-px shrink-0" />
              Modèle simplifié à but de démonstration : coefficients indicatifs, à calibrer avec les données réelles du site.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* UI pieces                                                            */
/* ------------------------------------------------------------------ */

function UnitCard({
  title,
  subtitle,
  icon: Icon,
  active,
  ok,
  onToggle,
  children,
  className,
}: {
  title: string
  subtitle: string
  icon: typeof Zap
  active: boolean
  ok: boolean
  onToggle: (v: boolean) => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-xl border bg-white shadow-sm transition-colors", active ? "border-slate-200" : "border-dashed border-slate-300", className)}>
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center", active ? "bg-emerald-50" : "bg-slate-100")}>
            <Icon className={cn("w-4 h-4", active ? "text-emerald-600" : "text-slate-400")} />
          </span>
          <div className="leading-tight min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{title}</p>
            <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {active && (
            <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-semibold", ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
              {ok ? "OK" : "Attention"}
            </span>
          )}
          {!active && <span className="text-[11px] font-medium text-slate-500">Arrêt</span>}
          <Switch checked={active} onCheckedChange={onToggle} aria-label={`Activer ${title}`} />
        </div>
      </header>
      <div className={cn("px-4 py-3 space-y-3", !active && "opacity-50")}>{children}</div>
    </section>
  )
}

/** Slider + numeric input kept in sync; typing is clamped to [min, max] on blur / Enter. */
function Field({
  label,
  unit,
  value,
  min,
  max,
  step,
  disabled,
  warnAbove,
  warnBelow,
  onChange,
}: {
  label: string
  unit: string
  value: number
  min: number
  max: number
  step: number
  disabled?: boolean
  warnAbove?: number
  warnBelow?: number
  onChange: (v: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const decimals = step < 1 ? 1 : 0
  const warn = (warnAbove !== undefined && value > warnAbove) || (warnBelow !== undefined && value < warnBelow)

  const commit = () => {
    if (draft === null) return
    const n = parseFloat(draft.replace(",", "."))
    if (!Number.isNaN(n)) onChange(+Math.min(max, Math.max(min, n)).toFixed(decimals))
    setDraft(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <label className="text-xs font-medium text-slate-600">{label}</label>
        <div
          className={cn(
            "flex items-center rounded-md border bg-white pr-2 focus-within:ring-2 focus-within:ring-emerald-500/30",
            warn ? "border-amber-400" : "border-slate-200",
          )}
        >
          <input
            type="text"
            inputMode="decimal"
            disabled={disabled}
            aria-label={label}
            value={draft ?? value.toFixed(decimals)}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur()
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault()
                const n = value + (e.key === "ArrowUp" ? step : -step)
                onChange(+Math.min(max, Math.max(min, n)).toFixed(decimals))
              }
            }}
            className={cn("w-16 bg-transparent px-2 py-1 text-right text-sm font-semibold tabular outline-none", warn ? "text-amber-700" : "text-slate-900")}
          />
          <span className="text-[11px] text-slate-500">{unit}</span>
        </div>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} disabled={disabled} onValueChange={([v]) => onChange(v)} />
      <div className="flex justify-between mt-1 text-[10px] text-slate-400 tabular">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900 tabular">{value}</span>
    </div>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  ref_,
  unit,
  accent,
  signed,
  invert,
}: {
  icon: typeof Zap
  label: string
  value: number
  ref_: number
  unit: string
  accent: string
  signed?: boolean
  invert?: boolean
}) {
  const diff = value - ref_
  const pct = ref_ !== 0 ? (diff / Math.abs(ref_)) * 100 : 0
  const good = invert ? diff <= 0 : diff >= 0
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
        <Icon className="w-3.5 h-3.5" /> {label}
      </p>
      <p className={cn("mt-0.5 text-xl font-bold tabular", accent)}>
        {signed && value > 0 ? "+" : ""}
        {Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(1)}
        <span className="ml-1 text-xs font-medium text-slate-500">{unit}</span>
      </p>
      <p className={cn("text-[11px] font-medium tabular", Math.abs(pct) < 0.05 ? "text-slate-400" : good ? "text-emerald-600" : "text-red-600")}>
        {Math.abs(pct) < 0.05 ? "= nominal" : `${diff > 0 ? "▲" : "▼"} ${Math.abs(pct).toFixed(1)} %`}
      </p>
    </div>
  )
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-1">
      <dt className="text-slate-600">{label}</dt>
      <dd className={cn("font-semibold tabular", warn ? "text-amber-600" : "text-slate-900")}>{value}</dd>
    </div>
  )
}

function Dot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn("w-2 h-2 rounded-full", className)} /> {label}
    </span>
  )
}
