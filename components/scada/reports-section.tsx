"use client"

import { FileText, Download } from "lucide-react"

interface Report {
  title: string
  category: string
  date: string
  size: string
  categoryColor: string
}

const reports: Report[] = [
  {
    title: "Rapport Performance Globale",
    category: "Performance Globale",
    date: "11/12/2025",
    size: "2.4 MB",
    categoryColor: "bg-cyan-100 text-cyan-700 border-cyan-200"
  },
  {
    title: "Intelligence Artificielle - Décembre",
    category: "Intelligence Artificielle",
    date: "10/12/2025",
    size: "5.8 MB",
    categoryColor: "bg-purple-100 text-purple-700 border-purple-200"
  },
  {
    title: "Analyse Énergétique Mensuelle",
    category: "Énergie",
    date: "10/12/2025",
    size: "5.2 MB",
    categoryColor: "bg-amber-100 text-amber-700 border-amber-200"
  },
  {
    title: "Audit Ressources Hydrauliques",
    category: "Ressources Hydrauliques",
    date: "08/12/2025",
    size: "3.8 MB",
    categoryColor: "bg-blue-100 text-blue-700 border-blue-200"
  },
  {
    title: "Rapport Hebdomadaire Opérations",
    category: "Performance Globale",
    date: "08/12/2025",
    size: "8.1 MB",
    categoryColor: "bg-cyan-100 text-cyan-700 border-cyan-200"
  },
  {
    title: "Bilan Mensuel Novembre",
    category: "Performance Globale",
    date: "01/12/2025",
    size: "24.5 MB",
    categoryColor: "bg-cyan-100 text-cyan-700 border-cyan-200"
  },
  {
    title: "Centrale Thermique - Performance",
    category: "Centrale Thermique",
    date: "28/11/2025",
    size: "4.2 MB",
    categoryColor: "bg-orange-100 text-orange-700 border-orange-200"
  },
  {
    title: "Unité Sulfurique - Analyse Vapeur",
    category: "Unité Sulfurique",
    date: "25/11/2025",
    size: "3.6 MB",
    categoryColor: "bg-red-100 text-red-700 border-red-200"
  },
  {
    title: "TED - Traitement Eau Démineralisée",
    category: "TED",
    date: "22/11/2025",
    size: "2.9 MB",
    categoryColor: "bg-green-100 text-green-700 border-green-200"
  },
  {
    title: "CAP U/V/W - Analyse Condensat",
    category: "CAP",
    date: "20/11/2025",
    size: "6.7 MB",
    categoryColor: "bg-indigo-100 text-indigo-700 border-indigo-200"
  }
]

export function ReportsSection() {
  const handleDownload = (format: "pdf" | "excel", reportTitle: string) => {
    console.log(`Downloading ${reportTitle} as ${format}`)
    // TODO: Implement actual download logic
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <FileText className="w-8 h-8 text-cyan-700" />
        <h2 className="text-3xl font-bold text-slate-900">Rapports Disponibles</h2>
      </div>

      <div className="space-y-3">
        {reports.map((report, index) => (
          <div
            key={index}
            className="relative bg-white rounded-xl p-4 border border-slate-200 hover:border-slate-300 transition-all hover:bg-white"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <FileText className="w-6 h-6 text-cyan-700 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-slate-900 truncate">{report.title}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-600">
                    <span className={`px-2 py-1 rounded-md border font-medium ${report.categoryColor}`}>{report.category}</span>
                    <span>{report.date} • {report.size}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleDownload("pdf", report.title)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </button>
                <button
                  onClick={() => handleDownload("excel", report.title)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Excel
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
