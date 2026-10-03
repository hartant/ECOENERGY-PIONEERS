"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, Pause, Square, Info, Zap, Activity, Gauge, Thermometer, AlertCircle, Power } from "lucide-react"

interface UnitControl {
  id: string
  name: string
  type: string
  status: "running" | "paused" | "stopped"
  power: number
  charge: number
  consommation: number
  temperature: number
  pression: number
}

export function ProductionPanel() {
  const [autoMode, setAutoMode] = useState(true)
  const [units, setUnits] = useState<UnitControl[]>([
    { 
      id: "elec", 
      name: "Énergie Électrique", 
      type: "Production Principale",
      status: "running", 
      power: 42.5, 
      charge: 72,
      consommation: 95,
      temperature: 425,
      pression: 8.2
    },
    { 
      id: "ted", 
      name: "Traitement Eau TED", 
      type: "Épuration",
      status: "running", 
      power: 2.5, 
      charge: 65,
      consommation: 88,
      temperature: 298,
      pression: 4.5
    },
  ])

  const handleControl = (unitId: string, action: "start" | "pause" | "stop") => {
    setUnits((prev) =>
      prev.map((unit) => {
        if (unit.id === unitId) {
          switch (action) {
            case "start":
              return { 
                ...unit, 
                status: "running", 
                power: unit.id === "elec" ? 42.5 : 2.5,
                charge: 75 + Math.random() * 20,
                consommation: 85 + Math.random() * 15,
                temperature: unit.id === "elec" ? 425 : 300,
                pression: unit.id === "elec" ? 8 : 5
              }
            case "pause":
              return { ...unit, status: "paused", power: 0, charge: 0, consommation: 0 }
            case "stop":
              return { 
                ...unit, 
                status: "stopped", 
                power: 0, 
                charge: 0, 
                consommation: 0,
                temperature: 180 + Math.random() * 20,
                pression: 2 + Math.random() * 0.5
              }
            default:
              return unit
          }
        }
        return unit
      }),
    )
  }

  const handleEmergencyStop = () => {
    setUnits((prev) => prev.map((unit) => ({
      ...unit,
      status: "stopped",
      power: 0,
      charge: 0,
      consommation: 0,
      temperature: 180 + Math.random() * 20,
      pression: 2 + Math.random() * 0.5
    })))
  }

  const handleStartAll = () => {
    setUnits((prev) => prev.map((unit) => ({
      ...unit,
      status: "running",
      power: unit.id === "elec" ? 42.5 : 2.5,
      charge: 75 + Math.random() * 20,
      consommation: 85 + Math.random() * 15,
      temperature: unit.id === "elec" ? 425 : 300,
      pression: unit.id === "elec" ? 8 : 5
    })))
  }

  const activeUnits = units.filter(u => u.status === "running").length
  const totalProduction = units.filter(u => u.status === "running").reduce((sum, u) => sum + u.power, 0)
  const averageCharge = units.filter(u => u.status === "running").reduce((sum, u) => sum + u.charge, 0) / (activeUnits || 1)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">En marche</Badge>
      case "paused":
        return <Badge className="bg-amber-100 text-amber-700 border-amber-300">En pause</Badge>
      case "stopped":
        return <Badge className="bg-red-100 text-red-700 border-red-300">Arrêt</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-600 border-slate-300">Inconnu</Badge>
    }
  }

  const getChargeBarColor = (charge: number) => {
    if (charge >= 80) return "from-emerald-500 to-cyan-500"
    if (charge >= 50) return "from-amber-500 to-yellow-500"
    return "from-red-500 to-amber-500"
  }

  const getTemperatureStatus = (temp: number, status: string) => {
    if (status !== "running") return "text-slate-500"
    if (temp > 450) return "text-amber-700"
    return "text-emerald-700"
  }

  const getPressionStatus = (pression: number, status: string) => {
    if (status !== "running") return "text-slate-500"
    if (pression > 10) return "text-amber-700"
    return "text-cyan-700"
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Contrôle de Production</h2>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 shadow-lg shadow-blue-500/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 text-sm">Unités Actives</p>
              <Activity className="w-5 h-5 text-blue-700" />
            </div>
            <p className="text-4xl font-bold text-blue-700">{activeUnits}<span className="text-xl text-slate-600">/2</span></p>
            <div className="flex items-center gap-1 mt-2 text-xs text-slate-600">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Opérationnelles
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-white border-2 border-yellow-200 shadow-lg shadow-yellow-500/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 text-sm">Production Totale</p>
              <Zap className="w-5 h-5 text-yellow-700" />
            </div>
            <p className="text-4xl font-bold text-yellow-700">{totalProduction.toFixed(1)}<span className="text-xl text-slate-600"> MW</span></p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-200 shadow-lg shadow-emerald-500/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 text-sm">Charge Moyenne</p>
              <Gauge className="w-5 h-5 text-emerald-700" />
            </div>
            <p className="text-4xl font-bold text-emerald-700">{averageCharge.toFixed(0)}%</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-white border-2 border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 text-sm">Contrôles Globaux</p>
              <Power className="w-5 h-5 text-slate-600" />
            </div>
            <div className="flex flex-col gap-2 mt-2">
              <Button
                size="sm"
                className="bg-red-100 text-red-700 border border-red-300 hover:bg-red-100"
                onClick={handleEmergencyStop}
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Arrêt d'Urgence
              </Button>
              <Button
                size="sm"
                className="bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
                onClick={handleStartAll}
              >
                <Play className="w-4 h-4 mr-2" />
                Démarrer Tout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unit Details */}
      <div className="space-y-4">
        {units.map((unit) => (
          <Card
            key={unit.id}
            className="bg-white border-slate-200 hover:border-slate-200 transition-all duration-300 hover:shadow-lg"
          >
            <CardContent className="p-6">
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 min-w-0">
                <div className="flex items-start sm:items-center gap-4 min-w-0">
                  <div className="flex flex-col">
                    <h3 className="text-xl font-bold text-slate-900">{unit.name}</h3>
                    <p className="text-sm text-slate-600">{unit.type}</p>
                  </div>
                  {getStatusBadge(unit.status)}
                </div>
                {unit.status === "running" && (
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-700" />
                    <span className="text-2xl font-bold text-yellow-700">{unit.power.toFixed(1)} MW</span>
                  </div>
                )}
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
                {/* Charge with Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 text-sm flex items-center gap-2">
                      <Gauge className="w-4 h-4" />
                      Charge
                    </span>
                    <span className="text-slate-900 font-bold">{unit.charge.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`bg-gradient-to-r ${getChargeBarColor(unit.charge)} h-3 rounded-full transition-all duration-500`}
                      style={{ width: `${unit.charge}%` }}
                    />
                  </div>
                </div>

                {/* Consommation */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 text-sm flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Consommation
                    </span>
                    <span className={`font-bold ${unit.status === "running" ? "text-cyan-700" : "text-slate-500"}`}>
                      {unit.consommation.toFixed(0)}%
                    </span>
                  </div>
                  {/* concise */}
                </div>

                {/* Temperature */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 text-sm flex items-center gap-2">
                      <Thermometer className="w-4 h-4" />
                      Température
                    </span>
                    <span className={`font-bold ${getTemperatureStatus(unit.temperature, unit.status)}`}>
                      {unit.temperature.toFixed(0)}°C
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{unit.status === "running" ? "Surveillance" : "Refroidissement"}</p>
                </div>

                {/* Pression */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 text-sm flex items-center gap-2">
                      <Gauge className="w-4 h-4" />
                      Pression
                    </span>
                    <span className={`font-bold ${getPressionStatus(unit.pression, unit.status)}`}>
                      {unit.pression.toFixed(1)} bar
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{unit.status === "running" ? "Pression en ligne" : "Basse"}</p>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <Button
                  size="sm"
                  className="flex-1 bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
                  onClick={() => handleControl(unit.id, "start")}
                  disabled={unit.status === "running"}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Démarrer
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-100"
                  onClick={() => handleControl(unit.id, "pause")}
                  disabled={unit.status !== "running"}
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-red-100 text-red-700 border border-red-300 hover:bg-red-100"
                  onClick={() => handleControl(unit.id, "stop")}
                  disabled={unit.status === "stopped"}
                >
                  <Square className="w-4 h-4 mr-2" />
                  Arrêter
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-100"
                >
                  <Info className="w-4 h-4 mr-2" />
                  Détails
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
