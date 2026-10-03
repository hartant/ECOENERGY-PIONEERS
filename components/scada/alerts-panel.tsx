"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, AlertCircle, Info, CheckCircle, X, Settings, Archive, MapPin, Clock, Thermometer, Droplets, Zap, Activity, Wrench, Brain, AlertOctagon, Star } from "lucide-react"
import { useDashboard } from "@/context/dashboard-context"

interface Alert {
  id: string
  level: "critical" | "warning" | "info" | "success"
  title: string
  description: string
  timestamp: string
  acknowledged: boolean
  source: string
  category: "thermique" | "qualité" | "ressources" | "production" | "maintenance" | "ia"
  impact?: string
  aiSuggestions?: {
    title: string
    description: string
    priority: "high" | "medium" | "low"
    action?: string
  }[]
}

type FilterCategory = "all" | "critical" | "warning" | "info" | "unacknowledged"

export function AlertsPanel() {
  const { alertEmails, addAlertEmail, removeAlertEmail, sendAlertEmail, setPrimaryAlertEmail } = useDashboard()
  const [emailInput, setEmailInput] = useState("")
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all")
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: "1",
      level: "critical",
      title: "Température VHP élevée",
      description: "Température VHP Sulfurique: 435°C (seuil: 420°C)",
      timestamp: "14:32:15",
      acknowledged: false,
      source: "Unité Sulfurique",
      category: "thermique",
      impact: "Risque de dépassement de seuil critique et arrêt automatique",
      aiSuggestions: [
        {
          title: "Réduire l'apport thermique",
          description: "Diminuer l'alimentation en vapeur VHP de 15% pour ramener la température à 415°C",
          priority: "high",
          action: "Appliquer"
        },
        {
          title: "Augmenter le débit de refroidissement",
          description: "Augmenter le circuit de refroidissement secondaire de 20% pour accélérer la dissipation",
          priority: "high",
          action: "Appliquer"
        },
        {
          title: "Vérifier les échangeurs",
          description: "Inspectionner l'échangeur thermique pour déceler un encrassement possible",
          priority: "medium",
          action: "Diagnostiquer"
        }
      ]
    },
    {
      id: "2",
      level: "warning",
      title: "pH hors plage - CAP W",
      description: "pH condensat: 6.8 (plage normale: 7.0-7.5)",
      timestamp: "14:28:45",
      acknowledged: false,
      source: "CAP W",
      category: "qualité",
      impact: "Qualité de l'eau compromise - ajustement requis",
      aiSuggestions: [
        {
          title: "Ajuster l'injection alcaline",
          description: "Augmenter l'injection de solution alcaline de 2.5% pour corriger le pH à 7.2",
          priority: "high",
          action: "Appliquer"
        },
        {
          title: "Vérifier la source d'eau",
          description: "Tester l'eau d'entrée pour vérifier qu'il n'y a pas de contamination acide",
          priority: "medium",
          action: "Tester"
        },
        {
          title: "Augmenter la fréquence de contrôle",
          description: "Passer à un contrôle toutes les 15 minutes jusqu'à stabilisation",
          priority: "low",
          action: "Configurer"
        }
      ]
    },
    {
      id: "3",
      level: "warning",
      title: "Stock TED bas",
      description: "Stock prévu insuffisant pour les prochaines 24h",
      timestamp: "14:15:00",
      acknowledged: true,
      source: "Traitement TED",
      category: "ressources",
      aiSuggestions: [
        {
          title: "Commander un approvisionnement d'urgence",
          description: "Lancer une commande express de 5 tonnes de produits de traitement TED",
          priority: "high",
          action: "Commander"
        },
        {
          title: "Optimiser la consommation",
          description: "Réduire les débits de recyclage non essentiels de 10% pour étendre les stocks",
          priority: "high",
          action: "Appliquer"
        },
        {
          title: "Prévoir un surstock",
          description: "Augmenter le seuil de réapprovisionnement de 20% pour éviter les ruptures futures",
          priority: "medium",
          action: "Configurer"
        }
      ]
    },
    {
      id: "4",
      level: "info",
      title: "Maintenance planifiée",
      description: "Maintenance CAP V prévue dans 48h",
      timestamp: "10:00:00",
      acknowledged: true,
      source: "CAP V",
      category: "maintenance",
      aiSuggestions: [
        {
          title: "Préparer les pièces de rechange",
          description: "Vérifier la disponibilité des filtres et joints pour CAP V avant la maintenance",
          priority: "medium",
          action: "Vérifier"
        },
        {
          title: "Programmer la maintenance préventive",
          description: "En parallèle de cette maintenance, effectuer une révision des capteurs de température",
          priority: "low",
          action: "Ajouter"
        }
      ]
    },
    {
      id: "5",
      level: "critical",
      title: "Pression anormale Circuit Primaire",
      description: "Pression: 12.8 bar (seuil max: 12.0 bar)",
      timestamp: "14:45:22",
      acknowledged: false,
      source: "Circuit Primaire",
      category: "thermique",
      impact: "Risque de surpression - intervention immédiate requise",
      aiSuggestions: [
        {
          title: "Purger le circuit primaire",
          description: "Ouvrir le purgeur d'air pour libérer 0.8 bar de pression excédentaire",
          priority: "high",
          action: "Purger"
        },
        {
          title: "Réduire l'apport d'eau chaude",
          description: "Diminuer le débit d'entrée de 8% et réduire la température de 5°C",
          priority: "high",
          action: "Appliquer"
        },
        {
          title: "Vérifier le clapet de sécurité",
          description: "Inspecter et nettoyer le clapet de sécurité, il pourrait être encrasse",
          priority: "high",
          action: "Inspecter"
        }
      ]
    },
    {
      id: "6",
      level: "info",
      title: "Optimisation IA appliquée",
      description: "L'IA a ajusté les paramètres de CAP U pour améliorer l'efficacité",
      timestamp: "13:20:10",
      acknowledged: true,
      source: "Système IA",
      category: "ia",
      aiSuggestions: [
        {
          title: "Valider les résultats",
          description: "Les ajustements ont augmenté l'efficacité de 3.2%. Ces modifications sont stables.",
          priority: "low",
          action: "Approuver"
        },
        {
          title: "Appliquer aux autres CAP",
          description: "Dupliquer les ajustements optimisés à CAP V et CAP W pour une efficacité globale",
          priority: "medium",
          action: "Dupliquer"
        }
      ]
    },
    {
      id: "7",
      level: "warning",
      title: "Débit d'eau réduit",
      description: "Débit Circuit Refroidissement: 365 m³/h (min: 380 m³/h)",
      timestamp: "12:15:33",
      acknowledged: false,
      source: "Circuit Refroidissement",
      category: "ressources",
      impact: "Refroidissement insuffisant - surveillance nécessaire",
      aiSuggestions: [
        {
          title: "Nettoyer les filtres",
          description: "Le débit réduit indique un encrassement probable des filtres d'entrée. Nettoyage recommandé.",
          priority: "high",
          action: "Nettoyer"
        },
        {
          title: "Augmenter la puissance pompe",
          description: "Augmenter la vitesse de la pompe de 5% pour compenser la perte de débit",
          priority: "medium",
          action: "Appliquer"
        },
        {
          title: "Vérifier les vannes d'isolement",
          description: "S'assurer qu'aucune vanne n'est partiellement fermée sur le circuit",
          priority: "medium",
          action: "Vérifier"
        }
      ]
    },
    {
      id: "8",
      level: "success",
      title: "Audit qualité réussi",
      description: "Tous les paramètres de qualité conformes aux normes",
      timestamp: "09:00:00",
      acknowledged: true,
      source: "Système Qualité",
      category: "qualité",
      aiSuggestions: [
        {
          title: "Documenter les paramètres",
          description: "Les configuration actuelle assurant conformité totale. À conserver en référence.",
          priority: "low",
          action: "Archiver"
        }
      ]
    }
  ])

  const acknowledgeAlert = (alertId: string) => {
    setAlerts((prev) => prev.map((alert) => (alert.id === alertId ? { ...alert, acknowledged: true } : alert)))
  }

  const dismissAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId))
  }

  const archiveAll = () => {
    setAlerts((prev) => prev.map((alert) => ({ ...alert, acknowledged: true })))
  }

  const getAlertIcon = (level: string) => {
    switch (level) {
      case "critical":
        return <AlertOctagon className="w-5 h-5 text-red-700" />
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-700" />
      case "info":
        return <Info className="w-5 h-5 text-blue-700" />
      case "success":
        return <CheckCircle className="w-5 h-5 text-emerald-700" />
      default:
        return <Info className="w-5 h-5" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "thermique":
        return <Thermometer className="w-4 h-4" />
      case "qualité":
        return <Droplets className="w-4 h-4" />
      case "ressources":
        return <Activity className="w-4 h-4" />
      case "production":
        return <Zap className="w-4 h-4" />
      case "maintenance":
        return <Wrench className="w-4 h-4" />
      case "ia":
        return <Brain className="w-4 h-4" />
      default:
        return <Info className="w-4 h-4" />
    }
  }

  const getSeverityBadge = (level: string) => {
    switch (level) {
      case "critical":
        return <Badge className="bg-red-100 text-red-700 border-red-300">Critique</Badge>
      case "warning":
        return <Badge className="bg-amber-100 text-amber-700 border-amber-300">Avertissement</Badge>
      case "info":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Information</Badge>
      case "success":
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">Succès</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-600 border-slate-300">Inconnu</Badge>
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-50 border-red-300 text-red-700"
      case "medium":
        return "bg-amber-50 border-amber-300 text-amber-700"
      case "low":
        return "bg-blue-50 border-blue-300 text-blue-700"
      default:
        return "bg-slate-100 border-slate-300 text-slate-700"
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-red-100 text-red-700 border-red-300">Haute Priorité</Badge>
      case "medium":
        return <Badge className="bg-amber-100 text-amber-700 border-amber-300">Priorité Moyenne</Badge>
      case "low":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Basse Priorité</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-600 border-slate-300">Non définie</Badge>
    }
  }

  const getAlertStyle = (level: string, acknowledged: boolean) => {
    const opacity = acknowledged ? "opacity-60" : ""
    switch (level) {
      case "critical":
        return `border-red-300 bg-red-50 hover:bg-red-50 ${opacity}`
      case "warning":
        return `border-amber-300 bg-amber-50 hover:bg-amber-50 ${opacity}`
      case "info":
        return `border-blue-300 bg-blue-50 hover:bg-blue-50 ${opacity}`
      case "success":
        return `border-emerald-300 bg-emerald-50 hover:bg-emerald-50 ${opacity}`
      default:
        return `border-slate-300 bg-slate-100 ${opacity}`
    }
  }

  const filteredAlerts = alerts.filter((alert) => {
    switch (activeFilter) {
      case "critical":
        return alert.level === "critical"
      case "warning":
        return alert.level === "warning"
      case "info":
        return alert.level === "info" || alert.level === "success"
      case "unacknowledged":
        return !alert.acknowledged
      default:
        return true
    }
  })

  const criticalCount = alerts.filter((a) => a.level === "critical" && !a.acknowledged).length
  const warningCount = alerts.filter((a) => a.level === "warning" && !a.acknowledged).length
  const infoCount = alerts.filter((a) => (a.level === "info" || a.level === "success") && !a.acknowledged).length
  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length

  const handleAdd = () => {
    const trimmed = emailInput.trim()
    if (!trimmed) return
    if (!trimmed.includes("@")) {
      console.error("Invalid email format")
      return
    }
    addAlertEmail(trimmed)
    setEmailInput("")
  }

  return (
    <div className="space-y-6">
      {/* Header with Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-900">Alertes</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            size="sm"
            className="bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-100"
          >
            <Settings className="w-4 h-4 mr-2" /> Configurer
          </Button>
          <Button
            size="sm"
            className="bg-cyan-100 text-cyan-700 border border-cyan-300 hover:bg-cyan-100"
            onClick={() => setAlerts((prev) => prev.map((alert) => ({ ...alert, acknowledged: true })))}
          >
            <Archive className="w-4 h-4 mr-2" />
            Archiver Tout
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-white border-2 border-red-200 shadow-lg shadow-red-500/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 text-sm">Alertes Critiques</p>
              <AlertOctagon className="w-5 h-5 text-red-700" />
            </div>
            <p className="text-4xl font-bold text-red-700">{criticalCount}</p>
            <p className="text-xs text-red-700 mt-2">Action immédiate requise</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white border-2 border-amber-200 shadow-lg shadow-amber-500/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 text-sm">Avertissements</p>
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <p className="text-4xl font-bold text-amber-700">{warningCount}</p>
            <p className="text-xs text-amber-700 mt-2">Surveillance nécessaire</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-50 to-white border-2 border-slate-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 text-sm">Moyennes Audits</p>
              <Info className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-4xl font-bold text-slate-700">{infoCount}</p>
            <p className="text-xs text-slate-600 mt-2">Info</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-white border-2 border-cyan-200 shadow-lg shadow-cyan-500/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-600 text-sm">Total Alts</p>
              <AlertCircle className="w-5 h-5 text-cyan-700" />
            </div>
            <p className="text-4xl font-bold text-cyan-700">{alerts.length}</p>
            <p className="text-xs text-cyan-700 mt-2">{unacknowledgedCount} non acquittées</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          size="sm"
          variant={activeFilter === "all" ? "default" : "outline"}
          className={activeFilter === "all" ? "bg-cyan-500 hover:bg-cyan-600" : "bg-slate-100 hover:bg-slate-100"}
          onClick={() => setActiveFilter("all")}
        >
          Tous ({alerts.length})
        </Button>
        <Button
          size="sm"
          variant={activeFilter === "critical" ? "default" : "outline"}
          className={activeFilter === "critical" ? "bg-red-500 hover:bg-red-600" : "bg-slate-100 hover:bg-slate-100"}
          onClick={() => setActiveFilter("critical")}
        >
          Critique ({alerts.filter(a => a.level === "critical").length})
        </Button>
        <Button
          size="sm"
          variant={activeFilter === "warning" ? "default" : "outline"}
          className={activeFilter === "warning" ? "bg-amber-500 hover:bg-amber-600" : "bg-slate-100 hover:bg-slate-100"}
          onClick={() => setActiveFilter("warning")}
        >
          Avertissements ({alerts.filter(a => a.level === "warning").length})
        </Button>
        <Button
          size="sm"
          variant={activeFilter === "info" ? "default" : "outline"}
          className={activeFilter === "info" ? "bg-blue-500 hover:bg-blue-600" : "bg-slate-100 hover:bg-slate-100"}
          onClick={() => setActiveFilter("info")}
        >
          Informations ({alerts.filter(a => a.level === "info" || a.level === "success").length})
        </Button>
        <Button
          size="sm"
          variant={activeFilter === "unacknowledged" ? "default" : "outline"}
          className={activeFilter === "unacknowledged" ? "bg-purple-500 hover:bg-purple-600" : "bg-slate-100 hover:bg-slate-100"}
          onClick={() => setActiveFilter("unacknowledged")}
        >
          Non Acquittés ({unacknowledgedCount})
        </Button>
      </div>

      {/* Alert email recipients - FIXED */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Destinataires Alertes</h3>
            <p className="text-xs text-slate-600">
              {alertEmails && alertEmails.length > 0 ? (
                <>
                  Principal: <span className="text-cyan-700 font-medium">{alertEmails[0]}</span>
                </>
              ) : (
                "—"
              )}
            </p>
          </div>
          <button
            onClick={() =>
              sendAlertEmail({
                title: "Test alerte",
                message: "Ceci est un test d'envoi d'alerte.",
                suggestion: "Vérifiez la configuration de Resend.",
              })
            }
            className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-500 transition-colors"
          >
            Envoyer un test
          </button>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            className="flex-1 rounded-lg bg-slate-100 border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="email@exemple.com"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={!emailInput.trim()}
            className="px-3 py-2 rounded-lg bg-cyan-600 text-white text-sm hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Ajouter
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {alertEmails && alertEmails.length > 0 ? (
            alertEmails.map((email, idx) => (
              <span
                key={email}
                className={`flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-900 text-xs px-2 py-1 rounded-lg ${
                  idx === 0 ? "ring-1 ring-cyan-500/50" : ""
                }`}
              >
                <span>{email}</span>
                <button
                  onClick={() => setPrimaryAlertEmail(email)}
                  className={`text-slate-600 hover:text-cyan-700 transition-colors ${
                    idx === 0 ? "cursor-default opacity-60" : ""
                  }`}
                  aria-label={`Définir ${email} comme principal`}
                  disabled={idx === 0}
                  title={idx === 0 ? "Déjà principal" : "Définir comme principal"}
                >
                  <Star className={`w-3 h-3 ${idx === 0 ? "fill-cyan-400 text-cyan-700" : ""}`} />
                </button>
                <button
                  onClick={() => removeAlertEmail(email)}
                  className="text-slate-600 hover:text-red-700 transition-colors"
                  aria-label={`Supprimer ${email}`}
                >
                  ×
                </button>
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-500">Aucun destinataire configuré</span>
          )}
        </div>
      </div>

      {/* Alert Cards */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <Card className="bg-white border-slate-200">
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-emerald-700 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucune alerte</h3>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-700 mt-1" />
                <div>
                  <p className="text-amber-700 font-semibold mb-1">Aucune alerte</p>
                  <p className="text-sm text-amber-700">Aucun résultat pour ce filtre</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredAlerts.map((alert) => (
            <Card key={alert.id} className={`border transition-all duration-300 ${getAlertStyle(alert.level, alert.acknowledged)} min-w-0`}>
              <CardContent className="p-6">
                {/* Header Row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.level)}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getSeverityBadge(alert.level)}
                        {alert.acknowledged && (
                          <Badge className="bg-slate-100 text-slate-600 border-slate-300">
                            Acquitté
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 text-lg">{alert.title}</h4>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-slate-700 mb-4 ml-8">{alert.description}</p>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 ml-8">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-600" />
                    <div>
                      <p className="text-xs text-slate-500">Source</p>
                      <p className="text-sm text-slate-900 font-medium">{alert.source}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-600" />
                    <div>
                      <p className="text-xs text-slate-500">Horodatage</p>
                      <p className="text-sm text-slate-900 font-medium">{alert.timestamp}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(alert.category)}
                    <div>
                      <p className="text-xs text-slate-500">Catégorie</p>
                      <p className="text-sm text-slate-900 font-medium capitalize">{alert.category}</p>
                    </div>
                  </div>
                </div>

                {/* Impact Box */}
                {alert.impact && !alert.acknowledged && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 ml-8">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-700 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-yellow-700 mb-1">Impact</p>
                        <p className="text-sm text-yellow-700">{alert.impact}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Suggestions Section */}
                {alert.aiSuggestions && alert.aiSuggestions.length > 0 && (
                  <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-200 rounded-lg p-4 mb-4 ml-8">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="w-5 h-5 text-purple-700" />
                      <h5 className="font-semibold text-purple-700">Suggestions IA</h5>
                    </div>
                    <div className="space-y-3">
                      {alert.aiSuggestions.map((suggestion, idx) => (
                        <div key={idx} className={`border rounded-lg p-3 ${getPriorityColor(suggestion.priority)}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-sm mb-1">{suggestion.title}</p>
                              {getPriorityBadge(suggestion.priority)}
                            </div>
                          </div>
                          <p className="text-xs opacity-90 mb-3">{suggestion.description}</p>
                          {suggestion.action && (
                            <Button
                              size="sm"
                              className="bg-purple-500 hover:bg-purple-600 text-white text-xs h-7"
                              onClick={() => {
                                // Handle action
                                console.log(`Action: ${suggestion.action} - ${suggestion.title}`)
                              }}
                            >
                              {suggestion.action}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 ml-8">
                  {!alert.acknowledged && (
                    <Button
                      size="sm"
                      className="bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Acquitter
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="bg-red-100 text-red-700 border border-red-300 hover:bg-red-100"
                    onClick={() => dismissAlert(alert.id)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Rejeter
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
