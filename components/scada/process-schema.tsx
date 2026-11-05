"use client"

import { useDashboard } from "@/context/dashboard-context"
import { fmt, useLive } from "@/lib/api"
import { ApiError, ReplayChip } from "./data-source"

/* ------------------------------------------------------------------ */
/* Schéma procédé : la vraie topologie du site, alimentée par /api/live */
/*                                                                      */
/*  Eau dessalée → TED ─WDS→ Unité sulfurique ─VHP→ Centrale (GTA)      */
/*                  ├─WDS→ Centrale     Vapeur MC ↗     ├─BP→ CAP X…T   */
/*                  └─WDS→ Maroc Chimie                 ├─élec→ réseau  */
/*                          condensat → retour vers TED ┘               */
/* ------------------------------------------------------------------ */

const CAPS = ["x", "y", "u", "v", "t"] as const

export function ProcessSchema() {
  const { anomalyActive, setAnomalyActive } = useDashboard()
  const { data: live, error } = useLive()

  if (!live) return error ? <ApiError error={error} /> : <p className="text-sm text-slate-500">Chargement des données…</p>

  const v = live.values
  const val = (k: string) => v[k]?.value ?? null
  const flows = (k: string) => (val(k) ?? 0) > 0
  const txt = (k: string, digits = 1) => (val(k) === null ? "—" : `${fmt(val(k), digits)} ${v[k].unit}`)
  const row = (label: string, k: string, digits = 1, tone?: Tone): Row => ({
    label,
    value: txt(k, digits),
    sim: v[k]?.source === "simulated",
    tone: v[k]?.status === "hors_cible" ? "alert" : tone,
  })

  const steamAlert = anomalyActive === "uncomfortable-steam"
  const leakAlert = anomalyActive === "water-leak"
  const gta3On = flows("prod_gta3_mw")
  const achats = (val("recu_mc_mw") ?? 0) + (val("recu_onee_mw") ?? 0)
  const C = SC

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Schéma Procédé</h1>
          <p className="text-sm text-slate-500">Flux réels du jour rejoué · eau, vapeur et électricité · « SIM » = valeur simulée</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReplayChip replay={live.replay} />
          {/* Démonstration de la chaîne d'alerte (notification + email) : sera remplacée par la détection automatique */}
          <span className="text-xs font-medium text-slate-500">Démo alerte</span>
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
                onClick={() => setAnomalyActive(mode)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${anomalyActive === mode ? `${activeBg} text-white shadow-sm` : "text-slate-600 hover:bg-slate-100"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 shadow-sm overflow-x-auto">
        <svg viewBox="0 0 1400 830" className="w-full" style={{ minWidth: 1000 }} role="img" aria-label="Schéma procédé du site Utilités">
          <defs>
            {Object.entries(C).map(([k, color]) => (
              <marker key={k} id={`arrow-${k}`} markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0, 12 6, 0 12" fill={color} />
              </marker>
            ))}
          </defs>

          {/* Légende */}
          <g transform="translate(40, 26)" className="sc-text">
            <Legend x={0} color={C.eau} label="Eau / condensat" />
            <Legend x={150} color={C.vapeur} label="Vapeur" />
            <Legend x={240} color={C.elec} label="Électricité produite" />
            <Legend x={420} color={C.achat} label="Électricité achetée" dashed />
            <g transform="translate(600,0)">
              <circle cx={0} cy={0} r={5} fill="var(--color-white)" stroke="var(--color-slate-900)" strokeWidth={2} />
              <text x={12} y={4} fontSize={12} fill="var(--color-slate-600)">Point de mesure</text>
            </g>
          </g>

          {/* ===== Conduites (dessinées d'abord, les unités passent par-dessus) ===== */}

          {/* Centrale → collecteur BP → lignes CAP */}
          <Pipe d="M 450 330 V 235" color={C.vapeur} arrow={false} idle={!flows("soutirage_bp_t_h")} />
          <Pipe d="M 120 235 H 800" color={C.vapeur} arrow={false} idle={!flows("soutirage_bp_t_h")} />
          {CAPS.map((c, i) => (
            <Pipe key={c} d={`M ${120 + i * 170} 235 V 184`} color={C.vapeur} idle={!flows(`cap_${c}_bp_t_h`)} />
          ))}
          <Label x={460} y={262} anchor="start" text={`Vapeur BP soutirée : ${txt("soutirage_bp_t_h")}`} color={C.vapeur} />
          <Sensor x={450} y={290} />

          {/* GTA3 → réseau électrique du site */}
          <Pipe d="M 630 370 H 900 V 160 H 1038" color={C.elec} idle={!gta3On} />
          <Label x={645} y={360} anchor="start" text={`Production GTA3 : ${txt("prod_gta3_mw", 2)}`} color={gta3On ? C.elec : "var(--color-slate-400)"} />
          <Chip x={900} y={300} text="Compteur" />

          {/* Achats : Maroc Chimie et ONEE → réseau du site */}
          <Pipe d="M 1120 12 V 58" color={C.achat} idle={!flows("recu_mc_mw")} />
          <Label x={1112} y={28} anchor="end" text={`Maroc Chimie ${txt("recu_mc_mw", 2)}`} color={C.achat} />
          <Pipe d="M 1290 12 V 58" color={C.achat} idle={!flows("recu_onee_mw")} />
          <Label x={1282} y={28} anchor="end" text={`ONEE ${txt("recu_onee_mw", 2)}`} color={C.achat} />

          {/* Réseau du site → consommateurs */}
          <Pipe d="M 1200 292 V 330" color={C.elec} />
          <Chip x={1200} y={344} text={`Usine : ${txt("conso_usine_mw", 1)}`} w={170} />

          {/* Unité sulfurique → centrale (VHP) */}
          <Pipe d="M 1038 450 H 632" color={steamAlert ? C.alert : C.vapeur} idle={!flows("vhp_gta3_t_h")} fast={steamAlert} />
          <Label x={835} y={440} text={`VHP : ${txt("vhp_gta3_t_h")}`} color={steamAlert ? C.alert : C.vapeur} />
          <Sensor x={760} y={450} />

          {/* Maroc Chimie → centrale (vapeur 8,5 bar) */}
          <Pipe d="M 600 650 V 602" color={C.vapeur} idle={!flows("vapeur_recue_mc_t_h")} />
          <Label x={612} y={630} anchor="start" text={`Vapeur reçue : ${txt("vapeur_recue_mc_t_h")}`} color={C.vapeur} />

          {/* Eau dessalée → TED */}
          <Pipe d="M 100 400 V 618" color={C.eau} idle={!flows("eau_dessalee_m3_h")} />
          <Label x={110} y={392} anchor="start" text={`Eau dessalée : ${txt("eau_dessalee_m3_h", 0)}`} color={C.eau} />

          {/* TED → centrale (WDS chaudières) */}
          <Pipe d="M 270 618 V 500 H 298" color={leakAlert ? C.alert : C.eau} idle={!flows("wds_vers_centrale_m3_h")} fast={leakAlert} />
          <Label x={278} y={490} anchor="end" text={`WDS ${txt("wds_vers_centrale_m3_h", 0)}`} color={leakAlert ? C.alert : C.eau} />

          {/* Centrale → retour condensat vers TED */}
          <Pipe d="M 300 560 H 200 V 618" color={steamAlert ? C.alert : C.eau} idle={!flows("condensat_gta3_m3_h")} />
          <Label x={196} y={552} anchor="end" text={`Condensat ${txt("condensat_gta3_m3_h")}`} color={steamAlert ? C.alert : C.eau} />
          <Sensor x={240} y={560} />

          {/* TED → Maroc Chimie (WDS) */}
          <Pipe d="M 342 710 H 478" color={C.eau} idle={!flows("wds_vers_mc_m3_h")} />
          <Label x={410} y={700} text={`WDS ${txt("wds_vers_mc_m3_h", 0)}`} color={C.eau} />

          {/* TED → unité sulfurique (WDS chaudières de récupération) */}
          <Pipe d="M 190 792 V 812 H 1300 V 572" color={leakAlert ? C.alert : C.eau} idle={!flows("wds_vers_sulfurique_m3_h")} fast={leakAlert} />
          <Label x={900} y={804} text={`WDS vers sulfurique : ${txt("wds_vers_sulfurique_m3_h", 1)}`} color={leakAlert ? C.alert : C.eau} />
          <Sensor x={1300} y={700} />

          {/* ===== Unités ===== */}

          {CAPS.map((c, i) => (
            <UnitBox
              key={c}
              x={40 + i * 170}
              y={74}
              w={160}
              h={110}
              title={`CAP ${c.toUpperCase()}`}
              rows={[row("BP", `cap_${c}_bp_t_h`), { label: "État", value: flows(`cap_${c}_bp_t_h`) ? "En marche" : "À l'arrêt", tone: flows(`cap_${c}_bp_t_h`) ? "ok" : undefined }]}
            />
          ))}
          <text x={40} y={66} fontSize={11} fontWeight={700} fill="var(--color-slate-500)" letterSpacing={0.6} className="sc-text">
            CONCENTRATION D'ACIDE PHOSPHORIQUE · ACP produit : {txt("acp_t_p2o5", 0)}
          </text>

          <UnitBox
            x={300}
            y={330}
            w={330}
            h={272}
            title="CENTRALE (GTA)"
            alert={steamAlert ? "Écart vapeur / condensat" : undefined}
            rows={[
              { label: "GTA1", value: (val("dispo_gta1_pct") ?? 0) > 0 ? "En marche" : "À l'arrêt", tone: (val("dispo_gta1_pct") ?? 0) > 0 ? "ok" : "warn" },
              { label: "GTA2", value: (val("dispo_gta2_pct") ?? 0) > 0 ? "En marche" : "À l'arrêt", tone: (val("dispo_gta2_pct") ?? 0) > 0 ? "ok" : "warn" },
              row("GTA3 · puissance", "prod_gta3_mw", 2, "big"),
              row("Température VHP", "temperature_vhp_c"),
              row("Pression VHP", "pression_vhp_bar"),
              row("Consommation spécifique", "cs_vhp_t_par_mwh", 2, "ok"),
              row("Température condensat", "temperature_condensat_c"),
              { label: "Disponibilité GTA3", value: `${fmt(val("dispo_gta3_pct"), 0)} %` },
              {
                label: "Sortie BP + condensat",
                value: `${fmt((val("soutirage_bp_t_h") ?? 0) + (val("condensat_gta3_m3_h") ?? 0))} t/h`,
              },
            ]}
          />

          <UnitBox
            x={1040}
            y={60}
            w={320}
            h={232}
            title="RÉSEAU ÉLECTRIQUE DU SITE"
            rows={[
              row("Production GTA3", "prod_gta3_mw", 2),
              row("Reçu de Maroc Chimie", "recu_mc_mw", 2),
              row("Reçu de l'ONEE", "recu_onee_mw", 2),
              row("Consommation du site", "conso_usine_mw", 2, "big"),
              row("Autonomie", "taux_couverture_pct", 1, "ok"),
              { label: "Coût des achats du jour", value: `${fmt(val("recu_montant_dh"), 0)} DH`, tone: "warn" },
            ]}
          />
          <g className="sc-text">
            <rect x={1220} y={262} width={124} height={22} rx={11} fill={achats > 0 ? C.achat : C.elec} />
            <text x={1282} y={277} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-white)" letterSpacing={0.5}>
              {achats > 0 ? "IMPORTATION" : "AUTONOME"}
            </text>
          </g>

          <UnitBox
            x={1040}
            y={402}
            w={320}
            h={170}
            title="UNITÉ SULFURIQUE"
            rows={[
              { section: "Vapeur produite (chaleur de réaction)" },
              row("VHP vers GTA3", "vhp_gta3_t_h"),
              row("Température VHP", "temperature_vhp_c"),
              row("Pression VHP", "pression_vhp_bar"),
              row("WDS reçue", "wds_vers_sulfurique_m3_h"),
            ]}
          />

          <UnitBox
            x={40}
            y={620}
            w={300}
            h={172}
            title="TRAITEMENT DES EAUX (TED)"
            alert={leakAlert ? "Fuite détectée" : undefined}
            rows={[
              row("Eau dessalée reçue", "eau_dessalee_m3_h", 0),
              row("Production WDS", "wds_production_m3_h", 1, leakAlert ? "alert" : "ok"),
              row("Consommation WDS", "wds_consommation_m3_h", 1),
              row("Stock WDS", "stock_wds_sulfurique_m3", 0),
            ]}
          />

          <UnitBox
            x={480}
            y={650}
            w={250}
            h={120}
            title="MAROC CHIMIE (voisin)"
            rows={[row("Électricité fournie", "recu_mc_mw", 2), row("Vapeur fournie", "vapeur_recue_mc_t_h"), row("WDS reçue", "wds_vers_mc_m3_h", 0)]}
          />
        </svg>
      </div>
    </div>
  )
}

