"use client"

import { useState, useEffect } from "react"
import { useDashboard } from "@/context/dashboard-context"

interface SchemaData {
  capU: { charge: number; puissance: number; pH: number; cond: number; flow: number }
  capV: { charge: number; puissance: number; pH: number; cond: number; flow: number }
  capW: { charge: number; puissance: number; pH: number; cond: number; flow: number }
  centrale: {
    charge: number
    puissance: number
    efficacite: number
    temp: number
    retourPH: number
    retourCond: number
    retourDebit: number
    retourTemp: number
  }
  sulfurique: { charge: number; temp: number; vhpExport: number; vhpTemp: number; vbpExport: number; vbpTemp: number }
  ted: { charge: number; debitEntree: number; debitSortie: number; stockActuel: number; prevision24h: number; tauxRecyclage: number }
  echangeElec: {
    energieNecessaire: number
    energieProduite: number
    energieExportee: number
    energieImportee: number
    bilanNet: number
    statut: string
  }
}

type StatutType = "EXPORTATION" | "IMPORTATION" | "ÉQUILIBRE" | null

export function ProcessSchema() {
  const { setAnomalyActive } = useDashboard()
  const [data, setData] = useState<SchemaData>({
    capU: { charge: 118.5, puissance: 11.85, pH: 6.9, cond: 450, flow: 63.1 },
    capV: { charge: 113.6, puissance: 11.36, pH: 7.0, cond: 485, flow: 56.6 },
    capW: { charge: 113.4, puissance: 11.34, pH: 6.7, cond: 467, flow: 61.4 },
    centrale: { charge: 91, puissance: 65.68, efficacite: 93.8, temp: 482.4, retourPH: 7.4, retourCond: 520, retourDebit: 210, retourTemp: 85 },
    sulfurique: { charge: 83, temp: 410, vhpExport: 46, vhpTemp: 482.4, vbpExport: 32, vbpTemp: 175 },
    ted: { charge: 86, debitEntree: 680, debitSortie: 340, stockActuel: 15125, prevision24h: 14097, tauxRecyclage: 92 },
    echangeElec: {
      energieNecessaire: 38.5,
      energieProduite: 65.68,
      energieExportee: 27.18,
      energieImportee: 0,
      bilanNet: 27.18,
      statut: "EXPORTATION"
    }
  })

  const [anomalyMode, setAnomalyMode] = useState<"none" | "uncomfortable-steam" | "water-leak">("none")

  // Force statut: "EXPORTATION" | "IMPORTATION" | null (default: null to avoid TS literal narrowing)
  const FORCE_STATUT: StatutType = null

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const newPuissance = prev.centrale.puissance + (Math.random() - 0.5) * 0.5
        const energieNecessaire = prev.capU.puissance + prev.capV.puissance + prev.capW.puissance + 4.2
        let bilanNet = newPuissance - energieNecessaire
        // Ensure export stays above 20 MW
        if (bilanNet < 22) {
          bilanNet = 22 + Math.random() * 5
        }
        let statut: StatutType = bilanNet > 0 ? "EXPORTATION" : bilanNet < -2 ? "IMPORTATION" : "ÉQUILIBRE"

        // Override statut if forcing mode
        if (FORCE_STATUT !== null && FORCE_STATUT === "EXPORTATION") {
          statut = "EXPORTATION"
          // Ensure positive export with a minimum visibility value
          bilanNet = Math.max(bilanNet, 0.5)
        } else if (FORCE_STATUT !== null && FORCE_STATUT === "IMPORTATION") {
          statut = "IMPORTATION"
          // Ensure positive import with a minimum visibility value
          bilanNet = -Math.max(Math.abs(bilanNet), 0.5)
        }

        let newData = {
          capU: { ...prev.capU, charge: prev.capU.charge + (Math.random() - 0.5) * 2 },
          capV: { ...prev.capV, charge: prev.capV.charge + (Math.random() - 0.5) * 2 },
          capW: { ...prev.capW, charge: prev.capW.charge + (Math.random() - 0.5) * 2 },
          centrale: {
            ...prev.centrale,
            puissance: newPuissance,
            temp: Math.max(480, Math.min(495, prev.sulfurique.vhpTemp + (Math.random() - 0.5) * 1.5)),
          },
          sulfurique: {
            ...prev.sulfurique,
            temp: prev.sulfurique.temp + (Math.random() - 0.5) * 1,
            vhpTemp: Math.max(480, Math.min(495, prev.sulfurique.vhpTemp + (Math.random() - 0.5) * 1.5)),
          },
          ted: { ...prev.ted, debitEntree: prev.ted.debitEntree + (Math.random() - 0.5) * 10 },
          echangeElec: {
            energieNecessaire,
            energieProduite: newPuissance,
            energieExportee: bilanNet > 0 ? bilanNet : 0,
            energieImportee: bilanNet < 0 ? Math.abs(bilanNet) : 0,
            bilanNet,
            statut: statut || "ÉQUILIBRE",
          },
        }

        // Apply anomaly simulations
        if (anomalyMode === "uncomfortable-steam") {
          // Simulate uncomfortable steam: vapor flow significantly different from condensate return
          const vaporFlow = prev.capU.flow + prev.capV.flow + prev.capW.flow
          newData.centrale = {
            ...newData.centrale,
            retourDebit: vaporFlow * 0.65 // 35% difference (uncomfortable)
          }
        } else if (anomalyMode === "water-leak") {
          // Simulate water leak: return water less than input water
          newData.ted = {
            ...newData.ted,
            debitSortie: newData.ted.debitEntree * 0.70 // 30% loss (leak)
          }
        }

        return newData
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [anomalyMode])



  const isExport = data.echangeElec.statut === "EXPORTATION"
  const exportMad = isExport ? Math.min(19.5, Math.abs(data.echangeElec.bilanNet)) : 0
  const importMad = data.echangeElec.energieImportee > 0 ? Math.max(105, Math.abs(data.echangeElec.bilanNet) + 80) : 0
  const steamAlert = anomalyMode === "uncomfortable-steam"
  const leakAlert = anomalyMode === "water-leak"

  const C = SC

  const statutColor =
    data.echangeElec.statut === "EXPORTATION" ? C.export : data.echangeElec.statut === "IMPORTATION" ? C.import : "var(--color-slate-500)"

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Schéma Procédé</h1>
          <p className="text-sm text-slate-500">Flux vapeur, condensat et électricité animés en temps réel</p>
        </div>

        {/* Anomaly test controls (segmented) */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Test d'anomalie</span>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            {(
              [
                ["none", "Normal", "bg-emerald-600"],
                ["uncomfortable-steam", "Vapeur non conforme", "bg-orange-600"],
                ["water-leak", "Fuite d'eau", "bg-red-600"],
              ] as const
            ).map(([mode, label, activeBg]) => (
              <button
                key={mode}
                onClick={() => {
                  setAnomalyMode(mode)
                  setAnomalyActive(mode)
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  anomalyMode === mode ? `${activeBg} text-white shadow-sm` : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Schema */}
      <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 shadow-sm overflow-x-auto">
        <svg viewBox="0 0 1400 800" className="w-full" style={{ minWidth: 1000 }} role="img" aria-label="Schéma procédé">
          <defs>
            {Object.entries(C).map(([k, color]) => (
              <marker key={k} id={`arrow-${k}`} markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0, 12 6, 0 12" fill={color} />
              </marker>
            ))}
            <style>{`
              .sc-text { font-family: inherit; }
            `}</style>
          </defs>

          {/* Legend */}
          <g transform="translate(80, 36)" className="sc-text">
            <Legend x={0} color={C.condensat} label="Condensat / Eau" />
            <Legend x={150} color={C.vapeur} label="Vapeur" />
            <Legend x={250} color={C.export} label="Électricité export" />
            <Legend x={400} color={C.import} label="Électricité import" dashed />
            <g transform="translate(560,0)">
              <circle cx={0} cy={0} r={5} fill="var(--color-white)" stroke="var(--color-slate-900)" strokeWidth={2} />
              <text x={12} y={4} fontSize={12} fill="var(--color-slate-600)">Capteur</text>
            </g>
          </g>

          {/* ===== Pipes (drawn first so boxes sit on top) ===== */}

          {/* TED -> condensat header */}
          <Pipe d="M 110 610 V 90" color={leakAlert ? C.alert : C.condensat} arrow={false} />
          <Pipe d="M 110 90 H 740" color={leakAlert ? C.alert : C.condensat} arrow={false} />
          <Label x={130} y={80} text="Condensat traité" color="var(--color-slate-600)" anchor="start" />
          {[260, 500, 740].map((x) => (
            <Pipe key={x} d={`M ${x} 90 V 118`} color={leakAlert ? C.alert : C.condensat} />
          ))}
          <Sensor x={380} y={90} />
          <Sensor x={620} y={90} />

          {/* CAP -> Vapeur BP collector -> Centrale */}
          {[260, 500, 740].map((x) => (
            <g key={x}>
              <Pipe d={`M ${x} 290 V 330`} color={C.vapeur} arrow={false} />
              <Sensor x={x} y={308} />
            </g>
          ))}
          <Pipe d="M 260 330 H 500" color={C.vapeur} arrow={false} />
          <Pipe d="M 740 330 H 500" color={C.vapeur} arrow={false} />
          <Pipe d="M 500 330 V 378" color={C.vapeur} />
          <Label x={380} y={322} text="Vapeur BP" color={C.vapeur} />

          {/* Centrale -> Échange électrique (export) */}
          <Pipe
            d="M 630 410 H 940 V 230 H 1058"
            color={data.echangeElec.energieExportee > 0 ? C.export : C.idle}
            idle={data.echangeElec.energieExportee <= 0}
          />
          <Label
            x={645}
            y={400}
            anchor="start"
            text={`Export : ${data.echangeElec.energieExportee.toFixed(2)} MW`}
            color={data.echangeElec.energieExportee > 0 ? C.export : "var(--color-slate-400)"}
          />
          <Chip x={860} y={410} text="Compteur kWh" />

          {/* Échange électrique -> Centrale (import) */}
          <Pipe
            d="M 1058 300 H 960 V 450 H 632"
            color={data.echangeElec.energieImportee > 0 ? C.import : C.idle}
            idle={data.echangeElec.energieImportee <= 0}
          />
          <Label
            x={645}
            y={468}
            anchor="start"
            text={`Import : ${data.echangeElec.energieImportee.toFixed(2)} MW`}
            color={data.echangeElec.energieImportee > 0 ? C.import : "var(--color-slate-400)"}
          />

          {/* Centrale -> Sulfurique (VHP/VBP) */}
          <Pipe d="M 630 540 H 1038" color={steamAlert ? C.alert : C.vapeur} fast={steamAlert} />
          <Label x={835} y={530} text="VHP / VBP" color={steamAlert ? C.alert : C.vapeur} />
          <Sensor x={760} y={540} />

          {/* Sulfurique -> TED (retour condensat) */}
          <Pipe d="M 1190 602 V 700 H 342" color={leakAlert ? C.alert : C.condensat} fast={leakAlert} />
          <Label x={760} y={690} text="Retour condensat" color={leakAlert ? C.alert : C.condensat} />
          <Sensor x={1000} y={700} />

          {/* ===== Units ===== */}

          <UnitBox x={160} y={120} w={200} h={170} title="CAP U" rows={capRows(data.capU)} />
          <UnitBox x={400} y={120} w={200} h={170} title="CAP V" rows={capRows(data.capV)} />
          <UnitBox x={640} y={120} w={200} h={170} title="CAP W" rows={capRows(data.capW)} />

          <UnitBox
            x={370}
            y={380}
            w={260}
            h={240}
            title="CENTRALE THERMIQUE"
            alert={steamAlert ? "Écart vapeur / condensat" : undefined}
            rows={[
              { label: "Charge", value: `${data.centrale.charge}%`, tone: "big" },
              { label: "Puissance", value: `${data.centrale.puissance.toFixed(2)} MW`, tone: "big" },
              { label: "Efficacité IA", value: `${data.centrale.efficacite.toFixed(1)}%`, tone: "ok" },
              { label: "Température VHP", value: `${data.sulfurique.vhpTemp.toFixed(1)} °C`, tone: "ok" },
              { section: "Retour condensat" },
              { label: "pH", value: data.centrale.retourPH.toFixed(2) },
              { label: "Conductivité", value: `${data.centrale.retourCond} µS/cm` },
              {
                label: "Débit",
                value: `${data.centrale.retourDebit.toFixed(0)} m³/h`,
                tone: steamAlert ? "alert" : undefined,
              },
            ]}
          />

          <UnitBox
            x={1060}
            y={120}
            w={280}
            h={190}
            title="ÉCHANGE ÉLECTRIQUE"
            rows={[
              { label: "Énergie produite", value: `${data.echangeElec.energieProduite.toFixed(2)} MW` },
              { label: "Énergie nécessaire", value: `${data.echangeElec.energieNecessaire.toFixed(2)} MW` },
              {
                label: "Bilan net",
                value: `${data.echangeElec.bilanNet > 0 ? "+" : ""}${data.echangeElec.bilanNet.toFixed(2)} MW`,
                tone: data.echangeElec.bilanNet > 0 ? "ok" : "warn",
              },
              { label: "Valeur export", value: `+${exportMad.toFixed(2)} MAD`, tone: "ok" },
              { label: "Coût import", value: importMad > 0 ? `-${importMad.toFixed(2)} MAD` : "0.00 MAD", tone: importMad > 0 ? "alert" : undefined },
            ]}
          />
          {/* Statut pill */}
          <g className="sc-text">
            <text x={1074} y={292} fontSize={12} fill="var(--color-slate-500)">Statut</text>
            <rect x={1196} y={276} width={130} height={22} rx={11} fill={statutColor} />
            <text x={1261} y={291} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-white)" letterSpacing={0.5}>
              {data.echangeElec.statut}
            </text>
          </g>

          <UnitBox
            x={1040}
            y={440}
            w={300}
            h={162}
            title="UNITÉ SULFURIQUE"
            rows={[
              { label: "Charge", value: `${data.sulfurique.charge}%`, tone: "big" },
              { label: "Température", value: `${data.sulfurique.temp.toFixed(1)} °C`, tone: "ok" },
              { section: "Export vapeur" },
              { label: "VHP", value: `${data.sulfurique.vhpExport} T/h · ${data.sulfurique.vhpTemp.toFixed(0)} °C` },
              { label: "VBP", value: `${data.sulfurique.vbpExport} T/h · ${data.sulfurique.vbpTemp.toFixed(0)} °C` },
            ]}
          />

          <UnitBox
            x={60}
            y={610}
            w={280}
            h={170}
            title="TRAITEMENT TED"
            alert={leakAlert ? "Fuite détectée" : undefined}
            rows={[
              { label: "Charge", value: `${data.ted.charge}%`, tone: "big" },
              { label: "Débit entrée", value: `${data.ted.debitEntree.toFixed(0)} m³/h`, tone: "ok" },
              {
                label: "Débit sortie",
                value: `${data.ted.debitSortie.toFixed(0)} m³/h`,
                tone: leakAlert ? "alert" : "ok",
              },
              { label: "Taux recyclage", value: `${data.ted.tauxRecyclage}%` },
              { label: "Stock actuel", value: `${data.ted.stockActuel.toLocaleString("fr-FR")} m³` },
            ]}
          />
        </svg>
      </div>
    </div>
  )
}

