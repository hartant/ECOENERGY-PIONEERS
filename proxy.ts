/**
 * Mot de passe sur tout le site (authentification HTTP « Basic »).
 *
 * Les données affichées sont des données réelles d'OCP : en ligne, seules les personnes qui ont
 * le mot de passe doivent pouvoir les voir. Actif seulement si SITE_PASSWORD est défini
 * (variables d'environnement Vercel) ; en local, rien ne change.
 *
 * Next.js 16 : ce fichier s'appelle proxy.ts (anciennement middleware.ts).
 */

import { NextResponse, type NextRequest } from "next/server"

/** Comparaison en temps constant : ne révèle pas, par le temps de réponse, combien de caractères sont justes. */
function safeEqual(a: string, b: string) {
  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}

export function proxy(request: NextRequest) {
  const password = process.env.SITE_PASSWORD
  if (!password) return NextResponse.next()
  const user = process.env.SITE_USER ?? "ocp"

  const auth = request.headers.get("authorization") ?? ""
  if (auth.startsWith("Basic ")) {
    try {
      const [u, ...rest] = atob(auth.slice(6)).split(":")
      if (safeEqual(u, user) && safeEqual(rest.join(":"), password)) return NextResponse.next()
    } catch {
      // en-tête mal formé : on redemande le mot de passe
    }
  }
  return new NextResponse("Authentification requise", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="EcoEnergy Pioneers", charset="UTF-8"' },
  })
}

export const config = {
  // Tout le site (pages ET routes /api), sauf les fichiers statiques de Next.js
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
