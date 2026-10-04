"use client"

import {
  LayoutDashboard,
  Zap,
  Droplets,
  Factory,
  Brain,
  Bell,
  FileText,
  GitBranch,
  SlidersHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useDashboard } from "@/context/dashboard-context"
import type { TabType } from "../scada-dashboard"

export const menuGroups: { title: string; items: { id: TabType; label: string; icon: typeof Zap }[] }[] = [
  {
    title: "Supervision",
    items: [
      { id: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
      { id: "diagram", label: "Schéma Procédé", icon: GitBranch },
    ],
  },
  {
    title: "Ressources",
    items: [
      { id: "energy", label: "Énergie", icon: Zap },
      { id: "water", label: "Eau", icon: Droplets },
      { id: "production", label: "Production", icon: Factory },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { id: "analytics", label: "Analytiques IA", icon: Brain },
      { id: "simulation", label: "Simulation", icon: SlidersHorizontal },
    ],
  },
  {
    title: "Gestion",
    items: [
      { id: "alerts", label: "Alertes", icon: Bell },
      { id: "reports", label: "Rapports", icon: FileText },
    ],
  },
]

interface SidebarProps {
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
}

export function Logo({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <div className={cn("rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm", className)}>
      <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
    </div>
  )
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { anomalyActive } = useDashboard()

  return (
    <aside className="w-full lg:w-60 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col lg:h-screen lg:sticky lg:top-0">
      <div className="h-14 px-4 flex items-center gap-3 border-b border-slate-200">
        <Logo />
        <div className="leading-tight">
          <p className="font-bold text-slate-900 tracking-tight">EcoEnergy Pioneers</p>
          <p className="text-[11px] text-slate-500">SCADA-IA · Monitoring</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 flex lg:flex-col gap-4 lg:gap-5 overflow-x-auto">
        {menuGroups.map((group) => (
          <div key={group.title} className="shrink-0">
            <p className="hidden lg:block px-3 mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
              {group.title}
            </p>
            <div className="flex lg:flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const active = activeTab === item.id
                const showDot = item.id === "alerts" && anomalyActive !== "none"
                return (
                  <button
                    key={item.id}
                    data-tab={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap",
                      active
                        ? "bg-emerald-50 text-emerald-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    {active && <span className="hidden lg:block absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-emerald-600" />}
                    <Icon className="w-[18px] h-[18px]" />
                    <span>{item.label}</span>
                    {showDot && <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="hidden lg:block p-3 border-t border-slate-200">
        <div className="rounded-lg bg-slate-100 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-slate-700">Système actif</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Rafraîchissement toutes les 2 s</p>
        </div>
      </div>
    </aside>
  )
}
