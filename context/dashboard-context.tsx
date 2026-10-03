"use client"

import React, { createContext, useState, useCallback, ReactNode } from "react"

export interface SystemNotification {
  id: string
  type: "anomaly-detected" | "anomaly-resolved" | "data-updated"
  title: string
  message: string
  timestamp: string
  anomalyType?: "uncomfortable-steam" | "water-leak"
  severity: "critical" | "warning" | "info"
}

export interface UnitReport {
  id: string
  title: string
  category:
    | "Performance Globale"
    | "Intelligence Artificielle"
    | "Énergie"
    | "Ressources Hydrauliques"
    | "Centrale Thermique"
    | "Unité Sulfurique"
    | "TED"
    | "CAP"
  date: string // DD/MM/YYYY
  size: string // e.g., "2.4 MB"
}

export interface DashboardContextType {
  anomalyActive: "none" | "uncomfortable-steam" | "water-leak"
  setAnomalyActive: (anomaly: "none" | "uncomfortable-steam" | "water-leak") => void
  notifications: SystemNotification[]
  addNotification: (notification: Omit<SystemNotification, "id" | "timestamp">) => void
  dismissNotification: (id: string) => void
  dataMultiplier: number
  reports: UnitReport[]
  addReport: (report: Omit<UnitReport, "id">) => void
  removeReport: (id: string) => void
  alertEmails: string[]
  addAlertEmail: (email: string) => void
  removeAlertEmail: (email: string) => void
  sendAlertEmail: (payload: { title: string; message: string; suggestion?: string }) => Promise<void>
  setPrimaryAlertEmail: (email: string) => void
}

// Safe default context for SSR/prerender (no-ops)
const defaultContext: DashboardContextType = {
  anomalyActive: "none",
  setAnomalyActive: () => {},
  notifications: [],
  addNotification: () => {},
  dismissNotification: () => {},
  dataMultiplier: 1,
  reports: [],
  addReport: () => {},
  removeReport: () => {},
  alertEmails: [],
  addAlertEmail: () => {},
  removeAlertEmail: () => {},
  sendAlertEmail: async () => {},
  setPrimaryAlertEmail: () => {},
}