/* ---------- Helpers for the SVG schema ---------- */

type Row =
  | { label: string; value: string; tone?: "big" | "ok" | "warn" | "alert"; section?: undefined }
  | { section: string; label?: undefined; value?: undefined; tone?: undefined }

const TONE: Record<string, { fill: string; size: number; weight: number }> = {
  big: { fill: "var(--color-slate-900)", size: 15, weight: 700 },
  ok: { fill: "var(--color-emerald-700)", size: 13, weight: 600 },
  warn: { fill: "var(--color-amber-700)", size: 13, weight: 700 },
  alert: { fill: "var(--color-red-600)", size: 13, weight: 700 },
  default: { fill: "var(--color-slate-700)", size: 13, weight: 500 },
}

function capRows(u: { charge: number; puissance: number; pH: number; cond: number; flow: number }): Row[] {
  return [
    { label: "Charge", value: `${u.charge.toFixed(1)}%`, tone: "big" },
    { label: "Puissance", value: `${u.puissance.toFixed(2)} MW`, tone: "ok" },
    { label: "pH retour", value: u.pH.toFixed(1) },
    { label: "Conductivité", value: `${u.cond} µS/cm` },
    { label: "Débit", value: `${u.flow.toFixed(1)} m³/h` },
  ]
}

function UnitBox({
  x,
  y,
  w,
  h,
  title,
  rows,
  alert,
}: {
  x: number
  y: number
  w: number
  h: number
  title: string
  rows: Row[]
  alert?: string
}) {
  const pad = 14
  let cy = y + 56
  return (
    <g className="sc-text">
      <rect x={x} y={y} width={w} height={h} rx={10} fill="var(--color-white)" stroke={alert ? "var(--color-red-600)" : "var(--color-slate-300)"} strokeWidth={alert ? 2.5 : 1.5} />
      <rect x={x} y={y} width={w} height={34} rx={10} fill={alert ? "var(--color-red-100)" : "var(--color-slate-100)"} />
      <rect x={x} y={y + 24} width={w} height={10} fill={alert ? "var(--color-red-100)" : "var(--color-slate-100)"} />
      <line x1={x} y1={y + 34} x2={x + w} y2={y + 34} stroke={alert ? "var(--color-red-300)" : "var(--color-slate-200)"} />
      <text x={x + w / 2} y={y + 22} textAnchor="middle" fontSize={13} fontWeight={700} fill={alert ? "var(--color-red-700)" : "var(--color-cyan-700)"} letterSpacing={0.6}>
        {title}
      </text>
      {alert && (
        <text x={x + w - pad} y={y - 8} textAnchor="end" fontSize={11} fontWeight={700} fill="var(--color-red-600)">
          ⚠ {alert}
        </text>
      )}
      {rows.map((r, i) => {
        if (r.section !== undefined) {
          const sy = cy + 2
          cy += 20
          return (
            <text key={i} x={x + pad} y={sy} fontSize={10.5} fontWeight={700} fill="var(--color-slate-400)" letterSpacing={0.6}>
              {r.section.toUpperCase()}
            </text>
          )
        }
        const t = TONE[r.tone ?? "default"]
        const ry = cy
        cy += 22
        return (
          <g key={i}>
            <text x={x + pad} y={ry} fontSize={12} fill="var(--color-slate-500)">
              {r.label}
            </text>
            <text x={x + w - pad} y={ry} textAnchor="end" fontSize={t.size} fontWeight={t.weight} fill={t.fill} style={{ fontVariantNumeric: "tabular-nums" }}>
              {r.value}
            </text>
          </g>
        )
      })}
    </g>
  )
}

