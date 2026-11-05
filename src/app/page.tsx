import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyAccessToken, validateSession, hashToken } from "../lib/auth";
import { pool } from "../lib/db";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (token) {
    const payload = verifyAccessToken(token);
    if (payload?.sessionId) {
      const validation = await validateSession(payload.sessionId);
      if (validation.valid) {
        redirect("/dashboard");
      }
    } else if (payload?.userId) {
      redirect("/dashboard");
    }
  }

  if (refreshToken) {
    try {
      const hash = hashToken(refreshToken);
      const res = await pool.query(
        `SELECT s.id, s.last_active_at, s.is_revoked, u.is_active
         FROM user_sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.refresh_token_hash = $1`,
        [hash],
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        const inactiveMs = Date.now() - new Date(row.last_active_at).getTime();
        const INACTIVITY_TIMEOUT_MS = 14 * 24 * 60 * 60 * 1000;
        if (!row.is_revoked && row.is_active && inactiveMs < INACTIVITY_TIMEOUT_MS) {
          redirect("/dashboard");
        }
      }
    } catch {
      // Fallback to login
    }
  }

  redirect("/login");
}