/* ---------- Helpers for the SVG schema ---------- */

type Tone = "big" | "ok" | "warn" | "alert"
type Row =
  | { label: string; value: string; tone?: Tone; sim?: boolean; section?: undefined }
  | { section: string; label?: undefined; value?: undefined; tone?: undefined; sim?: undefined }

const TONE: Record<string, { fill: string; size: number; weight: number }> = {
  big: { fill: "var(--color-slate-900)", size: 15, weight: 700 },
  ok: { fill: "var(--color-emerald-700)", size: 13, weight: 600 },
  warn: { fill: "var(--color-amber-700)", size: 13, weight: 700 },
  alert: { fill: "var(--color-red-600)", size: 13, weight: 700 },
  default: { fill: "var(--color-slate-700)", size: 13, weight: 500 },
}

function UnitBox({ x, y, w, h, title, rows, alert }: { x: number; y: number; w: number; h: number; title: string; rows: Row[]; alert?: string }) {
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
              {r.sim && (
                <tspan dx={6} fontSize={9} fontWeight={700} fill="var(--color-violet-600)">
                  SIM
                </tspan>
              )}
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
  eau: "var(--color-cyan-600)",
  vapeur: "var(--color-orange-600)",
  elec: "var(--color-emerald-600)",
  achat: "var(--color-amber-600)",
  alert: "var(--color-red-600)",
  idle: "var(--color-slate-300)",
}

