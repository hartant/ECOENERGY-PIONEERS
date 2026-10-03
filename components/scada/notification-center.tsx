"use client"

import { useDashboard } from "@/context/dashboard-context"
import { AlertTriangle, AlertOctagon, Info, X, AlertCircle } from "lucide-react"

export function NotificationCenter({
  onNavigateToAlerts,
}: {
  onNavigateToAlerts?: () => void
} = {}) {
  const { notifications, dismissNotification } = useDashboard()

  if (notifications.length === 0) return null

  const handleViewAlerts = (notificationId: string) => {
    if (onNavigateToAlerts) {
      onNavigateToAlerts()
    }
    dismissNotification(notificationId)
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm animate-in slide-in-from-right-5 ${
            notification.severity === "critical"
              ? "bg-red-50 border-red-300 text-red-900 shadow-lg"
              : notification.severity === "warning"
                ? "bg-amber-50 border-amber-300 text-amber-900 shadow-lg"
                : "bg-blue-50 border-blue-300 text-blue-900 shadow-lg"
          }`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {notification.severity === "critical" && (
              <AlertOctagon className="w-5 h-5 text-red-700" />
            )}
            {notification.severity === "warning" && (
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            )}
            {notification.severity === "info" && (
              <AlertCircle className="w-5 h-5 text-blue-700" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{notification.title}</h3>
            <p className="text-xs opacity-90 mt-1">{notification.message}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs opacity-75">{notification.timestamp}</span>
              {notification.type === "anomaly-detected" && (
                <button
                  onClick={() => handleViewAlerts(notification.id)}
                  className="text-xs font-semibold underline hover:opacity-80 transition-opacity cursor-pointer"
                >
                  Voir les alertes
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => dismissNotification(notification.id)}
            className="flex-shrink-0 text-current opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