const SC = {
  condensat: "var(--color-cyan-600)",
  vapeur: "var(--color-orange-600)",
  export: "var(--color-emerald-600)",
  import: "var(--color-amber-600)",
  alert: "var(--color-red-600)",
  idle: "var(--color-slate-300)",
}

/**
 * A process line. The faint wide stroke is the pipe body; the dashed stroke on top
 * moves along the path direction (stroke-dashoffset animation) so the flow is visible.
 * `idle` = nothing flowing: a static dashed line.
 */
function Pipe({
  d,
  color,
  arrow = true,
  idle = false,
  fast = false,
}: {
  d: string
  color: string
  arrow?: boolean
  idle?: boolean
  fast?: boolean
}) {
  const id = (Object.keys(SC) as (keyof typeof SC)[]).find((k) => SC[k] === color)
  const marker = arrow && id ? `url(#arrow-${id})` : undefined
  if (idle) {
    return <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeDasharray="6 8" strokeLinejoin="round" markerEnd={marker} />
  }
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeOpacity={0.18} strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" />
      <path d={d} fill="none" stroke={color} strokeOpacity={0.55} strokeWidth={2} strokeLinejoin="round" />
      <path d={d} fill="none" stroke={color} strokeWidth={4} strokeLinejoin="round" className={fast ? "flow flow-fast" : "flow"} markerEnd={marker} />
    </g>
  )
}