/**
 * A process line. The faint wide stroke is the pipe body; the dashed stroke on top
 * moves along the path direction (stroke-dashoffset animation) so the flow is visible.
 * `idle` = nothing flowing (real value is 0 or missing): a static grey dashed line.
 */
function Pipe({ d, color, arrow = true, idle = false, fast = false }: { d: string; color: string; arrow?: boolean; idle?: boolean; fast?: boolean }) {
  const c = idle ? SC.idle : color
  const id = (Object.keys(SC) as (keyof typeof SC)[]).find((k) => SC[k] === c)
  const marker = arrow && id ? `url(#arrow-${id})` : undefined
  if (idle) {
    return <path d={d} fill="none" stroke={c} strokeWidth={2.5} strokeDasharray="6 8" strokeLinejoin="round" markerEnd={marker} />
  }
  return (
    <g>
      <path d={d} fill="none" stroke={c} strokeOpacity={0.18} strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" />
      <path d={d} fill="none" stroke={c} strokeOpacity={0.55} strokeWidth={2} strokeLinejoin="round" />
      <path d={d} fill="none" stroke={c} strokeWidth={4} strokeLinejoin="round" className={fast ? "flow flow-fast" : "flow"} markerEnd={marker} />
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

function Chip({ x, y, text, w = 100 }: { x: number; y: number; text: string; w?: number }) {
  return (
    <g className="sc-text">
      <rect x={x - w / 2} y={y - 12} width={w} height={24} rx={6} fill="var(--color-slate-50)" stroke="var(--color-slate-400)" />
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
