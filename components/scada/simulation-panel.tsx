"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Droplets,
  Thermometer,
  Gauge,
  TrendingUp,
  Factory,
  Flame,
  Beaker,
  Activity,
  AlertCircle,
} from "lucide-react"
import { useDashboard } from "@/context/dashboard-context"

// Input parameters that user can control
interface InputParameters {
  capU: { active: boolean; steamFlow: number; waterInput: number }
  capV: { active: boolean; steamFlow: number; waterInput: number }
  capW: { active: boolean; steamFlow: number; waterInput: number }
  centralThermal: { active: boolean; targetTemp: number; pressure: number }
  sulfuric: { active: boolean; productionRate: number }
  ted: { active: boolean; treatmentCapacity: number; recycleTarget: number }
}

// Calculated outputs based on inputs
interface CalculatedOutputs {
  totalPower: number
  totalWaterConsumption: number
  efficiency: number
  dailyCost: number
  vhpFlow: number
  vbpFlow: number
  co2Emissions: number
  waterRecycled: number
  phEstimate: number
  conductivityEstimate: number
}

interface UnitState {
  name: string
  status: "running" | "stopped"
  charge: number
  temperature?: number
  debitHot?: number
  debit?: number
  pression?: number
  basePression?: number
  stockTotal?: number
  stockPercentage?: number
}

