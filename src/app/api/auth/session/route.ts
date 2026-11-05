export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  extractTokensFromRequest,
  verifyAccessToken,
  validateSession,
  refreshSession,
  recordSessionActivity,
  setAuthCookies,
  clearAuthCookies,
} from "../../../../lib/auth";

export async function GET(req: Request) {
  try {
    const { accessToken, refreshToken } = extractTokensFromRequest(req);

    // 1. First attempt: verify existing access token
    if (accessToken) {
      const payload = verifyAccessToken(accessToken);

      if (payload && payload.userId) {
        if (payload.sessionId) {
          const validation = await validateSession(payload.sessionId);

          if (validation.valid && validation.user) {
            // Meaningful activity: app opened / session restored
            recordSessionActivity(payload.sessionId, false).catch(() => {});

            const res = NextResponse.json({
              authenticated: true,
              user: validation.user,
              session: {
                id: payload.sessionId,
                lastActiveAt: validation.session?.last_active_at,
              },
            });

            // Update client session metadata cookie
            res.cookies.set(
              "auth_session_meta",
              JSON.stringify({
                authenticated: true,
                lastActive: Date.now(),
              }),
              {
                httpOnly: false,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
                maxAge: 14 * 24 * 60 * 60,
              },
            );

            return res;
          } else if (validation.status === 403) {
            // Account deactivated
            const res = NextResponse.json(
              { authenticated: false, error: validation.error },
              { status: 403 },
            );
            clearAuthCookies(res);
            return res;
          }
        } else {
          // Legacy token without sessionId
          const res = NextResponse.json({
            authenticated: true,
            user: { id: payload.userId, email: payload.email },
          });
          return res;
        }
      }
    }

    // 2. Second attempt: access token is expired or missing, but refresh token exists
    if (refreshToken) {
      const refreshResult = await refreshSession(refreshToken, req);

      if (refreshResult.success) {
        const res = NextResponse.json({
          authenticated: true,
          restored: true,
          user: refreshResult.user,
          session: {
            id: refreshResult.session.id,
            lastActiveAt: refreshResult.session.last_active_at,
          },
        });

        // Set rotated cookies
        setAuthCookies(res, refreshResult.accessToken, refreshResult.newRefreshToken, true);
        return res;
      } else {
        const res = NextResponse.json(
          { authenticated: false, error: refreshResult.error },
          { status: refreshResult.status || 401 },
        );
        clearAuthCookies(res);
        return res;
      }
    }

    // 3. No tokens found
    const res = NextResponse.json(
      { authenticated: false, error: "No active session" },
      { status: 401 },
    );
    clearAuthCookies(res);
    return res;
  } catch (err) {
    console.error("Session check error:", err);
    return NextResponse.json(
      { authenticated: false, error: "Server error during session check" },
      { status: 500 },
    );
  }
}
