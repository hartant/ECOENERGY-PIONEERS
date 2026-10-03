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

  const C = {
    condensat: "#0891b2",
    vapeur: "#ea580c",
    export: "#059669",
    import: "#d97706",
    alert: "#dc2626",
    idle: "#cbd5e1",
  }

  const statutColor =
    data.echangeElec.statut === "EXPORTATION" ? C.export : data.echangeElec.statut === "IMPORTATION" ? C.import : "#64748b"

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Schéma Procédé</h2>
        <p className="text-slate-600 mt-1">Diagramme détaillé avec valeurs en temps réel</p>
      </div>

      {/* Anomaly Testing Controls */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
        <h3 className="text-base font-semibold text-slate-800 mb-3">🧪 Tests d'Anomalies</h3>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => {
              setAnomalyMode("none")
              setAnomalyActive("none")
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all border ${
              anomalyMode === "none"
                ? "bg-green-600 border-green-600 text-white shadow-sm"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            ✓ Normal
          </button>
          <button
            onClick={() => {
              setAnomalyMode("uncomfortable-steam")
              setAnomalyActive("uncomfortable-steam")
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all border ${
              steamAlert
                ? "bg-orange-600 border-orange-600 text-white shadow-sm"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            ⚠️ Vapeur Non Conforme
          </button>
          <button
            onClick={() => {
              setAnomalyMode("water-leak")
              setAnomalyActive("water-leak")
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all border ${
              leakAlert
                ? "bg-red-600 border-red-600 text-white shadow-sm"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            💧 Fuite d'Eau
          </button>
        </div>
      </div>

      {/* SVG Schema */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm overflow-x-auto">
        <svg viewBox="0 0 1400 800" className="w-full" style={{ minWidth: 1000 }} role="img" aria-label="Schéma procédé">
          <defs>
            {Object.entries(C).map(([k, color]) => (
              <marker key={k} id={`arrow-${k}`} markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0, 12 6, 0 12" fill={color} />
              </marker>
            ))}
            <style>{`
              .sc-text { font-family: inherit; }
              .sc-flow { animation: sc-dash 1.2s linear infinite; }
              @keyframes sc-dash { to { stroke-dashoffset: -16; } }
            `}</style>
          </defs>

          {/* Legend */}
          <g transform="translate(80, 36)" className="sc-text">
            <Legend x={0} color={C.condensat} label="Condensat / Eau" />
            <Legend x={150} color={C.vapeur} label="Vapeur" />
            <Legend x={250} color={C.export} label="Électricité export" />
            <Legend x={400} color={C.import} label="Électricité import" dashed />
            <g transform="translate(560,0)">
              <circle cx={0} cy={0} r={5} fill="#fff" stroke="#0f172a" strokeWidth={2} />
              <text x={12} y={4} fontSize={12} fill="#475569">Capteur</text>
            </g>
          </g>

          {/* ===== Pipes (drawn first so boxes sit on top) ===== */}

          {/* TED -> condensat header */}
          <Pipe d="M 110 610 V 90" color={leakAlert ? C.alert : C.condensat} arrow={false} />
          <Pipe d="M 110 90 H 740" color={leakAlert ? C.alert : C.condensat} arrow={false} />
          <Label x={130} y={80} text="Condensat traité" color="#475569" anchor="start" />
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
          <Pipe d="M 260 330 H 740" color={C.vapeur} arrow={false} />
          <Pipe d="M 500 330 V 378" color={C.vapeur} />
          <Label x={380} y={322} text="Vapeur BP" color={C.vapeur} />

          {/* Centrale -> Échange électrique (export) */}
          <Pipe
            d="M 630 410 H 940 V 230 H 1058"
            color={data.echangeElec.energieExportee > 0 ? C.export : C.idle}
            dashed={data.echangeElec.energieExportee <= 0}
          />
          <Label
            x={645}
            y={400}
            anchor="start"
            text={`Export : ${data.echangeElec.energieExportee.toFixed(2)} MW`}
            color={data.echangeElec.energieExportee > 0 ? C.export : "#94a3b8"}
          />
          <Chip x={860} y={410} text="Compteur kWh" />

          {/* Échange électrique -> Centrale (import) */}
          <Pipe
            d="M 1058 300 H 960 V 450 H 632"
            color={data.echangeElec.energieImportee > 0 ? C.import : C.idle}
            dashed
          />
          <Label
            x={645}
            y={468}
            anchor="start"
            text={`Import : ${data.echangeElec.energieImportee.toFixed(2)} MW`}
            color={data.echangeElec.energieImportee > 0 ? C.import : "#94a3b8"}
          />

          {/* Centrale -> Sulfurique (VHP/VBP) */}
          <Pipe d="M 630 540 H 1038" color={steamAlert ? C.alert : C.vapeur} />
          <Label x={835} y={530} text="VHP / VBP" color={steamAlert ? C.alert : C.vapeur} />
          <Sensor x={760} y={540} />

          {/* Sulfurique -> TED (retour condensat) */}
          <Pipe d="M 1190 602 V 700 H 342" color={leakAlert ? C.alert : C.condensat} dashed={leakAlert} />
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
            <text x={1074} y={292} fontSize={12} fill="#64748b">Statut</text>
            <rect x={1196} y={276} width={130} height={22} rx={11} fill={statutColor} />
            <text x={1261} y={291} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff" letterSpacing={0.5}>
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
  big: { fill: "#0f172a", size: 15, weight: 700 },
  ok: { fill: "#047857", size: 13, weight: 600 },
  warn: { fill: "#b45309", size: 13, weight: 700 },
  alert: { fill: "#dc2626", size: 13, weight: 700 },
  default: { fill: "#334155", size: 13, weight: 500 },
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
      <rect x={x} y={y} width={w} height={h} rx={10} fill="#ffffff" stroke={alert ? "#dc2626" : "#cbd5e1"} strokeWidth={alert ? 2.5 : 1.5} />
      <rect x={x} y={y} width={w} height={34} rx={10} fill={alert ? "#fee2e2" : "#f1f5f9"} />
      <rect x={x} y={y + 24} width={w} height={10} fill={alert ? "#fee2e2" : "#f1f5f9"} />
      <line x1={x} y1={y + 34} x2={x + w} y2={y + 34} stroke={alert ? "#fca5a5" : "#e2e8f0"} />
      <text x={x + w / 2} y={y + 22} textAnchor="middle" fontSize={13} fontWeight={700} fill={alert ? "#b91c1c" : "#0e7490"} letterSpacing={0.6}>
        {title}
      </text>
      {alert && (
        <text x={x + w - pad} y={y - 8} textAnchor="end" fontSize={11} fontWeight={700} fill="#dc2626">
          ⚠ {alert}
        </text>
      )}
      {rows.map((r, i) => {
        if (r.section !== undefined) {
          const sy = cy + 2
          cy += 20
          return (
            <text key={i} x={x + pad} y={sy} fontSize={10.5} fontWeight={700} fill="#94a3b8" letterSpacing={0.6}>
              {r.section.toUpperCase()}
            </text>
          )
        }
        const t = TONE[r.tone ?? "default"]
        const ry = cy
        cy += 22
        return (
          <g key={i}>
            <text x={x + pad} y={ry} fontSize={12} fill="#64748b">
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

function Pipe({ d, color, arrow = true, dashed = false }: { d: string; color: string; arrow?: boolean; dashed?: boolean }) {
  const id = Object.entries({
    condensat: "#0891b2",
    vapeur: "#ea580c",
    export: "#059669",
    import: "#d97706",
    alert: "#dc2626",
    idle: "#cbd5e1",
  }).find(([, c]) => c === color)?.[0]
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={3}
      strokeLinejoin="round"
      strokeDasharray={dashed ? "8 8" : undefined}
      className={dashed ? "sc-flow" : undefined}
      markerEnd={arrow && id ? `url(#arrow-${id})` : undefined}
    />
  )
}

function Sensor({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={5} fill="#ffffff" stroke="#0f172a" strokeWidth={2} />
}

function Label({ x, y, text, color, anchor = "middle" }: { x: number; y: number; text: string; color: string; anchor?: "start" | "middle" | "end" }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={12} fontWeight={600} fill={color} className="sc-text" style={{ paintOrder: "stroke", stroke: "#ffffff", strokeWidth: 4 }}>
      {text}
    </text>
  )
}

function Chip({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <g className="sc-text">
      <rect x={x - 50} y={y - 12} width={100} height={24} rx={6} fill="#f8fafc" stroke="#94a3b8" />
      <text x={x} y={y + 4} textAnchor="middle" fontSize={11} fill="#334155">
        {text}
      </text>
    </g>
  )
}

function Legend({ x, color, label, dashed = false }: { x: number; color: string; label: string; dashed?: boolean }) {
  return (
    <g transform={`translate(${x},0)`}>
      <line x1={0} y1={0} x2={22} y2={0} stroke={color} strokeWidth={3} strokeDasharray={dashed ? "5 4" : undefined} />
      <text x={30} y={4} fontSize={12} fill="#475569">
        {label}
      </text>
    </g>
  )
}
