/**
 * Relais vers l'API Python : /api/backend/api/live → BACKEND_URL/api/live
 *
 * Pourquoi un relais ? Le navigateur ne connaît ni l'adresse du backend ni sa clé secrète.
 * Ce code tourne sur le serveur Next.js (Vercel) : il ajoute l'en-tête X-API-Key et renvoie
 * la réponse telle quelle (JSON, PDF, Excel). Comme tout le site, il est derrière le mot de
 * passe défini dans proxy.ts.
 */

import type { NextRequest } from "next/server"

// L'hébergement gratuit du backend s'endort après 15 min : le premier appel peut prendre ~50 s.
export const maxDuration = 60

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000"

type Ctx = { params: Promise<{ path: string[] }> }

async function forward(request: NextRequest, { params }: Ctx) {
  const { path } = await params
  // Seules les routes /api/* du backend sont relayées, sans « .. » pour remonter ailleurs.
  if (path[0] !== "api" || path.some((p) => p === ".." || p === ".")) {
    return Response.json({ detail: "Chemin non autorisé" }, { status: 404 })
  }
  const url = `${BACKEND_URL}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`

  const headers = new Headers({ "X-API-Key": process.env.BACKEND_API_KEY ?? "" })
  const contentType = request.headers.get("content-type")
  if (contentType) headers.set("content-type", contentType)

  let res: Response
  try {
    res = await fetch(url, {
      method: request.method,
      headers,
      body: request.method === "GET" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
    })
  } catch {
    return Response.json({ detail: "Le backend ne répond pas (il démarre peut-être : réessayer dans une minute)" }, { status: 502 })
  }

  // On ne renvoie que les en-têtes utiles (type de contenu, nom du fichier téléchargé)
  const out = new Headers()
  for (const h of ["content-type", "content-disposition"]) {
    const v = res.headers.get(h)
    if (v) out.set(h, v)
  }
  return new Response(res.body, { status: res.status, headers: out })
}

export const GET = forward
export const POST = forward
