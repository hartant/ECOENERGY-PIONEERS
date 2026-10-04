import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

// nodemailer needs the Node.js runtime (not Edge)
export const runtime = "nodejs"

/**
 * Sends an anomaly alert e-mail to every recipient.
 *
 * Two providers are supported, picked from the environment (.env.local):
 *  1. SMTP (e.g. Gmail)  → SMTP_USER + SMTP_PASS  (can send to ANY address)
 *  2. Resend             → RESEND_API_KEY          (without a verified domain, only to the account's own address)
 * SMTP wins when both are configured.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const escapeHtml = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

const nl2br = (s: unknown) => escapeHtml(s).replace(/\n/g, "<br>")

function buildHtml(title: string, message: string, suggestion: string) {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
      <h2 style="margin: 0;">${escapeHtml(title)}</h2>
    </div>
    <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px;">
      <p style="color: #333; line-height: 1.6;">${nl2br(message)}</p>
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin-top: 20px; border-radius: 4px;">
        <p style="margin: 0; color: #856404;"><strong>Suggestion IA :</strong></p>
        <p style="margin: 8px 0 0 0; color: #856404;">${nl2br(suggestion)}</p>
      </div>
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 12px;">
        <p>EcoEnergy Pioneers · SCADA-IA</p>
        <p>Heure d'envoi : ${new Date().toLocaleString("fr-FR")}</p>
      </div>
    </div>
  </div>`
}

type SendResult = { to: string; success: boolean; messageId?: string; error?: string }

async function sendWithSmtp(recipients: string[], subject: string, html: string, text: string): Promise<SendResult[]> {
  const user = process.env.SMTP_USER!
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user, pass: process.env.SMTP_PASS! },
  })
  const from = process.env.EMAIL_FROM || `SCADA-IA <${user}>`

  return Promise.all(
    recipients.map(async (to) => {
      try {
        const info = await transporter.sendMail({ from, to, subject, html, text })
        return { to, success: true, messageId: info.messageId }
      } catch (e) {
        return { to, success: false, error: e instanceof Error ? e.message : String(e) }
      }
    }),
  )
}

async function sendWithResend(recipients: string[], subject: string, html: string, text: string): Promise<SendResult[]> {
  const from = process.env.EMAIL_FROM || process.env.NEXT_PUBLIC_EMAIL_FROM || "onboarding@resend.dev"
  return Promise.all(
    recipients.map(async (to) => {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
          body: JSON.stringify({ from, to: [to], subject, html, text }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return { to, success: false, error: data?.message || `HTTP ${res.status}` }
        return { to, success: true, messageId: data.id }
      } catch (e) {
        return { to, success: false, error: e instanceof Error ? e.message : String(e) }
      }
    }),
  )
}

export async function POST(req: Request) {
  try {
    const { recipients, title, message, suggestion } = await req.json()

    const list: string[] = Array.isArray(recipients)
      ? [...new Set(recipients.map((r: unknown) => String(r).trim().toLowerCase()).filter((r) => EMAIL_RE.test(r)))]
      : []
    if (list.length === 0) {
      return NextResponse.json({ error: "Aucune adresse e-mail valide" }, { status: 400 })
    }

    const useSmtp = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)
    const useResend = Boolean(process.env.RESEND_API_KEY)
    if (!useSmtp && !useResend) {
      console.error("❌ Aucun service e-mail configuré (SMTP_USER/SMTP_PASS ou RESEND_API_KEY manquant dans .env.local)")
      return NextResponse.json(
        { error: "Service e-mail non configuré : ajoutez SMTP_USER et SMTP_PASS dans .env.local puis redémarrez le serveur" },
        { status: 500 },
      )
    }

    const subject = `[SCADA-IA] ${String(title ?? "Alerte")}`
    const html = buildHtml(String(title ?? ""), String(message ?? ""), String(suggestion ?? "Aucune suggestion"))
    const text = `${title}\n\n${message}\n\nSuggestion IA :\n${suggestion ?? ""}`

    const results = useSmtp ? await sendWithSmtp(list, subject, html, text) : await sendWithResend(list, subject, html, text)
    const sent = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success)

    failed.forEach((f) => console.error(`❌ Échec vers ${f.to} : ${f.error}`))

    if (sent === 0) {
      return NextResponse.json(
        { error: failed[0]?.error || "Échec de l'envoi", provider: useSmtp ? "smtp" : "resend", results },
        { status: 502 },
      )
    }

    console.log(`✅ ${sent} e-mail(s) envoyé(s) via ${useSmtp ? "SMTP" : "Resend"}, ${failed.length} échec(s)`)
    return NextResponse.json({ ok: true, provider: useSmtp ? "smtp" : "resend", totalSent: sent, totalFailed: failed.length, results })
  } catch (error) {
    console.error("❌ Error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Échec de l'envoi" }, { status: 500 })
  }
}
