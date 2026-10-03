"use client"

import { useState } from "react"
import { DashboardProvider } from "@/context/dashboard-context"
import { Sidebar } from "./scada/sidebar"
import { Header } from "./scada/header"
import { NotificationCenter } from "./scada/notification-center"
import { OverviewPanel } from "./scada/overview-panel"
import { EnergyPanel } from "./scada/energy-panel"
import { WaterPanel } from "./scada/water-panel"
import { ProductionPanel } from "./scada/production-panel"
import { AnalyticsPanel } from "./scada/analytics-panel"
import { AlertsPanel } from "./scada/alerts-panel"
import { ReportsPanel } from "./scada/reports-panel"
import { ProcessSchema } from "./scada/process-schema"
import { SimulationPanel } from "./scada/simulation-panel"

export type TabType =
  | "overview"
  | "energy"
  | "water"
  | "production"
  | "analytics"
  | "alerts"
  | "reports"
  | "diagram"
  | "simulation"

export function ScadaDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("overview")

  const renderPanel = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewPanel />
      case "energy":
        return <EnergyPanel />
      case "water":
        return <WaterPanel />
      case "production":
        return <ProductionPanel />
      case "analytics":
        return <AnalyticsPanel />
      case "alerts":
        return <AlertsPanel />
      case "reports":
        return <ReportsPanel />
      case "diagram":
        return <ProcessSchema />
      case "simulation":
        return <SimulationPanel />
      default:
        return <OverviewPanel />
    }
  }

  return (
    <DashboardProvider>
      <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 text-slate-900">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 flex flex-col overflow-hidden w-full">
          <Header />
          <NotificationCenter onNavigateToAlerts={() => setActiveTab("alerts")} />
          <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">{renderPanel()}</main>
        </div>
      </div>
    </DashboardProvider>
  )
}
