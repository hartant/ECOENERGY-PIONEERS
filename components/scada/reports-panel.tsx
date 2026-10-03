"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Download, Calendar, TrendingUp, TrendingDown, Droplets, Leaf, Brain, DollarSign, BarChart3, FileSpreadsheet, FileDown } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { useDashboard } from "@/context/dashboard-context"

export function ReportsPanel() {
  const { reports } = useDashboard()

  const trendData = [
    { month: "Juil", economies: 68500, couts: 3200000 },
    { month: "Août", economies: 72300, couts: 3150000 },
    { month: "Sept", economies: 85400, couts: 3100000 },
    { month: "Oct", economies: 92100, couts: 3050000 },
    { month: "Nov", economies: 98200, couts: 3000000 },
    { month: "Déc", economies: 105000, couts: 2950000 },
  ]

  const getCategoryBadge = (category: string) => {
    const colorClasses: Record<string, string> = {
      "Performance Globale": "bg-cyan-100 text-cyan-700 border-cyan-300",
      "Intelligence Artificielle": "bg-purple-100 text-purple-700 border-purple-300",
      "Énergie": "bg-amber-100 text-amber-700 border-amber-300",
      "Ressources Hydrauliques": "bg-blue-100 text-blue-700 border-blue-300",
      "Centrale Thermique": "bg-orange-100 text-orange-700 border-orange-300",
      "Unité Sulfurique": "bg-red-100 text-red-700 border-red-300",
      "TED": "bg-green-100 text-green-700 border-green-300",
      "CAP": "bg-indigo-100 text-indigo-700 border-indigo-300",
    }
    return <Badge className={colorClasses[category] || colorClasses["Performance Globale"]}>{category}</Badge>
  }

  const handleDownload = (reportId: string, format: "pdf" | "excel") => {
    console.log(`Downloading report ${reportId} as ${format}`)
    // TODO: Implement actual download logic
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-900">Rapports & Analyses</h2>
        <div className="flex flex-wrap gap-2">
          <Button className="bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-100">
            <Calendar className="w-4 h-4 mr-2" />
            Période
          </Button>
          <Button className="bg-cyan-100 text-cyan-700 border border-cyan-300 hover:bg-cyan-100">
            <FileText className="w-4 h-4 mr-2" />
            Générer Rapport
          </Button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-200 shadow-lg shadow-emerald-500/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 text-sm">Économies Totale</p>
              <DollarSign className="w-5 h-5 text-emerald-700" />
            </div>
            <p className="text-3xl font-bold text-emerald-700">543,200 DH</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 shadow-lg shadow-blue-500/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 text-sm">Eau Economisé</p>
              <Droplets className="w-5 h-5 text-blue-700" />
            </div>
            <p className="text-3xl font-bold text-blue-700">18,450 m³</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border-2 border-green-200 shadow-lg shadow-green-500/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 text-sm">CO₂ Réduit</p>
              <Leaf className="w-5 h-5 text-green-700" />
            </div>
            <p className="text-3xl font-bold text-green-700">142 Tonnes</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200 shadow-lg shadow-purple-500/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 text-sm">Efficacité IA</p>
              <Brain className="w-5 h-5 text-purple-700" />
            </div>
            <p className="text-3xl font-bold text-purple-700">97.2%</p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-xs">Coût Total Mensuel</p>
                <p className="text-2xl font-bold text-cyan-700 mt-1">3.75M DH</p>
              </div>
              <BarChart3 className="w-8 h-8 text-cyan-700" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-xs">Économies IA</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">425K DH</p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-700" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-xs">Profit Net</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">350K DH</p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-700" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-xs">Pertes Estimées</p>
                <p className="text-2xl font-bold text-red-700 mt-1">30K DH</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-700" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-700" />
            Tendance Économies vs Coûts Optimisés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis yAxisId="couts" stroke="#3b82f6" tickFormatter={(v: number) => `${(v / 1e6).toFixed(1)}M`} />
                <YAxis yAxisId="eco" orientation="right" stroke="#f59e0b" tickFormatter={(v: number) => `${Math.round(v / 1000)}K`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a" }}
                  labelStyle={{ color: "#0f172a", fontWeight: 700 }}
                  formatter={(value: number) => `${value.toLocaleString()} DH`}
                />
                <Legend />
                <Bar yAxisId="eco" dataKey="economies" name="Économies" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="couts" dataKey="couts" name="Coûts Optimisés" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-700" />
            Rapports Disponibles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-100 rounded-lg hover:bg-slate-100 transition-colors gap-3 min-w-0"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <FileText className="w-5 h-5 text-cyan-700" />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold text-slate-900">{report.title}</p>
                      {getCategoryBadge(report.category)}
                    </div>
                    <p className="text-xs text-slate-600">
                      {report.date} • {report.size}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleDownload(report.id, "pdf")}
                    className="bg-red-100 text-red-700 border border-red-300 hover:bg-red-100"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    PDF
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDownload(report.id, "excel")}
                    className="bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Excel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Options (compact) */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <FileDown className="w-5 h-5 text-purple-700" />
            Export
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[{label:"PDF",color:"red-500"},{label:"Excel",color:"emerald-500"},{label:"CSV",color:"blue-500"}].map(({label,color})=>(
            <Button key={label} className={`bg-${color}/20 text-${color.replace("-500","-400")} border border-${color}/50 hover:bg-${color}/30`}>
              <Download className="w-4 h-4 mr-2" />{label}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
