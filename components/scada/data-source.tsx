"use client"

import { AlertTriangle, PlayCircle } from "lucide-react"
import type { Live, Source } from "@/lib/api"
import { formatDate } from "@/lib/api"
import { cn } from "@/lib/utils"

/** Petit badge « simulé » : toute valeur qui ne vient pas des données réelles doit le porter. */
export function SimBadge({ source, className }: { source?: Source; className?: string }) {
  if (source !== "simulated") return null
  return (
    <span
      title="Valeur simulée : cette mesure n'existe pas dans les données réelles du site"
      className={cn(
        "ml-1 inline-flex items-center rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wide bg-violet-100 text-violet-700 align-middle",
        className,
      )}
    >
      simulé
    </span>
  )
}

/** Bandeau : quel jour réel est rejoué, et à quelle vitesse. */
export function ReplayChip({ replay }: { replay: Live["replay"] }) {
  const h = Math.floor(replay.hour)
  const m = Math.floor((replay.hour - h) * 60)
  return (
    <span
      title={`Rejeu des données réelles 2025 : 1 jour = ${replay.seconds_per_day} s (jour ${replay.day_index + 1} / ${replay.days})`}
      className="inline-flex items-center gap-2 rounded-full bg-sky-50 border border-sky-200 px-3 py-1 text-xs font-semibold text-sky-700"
    >
      <PlayCircle className="w-3.5 h-3.5" />
      {replay.pinned ? "Jour figé" : "Rejeu"} · {formatDate(replay.date)} · {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}
    </span>
  )
}

/** Message clair quand l'API Python ne répond pas. */
export function ApiError({ error }: { error: Error }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex gap-3">
      <AlertTriangle className="w-5 h-5 shrink-0" />
      <div>
        <p className="font-semibold">Données indisponibles : l'API ne répond pas</p>
        <p className="mt-1 text-amber-700">
          {error.message}. Lancer le backend :{" "}
          <code className="rounded bg-amber-100 px-1">cd backend && uv run uvicorn app.main:app --reload --port 8000</code>
        </p>
      </div>
    </div>
  )
}