// Initialize with safe defaults instead of undefined
const DashboardContext = createContext<DashboardContextType>(defaultContext)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [anomalyActive, setAnomalyState] = useState<"none" | "uncomfortable-steam" | "water-leak">("none")
  const [notifications, setNotifications] = useState<SystemNotification[]>([])
  const [dataMultiplier, setDataMultiplier] = useState(1)
  const [reports, setReports] = useState<UnitReport[]>([
    // Existing global/system-level reports (examples)
    { id: "r-1", title: "Rapport Performance Globale", category: "Performance Globale", date: "11/12/2025", size: "2.4 MB" },
    { id: "r-2", title: "Intelligence Artificielle - Décembre", category: "Intelligence Artificielle", date: "10/12/2025", size: "5.8 MB" },
    { id: "r-3", title: "Analyse Énergétique Mensuelle", category: "Énergie", date: "10/12/2025", size: "5.2 MB" },
    { id: "r-4", title: "Audit Ressources Hydrauliques", category: "Ressources Hydrauliques", date: "08/12/2025", size: "3.8 MB" },
    { id: "r-5", title: "Rapport Hebdomadaire Opérations", category: "Performance Globale", date: "08/12/2025", size: "8.1 MB" },
    { id: "r-6", title: "Bilan Mensuel Novembre", category: "Performance Globale", date: "01/12/2025", size: "24.5 MB" },

    // Added: unit-specific reports (more rapports for all units)
    { id: "u-ct-1", title: "Centrale Thermique - Performance et Efficacité", category: "Centrale Thermique", date: "11/12/2025", size: "3.4 MB" },
    { id: "u-ct-2", title: "Centrale Thermique - Puissance et Température", category: "Centrale Thermique", date: "09/12/2025", size: "2.7 MB" },

    { id: "u-sulf-1", title: "Unité Sulfurique - Export Vapeur VHP/VBP", category: "Unité Sulfurique", date: "10/12/2025", size: "2.8 MB" },
    { id: "u-sulf-2", title: "Unité Sulfurique - Températures et Débits", category: "Unité Sulfurique", date: "07/12/2025", size: "2.5 MB" },

    { id: "u-ted-1", title: "TED - Débits Entrée/Sortie et Recyclage", category: "TED", date: "10/12/2025", size: "2.2 MB" },
    { id: "u-ted-2", title: "TED - Stock Actuel et Prévisions 24h", category: "TED", date: "06/12/2025", size: "2.0 MB" },

    { id: "u-cap-1", title: "CAP U/V/W - Analyse Condensat et Vapeur BP", category: "CAP", date: "11/12/2025", size: "2.1 MB" },
    { id: "u-cap-2", title: "CAP U/V/W - Charge et Puissance", category: "CAP", date: "08/12/2025", size: "1.9 MB" },

    { id: "u-elec-1", title: "Échange Électrique - Bilan Net Export/Import", category: "Énergie", date: "09/12/2025", size: "1.9 MB" },
    { id: "u-elec-2", title: "Échange Électrique - Statut et Énergie Utilisable", category: "Énergie", date: "05/12/2025", size: "1.7 MB" },
  ])

  const [alertEmails, setAlertEmails] = useState<string[]>(["ops@example.com"])

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const addNotification = useCallback((notification: Omit<SystemNotification, "id" | "timestamp">) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const timestamp = new Date().toLocaleTimeString("fr-FR")
    setNotifications((prev) => [
      ...prev,
      {
        ...notification,
        id,
        timestamp,
      },
    ])

    // Auto-dismiss after 8 seconds for info/warning
    if (notification.severity !== "critical") {
      setTimeout(() => dismissNotification(id), 8000)
    }
  }, [dismissNotification])

  const addAlertEmail = useCallback((email: string) => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    setAlertEmails((prev) => {
      const withoutDefault = prev.filter((e) => e !== "ops@example.com")
      if (withoutDefault.includes(trimmed)) return withoutDefault
      return [trimmed, ...withoutDefault]
    })
  }, [])

  const setPrimaryAlertEmail = useCallback((email: string) => {
    setAlertEmails((prev) => {
      const filtered = prev.filter((e) => e !== email)
      return [email, ...filtered]
    })
  }, [])

  const removeAlertEmail = useCallback((email: string) => {
    setAlertEmails((prev) => prev.filter((e) => e !== email))
  }, [])

  // SEND ALERT EMAIL - FIXED DEPENDENCY ISSUE
  const sendAlertEmail = useCallback(
    async (payload: { title: string; message: string; suggestion?: string }) => {
      console.log("📧 sendAlertEmail called with title:", payload.title)

      // Get current alert emails directly instead of relying on closure
      const currentEmails = alertEmails
      
      if (!currentEmails || currentEmails.length === 0) {
        console.warn("⚠️ No alert emails configured")
        addNotification({
          type: "data-updated",
          title: "❌ Aucune adresse configurée",
          message: "Veuillez ajouter une adresse dans les paramètres des alertes",
          severity: "warning",
        })
        return
      }

      const recipientsList = currentEmails

      try {
        console.log("📤 Sending email to all recipients:", recipientsList)
        console.log("📧 Email details:", { title: payload.title, recipients: recipientsList })
        
        const response = await fetch("/api/alerts/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipients: recipientsList,
            title: payload.title,
            message: payload.message,
            suggestion: payload.suggestion ?? "Aucune suggestion fournie",
          }),
        })

        const data = await response.json()
        console.log("📬 Response from server:", data)

        if (!response.ok) {
          const errorMsg = data?.error || `HTTP ${response.status}`
          console.error("❌ Failed to send email:", errorMsg)
          addNotification({
            type: "data-updated",
            title: "⚠️ Échec d'envoi email",
            message: `Erreur: ${errorMsg}`,
            severity: "warning",
          })
          return
        }

        console.log("✅ Email sent successfully:", data)
        addNotification({
          type: "data-updated",
          title: "✉️ Emails envoyés",
          message: `Alerte envoyée à ${recipientsList.length} destinataire(s)`,
          severity: "info",
        })
      } catch (error) {
        console.error("❌ Network error:", error)
        addNotification({
          type: "data-updated",
          title: "❌ Erreur email",
          message: error instanceof Error ? error.message : "Erreur inconnue",
          severity: "warning",
        })
      }
    },
    [alertEmails, addNotification]
  )

  // SET ANOMALY ACTIVE - FIXED EMAIL SENDING FOR ALL ANOMALIES
  const setAnomalyActive = useCallback(
    (anomaly: "none" | "uncomfortable-steam" | "water-leak") => {
      setAnomalyState(anomaly)

      const timestamp = new Date().toLocaleTimeString("fr-FR")
      const date = new Date().toLocaleDateString("fr-FR")

      if (anomaly === "none") {
        addNotification({
          type: "anomaly-resolved",
          title: "Anomalie résolue",
          message: "Système normalisé",
          severity: "info",
        })
        setDataMultiplier(1)
        return
      }

      if (anomaly === "uncomfortable-steam") {
        const title = "⚠️ Anomalie détectée: Vapeur Non Conforme"
        const message = `Écart critique détecté entre vapeur et retour condensat. Décalage: 35%.
        
Détails:
- Date: ${date}
- Heure: ${timestamp}
- Localisation: Centrale Thermique - Circuit Vapeur
- Sévérité: Avertissement
- Impact: Efficacité réduite de ~8%`
        const suggestion = `Suggestions IA pour résolution:

1. Réduire l'apport thermique (Priorité Haute)
   - Action: Diminuer l'alimentation en vapeur VHP de 15%
   - Objectif: Ramener la température à 415°C
   
2. Augmenter le débit de refroidissement (Priorité Haute)
   - Action: Augmenter le circuit de refroidissement secondaire de 20%
   - Objectif: Accélérer la dissipation thermique
   
3. Vérifier les échangeurs (Priorité Moyenne)
   - Action: Inspecter l'échangeur thermique
   - Objectif: Déceler un encrassement possible`

        addNotification({
          type: "anomaly-detected",
          title,
          message: "Écart critique détecté entre vapeur et retour condensat",
          severity: "warning",
          anomalyType: "uncomfortable-steam",
        })
        setDataMultiplier(0.92)
        sendAlertEmail({ title, message, suggestion })
        return
      }

      if (anomaly === "water-leak") {
        const title = "🚨 Anomalie détectée: Fuite d'Eau"
        const message = `Perte d'eau importante détectée en TED. Perte: 30%.
        
Détails:
- Date: ${date}
- Heure: ${timestamp}
- Localisation: Traitement TED - Circuit Hydraulique
- Sévérité: Critique
- Impact: Efficacité réduite de ~15%`
        const suggestion = `Suggestions IA pour résolution:

1. Commander un approvisionnement d'urgence (Priorité Haute)
   - Action: Lancer une commande express de 5 tonnes de produits TED
   - Objectif: Éviter rupture de stock
   
2. Optimiser la consommation (Priorité Haute)
   - Action: Réduire les débits de recyclage non essentiels de 10%
   - Objectif: Étendre les stocks actuels
   
3. Nettoyer les filtres (Priorité Haute)
   - Action: Nettoyage immédiat des filtres d'entrée
   - Objectif: Restaurer le débit nominal`

        addNotification({
          type: "anomaly-detected",
          title,
          message: "Perte d'eau importante détectée en TED",
          severity: "critical",
          anomalyType: "water-leak",
        })
        setDataMultiplier(0.85)
        sendAlertEmail({ title, message, suggestion })
        return
      }
    },
    [addNotification, sendAlertEmail]
  )

  const addReport = useCallback((report: Omit<UnitReport, "id">) => {
    const id = `rep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setReports((prev) => [...prev, { ...report, id }])
  }, [])

  const removeReport = useCallback((id: string) => {
    setReports((prev) => prev.filter((r) => r.id !== id))
  }, [])

  return (
    <DashboardContext.Provider
      value={{
        anomalyActive,
        setAnomalyActive,
        notifications,
        addNotification,
        dismissNotification,
        dataMultiplier,
        reports,
        addReport,
        removeReport,
        alertEmails,
        addAlertEmail,
        removeAlertEmail,
        sendAlertEmail,
        setPrimaryAlertEmail,
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  // Return whatever context is available (safe defaults during SSR)
  return React.useContext(DashboardContext)
}
