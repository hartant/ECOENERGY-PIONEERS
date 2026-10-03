"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"

interface UnitData {
  id: string
  name: string
  status: "running" | "stopped" | "warning"
  power: number
  flow: number
  ph: number
  conductivity: number
  recycledFlow: number
  temperature: number
  pressure: number
}

interface CentralData {
  power: number
  efficiency: number
  vhpFlow: number
  vbpFlow: number
  vhpTemp: number
  vbpTemp: number
  vhpPressure: number
  vbpPressure: number
  returnPh: number
  returnConductivity: number
  returnFlow: number
  returnTemp: number
}

interface SulfuricData {
  power: number
  vhpExport: number
  vbpExport: number
  vhpTemp: number
  vbpTemp: number
  vhpPressure: number
  vbpPressure: number
  emissions: number
}

interface TedData {
  power: number
  stockTotal: number
  prediction24h: number
  recycleRate: number
  treatmentFlow: number
}

export function ProcessDiagram() {
  const [units, setUnits] = useState<UnitData[]>([
    { id: "1", name: "CAP U", status: "running", power: 12.5, flow: 120, ph: 6.8, conductivity: 450, recycledFlow: 65, temperature: 78, pressure: 8.5 },
    { id: "2", name: "CAP V", status: "running", power: 11.2, flow: 110, ph: 7.0, conductivity: 480, recycledFlow: 58, temperature: 75, pressure: 8.2 },
    { id: "3", name: "CAP W", status: "warning", power: 10.8, flow: 105, ph: 6.9, conductivity: 465, recycledFlow: 61, temperature: 76, pressure: 8.3 },
  ])

  const [central, setCentral] = useState<CentralData>({
    power: 44.4,
    efficiency: 94.0,
    vhpFlow: 250,
    vbpFlow: 180,
    vhpTemp: 410,
    vbpTemp: 165,
    vhpPressure: 42.5,
    vbpPressure: 8.1,
    returnPh: 7.39,
    returnConductivity: 520,
    returnFlow: 210,
    returnTemp: 85,
  })

  const [sulfuric, setSulfuric] = useState<SulfuricData>({
    power: 8.3,
    vhpExport: 46,
    vbpExport: 32,
    vhpTemp: 410,
    vbpTemp: 175,
    vhpPressure: 42,
    vbpPressure: 7.5,
    emissions: 12,
  })

  const [ted, setTed] = useState<TedData>({
    power: 2.6,
    stockTotal: 15000,
    prediction24h: 14100,
    recycleRate: 92,
    treatmentFlow: 335,
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setUnits((prev) =>
        prev.map((unit) => ({
          ...unit,
          power: Math.max(8, Math.min(13, unit.power + (Math.random() - 0.5) * 0.5)),
          flow: Math.max(95, Math.min(125, unit.flow + (Math.random() - 0.5) * 3)),
          ph: Math.max(6.5, Math.min(7.5, unit.ph + (Math.random() - 0.5) * 0.2)),
          conductivity: Math.max(400, Math.min(550, unit.conductivity + (Math.random() - 0.5) * 10)),
          recycledFlow: Math.max(50, Math.min(70, unit.recycledFlow + (Math.random() - 0.5) * 2)),
          temperature: Math.max(70, Math.min(85, unit.temperature + (Math.random() - 0.5) * 1.5)),
          pressure: Math.max(7.5, Math.min(9, unit.pressure + (Math.random() - 0.5) * 0.3)),
        }))
      )

      setCentral((prev) => ({
        ...prev,
        power: Math.max(40, Math.min(50, prev.power + (Math.random() - 0.5) * 1)),
        efficiency: Math.max(92, Math.min(96, prev.efficiency + (Math.random() - 0.5) * 0.3)),
        vhpFlow: Math.max(240, Math.min(260, prev.vhpFlow + (Math.random() - 0.5) * 3)),
        vbpFlow: Math.max(170, Math.min(190, prev.vbpFlow + (Math.random() - 0.5) * 2)),
        vhpTemp: prev.vhpTemp + (Math.random() - 0.5) * 5,
        vbpTemp: prev.vbpTemp + (Math.random() - 0.5) * 3,
        vhpPressure: Math.max(40, Math.min(48, prev.vhpPressure + (Math.random() - 0.5) * 1.5)),
        vbpPressure: Math.max(6.5, Math.min(9, prev.vbpPressure + (Math.random() - 0.5) * 0.4)),
      }))

      setTed((prev) => ({
        ...prev,
        power: prev.power + (Math.random() - 0.5) * 0.1,
        stockTotal: prev.stockTotal + (Math.random() - 0.5) * 100,
        prediction24h: prev.prediction24h + (Math.random() - 0.5) * 50,
        treatmentFlow: prev.treatmentFlow + (Math.random() - 0.5) * 10,
      }))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const formatTemp = (value: number | undefined | null) =>
    Number.isFinite(value as number) ? (value as number).toFixed(2) : "0.00"

  return (
    <div className="space-y-6">
      <div className="relative">
        <h2 className="relative text-4xl font-bold bg-gradient-to-r from-cyan-600 via-purple-600 to-amber-600 bg-clip-text text-transparent ">Vue d'ensemble</h2>
        <p className="relative text-slate-700 mt-2 text-lg font-medium">Vue d'ensemble du systeme de production et traitement</p>
      </div>

      {/* Quick Status Bar - Enhanced with gradients and shadows */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-indigo-300 rounded-xl p-4 text-center">
          <p className="text-4xl font-bold text-indigo-700">{central.power.toFixed(1)}</p>
          <p className="text-sm text-slate-700 mt-2 font-semibold">MW Total</p>
        </div>
        <div className="bg-white border-2 border-emerald-300 rounded-xl p-4 text-center">
          <p className="text-4xl font-bold text-emerald-700">{central.efficiency.toFixed(1)}%</p>
          <p className="text-sm text-slate-700 mt-2 font-semibold">Efficacite</p>
        </div>
        <div className="bg-white border-2 border-orange-300 rounded-xl p-4 text-center">
          <p className="text-4xl font-bold text-orange-700">{central.returnFlow.toFixed(0)}</p>
          <p className="text-sm text-slate-700 mt-2 font-semibold">Debit Total T/h</p>
        </div>
        <div className="bg-white border-2 border-cyan-300 rounded-xl p-4 text-center">
          <p className="text-4xl font-bold text-cyan-700">{ted.recycleRate}%</p>
          <p className="text-sm text-slate-700 mt-2 font-semibold">Recyclage</p>
        </div>
      </div>

      {/* MAIN DIAGRAM - CARD-BASED LAYOUT WITH FLOW CONNECTIONS */}
      <div className="relative bg-slate-50 rounded-2xl p-6 border border-slate-200">
        {/* Company Logo/Name in Center */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none">
          <div className="flex flex-col items-center opacity-10">
            <div className="flex items-center gap-4 mb-2">
              {/* Water droplet + lightbulb icon */}
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {/* Lightbulb base */}
                  <rect x="42" y="70" width="16" height="8" fill="#10b981" rx="2"/>
                  <rect x="40" y="78" width="20" height="3" fill="#10b981"/>
                  <rect x="38" y="81" width="24" height="3" fill="#10b981"/>
                  {/* Curved sides like hands */}
                  <path d="M 30 60 Q 25 50 25 40 Q 25 20 35 15" stroke="#10b981" strokeWidth="4" fill="none" strokeLinecap="round"/>
                  <path d="M 70 60 Q 75 50 75 40 Q 75 20 65 15" stroke="#10b981" strokeWidth="4" fill="none" strokeLinecap="round"/>
                  {/* Water droplet */}
                  <ellipse cx="50" cy="35" rx="15" ry="20" fill="#0ea5e9"/>
                  <ellipse cx="47" cy="30" rx="4" ry="6" fill="#38bdf8" opacity="0.6"/>
                </svg>
              </div>
            </div>
            <h1 className="text-6xl font-black text-teal-700 tracking-wider">ECOENERGY</h1>
            <p className="text-4xl font-bold text-teal-700 tracking-widest mt-1">PIONEERS</p>
          </div>
        </div>

        {/* Cards container - 3 column layout */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* LEFT COLUMN: CAP UNITS (Compact Stack) */}
          <div className="space-y-4">
            {/* CAP U */}
            <div className="border-2 border-cyan-300 rounded-xl p-4 bg-white">
              <div className="flex items-center justify-between mb-4 relative">
                <h3 className="text-lg font-bold text-cyan-700 ">CAP U</h3>
                <div className="relative">
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-cyan-400 blur-sm animate-pulse" />
                  <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-lg shadow-cyan-400/80" />
                </div>
              </div>
              
              <div className="space-y-3 relative">
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">Charge</div>
                  <div className="text-2xl font-bold text-cyan-700">{(units[0].power * 10).toFixed(1)}%</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">Puissance</div>
                  <div className="text-xl font-bold text-amber-700">{units[0].power.toFixed(2)} MW</div>
                </div>
                <div className="bg-gradient-to-br from-cyan-50 to-white rounded-lg p-3 border border-cyan-200">
                  <div className="text-xs text-cyan-700 font-semibold mb-2">Recyclage Vapeur BP</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[10px] text-slate-500">pH</div>
                      <div className="text-sm font-bold text-slate-900">{units[0].ph.toFixed(1)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">μS/cm</div>
                      <div className="text-sm font-bold text-slate-900">{(units[0].conductivity).toFixed(0)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">m³/h</div>
                      <div className="text-sm font-bold text-cyan-700">{units[0].recycledFlow.toFixed(1)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CAP V */}
            <div className="border-2 border-cyan-300 rounded-xl p-4 bg-white">
              <div className="flex items-center justify-between mb-4 relative">
                <h3 className="text-lg font-bold text-cyan-700 ">CAP V</h3>
                <div className="relative">
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-cyan-400 blur-sm animate-pulse" />
                  <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-lg shadow-cyan-400/80" />
                </div>
              </div>
              
              <div className="space-y-3 relative">
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">Charge</div>
                  <div className="text-2xl font-bold text-cyan-700">{(units[1].power * 10).toFixed(1)}%</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">Puissance</div>
                  <div className="text-xl font-bold text-amber-700">{units[1].power.toFixed(2)} MW</div>
                </div>
                <div className="bg-gradient-to-br from-cyan-50 to-white rounded-lg p-3 border border-cyan-200">
                  <div className="text-xs text-cyan-700 font-semibold mb-2">Recyclage Vapeur BP</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[10px] text-slate-500">pH</div>
                      <div className="text-sm font-bold text-slate-900">{units[1].ph.toFixed(1)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">μS/cm</div>
                      <div className="text-sm font-bold text-slate-900">{(units[1].conductivity).toFixed(0)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">m³/h</div>
                      <div className="text-sm font-bold text-cyan-700">{units[1].recycledFlow.toFixed(1)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CAP W */}
            <div className="border-2 border-purple-300 rounded-xl p-4 bg-white">
              <div className="flex items-center justify-between mb-4 relative">
                <h3 className="text-lg font-bold text-purple-700 ">CAP W</h3>
                <div className="relative">
                  <div className={`absolute inset-0 w-3 h-3 rounded-full blur-sm animate-pulse ${units[2].status === "warning" ? "bg-yellow-400" : "bg-purple-400"}`} />
                  <div className={`w-3 h-3 rounded-full animate-pulse shadow-lg ${units[2].status === "warning" ? "bg-yellow-400 shadow-yellow-400/80" : "bg-purple-400 shadow-purple-400/80"}`} />
                </div>
              </div>
              
              <div className="space-y-3 relative">
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">Charge</div>
                  <div className="text-2xl font-bold text-purple-700">{(units[2].power * 10).toFixed(1)}%</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">Puissance</div>
                  <div className="text-xl font-bold text-amber-700">{units[2].power.toFixed(2)} MW</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-3 border border-purple-200">
                  <div className="text-xs text-purple-700 font-semibold mb-2">Recyclage Vapeur BP</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[10px] text-slate-500">pH</div>
                      <div className="text-sm font-bold text-slate-900">{units[2].ph.toFixed(1)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">μS/cm</div>
                      <div className="text-sm font-bold text-slate-900">{(units[2].conductivity).toFixed(0)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">m³/h</div>
                      <div className="text-sm font-bold text-purple-700">{units[2].recycledFlow.toFixed(1)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CENTER COLUMN: CENTRALE THERMIQUE */}
          <div className="border-2 border-sky-300 rounded-xl p-5 bg-white lg:col-span-1">
            <div className="flex items-center justify-between mb-4 relative">
              <h3 className="text-base font-bold text-sky-700 ">CENTRALE THERMIQUE</h3>
              <div className="relative">
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-cyan-400 blur-sm animate-pulse" />
                <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-lg shadow-cyan-400/80" />
              </div>
            </div>

            <div className="space-y-3 relative">
              <div className="bg-gradient-to-br from-sky-50 to-white rounded-lg p-4 border border-sky-200">
                <div className="text-xs text-slate-600 mb-2">Charge</div>
                <div className="text-4xl font-bold text-cyan-700">{(central.power / 50 * 100).toFixed(0)}%</div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-white rounded-lg p-4 border border-amber-200">
                <div className="text-xs text-slate-600 mb-2">Puissance</div>
                <div className="text-3xl font-bold text-amber-700">{central.power.toFixed(2)} MW</div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg p-4 border border-emerald-200">
                <div className="text-xs text-slate-600 mb-2">Efficacite IA</div>
                <div className="text-3xl font-bold text-emerald-700">{central.efficiency.toFixed(1)}%</div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-white rounded-lg p-3 border border-orange-200 text-center">
                <div className="text-xs text-slate-600 mb-1">Temperature</div>
                <div className="text-2xl font-bold text-orange-700">{formatTemp(central.vhpTemp)}°C</div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-3 border border-purple-200">
                <div className="text-xs text-purple-700 font-semibold mb-3">Retour Condensat - Sulfurique</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white rounded p-2 text-center">
                    <div className="text-[10px] text-slate-500">pH</div>
                    <div className="text-sm font-bold text-emerald-700">{central.returnPh.toFixed(1)}</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="text-[10px] text-slate-500">Cond.</div>
                    <div className="text-sm font-bold text-blue-700">{central.returnConductivity.toFixed(0)}</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="text-[10px] text-slate-500">Debit</div>
                    <div className="text-sm font-bold text-cyan-700">{central.returnFlow.toFixed(0)}</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="text-[10px] text-slate-500">Temp</div>
                    <div className="text-sm font-bold text-red-700">{central.returnTemp}°C</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: SULFURIQUE & TED (Stacked) */}
          <div className="space-y-4 lg:col-span-2">
            {/* Unite Sulfurique */}
            <div className="border-2 border-orange-300 rounded-xl p-4 bg-white">
              <div className="flex items-center justify-between mb-4 relative">
                <h3 className="text-base font-bold text-orange-700 ">UNITE SULFURIQUE</h3>
                <div className="relative">
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-yellow-400 blur-sm animate-pulse" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse shadow-lg shadow-yellow-400/80" />
                </div>
              </div>

              <div className="space-y-3 relative">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">Charge</div>
                    <div className="text-2xl text-orange-700 font-bold">{(sulfuric.power / 10 * 100).toFixed(0)}%</div>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">Temperature</div>
                    <div className="text-2xl text-orange-700 font-bold">{sulfuric.vhpTemp}°C</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-white rounded-lg p-3 border border-orange-200">
                  <div className="text-xs text-orange-700 font-semibold mb-3">Export Vapeur:</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-red-50 to-white rounded-lg p-3 border border-red-200">
                      <div className="text-xs text-slate-500 mb-1">VHP Export</div>
                      <div className="text-xl text-red-700 font-bold">{sulfuric.vhpExport.toFixed(0)} T/h</div>
                      <div className="text-xs text-orange-700 mt-1">{sulfuric.vhpTemp}°C</div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-white rounded-lg p-3 border border-amber-200">
                      <div className="text-xs text-slate-500 mb-1">VBP Export</div>
                      <div className="text-xl text-amber-700 font-bold">{sulfuric.vbpExport.toFixed(0)} T/h</div>
                      <div className="text-xs text-amber-700 mt-1">{sulfuric.vbpTemp}°C</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Traitement Eau TED */}
            <div className="border-2 border-cyan-300 rounded-xl p-4 bg-white">
              <div className="flex items-center justify-between mb-4 relative">
                <h3 className="text-base font-bold text-cyan-700 ">TRAITEMENT TED</h3>
                <div className="relative">
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-cyan-400 blur-sm animate-pulse" />
                  <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-lg shadow-cyan-400/80" />
                </div>
              </div>

              <div className="space-y-3 relative">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">Charge</div>
                    <div className="text-2xl text-cyan-700 font-bold">{(ted.power / 3 * 100).toFixed(0)}%</div>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">Debit Entree</div>
                    <div className="text-xl text-cyan-700 font-bold">{(ted.treatmentFlow * 2).toFixed(0)} m³/h</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">Debit Sortie</div>
                    <div className="text-lg text-cyan-700 font-bold">{ted.treatmentFlow.toFixed(0)} m³/h</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-3 border border-purple-200">
                    <div className="text-xs text-slate-500 mb-1">Gestion Stock IA</div>
                    <div className="text-xl text-purple-700 font-bold">✓</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-white to-slate-50 rounded-lg p-3 border border-slate-300 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Stock Actuel:</span>
                    <span className="text-slate-900 font-semibold">{(ted.stockTotal).toFixed(0)} m³</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Prevision IA 24h:</span>
                    <span className="text-purple-700 font-semibold">{(ted.prediction24h).toFixed(0)} m³</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg p-3 border border-emerald-200 text-center">
                  <div className="text-xs text-slate-600 mb-1">Taux Recyclage</div>
                  <div className="text-3xl text-emerald-700 font-bold">{ted.recycleRate}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM LEGEND - INFO FOOTER */}
      <div className="border-t border-slate-200 pt-6 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-white border border-cyan-200">
            <div className="text-cyan-700 text-xl">💧</div>
            <div className="text-xs">
              <p className="font-bold text-cyan-700">Capteurs Qualite</p>
              <p className="text-slate-600">pH, Conductivite, Debit pour chaque unite</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 rounded-lg bg-white border border-orange-200">
            <div className="text-orange-700 text-xl">🔥</div>
            <div className="text-xs">
              <p className="font-bold text-orange-700">Export Vapeur</p>
              <p className="text-slate-600">VHP/VBP avec debits et temperatures</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-white border border-purple-200">
            <div className="text-purple-700 text-xl">🤖</div>
            <div className="text-xs">
              <p className="font-bold text-purple-700">Prediction IA</p>
              <p className="text-slate-600">Stock TED avec prevision 24h</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-white border border-emerald-200">
            <div className="text-emerald-700 text-xl">⚡</div>
            <div className="text-xs">
              <p className="font-bold text-emerald-700">Temps Reel</p>
              <p className="text-slate-600">Mise a jour toutes les 2 secondes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
