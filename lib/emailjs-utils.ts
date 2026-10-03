// This file is kept for backward compatibility but is no longer used.
// Email notifications are now handled through the backend API:
// See: c:\dev\steam\front-end\app\api\alerts\send\route.ts

export const initEmailJS = async (): Promise<boolean> => {
  console.log("✅ Email system initialized (backend API)")
  return true
}

export const notify = async (action: string): Promise<boolean> => {
  console.log("📧 Email notification:", action)
  // Email is now handled by setAnomalyActive in dashboard context
  return true
}