export function SimulationPanel() {
  const { dataMultiplier } = useDashboard()
  const [isRunning, setIsRunning] = useState(false)

  // Input parameters (user-controlled)
  const [inputs, setInputs] = useState<InputParameters>({
    capU: { active: true, steamFlow: 0, waterInput: 0 },
    capV: { active: true, steamFlow: 0, waterInput: 0 },
    capW: { active: false, steamFlow: 0, waterInput: 0 },
    centralThermal: { active: true, targetTemp: 0, pressure: 0 },
    sulfuric: { active: true, productionRate: 0 },
    ted: { active: true, treatmentCapacity: 0, recycleTarget: 0 },
  })

  // Calculated outputs (derived from inputs)
  const [outputs, setOutputs] = useState<CalculatedOutputs>({
    totalPower: 0,
    totalWaterConsumption: 0,
    efficiency: 0,
    dailyCost: 0,
    vhpFlow: 0,
    vbpFlow: 0,
    co2Emissions: 0,
    waterRecycled: 0,
    phEstimate: 7.0,
    conductivityEstimate: 400,
  })

  // Unit states
  const [units, setUnits] = useState<Record<string, UnitState>>({
    capU: {
      name: "CAP U",
      status: "running",
      charge: 118.5,
      temperature: 65,
      debit: 63.1,
      pression: 4.2,
    },
    capV: {
      name: "CAP V",
      status: "running",
      charge: 113.6,
      temperature: 68,
      debit: 56.6,
      pression: 4.5,
    },
    capW: {
      name: "CAP W",
      status: "running",
      charge: 113.4,
      temperature: 62,
      debit: 61.4,
      pression: 4.1,
    },
    sulfurique: {
      name: "Unité Sulfurique",
      status: "running",
      charge: 83,
      temperature: 410,
      debitHot: 46,
      pression: 8.2,
    },
    ted: {
      name: "Traitement Eau (TED)",
      status: "running",
      charge: 86,
      stockTotal: 15125,
      stockPercentage: 86,
    },
  })

  // Calculate outputs based on inputs
  const calculateOutputs = useCallback((params: InputParameters): CalculatedOutputs => {
    // Active units
    const activeUnits = [
      params.capU.active ? params.capU : null,
      params.capV.active ? params.capV : null,
      params.capW.active ? params.capW : null,
    ].filter(Boolean)

    const numActiveUnits = activeUnits.length

    // Power calculation: base power per unit + steam flow contribution
    const capUPower = params.capU.active ? 8 + params.capU.steamFlow * 0.05 : 0
    const capVPower = params.capV.active ? 7.5 + params.capV.steamFlow * 0.048 : 0
    const capWPower = params.capW.active ? 7 + params.capW.steamFlow * 0.045 : 0
    const centralPower = params.centralThermal.active
      ? params.centralThermal.pressure * 0.3 + params.centralThermal.targetTemp * 0.02
      : 0
    const sulfuricPower = params.sulfuric.active ? params.sulfuric.productionRate * 0.1 : 0
    const tedPower = params.ted.active ? params.ted.treatmentCapacity * 0.008 : 0

    const totalPower = capUPower + capVPower + capWPower + centralPower + sulfuricPower + tedPower

    // Water consumption: sum of inputs minus recycled
    const totalWaterInput =
      (params.capU.active ? params.capU.waterInput : 0) +
      (params.capV.active ? params.capV.waterInput : 0) +
      (params.capW.active ? params.capW.waterInput : 0)

    const waterRecycled = params.ted.active ? (totalWaterInput * params.ted.recycleTarget) / 100 : 0
    const totalWaterConsumption =
      totalWaterInput - waterRecycled + (params.ted.active ? params.ted.treatmentCapacity * 0.1 : 0)

    // VHP/VBP flow based on steam flows and temperature
    const totalSteamFlow =
      (params.capU.active ? params.capU.steamFlow : 0) +
      (params.capV.active ? params.capV.steamFlow : 0) +
      (params.capW.active ? params.capW.steamFlow : 0)

    const vhpFlow = params.centralThermal.active ? totalSteamFlow * 0.55 * (params.centralThermal.pressure / 50) : 0
    const vbpFlow = params.centralThermal.active ? totalSteamFlow * 0.35 * (params.centralThermal.pressure / 50) : 0

    // Efficiency: based on temperature, pressure, and active units
    const tempEfficiency = params.centralThermal.active
      ? Math.min(100, (params.centralThermal.targetTemp / 450) * 100)
      : 0
    const pressureEfficiency = params.centralThermal.active
      ? Math.min(100, (params.centralThermal.pressure / 50) * 100)
      : 0
    const unitEfficiency = numActiveUnits > 0 ? (numActiveUnits / 3) * 100 : 0
    const recycleEfficiency = params.ted.active ? params.ted.recycleTarget : 0
    const efficiency =
      tempEfficiency * 0.3 + pressureEfficiency * 0.25 + unitEfficiency * 0.25 + recycleEfficiency * 0.2

    // Daily cost in DH
    const energyCost = totalPower * 850 // DH per MW
    const waterCost = totalWaterConsumption * 12 // DH per m³
    const productionCost = params.sulfuric.active ? params.sulfuric.productionRate * 150 : 0
    const dailyCost = (energyCost + waterCost + productionCost) * 24

    // CO2 emissions (inversely related to efficiency and recycle rate)
    const co2Emissions = Math.max(0, 25 - efficiency * 0.15 - (params.ted.active ? params.ted.recycleTarget * 0.05 : 0))

    // pH estimate: affected by sulfuric production and treatment
    const phEstimate =
      7.0 +
      (params.ted.active ? params.ted.treatmentCapacity / 1000 : 0) -
      (params.sulfuric.active ? params.sulfuric.productionRate / 200 : 0)

    // Conductivity: affected by water flow and recycling
    const conductivityEstimate = 350 + totalWaterInput * 0.5 - (params.ted.active ? params.ted.recycleTarget * 2 : 0)

    return {
      totalPower: Math.round(totalPower * 10) / 10,
      totalWaterConsumption: Math.round(totalWaterConsumption),
      efficiency: Math.round(efficiency * 10) / 10,
      dailyCost: Math.round(dailyCost),
      vhpFlow: Math.round(vhpFlow * 10) / 10,
      vbpFlow: Math.round(vbpFlow * 10) / 10,
      co2Emissions: Math.round(co2Emissions * 10) / 10,
      waterRecycled: Math.round(waterRecycled),
      phEstimate: Math.round(phEstimate * 100) / 100,
      conductivityEstimate: Math.round(conductivityEstimate),
    }
  }, [])

  // Recalculate when inputs change
  useEffect(() => {
    setOutputs(calculateOutputs(inputs))
  }, [inputs, calculateOutputs])

  // Simulation loop with small fluctuations
  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(() => {
      setOutputs((prev) => ({
        ...prev,
        totalPower: prev.totalPower + (Math.random() - 0.5) * 0.5,
        efficiency: Math.min(100, Math.max(0, prev.efficiency + (Math.random() - 0.5) * 0.3)),
        phEstimate: prev.phEstimate + (Math.random() - 0.5) * 0.02,
        conductivityEstimate: prev.conductivityEstimate + (Math.random() - 0.5) * 5,
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning])

  const resetToDefaults = () => {
    setInputs({
      capU: { active: true, steamFlow: 0, waterInput: 0 },
      capV: { active: true, steamFlow: 0, waterInput: 0 },
      capW: { active: false, steamFlow: 0, waterInput: 0 },
      centralThermal: { active: true, targetTemp: 0, pressure: 0 },
      sulfuric: { active: true, productionRate: 0 },
      ted: { active: true, treatmentCapacity: 0, recycleTarget: 0 },
    })
    setIsRunning(false)
  }

  // Check slider range status
  const checkSliderStatus = () => {
    const allValues = [
      inputs.capU.steamFlow,
      inputs.capU.waterInput,
      inputs.capV.steamFlow,
      inputs.capV.waterInput,
      inputs.capW.steamFlow,
      inputs.capW.waterInput,
      inputs.centralThermal.targetTemp,
      inputs.centralThermal.pressure,
      inputs.sulfuric.productionRate,
      inputs.ted.treatmentCapacity,
      inputs.ted.recycleTarget,
    ]
    
    // Green if all values are within valid ranges (>= 0)
    return allValues.every(val => val >= 0)
  }

  // Check individual component status
  const checkCapUnitStatus = (unit: "capU" | "capV" | "capW") => {
    // NO if active but values too low, or values out of safe range
    if (!inputs[unit].active) return true // OK if disabled
    return inputs[unit].steamFlow >= 30 && inputs[unit].waterInput >= 30 && 
           inputs[unit].steamFlow <= 150 && inputs[unit].waterInput <= 200
  }

  const checkCentralThermalStatus = () => {
    if (!inputs.centralThermal.active) return true
    // NO if temperature too low (<200) or pressure too low (<10) for operation
    return inputs.centralThermal.targetTemp >= 200 && inputs.centralThermal.pressure >= 10
  }

  const checkSulfuricStatus = () => {
    if (!inputs.sulfuric.active) return true
    // NO if production rate too low for operation
    return inputs.sulfuric.productionRate >= 20
  }

  const checkTedStatus = () => {
    if (!inputs.ted.active) return true
    // NO if treatment capacity too low (<100) or recycle target too low (<30)
    return inputs.ted.treatmentCapacity >= 100 && inputs.ted.recycleTarget >= 30
  }

  const isSliderHealthy = checkSliderStatus()

  const updateCapUnit = (unit: "capU" | "capV" | "capW", field: string, value: number | boolean) => {
    setInputs((prev) => ({
      ...prev,
      [unit]: { ...prev[unit], [field]: value },
    }))
  }

  // Simulate unit data changes
  useEffect(() => {
    const interval = setInterval(() => {
      setUnits((prev) => ({
        ...prev,
        capU: {
          ...prev.capU,
          charge: Math.max(60, Math.min(95, prev.capU.charge + (Math.random() - 0.5) * 3)),
          temperature: Math.max(50, Math.min(80, prev.capU.temperature! + (Math.random() - 0.5) * 2)),
          debit: Math.max(50, Math.min(75, prev.capU.debit! + (Math.random() - 0.5) * 1.5)),
          pression: Math.max(3.5, Math.min(5, prev.capU.pression! + (Math.random() - 0.5) * 0.2)),
        },
        capV: {
          ...prev.capV,
          charge: Math.max(60, Math.min(95, prev.capV.charge + (Math.random() - 0.5) * 3)),
          temperature: Math.max(50, Math.min(80, prev.capV.temperature! + (Math.random() - 0.5) * 2)),
          debit: Math.max(50, Math.min(75, prev.capV.debit! + (Math.random() - 0.5) * 1.5)),
          pression: Math.max(3.5, Math.min(5, prev.capV.pression! + (Math.random() - 0.5) * 0.2)),
        },
        capW: {
          ...prev.capW,
          charge: Math.max(60, Math.min(95, prev.capW.charge + (Math.random() - 0.5) * 3)),
          temperature: Math.max(50, Math.min(80, prev.capW.temperature! + (Math.random() - 0.5) * 2)),
          debit: Math.max(50, Math.min(75, prev.capW.debit! + (Math.random() - 0.5) * 1.5)),
          pression: Math.max(3.5, Math.min(5, prev.capW.pression! + (Math.random() - 0.5) * 0.2)),
        },
        sulfurique: {
          ...prev.sulfurique,
          charge: Math.max(60, Math.min(95, prev.sulfurique.charge + (Math.random() - 0.5) * 3)),
          temperature: Math.max(380, Math.min(450, prev.sulfurique.temperature! + (Math.random() - 0.5) * 5)),
          debitHot: Math.max(35, Math.min(55, prev.sulfurique.debitHot! + (Math.random() - 0.5) * 2)),
          basePression: Math.max(7.5, Math.min(9.5, prev.sulfurique.basePression! + (Math.random() - 0.5) * 0.3)),
        },
        ted: {
          ...prev.ted,
          // Stock impacts charge - when stock reduces, charge decreases
          stockTotal: Math.max(12000, Math.min(16000, prev.ted.stockTotal! + Math.floor((Math.random() - 0.5) * 200))),
          stockPercentage: Math.max(60, Math.min(95, prev.ted.stockPercentage! + (Math.random() - 0.5) * 3)),
          // Charge is directly affected by stock percentage
          charge: (prev.ted.stockPercentage! + (Math.random() - 0.5) * 3) * 0.95, // 95% correlation with stock
        },
      }))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const getStatusBadge = (status: string) => {
    return status === "running" ? (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">En marche</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-700 border-red-300">Arrêt</Badge>
    )
  }

  const getChargeBarColor = (charge: number) => {
    if (charge >= 80) return "from-emerald-500 to-cyan-500"
    if (charge >= 50) return "from-amber-500 to-yellow-500"
    return "from-red-500 to-amber-500"
  }

  const getTemperatureStatus = (temp: number, unit: string) => {
    if (unit === "sulfurique") {
      if (temp > 450) return "text-red-700"
      if (temp > 430) return "text-amber-700"
      return "text-emerald-700"
    }
    // CAP units
    return "text-emerald-700"
  }

  const getPressionStatus = (pression: number, unit: string) => {
    if (unit === "sulfurique") {
      if (pression > 9) return "text-amber-700"
      return "text-cyan-700"
    }
    // CAP units - lower pressure
    return "text-cyan-700"
  }

  // New state for interactive sliders
  const [sulfuriqueSliders, setSulfuriqueSliders] = useState({
    temperature: 410,
    debit: 46,
    pression: 8.2,
  })

  const [tedSliders, setTedSliders] = useState({
    stockTotal: 15125,
  })

  const handleSulfuriqueSliderChange = (property: "temperature" | "debit" | "pression", value: number) => {
    setSulfuriqueSliders((prev) => ({
      ...prev,
      [property]: value,
    }))
  }

  const handleTedSliderChange = (value: number) => {
    setTedSliders({ stockTotal: value })
  }

  const getStockStatus = (stock: number) => {
    if (stock > 15000) {
      return { status: "✓ Stock Optimal", color: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-200" }
    } else if (stock > 10000) {
      return { status: "⚠ Stock Moyen", color: "text-yellow-700", bgColor: "bg-yellow-50 border-yellow-200" }
    } else {
      return { status: "❌ Stock Critique", color: "text-red-700", bgColor: "bg-red-50 border-red-200" }
    }
  }

  const stockStatus = getStockStatus(tedSliders.stockTotal)

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div className="min-w-0">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Simulation du Procédé</h2>
          <p className="text-slate-600 mt-1">Réglez les entrées, observez l'impact instantané.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Slider Status Indicator - Big Light */}
          <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border-2 ${isSliderHealthy ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}`}>
            <div className={`w-4 h-4 rounded-full ${isSliderHealthy ? "bg-emerald-500 shadow-lg shadow-emerald-500/70 animate-pulse" : "bg-red-500 shadow-lg shadow-red-500/70 animate-pulse"}`} />
            <span className={`text-sm font-bold ${isSliderHealthy ? "text-emerald-700" : "text-red-700"}`}>
              {isSliderHealthy ? "Plages Valides" : "Erreur Plage"}
            </span>
          </div>
          
          <Badge variant={isRunning ? "default" : "secondary"} className={isRunning ? "bg-gradient-to-r from-emerald-600 to-emerald-500" : "bg-slate-200"}>
            {isRunning ? "En cours" : "Arrêté"}
          </Badge>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRunning(!isRunning)}
            className="border-indigo-300 hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
          >
            {isRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isRunning ? "Pause" : "Démarrer"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            className="border-slate-300 hover:bg-slate-100 bg-transparent transition-colors"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Réinitialiser
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* INPUT PARAMETERS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-semibold text-indigo-700 flex items-center gap-2">
              <Gauge className="w-5 h-5" />
              Paramètres d'Entrée (Modifiables)
            </h3>
            {/* Status Indicator for Input Parameters */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isSliderHealthy ? "border-emerald-300 bg-emerald-500/8" : "border-red-300 bg-red-500/8"}`}>
              <div className={`w-2.5 h-2.5 rounded-full ${isSliderHealthy ? "bg-emerald-500 shadow-md shadow-emerald-500/60 animate-pulse" : "bg-red-500 shadow-md shadow-red-500/60 animate-pulse"}`} />
              <span className={`text-xs font-semibold ${isSliderHealthy ? "text-emerald-700" : "text-red-700"}`}>
                {isSliderHealthy ? "OK" : "Erreur"}
              </span>
            </div>
          </div>

          {/* CAP Units */}
          {(["capU", "capV", "capW"] as const).map((unit) => {
             const isUnitHealthy = checkCapUnitStatus(unit)
             return (
            <Card key={unit} className="bg-slate-50 border-slate-200 hover:border-indigo-200 transition-all min-w-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Factory className="w-4 h-4 text-indigo-700" />
                    <span className={`${isUnitHealthy ? "text-emerald-700" : "text-red-700"} font-semibold`}>CAP {unit.slice(-1)}</span>
                    {/* Status Badge */}
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isUnitHealthy ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${isUnitHealthy ? "bg-emerald-500" : "bg-red-500"} animate-pulse`} />
                      {isUnitHealthy ? "OK" : "NO"}
                    </div>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Actif</span>
                    <Switch
                      checked={inputs[unit].active}
                      onCheckedChange={(checked) => updateCapUnit(unit, "active", checked)}
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Débit Vapeur</span>
                    <span className="text-indigo-700 font-semibold">{inputs[unit].steamFlow} T/h</span>
                  </div>
                  <Slider
                    value={[inputs[unit].steamFlow]}
                    onValueChange={([v]) => updateCapUnit(unit, "steamFlow", v)}
                    min={0}
                    max={150}
                    step={1}
                    disabled={!inputs[unit].active}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Retour Condensat</span>
                    <span className="text-indigo-700 font-semibold">{inputs[unit].waterInput} m³/h</span>
                  </div>
                  <Slider
                    value={[inputs[unit].waterInput]}
                    onValueChange={([v]) => updateCapUnit(unit, "waterInput", v)}
                    min={0}
                    max={200}
                    step={1}
                    disabled={!inputs[unit].active}
                    className="w-full"
                  />
                </div>
                {/* New Fields: Temperature, Débit, Pression */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Température</span>
                    <span className="text-indigo-700 font-semibold">{Number(units[unit].temperature ?? 0).toFixed(0)} °C</span>
                  </div>
                  <Slider
                    value={[units[unit].temperature!]}
                    onValueChange={([v]) => updateCapUnit(unit, "temperature", v)}
                    min={0}
                    max={100}
                    step={1}
                    disabled={!inputs[unit].active}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Débit</span>
                    <span className="text-indigo-700 font-semibold">{Number(units[unit].debit ?? 0).toFixed(1)} m³/h</span>
                  </div>
                  <Slider
                    value={[units[unit].debit!]}
                    onValueChange={([v]) => updateCapUnit(unit, "debit", v)}
                    min={0}
                    max={75}
                    step={1}
                    disabled={!inputs[unit].active}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Pression</span>
                    <span className="text-indigo-700 font-semibold">{Number(units[unit].pression ?? 0).toFixed(2)} bar</span>
                  </div>
                  <Slider
                    value={[units[unit].pression!]}
                    onValueChange={([v]) => updateCapUnit(unit, "pression", v)}
                    min={0}
                    max={10}
                    step={0.1}
                    disabled={!inputs[unit].active}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
            )
          })}

          {/* Central Thermal */}
          <Card className="bg-slate-50 border-slate-200 hover:border-orange-200 transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-700" />
                  <span className={`${checkCentralThermalStatus() ? "text-emerald-700" : "text-red-700"} font-semibold`}>Central Thermique</span>
                  {/* Status Badge */}
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${checkCentralThermalStatus() ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${checkCentralThermalStatus() ? "bg-emerald-500" : "bg-red-500"} animate-pulse`} />
                    {checkCentralThermalStatus() ? "OK" : "NO"}
                  </div>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Actif</span>
                  <Switch
                    checked={inputs.centralThermal.active}
                    onCheckedChange={(checked) =>
                      setInputs((prev) => ({
                        ...prev,
                        centralThermal: { ...prev.centralThermal, active: checked },
                      }))
                    }
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Température Cible</span>
                  <span className="text-orange-700 font-semibold">{inputs.centralThermal.targetTemp} °C</span>
                </div>
                <Slider
                  value={[inputs.centralThermal.targetTemp]}
                  onValueChange={([v]) =>
                    setInputs((prev) => ({
                      ...prev,
                      centralThermal: { ...prev.centralThermal, targetTemp: v },
                    }))
                  }
                  min={0}
                  max={500}
                  step={5}
                  disabled={!inputs.centralThermal.active}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Pression</span>
                  <span className="text-orange-700 font-semibold">{inputs.centralThermal.pressure} bar</span>
                </div>
                <Slider
                  value={[inputs.centralThermal.pressure]}
                  onValueChange={([v]) =>
                    setInputs((prev) => ({
                      ...prev,
                      centralThermal: { ...prev.centralThermal, pressure: v },
                    }))
                  }
                  min={0}
                  max={60}
                  step={1}
                  disabled={!inputs.centralThermal.active}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* Sulfuric Unit */}
          <Card className="bg-slate-50 border-slate-200 hover:border-yellow-200 transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Beaker className="w-4 h-4 text-yellow-700" />
                  <span className={`${checkSulfuricStatus() ? "text-emerald-700" : "text-red-700"} font-semibold`}>Unité Sulfurique</span>
                  {/* Status Badge */}
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${checkSulfuricStatus() ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${checkSulfuricStatus() ? "bg-emerald-500" : "bg-red-500"} animate-pulse`} />
                    {checkSulfuricStatus() ? "OK" : "NO"}
                  </div>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Actif</span>
                  <Switch
                    checked={inputs.sulfuric.active}
                    onCheckedChange={(checked) =>
                      setInputs((prev) => ({
                        ...prev,
                        sulfuric: { ...prev.sulfuric, active: checked },
                      }))
                    }
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Taux de Production</span>
                  <span className="text-yellow-700 font-semibold">{inputs.sulfuric.productionRate} %</span>
                </div>
                <Slider
                  value={[inputs.sulfuric.productionRate]}
                  onValueChange={([v]) =>
                    setInputs((prev) => ({
                      ...prev,
                      sulfuric: { ...prev.sulfuric, productionRate: v },
                    }))
                  }
                  min={0}
                  max={100}
                  step={1}
                  disabled={!inputs.sulfuric.active}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* TED */}
          <Card className="bg-slate-50 border-slate-200 hover:border-blue-200 transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-700" />
                  <span className={`${checkTedStatus() ? "text-emerald-700" : "text-red-700"} font-semibold`}>Traitement Eau (TED)</span>
                  {/* Status Badge */}
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${checkTedStatus() ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${checkTedStatus() ? "bg-emerald-500" : "bg-red-500"} animate-pulse`} />
                    {checkTedStatus() ? "OK" : "NO"}
                  </div>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Actif</span>
                  <Switch
                    checked={inputs.ted.active}
                    onCheckedChange={(checked) =>
                      setInputs((prev) => ({
                        ...prev,
                        ted: { ...prev.ted, active: checked },
                      }))
                    }
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Capacité Traitement</span>
                  <span className="text-blue-700 font-semibold">{inputs.ted.treatmentCapacity} m³/h</span>
                </div>
                <Slider
                  value={[inputs.ted.treatmentCapacity]}
                  onValueChange={([v]) =>
                    setInputs((prev) => ({
                      ...prev,
                      ted: { ...prev.ted, treatmentCapacity: v },
                    }))
                  }
                  min={0}
                  max={500}
                  step={10}
                  disabled={!inputs.ted.active}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Objectif Recyclage</span>
                  <span className="text-blue-700 font-semibold">{inputs.ted.recycleTarget} %</span>
                </div>
                <Slider
                  value={[inputs.ted.recycleTarget]}
                  onValueChange={([v]) =>
                    setInputs((prev) => ({
                      ...prev,
                      ted: { ...prev.ted, recycleTarget: v },
                    }))
                  }
                  min={0}
                  max={100}
                  step={1}
                  disabled={!inputs.ted.active}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CALCULATED OUTPUTS */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-emerald-700 flex items-center gap-2 px-2">
            <TrendingUp className="w-5 h-5" />
            Résultats Calculés (Automatiques)
          </h3>

          {/* Main KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-200 hover:border-indigo-300 transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-indigo-700" />
                  <span className="text-sm text-slate-600">Puissance Totale</span>
                </div>
                <p className="text-3xl font-bold text-indigo-700">{outputs.totalPower.toFixed(1)}</p>
                <p className="text-sm text-slate-600">MW</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200 hover:border-blue-300 transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="w-5 h-5 text-blue-700" />
                  <span className="text-sm text-slate-600">Conso. Eau Nette</span>
                </div>
                <p className="text-3xl font-bold text-blue-700">{outputs.totalWaterConsumption}</p>
                <p className="text-sm text-slate-600">m³/h</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-200 hover:border-emerald-300 transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-emerald-700" />
                  <span className="text-sm text-slate-600">Efficacité</span>
                </div>
                <p className="text-3xl font-bold text-emerald-700">{outputs.efficiency.toFixed(1)}</p>
                <p className="text-sm text-slate-600">%</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-200 hover:border-amber-300 transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Factory className="w-5 h-5 text-amber-700" />
                  <span className="text-sm text-slate-600">Coût Journalier</span>
                </div>
                <p className="text-3xl font-bold text-amber-700">{(outputs.dailyCost / 1000).toFixed(0)}K</p>
                <p className="text-sm text-slate-600">DH</p>
              </CardContent>
            </Card>
          </div>

          {/* Steam Flows */}
          <Card className="bg-slate-50 border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-orange-700" />
                Débits Vapeur Calculés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-orange-50 to-slate-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-slate-600 mb-1">VHP (Haute Pression)</p>
                  <p className="text-2xl font-bold text-orange-700">{outputs.vhpFlow.toFixed(1)} T/h</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-slate-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-slate-600 mb-1">VBP (Basse Pression)</p>
                  <p className="text-2xl font-bold text-yellow-700">{outputs.vbpFlow.toFixed(1)} T/h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Water & Environment */}
          <Card className="bg-slate-50 border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-700" />
                Eau & Environnement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-slate-600 mb-1">Eau Recyclée</p>
                  <p className="text-2xl font-bold text-blue-700">{outputs.waterRecycled} m³/h</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-slate-50 border border-emerald-200 rounded-lg p-4">
                  <p className="text-sm text-slate-600 mb-1">Réduction CO₂</p>
                  <p className="text-2xl font-bold text-emerald-700">{outputs.co2Emissions.toFixed(1)} %</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quality Estimates */}
          <Card className="bg-slate-50 border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Beaker className="w-4 h-4 text-purple-700" />
                Qualité Eau Estimée
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-100 rounded-lg p-4 border border-slate-200">
                  <p className="text-sm text-slate-600 mb-1">pH Estimé</p>
                  <p
                    className={`text-2xl font-bold ${
                      outputs.phEstimate >= 6.5 && outputs.phEstimate <= 7.5 ? "text-emerald-700" : "text-red-700"
                    }`}
                  >
                    {outputs.phEstimate.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500">Optimal: 6.5 - 7.5</p>
                </div>
                <div className="bg-slate-100 rounded-lg p-4 border border-slate-200">
                  <p className="text-sm text-slate-600 mb-1">Conductivité</p>
                  <p
                    className={`text-2xl font-bold ${
                      outputs.conductivityEstimate <= 500 ? "text-emerald-700" : "text-yellow-700"
                    }`}
                  >
                    {outputs.conductivityEstimate}
                  </p>
                  <p className="text-xs text-slate-500">µS/cm (max: 500)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Units Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* UNITÉ SULFURIQUE */}
        <Card className="bg-gradient-to-br from-red-50 to-white border-2 border-red-200 shadow-lg min-w-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-700" />
                {units.sulfurique.name}
              </CardTitle>
              {getStatusBadge(units.sulfurique.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Charge with Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 text-sm flex items-center gap-2">
                  <Gauge className="w-4 h-4" />
                  Charge
                </span>
                <span className="text-slate-900 font-bold">{units.sulfurique.charge.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                <div
                  className={`bg-gradient-to-r ${getChargeBarColor(units.sulfurique.charge)} h-4 rounded-full transition-all duration-500`}
                  style={{ width: `${units.sulfurique.charge}%` }}
                />
              </div>
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 text-sm flex items-center gap-2">
                  <Thermometer className="w-4 h-4" />
                  Température
                </span>
                <span className={`font-bold text-lg ${getTemperatureStatus(units.sulfurique.temperature!, "sulfurique")}`}>
                  {units.sulfurique.temperature!.toFixed(0)}°C
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {units.sulfurique.temperature! > 450
                  ? "🔴 Très élevée - Intervention requise"
                  : units.sulfurique.temperature! > 430
                    ? "🟡 Élevée - À surveiller"
                    : "🟢 Optimale"}
              </div>
            </div>

            {/* Débit VHP */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 text-sm flex items-center gap-2">
                  <Droplets className="w-4 h-4" />
                  Débit VHP
                </span>
                <span className="text-slate-900 font-bold text-lg">{units.sulfurique.debitHot!.toFixed(1)} T/h</span>
              </div>
              <div className="text-xs text-slate-500">Vapeur Haute Pression</div>
            </div>

            {/* Pression */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Pression
                </span>
                <span className={`font-bold text-lg ${getPressionStatus(units.sulfurique.pression!, "sulfurique")}`}>
                  {units.sulfurique.pression!.toFixed(1)} bar
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {units.sulfurique.pression! > 9
                  ? "⚠️ Pression élevée"
                  : "✓ Pression optimale"}
              </div>
            </div>

            {/* Status Indicator */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm text-slate-600">Système opérationnel</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TRAITEMENT EAU (TED) */}
        <Card className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 shadow-lg min-w-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-700" />
                {units.ted.name}
              </CardTitle>
              {getStatusBadge(units.ted.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Charge with Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 text-sm flex items-center gap-2">
                  <Gauge className="w-4 h-4" />
                  Charge Traitement
                </span>
                <span className="text-slate-900 font-bold">{units.ted.charge.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                <div
                  className={`bg-gradient-to-r ${getChargeBarColor(units.ted.charge)} h-4 rounded-full transition-all duration-500`}
                  style={{ width: `${units.ted.charge}%` }}
                />
              </div>
            </div>

            {/* Stock Total */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Stock Total
                </span>
                <span className="text-slate-900 font-bold text-lg">{units.ted.stockTotal!.toLocaleString()} m³</span>
              </div>

              {/* Stock Percentage Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Capacité</span>
                  <span className={`text-xs font-semibold ${
                    units.ted.stockPercentage! >= 80
                      ? "text-emerald-700"
                      : units.ted.stockPercentage! >= 50
                        ? "text-amber-700"
                        : "text-red-700"
                  }`}>
                    {units.ted.stockPercentage!.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-5 overflow-hidden border border-slate-300">
                  <div
                    className={`bg-gradient-to-r ${
                      units.ted.stockPercentage! >= 80
                        ? "from-emerald-500 to-cyan-500"
                        : units.ted.stockPercentage! >= 50
                          ? "from-amber-500 to-yellow-500"
                          : "from-red-500 to-amber-500"
                    } h-5 rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                    style={{ width: `${units.ted.stockPercentage!}%` }}
                  >
                    {units.ted.stockPercentage! > 10 && (
                      <span className="text-xs font-bold text-slate-900">{units.ted.stockPercentage!.toFixed(0)}%</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stock Status */}
              <div className="text-xs text-slate-600 pt-2">
                {units.ted.stockPercentage! >= 80
                  ? "🟢 Stock optimal"
                  : units.ted.stockPercentage! >= 50
                    ? "🟡 Stock acceptable"
                    : "🔴 Stock critique - Approvisionnement requis"}
              </div>
            </div>

            {/* Status Indicator */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm text-slate-600">Système opérationnel</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Sliders Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unité Sulfurique Controls */}
        <Card className="bg-gradient-to-br from-red-50 to-white border-2 border-red-200 min-w-0">
          <CardHeader>
            <CardTitle className="text-slate-900 flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              🔥 Unité Sulfurique - Contrôle Avancé
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Temperature Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-slate-700 font-medium flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-blue-700" />
                  Température VHP
                </label>
                <span className="text-slate-900 font-bold text-xl">{sulfuriqueSliders.temperature.toFixed(1)}°C</span>
              </div>
              <Slider
                value={[sulfuriqueSliders.temperature]}
                onValueChange={([v]) => handleSulfuriqueSliderChange("temperature", v)}
                min={300}
                max={500}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-600">
                <span>300°C</span>
                <span>500°C</span>
              </div>
              <div className={`rounded-lg p-3 border ${sulfuriqueSliders.temperature > 450 ? "bg-red-50 border-red-200" : sulfuriqueSliders.temperature > 420 ? "bg-yellow-50 border-yellow-200" : "bg-emerald-50 border-emerald-200"}`}>
                <p className={`text-xs font-semibold ${sulfuriqueSliders.temperature > 450 ? "text-red-700" : sulfuriqueSliders.temperature > 420 ? "text-yellow-700" : "text-emerald-700"}`}>
                  {sulfuriqueSliders.temperature > 450
                    ? "⚠️ Température très élevée - Intervention requise"
                    : sulfuriqueSliders.temperature > 420
                      ? "! Température élevée - À surveiller"
                      : "✓ Température optimale"}
                </p>
              </div>
            </div>

            {/* Débit VHP Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-slate-700 font-medium flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-700" />
                  Débit VHP (Hot)
                </label>
                <span className="text-slate-900 font-bold text-xl">{sulfuriqueSliders.debit.toFixed(1)} T/h</span>
              </div>
              <Slider
                value={[sulfuriqueSliders.debit]}
                onValueChange={([v]) => handleSulfuriqueSliderChange("debit", v)}
                min={20}
                max={80}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-600">
                <span>20 T/h</span>
                <span>80 T/h</span>
              </div>
            </div>

            {/* Pression Base Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-slate-700 font-medium flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-cyan-700" />
                  Pression Base
                </label>
                <span className="text-slate-900 font-bold text-xl">{sulfuriqueSliders.pression.toFixed(2)} bar</span>
              </div>
              <Slider
                value={[sulfuriqueSliders.pression]}
                onValueChange={([v]) => handleSulfuriqueSliderChange("pression", v)}
                min={5}
                max={12}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-600">
                <span>5 bar</span>
                <span>12 bar</span>
              </div>
              <div className={`rounded-lg p-3 border ${sulfuriqueSliders.pression > 10 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
                <p className={`text-xs font-semibold ${sulfuriqueSliders.pression > 10 ? "text-amber-700" : "text-emerald-700"}`}>
                  {sulfuriqueSliders.pression > 10 ? "⚠ Pression élevée" : "✓ Pression optimale"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Traitement TED Controls */}
        <Card className="bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-200 min-w-0">
          <CardHeader>
            <CardTitle className="text-slate-900 flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
              💧 Traitement Eau TED - Gestion Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stock Total Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-slate-700 font-medium flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-700" />
                  Stock Total
                </label>
                <span className="text-slate-900 font-bold text-xl">{tedSliders.stockTotal.toFixed(0)} L</span>
              </div>
              <Slider
                value={[tedSliders.stockTotal]}
                onValueChange={([v]) => {
                  handleTedSliderChange(v)
                  // Update charge based on stock change
                  const stockPercentage = (v / 20000) * 100
                  setUnits((prev) => ({
                    ...prev,
                    ted: {
                      ...prev.ted,
                      stockTotal: v,
                      stockPercentage: stockPercentage,
                      charge: Math.max(40, stockPercentage * 0.95), // Charge correlates with stock
                    },
                  }))
                }}
                min={5000}
                max={20000}
                step={100}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-600">
                <span>5,000 L</span>
                <span>20,000 L</span>
              </div>
            </div>

            {/* Stock Status Indicator with Charge Impact */}
            <div className={`rounded-lg p-4 border ${stockStatus.bgColor}`}>
              <p className={`text-sm font-semibold ${stockStatus.color}`}>
                {stockStatus.status}
              </p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Capacité</span>
                  <span className={`font-semibold ${stockStatus.color}`}>
                    {((tedSliders.stockTotal / 20000) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden border border-slate-300">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${
                      tedSliders.stockTotal > 15000
                        ? "bg-gradient-to-r from-emerald-500 to-cyan-500"
                        : tedSliders.stockTotal > 10000
                          ? "bg-gradient-to-r from-yellow-500 to-amber-500"
                          : "bg-gradient-to-r from-red-500 to-orange-500"
                    }`}
                    style={{ width: `${(tedSliders.stockTotal / 20000) * 100}%` }}
                  />
                </div>
              </div>

              {/* Charge Impact Warning */}
              <div className="mt-4 pt-4 border-t border-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">Impact sur Charge</span>
                  <span className={`text-sm font-bold ${
                    tedSliders.stockTotal > 15000 ? "text-emerald-700" :
                    tedSliders.stockTotal > 10000 ? "text-yellow-700" :
                    "text-red-700"
                  }`}>
                    {Math.max(40, (tedSliders.stockTotal / 20000) * 100 * 0.95).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {tedSliders.stockTotal < 8000 
                    ? "⚠️ Stock faible = Charge réduite" 
                    : tedSliders.stockTotal < 12000 
                    ? "! Stock moyen = Charge moyenne"
                    : "✓ Stock optimal = Charge optimale"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Multiplier Alert */}
      {dataMultiplier < 1 && (
        <Card className="bg-red-900/20 border-2 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-700 flex-shrink-0" />
              <div>
                <h4 className="text-red-700 font-semibold mb-1">⚠️ Anomalie Détectée</h4>
                <p className="text-sm text-red-700">
                  L'efficacité système est réduite à {(dataMultiplier * 100).toFixed(0)}%. Vérifiez les alertes pour plus de détails.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
