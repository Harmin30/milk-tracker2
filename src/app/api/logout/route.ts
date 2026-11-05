export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  extractTokensFromRequest,
  verifyAccessToken,
  revokeSession,
  revokeSessionByRefreshToken,
  clearAuthCookies,
} from "../../../lib/auth";

export async function POST(req: Request) {
  try {
    const { accessToken, refreshToken } = extractTokensFromRequest(req);

    // 1. Revoke session if session ID is in access token
    if (accessToken) {
      const payload = verifyAccessToken(accessToken);
      if (payload && payload.sessionId) {
        await revokeSession(payload.sessionId);
      }
    }

    // 2. Also revoke by refresh token if present
    if (refreshToken) {
      await revokeSessionByRefreshToken(refreshToken);
    }

    const response = NextResponse.json({
      message: "Logged out",
    });

    // Clear all authentication cookies
    clearAuthCookies(response);

    return response;
  } catch (err) {
    console.error("Logout error:", err);
    const response = NextResponse.json({ message: "Logged out" });
    clearAuthCookies(response);
    return response;
  }
}
