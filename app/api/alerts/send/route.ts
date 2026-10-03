import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { recipients, title, message, suggestion } = await req.json()

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: "No recipients provided" }, { status: 400 })
    }

    const apiKey = process.env.RESEND_API_KEY
    const emailFrom = process.env.NEXT_PUBLIC_EMAIL_FROM || "onboarding@resend.dev"

    if (!apiKey) {
      console.error("❌ RESEND_API_KEY not configured")
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      )
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">${title}</h2>
        </div>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px;">
          <p style="color: #333; line-height: 1.6;">${String(message).replace(/\n/g, '<br>')}</p>
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin-top: 20px; border-radius: 4px;">
            <p style="margin: 0; color: #856404;"><strong>Suggestion IA:</strong></p>
            <p style="margin: 8px 0 0 0; color: #856404;">${String(suggestion).replace(/\n/g, '<br>')}</p>
          </div>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 12px;">
            <p>Système SCADA-IA | Monitoring Industriel</p>
            <p>Heure d'envoi: ${new Date().toLocaleString("fr-FR")}</p>
          </div>
        </div>
      </div>
    `

    // Send to each recipient individually
    const sendResults = await Promise.all(
      recipients.map(async (to: string) => {
        try {
          const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              from: emailFrom,
              to: [to],
              subject: `[SCADA-IA] ${title}`,
              html,
            }),
          })

          if (!resendResponse.ok) {
            const errorData = await resendResponse.json()
            console.error(`❌ Failed to send to ${to}:`, errorData)
            return { to, success: false, error: errorData?.message }
          }

          const responseData = await resendResponse.json()
          console.log(`✅ Email sent to ${to}:`, responseData.id)
          return { to, success: true, messageId: responseData.id }
        } catch (error) {
          console.error(`❌ Error sending to ${to}:`, error)
          return { to, success: false, error: error instanceof Error ? error.message : "Unknown error" }
        }
      })
    )

    const successCount = sendResults.filter((r) => r.success).length
    const failureCount = sendResults.filter((r) => !r.success).length

    if (successCount === 0) {
      return NextResponse.json(
        { error: "Failed to send email to any recipient" },
        { status: 500 }
      )
    }

    console.log(`✅ Sent ${successCount} emails, ${failureCount} failed`)

    return NextResponse.json({
      ok: true,
      totalSent: successCount,
      totalFailed: failureCount,
      results: sendResults,
    })
  } catch (error) {
    console.error("❌ Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send email" },
      { status: 500 }
    )
  }
}
