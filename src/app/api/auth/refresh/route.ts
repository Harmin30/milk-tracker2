export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  extractTokensFromRequest,
  refreshSession,
  setAuthCookies,
  clearAuthCookies,
} from "../../../../lib/auth";

export async function POST(req: Request) {
  try {
    let { refreshToken } = extractTokensFromRequest(req);

    // Also check body if sent explicitly
    if (!refreshToken) {
      try {
        const body = await req.json();
        if (body && body.refreshToken) {
          refreshToken = body.refreshToken;
        }
      } catch {
        // Body might be empty
      }
    }

    if (!refreshToken) {
      const res = NextResponse.json(
        { error: "Refresh token required" },
        { status: 401 },
      );
      clearAuthCookies(res);
      return res;
    }

    const result = await refreshSession(refreshToken, req);

    if (!result.success) {
      const res = NextResponse.json(
        { error: result.error },
        { status: result.status || 401 },
      );
      clearAuthCookies(res);
      return res;
    }

    const res = NextResponse.json({
      message: "Session refreshed successfully",
      user: result.user,
      accessToken: result.accessToken, // Optional for bearer clients
    });

    // Set rotated refresh token & new access token in secure cookies
    setAuthCookies(res, result.accessToken, result.newRefreshToken, true);

    return res;
  } catch (err) {
    console.error("Token refresh error:", err);
    return NextResponse.json(
      { error: "Server error during token refresh" },
      { status: 500 },
    );
  }
}