function Sensor({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={5} fill="var(--color-white)" stroke="var(--color-slate-900)" strokeWidth={2} />
}

function Label({ x, y, text, color, anchor = "middle" }: { x: number; y: number; text: string; color: string; anchor?: "start" | "middle" | "end" }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={12} fontWeight={600} fill={color} className="sc-text" style={{ paintOrder: "stroke", stroke: "var(--color-white)", strokeWidth: 4 }}>
      {text}
    </text>
  )
}

function Chip({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <g className="sc-text">
      <rect x={x - 50} y={y - 12} width={100} height={24} rx={6} fill="var(--color-slate-50)" stroke="var(--color-slate-400)" />
      <text x={x} y={y + 4} textAnchor="middle" fontSize={11} fill="var(--color-slate-700)">
        {text}
      </text>
    </g>
  )
}

function Legend({ x, color, label, dashed = false }: { x: number; color: string; label: string; dashed?: boolean }) {
  return (
    <g transform={`translate(${x},0)`}>
      <line x1={0} y1={0} x2={22} y2={0} stroke={color} strokeWidth={3} strokeDasharray={dashed ? "5 4" : undefined} />
      <text x={30} y={4} fontSize={12} fill="var(--color-slate-600)">
        {label}
      </text>
    </g>
  )
}
