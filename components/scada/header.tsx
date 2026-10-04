"use client"

import { useState, useEffect } from "react"
import { Bell, User, Wifi } from "lucide-react"
import { useDashboard } from "@/context/dashboard-context"
import { ThemeToggle } from "@/components/theme-toggle"
import { menuGroups } from "./sidebar"
import type { TabType } from "../scada-dashboard"

export function Header({ activeTab, onOpenAlerts }: { activeTab: TabType; onOpenAlerts: () => void }) {
  const [now, setNow] = useState<Date | null>(null)
  const { anomalyActive } = useDashboard()

  useEffect(() => {
    setNow(new Date())
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const current = menuGroups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.title }))).find((i) => i.id === activeTab)

  return (
    <header className="h-14 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-2 min-w-0 text-sm">
        <span className="text-slate-500 hidden sm:inline">{current?.group}</span>
        <span className="text-slate-300 hidden sm:inline">/</span>
        <span className="font-semibold text-slate-900 truncate">{current?.label}</span>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden md:flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
          <Wifi className="w-3.5 h-3.5" />
          Connecté
        </div>
        <div className="hidden md:block text-right leading-tight">
          <p className="text-sm font-semibold text-slate-900 tabular">
            {now ? now.toLocaleTimeString("fr-FR") : "--:--:--"}
          </p>
          <p className="text-[11px] text-slate-500 capitalize">
            {now ? now.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : ""}
          </p>
        </div>
        <ThemeToggle />
        <button
          onClick={onOpenAlerts}
          className="relative w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Alertes"
        >
          <Bell className="w-[18px] h-[18px]" />
          {anomalyActive !== "none" && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />}
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block leading-tight">
            <p className="text-sm font-medium text-slate-900">Opérateur</p>
            <p className="text-[11px] text-slate-500">Salle de contrôle</p>
          </div>
        </div>
      </div>
    </header>
  )
}
