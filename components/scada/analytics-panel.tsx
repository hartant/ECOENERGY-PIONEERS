"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Zap, DollarSign, Clock, ChevronDown, ChevronUp, Target, Activity } from "lucide-react"
import { LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

export function AnalyticsPanel() {
  const [expandedRec, setExpandedRec] = useState<number | null>(null)

  // Prediction data for line chart
  const predictionData = [
    { time: "00:00", real: 45.2, prediction: 44.8 },
    { time: "04:00", real: 42.1, prediction: 42.5 },
    { time: "08:00", real: 48.5, prediction: 48.2 },
    { time: "12:00", real: 51.2, prediction: 50.8 },
    { time: "16:00", real: 49.8, prediction: 50.1 },
    { time: "20:00", real: 47.3, prediction: 47.0 },
  ]

  // Radar chart data
  const radarData = [
    { domain: "Énergie", performance: 95 },
    { domain: "Eau", performance: 88 },
    { domain: "Thermique", performance: 92 },
    { domain: "Production", performance: 90 },
    { domain: "Coûts", performance: 85 },
    { domain: "Maintenance", performance: 93 },
  ]

  const analytics = [
    {
      title: "Consommation Énergétique",
      value: "48.2 MW",
      confidence: 94,
      trend: "+5.2%",
      trendUp: true,
    },
    {
      title: "Stock Eau TED",
      value: "14,200 m³",
      confidence: 89,
      trend: "-5.3%",
      trendUp: false,
    },
    {
      title: "Efficacité Globale",
      value: "93.8%",
      confidence: 91,
      trend: "-0.7%",
      trendUp: false,
    },
    {
      title: "Coût Opérationnel",
      value: "2.85M DH",
      confidence: 87,
      trend: "+2.1%",
      trendUp: true,
    },
  ]

  const recommendations = [
    {
      priority: "urgent",
      title: "Optimisation Immédiate CAP W",
      description: "Augmenter le débit vapeur de 10% pour améliorer l'efficacité énergétique",
      impact: "Économie: 12,500 DH/jour",
      savings: "375K DH/mois",
      domain: "Énergie",
    },
    {
      priority: "important",
      title: "Maintenance Préventive CAP V",
      description: "Planifier maintenance du système de recyclage dans 48h pour éviter panne",
      impact: "Prévention panne critique",
      savings: "Évite 200K DH perte",
      domain: "Maintenance",
    },
    {
      priority: "suggestion",
      title: "Optimisation Stock Eau TED",
      description: "Augmenter le traitement pour maintenir le stock au-dessus de 12,000 m³",
      impact: "Stabilité production",
      savings: "8.5K DH/jour",
      domain: "Eau",
    },
    {
      priority: "important",
      title: "Ajustement Thermique",
      description: "Réduire température centrale de 15°C pendant heures creuses",
      impact: "Réduction consommation",
      savings: "18K DH/jour",
      domain: "Thermique",
    },
  ]

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "border-red-300 bg-red-50"
      case "important":
        return "border-amber-300 bg-amber-50"
      default:
        return "border-emerald-300 bg-emerald-50"
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-700 border-red-200"
      case "important":
        return "bg-amber-100 text-amber-700 border-amber-200"
      default:
        return "bg-emerald-100 text-emerald-700 border-emerald-200"
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Intelligence Artificielle - Analytiques</h2>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-200 hover:border-indigo-300 transition-all">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-indigo-700" />
              <span className="text-sm text-slate-600">Performance Exisante</span>
            </div>
            <p className="text-3xl font-bold text-indigo-700">+18%</p>
            <p className="text-sm text-slate-600 mt-1">vs mois dernier</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-200 hover:border-emerald-300 transition-all">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-emerald-700" />
              <span className="text-sm text-slate-600">Économies Energétique</span>
            </div>
            <p className="text-3xl font-bold text-emerald-700">124,500</p>
            <p className="text-sm text-slate-600 mt-1">DH ce mois</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-white border-cyan-200 hover:border-cyan-300 transition-all">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-cyan-700" />
              <span className="text-sm text-slate-600">Prédictions Viables</span>
            </div>
            <p className="text-3xl font-bold text-cyan-700">99.2%</p>
            <p className="text-sm text-slate-600 mt-1">de précision</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-50 to-white border-violet-200 hover:border-violet-300 transition-all">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-violet-700" />
              <span className="text-sm text-slate-600">Temps de Réaction</span>
            </div>
            <p className="text-3xl font-bold text-violet-700">&lt;100ms</p>
            <p className="text-sm text-slate-600 mt-1">temps réel</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Predictions Line Chart (2/3 width) */}
        <Card className="lg:col-span-2 bg-slate-50 border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-900 flex items-center gap-2">
              <Brain className="w-4 h-4 text-cyan-700" />
              Prédictions Énergétique - Réel vs IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={predictionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} label={{ value: 'MW', angle: -90, position: 'insideLeft', fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', borderRadius: '8px' }}
                  labelStyle={{ color: '#64748b' }}
                />
                <Legend />
                <Line type="monotone" dataKey="real" stroke="#06b6d4" strokeWidth={2} name="Réel" dot={{ fill: '#06b6d4', r: 4 }} />
                <Line type="monotone" dataKey="prediction" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" name="Prédiction IA" dot={{ fill: '#8b5cf6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-3 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
              <p className="text-xs text-cyan-700">
                <strong>Précision IA:</strong> 95% de corrélation entre prédictions et consommation réelle sur 24h
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Radar Chart (1/3 width) */}
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-violet-700" />
              Performance IA par Domaine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="domain" stroke="#64748b" style={{ fontSize: '11px' }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#64748b" style={{ fontSize: '10px' }} />
                <Radar name="Performance" dataKey="performance" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Grid with Confidence Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {analytics.map((item, index) => (
          <Card key={index} className="bg-slate-50 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm text-slate-600">{item.title}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{item.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {item.trendUp ? (
                      <TrendingUp className="w-3 h-3 text-emerald-700" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-700" />
                    )}
                    <p className={`text-sm ${item.trendUp ? "text-emerald-700" : "text-red-700"}`}>
                      {item.trend}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-600">Confiance</p>
                  <p className="text-lg font-bold text-cyan-700">{item.confidence}%</p>
                </div>
              </div>
              {/* Confidence Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${item.confidence}%` }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Recommendations Section */}
      <Card className="bg-slate-50 border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <Brain className="w-5 h-5 text-cyan-700" />
            Recommandations IA Prioritaires
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className={`border-2 rounded-lg p-4 transition-all cursor-pointer hover:shadow-lg ${getPriorityStyles(rec.priority)}`}
              onClick={() => setExpandedRec(expandedRec === index ? null : index)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border uppercase ${getPriorityBadge(rec.priority)}`}>
                      {rec.priority}
                    </span>
                    <span className="text-xs text-slate-600">{rec.domain}</span>
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">{rec.title}</h4>
                  <p className="text-sm text-slate-600">{rec.description}</p>
                  
                  {expandedRec === index && (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-700" />
                        <span className="text-sm text-slate-700">{rec.impact}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-700" />
                        <span className="text-sm text-emerald-700 font-semibold">{rec.savings}</span>
                      </div>
                    </div>
                  )}
                </div>
                {expandedRec === index ? (
                  <ChevronUp className="w-5 h-5 text-slate-600 ml-2 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-600 ml-2 flex-shrink-0" />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* AI Insights - What AI Does */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-200">
          <CardHeader>
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-700" />
              Ce que fait l'IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
                <span>Analyse en temps réel de tous les paramètres du système</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
                <span>Prédictions énergétiques avec 95% de précision sur 24h</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
                <span>Détection d'anomalies avant qu'elles ne deviennent critiques</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
                <span>Optimisation automatique des paramètres de production</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
                <span>Priorisation intelligente des actions de maintenance</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
          <CardHeader>
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-700" />
              Impact IA ce mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-700" />
                  <span className="text-sm text-slate-700">Économies réalisées</span>
                </div>
                <span className="text-lg font-bold text-emerald-700">124,500 DH</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-700" />
                  <span className="text-sm text-slate-700">Réduction consommation</span>
                </div>
                <span className="text-lg font-bold text-amber-700">5.2%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-700" />
                  <span className="text-sm text-slate-700">Incidents prévenus</span>
                </div>
                <span className="text-lg font-bold text-orange-700">3</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-cyan-700" />
                  <span className="text-sm text-slate-700">Temps production gagné</span>
                </div>
                <span className="text-lg font-bold text-cyan-700">18.5h</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
