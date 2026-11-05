"use client"

import { useState } from "react"
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { AlertTriangle, CheckCircle2, FlaskConical, RotateCcw } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { useSimModel, useSimulation, type SimInputs } from "@/lib/api"
import { ApiError } from "./data-source"
import { PageHeader, Panel, StatCard, fmt } from "./ui"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/* Simulateur what-if : chaque réglage est envoyé au modèle Python     */
/* calé sur les données réelles 2025 (backend/app/simulator.py).       */
/* ------------------------------------------------------------------ */

export function SimulationPanel() {
  const { data: model, error } = useSimModel()
  const [inputs, setInputs] = useState<SimInputs | null>(null)
  const [preset, setPreset] = useState("median")
  const current = inputs ?? model?.reference ?? null
  const { data: run } = useSimulation(current)

  if (error) return <ApiError error={error} />
  if (!model || !current) return <p className="text-sm text-slate-500">Calage du modèle sur les données réelles…</p>

  const set = (patch: Partial<SimInputs>) => {
    setInputs({ ...current, ...patch })
    setPreset("")
  }
  const r = run?.result
  const pm = model.power_model
  const capacity = model.constants.gta_capacity_t_h

  return (
    <div className="space-y-4">
      <PageHeader
        title="Simulation « what-if »"
        subtitle={`Modèle calé sur ${pm.n_days} jours réels de marche stable · R² = ${fmt(pm.r2, 3)} · erreur moyenne ${fmt(pm.mae_mw, 2)} MW`}
      >
        <button
          onClick={() => {
            setInputs(null)
            setPreset("median")
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Revenir à la journée médiane
        </button>
      </PageHeader>

      {/* Scénarios issus des données */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
        {model.presets.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setInputs(p.inputs)
              setPreset(p.id)
            }}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-left transition-colors",
              preset === p.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:bg-slate-50",
            )}
          >
            <p className="text-sm font-semibold">{p.label}</p>
            <p className={cn("text-[11px]", preset === p.id ? "text-slate-300" : "text-slate-500")}>{p.hint}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Réglages */}
        <Panel title="Réglages" subtitle="Ce que l'exploitant peut faire varier">
          <div className="space-y-5 pt-1">
            <Control label="Vapeur VHP disponible" unit="t/h" value={current.vhp_t_h} min={0} max={3 * capacity} step={0.5} onChange={(v) => set({ vhp_t_h: v })} hint={`Médiane 2025 : ${fmt(model.reference.vhp_t_h)} t/h`} />
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium text-slate-700">Turbo-alternateurs en service</span>
                <span className="text-xs text-slate-500">{capacity} t/h max chacun</span>
              </div>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-xs font-semibold">
                {[1, 2, 3].map((n) => (
                  <button key={n} onClick={() => set({ gta: n })} className={cn("rounded-md px-4 py-1.5", current.gta === n ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}>
                    {n === 1 ? "GTA3" : n === 2 ? "GTA2 + GTA3" : "Les 3"}
                  </button>
                ))}
              </div>
            </div>
            <Control label="Vapeur BP demandée par les CAP" unit="t/h" value={current.bp_t_h} min={0} max={2 * capacity} step={0.5} onChange={(v) => set({ bp_t_h: v })} hint="Soutirée dans la turbine : plus de BP = moins d'électricité" />
            <Control label="Consommation électrique du site" unit="MW" value={current.conso_mw} min={5} max={40} step={0.1} onChange={(v) => set({ conso_mw: v })} hint={`Médiane 2025 : ${fmt(model.reference.conso_mw, 2)} MW`} />
            <Control label="Prix d'achat de l'électricité" unit="DH/MWh" value={current.prix_dh_mwh} min={400} max={900} step={5} onChange={(v) => set({ prix_dh_mwh: v })} hint="Payé en 2025 : 670 · tarif ONEE THT 481 – 745" />
          </div>
        </Panel>

        {/* Résultats */}
        <div className="xl:col-span-2 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard label="Production électrique" value={fmt(r?.production_mw, 2)} unit="MW" accent="text-emerald-600" hint={`Médiane 2025 : ${fmt(run?.reference.production_mw, 2)} MW`} />
            <StatCard label="Autonomie électrique" value={fmt(r?.autonomie_pct, 1)} unit="%" accent="text-violet-600" />
            <StatCard label="Électricité à acheter" value={fmt(r?.achats_mw, 2)} unit="MW" accent="text-amber-600" hint={r?.surplus_mw ? `Excédent exportable : ${fmt(r.surplus_mw, 2)} MW` : undefined} />
            <StatCard label="Coût des achats" value={fmt(r?.cout_achats_dh_jour, 0)} unit="DH/jour" accent="text-amber-700" />
            <StatCard
              label="Gain vs journée médiane"
              value={fmt(run ? run.gain_dh_an / 1e6 : null, 2)}
              unit="M DH/an"
              accent={(run?.gain_dh_an ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}
              hint={`${fmt(run?.gain_dh_jour, 0)} DH/jour`}
            />
            <StatCard label="CO₂ évité" value={fmt(r?.co2_evite_t_jour, 0)} unit="t/jour" accent="text-emerald-700" hint="réseau marocain 0,60 tCO₂/MWh (AIE)" />
          </div>

          <Panel title="Production selon la vapeur disponible" subtitle="Autres réglages inchangés · point = scénario actuel · ligne pointillée = consommation du site">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={run?.curve ?? []} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-200)" vertical={false} />
                  <XAxis dataKey="vhp_t_h" type="number" domain={[0, "dataMax"]} tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} unit=" t/h" />
                  <YAxis tick={{ fontSize: 11, fill: "var(--color-slate-500)" }} tickLine={false} axisLine={false} width={48} unit=" MW" />
                  <Tooltip formatter={(v) => [`${fmt(Number(v), 2)} MW`, "Production"]} labelFormatter={(l) => `${l} t/h de VHP`} />
                  <ReferenceLine y={current.conso_mw} stroke="var(--color-sky-600)" strokeDasharray="5 4" />
                  <Line type="linear" dataKey="production_mw" stroke="var(--color-emerald-600)" strokeWidth={2} dot={false} isAnimationActive={false} />
                  {r && <ReferenceDot x={Math.min(current.vhp_t_h, run?.curve.at(-1)?.vhp_t_h ?? 0)} y={r.production_mw} r={5} fill="var(--color-emerald-600)" stroke="white" />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Panel title="Bilan vapeur du scénario" subtitle="t/h">
              <ul className="space-y-1.5 text-sm">
                <Row label="Vapeur admise dans les turbines" value={`${fmt(r?.vapeur_admise_t_h)} t/h`} />
                <Row label="→ BP soutirée vers les CAP" value={`${fmt(r?.bp_soutiree_t_h)} t/h`} />
                <Row label="→ Condensat (retour chaudières)" value={`${fmt(r?.condensat_t_h)} t/h`} />
                <Row label="Vapeur non valorisée" value={`${fmt(r?.vapeur_non_valorisee_t_h)} t/h`} bad={(r?.vapeur_non_valorisee_t_h ?? 0) > 0} />
                <Row label="Consommation spécifique" value={`${fmt(r?.conso_specifique_t_mwh, 2)} t/MWh`} />
              </ul>
            </Panel>
            <Panel title="Contrôles" subtitle="Cibles du rapport journalier et domaine du modèle">
              {r && r.warnings.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" /> Scénario dans les cibles et dans le domaine observé.
                </p>
              ) : (
                <ul className="space-y-2">
                  {r?.warnings.map((w) => (
                    <li key={w} className="flex items-start gap-2 text-xs text-amber-800">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                      {w}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </div>

      <Panel title="Comment ce modèle est construit" subtitle="Pour comprendre (et défendre) chaque chiffre">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm text-slate-700">
          <div className="flex gap-3">
            <FlaskConical className="w-5 h-5 text-violet-600 shrink-0" />
            <div>
              <p className="font-semibold text-slate-900">Puissance d'une turbine</p>
              <p className="mt-1 font-mono text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1">
                P = {fmt(pm.c0, 3)} + {fmt(pm.c1, 4)} × VHP {pm.c2 < 0 ? "−" : "+"} {fmt(Math.abs(pm.c2), 4)} × BP
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Régression linéaire sur {pm.n_days} jours où le GTA3 a tourné 24 h. Valable entre {fmt(pm.vhp_min_t_h, 0)} et {fmt(pm.vhp_max_t_h, 0)} t/h par turbine. Le coefficient de la BP est négatif : la vapeur soutirée pour les CAP ne se détend pas jusqu'au condenseur.
              </p>
            </div>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Droite de Willans (vérification)</p>
            <p className="mt-1 font-mono text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1">
              VHP = {fmt(model.willans.a, 2)} + {fmt(model.willans.b, 2)} × P
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Loi classique des turbines à vapeur : la vapeur consommée est presque linéaire en la puissance. La pente ({fmt(model.willans.b, 2)} t/MWh) tombe dans la cible du site (6,8 – 7,5).
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Bilans et hypothèses</p>
            <ul className="mt-1 text-xs text-slate-500 list-disc pl-4 space-y-0.5">
              <li>Vapeur admise = BP soutirée + condensat (vérifié à 99,7 % sur 2025).</li>
              <li>Max {capacity} t/h par turbine (objectif 2 160 t/j du rapport journalier).</li>
              <li>Prix = prix moyen réellement payé en 2025.</li>
              <li>Scénario GTA2 : suppose la turbine réparée et la vapeur de MC disponible.</li>
            </ul>
          </div>
        </div>
      </Panel>
    </div>
  )
}

function Control({ label, unit, value, min, max, step, onChange, hint }: { label: string; unit: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="tabular font-semibold text-slate-900">
          {fmt(value, step < 1 ? 1 : 0)} <span className="text-xs font-medium text-slate-500">{unit}</span>
        </span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  )
}

function Row({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <li className="flex justify-between">
      <span className="text-slate-600">{label}</span>
      <span className={cn("tabular font-semibold", bad ? "text-red-600" : "text-slate-900")}>{value}</span>
    </li>
  )
}
