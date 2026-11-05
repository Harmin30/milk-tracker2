export const runtime = "nodejs";

import crypto from "crypto";
import jwt from "jsonwebtoken";
import { pool } from "./db";
import { NextResponse } from "next/server";

// 14-Day Inactivity Timeout Constants
export const INACTIVITY_TIMEOUT_DAYS = 14;
export const INACTIVITY_TIMEOUT_MS = INACTIVITY_TIMEOUT_DAYS * 24 * 60 * 60 * 1000; // 1,209,600,000 ms
export const ACCESS_TOKEN_EXPIRY = "15m"; // Short-lived access token
export const REFRESH_COOKIE_MAX_AGE = INACTIVITY_TIMEOUT_DAYS * 24 * 60 * 60; // 14 days in seconds
export const ACTIVITY_THROTTLE_MS = 60 * 1000; // 1 minute throttle for DB activity writes

export interface TokenPayload {
  userId: string;
  email: string;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  sessionId?: string;
  name?: string;
  is_admin?: boolean;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateRandomToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function signAccessToken(
  payload: { userId: string; email: string; sessionId?: string },
  expiresIn: string | number = ACCESS_TOKEN_EXPIRY,
): string {
  const secret = process.env.JWT_SECRET || "default_jwt_secret_milk_tracker";
  return jwt.sign(payload, secret, {
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const secret = process.env.JWT_SECRET || "default_jwt_secret_milk_tracker";
    return jwt.verify(token, secret) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Creates a persistent session in user_sessions with a 14-day inactivity window.
 */
export async function createSession(
  userId: string,
  req?: Request,
  customNow?: Date,
): Promise<{
  session: {
    id: string;
    user_id: string;
    refresh_token_hash: string;
    last_active_at: Date;
    expires_at: Date;
  };
  accessToken: string;
  refreshToken: string;
}> {
  const refreshToken = generateRandomToken();
  const refreshTokenHash = hashToken(refreshToken);

  const now = customNow || new Date();
  const expiresAt = new Date(now.getTime() + INACTIVITY_TIMEOUT_MS);

  let userAgent = "";
  let ipAddress = "";

  if (req) {
    userAgent = req.headers.get("user-agent") || "";
    ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "";
  }

  // Fetch user email for token
  const userRes = await pool.query("SELECT id, email FROM users WHERE id = $1", [userId]);
  if (userRes.rows.length === 0) {
    throw new Error("User not found");
  }
  const user = userRes.rows[0];

  const sessionRes = await pool.query(
    `
    INSERT INTO user_sessions
      (user_id, refresh_token_hash, last_active_at, expires_at, user_agent, ip_address)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, user_id, refresh_token_hash, last_active_at, expires_at
    `,
    [userId, refreshTokenHash, now.toISOString(), expiresAt.toISOString(), userAgent, ipAddress],
  );

  const session = sessionRes.rows[0];

  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    sessionId: session.id,
  });

  return {
    session,
    accessToken,
    refreshToken,
  };
}

export function clearSessionValidationCache(sessionId?: string): void {
  void sessionId;
  // No-op: in-memory cache removed to ensure authoritative database validation
}

/**
 * Validates whether a session is active, not revoked, user is active,
 * and inactivity period has not exceeded 14 days.
 */
export async function validateSession(
  sessionId: string,
  customNow?: Date,
): Promise<{
  valid: boolean;
  error?: string;
  status?: number;
  user?: { id: string; email: string; name?: string; is_admin?: boolean };
  session?: { id: string; user_id: string; last_active_at: Date; expires_at: Date };
}> {
  const now = customNow || new Date();

  const res = await pool.query(
    `
    SELECT s.id, s.user_id, s.last_active_at, s.expires_at, s.is_revoked,
           u.email, u.name, u.is_active, u.is_admin
    FROM user_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = $1
    `,
    [sessionId],
  );

  if (res.rows.length === 0) {
    return { valid: false, error: "Session not found", status: 401 };
  }

  const row = res.rows[0];

  // Check if user account is deactivated
  if (!row.is_active) {
    return { valid: false, error: "Account deactivated", status: 403 };
  }

  // Check if session was revoked
  if (row.is_revoked) {
    return { valid: false, error: "Session revoked", status: 401 };
  }

  // Check 14-day inactivity timeout
  const lastActive = new Date(row.last_active_at);
  const inactiveDurationMs = now.getTime() - lastActive.getTime();

  if (inactiveDurationMs >= INACTIVITY_TIMEOUT_MS) {
    // Session expired due to inactivity: revoke in database
    await pool.query("UPDATE user_sessions SET is_revoked = TRUE WHERE id = $1", [sessionId]);
    return {
      valid: false,
      error: "Session expired due to 14 days of inactivity",
      status: 401,
    };
  }

  return {
    valid: true,
    user: {
      id: row.user_id,
      email: row.email,
      name: row.name,
      is_admin: row.is_admin,
    },
    session: {
      id: row.id,
      user_id: row.user_id,
      last_active_at: row.last_active_at,
      expires_at: row.expires_at,
    },
  };
}

/**
 * Updates the last activity timestamp in the database to extend the 14-day window.
 * Throttled to at most once per minute unless force=true.
 */
export async function recordSessionActivity(
  sessionId: string,
  force = false,
  customNow?: Date,
): Promise<boolean> {
  try {
    const now = customNow || new Date();
    const newExpiresAt = new Date(now.getTime() + INACTIVITY_TIMEOUT_MS);

    if (!force) {
      // Check last_active_at to throttle
      const current = await pool.query(
        "SELECT last_active_at FROM user_sessions WHERE id = $1 AND is_revoked = FALSE",
        [sessionId],
      );
      if (current.rows.length > 0) {
        const lastActive = new Date(current.rows[0].last_active_at);
        if (now.getTime() - lastActive.getTime() < ACTIVITY_THROTTLE_MS) {
          return true; // Throttled: no DB update needed yet
        }
      }
    }

    await pool.query(
      `
      UPDATE user_sessions
      SET last_active_at = $1, expires_at = $2
      WHERE id = $3 AND is_revoked = FALSE
      `,
      [now.toISOString(), newExpiresAt.toISOString(), sessionId],
    );

    return true;
  } catch (err) {
    console.error("Error recording session activity:", err);
    return false;
  }
}

/**
 * Refreshes an access token using a refresh token.
 * Performs refresh-token rotation: issues a new refresh token, updates hash,
 * checks inactivity (<14 days), checks user active status, and extends the 14-day window.
 */
export async function refreshSession(
  refreshToken: string,
  req?: Request,
  customNow?: Date,
): Promise<
  | {
      success: true;
      user: { id: string; email: string; name?: string; is_admin?: boolean };
      session: { id: string; user_id: string; last_active_at: Date; expires_at: Date };
      accessToken: string;
      newRefreshToken: string;
    }
  | { success: false; error: string; status: number }
> {
  const tokenHash = hashToken(refreshToken);
  const now = customNow || new Date();

  const res = await pool.query(
    `
    SELECT s.id, s.user_id, s.last_active_at, s.expires_at, s.is_revoked,
           u.email, u.name, u.is_active, u.is_admin
    FROM user_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.refresh_token_hash = $1
    `,
    [tokenHash],
  );

  if (res.rows.length === 0) {
    return { success: false, error: "Invalid refresh token", status: 401 };
  }

  const row = res.rows[0];

  if (!row.is_active) {
    return { success: false, error: "Account deactivated", status: 403 };
  }

  if (row.is_revoked) {
    return { success: false, error: "Session has been revoked", status: 401 };
  }

  const lastActive = new Date(row.last_active_at);
  const inactiveDurationMs = now.getTime() - lastActive.getTime();

  if (inactiveDurationMs >= INACTIVITY_TIMEOUT_MS) {
    // Inactivity timeout reached (14 days)
    await pool.query("UPDATE user_sessions SET is_revoked = TRUE WHERE id = $1", [row.id]);
    return {
      success: false,
      error: "Session expired due to 14 days of inactivity",
      status: 401,
    };
  }

  // Refresh-token rotation: generate new refresh token
  const newRefreshToken = generateRandomToken();
  const newHash = hashToken(newRefreshToken);
  const newExpiresAt = new Date(now.getTime() + INACTIVITY_TIMEOUT_MS);

  let userAgent = "";
  let ipAddress = "";
  if (req) {
    userAgent = req.headers.get("user-agent") || "";
    ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "";
  }

  await pool.query(
    `
    UPDATE user_sessions
    SET refresh_token_hash = $1,
        last_active_at = $2,
        expires_at = $3,
        user_agent = COALESCE(NULLIF($4, ''), user_agent),
        ip_address = COALESCE(NULLIF($5, ''), ip_address)
    WHERE id = $6
    `,
    [newHash, now.toISOString(), newExpiresAt.toISOString(), userAgent, ipAddress, row.id],
  );

  const accessToken = signAccessToken({
    userId: row.user_id,
    email: row.email,
    sessionId: row.id,
  });

  return {
    success: true,
    user: {
      id: row.user_id,
      email: row.email,
      name: row.name,
      is_admin: row.is_admin,
    },
    session: {
      id: row.id,
      user_id: row.user_id,
      last_active_at: now,
      expires_at: newExpiresAt,
    },
    accessToken,
    newRefreshToken,
  };
}

/**
 * Revokes a session by session ID.
 */
export async function revokeSession(sessionId: string): Promise<boolean> {
  try {
    clearSessionValidationCache(sessionId);
    await pool.query("UPDATE user_sessions SET is_revoked = TRUE WHERE id = $1", [sessionId]);
    return true;
  } catch (err) {
    console.error("Error revoking session:", err);
    return false;
  }
}

/**
 * Revokes a session by refresh token.
 */
export async function revokeSessionByRefreshToken(refreshToken: string): Promise<boolean> {
  try {
    clearSessionValidationCache();
    const hash = hashToken(refreshToken);
    await pool.query(
      "UPDATE user_sessions SET is_revoked = TRUE WHERE refresh_token_hash = $1",
      [hash],
    );
    return true;
  } catch (err) {
    console.error("Error revoking session by refresh token:", err);
    return false;
  }
}

/**
 * Revokes all sessions for a user (e.g. on account deactivation or password change).
 */
export async function revokeAllUserSessions(userId: string): Promise<boolean> {
  try {
    clearSessionValidationCache();
    await pool.query("UPDATE user_sessions SET is_revoked = TRUE WHERE user_id = $1", [userId]);
    return true;
  } catch (err) {
    console.error("Error revoking all user sessions:", err);
    return false;
  }
}

/**
 * Extracts authentication tokens from an incoming Request.
 */
export function extractTokensFromRequest(req: Request): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  const cookieHeader = req.headers.get("cookie");
  let accessToken: string | null = null;
  let refreshToken: string | null = null;

  if (cookieHeader) {
    const cookies = cookieHeader.split("; ");
    for (const cookie of cookies) {
      if (cookie.startsWith("token=")) {
        accessToken = cookie.substring(6);
      } else if (cookie.startsWith("refresh_token=")) {
        refreshToken = cookie.substring(14);
      }
    }
  }

  // Also check Authorization: Bearer <token>
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    accessToken = authHeader.substring(7).trim();
  }

  return { accessToken, refreshToken };
}

/**
 * Authenticates a request. Checks JWT access token and session validity in database.
 * If active and within 14 days, throttled activity is recorded.
 */
export async function getUserFromRequest(
  req: Request,
  customNow?: Date,
): Promise<AuthenticatedUser | null> {
  const { accessToken } = extractTokensFromRequest(req);
  if (!accessToken) return null;

  const payload = verifyAccessToken(accessToken);
  if (!payload || !payload.userId) return null;

  // If token has a sessionId, validate session against DB
  if (payload.sessionId) {
    const validation = await validateSession(payload.sessionId, customNow);
    if (!validation.valid || !validation.user) {
      return null;
    }

    // Record activity (throttled)
    recordSessionActivity(payload.sessionId, false, customNow).catch(() => {});

    return {
      userId: validation.user.id,
      email: validation.user.email,
      sessionId: payload.sessionId,
      name: validation.user.name,
      is_admin: validation.user.is_admin,
    };
  }

  // Fallback for legacy tokens without sessionId: verify user is active
  try {
    const userRes = await pool.query(
      "SELECT id, email, name, is_active, is_admin FROM users WHERE id = $1",
      [payload.userId],
    );
    if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
      return null;
    }
    return {
      userId: userRes.rows[0].id,
      email: userRes.rows[0].email,
      name: userRes.rows[0].name,
      is_admin: userRes.rows[0].is_admin,
    };
  } catch {
    return null;
  }
}

/**
 * Backward compatible getUserFromToken helper.
 */
export async function getUserFromToken(req: Request): Promise<AuthenticatedUser | null> {
  return getUserFromRequest(req);
}

/**
 * Sets secure authentication cookies on the outgoing response.
 */
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken?: string,
  remember = true,
): void {
  const isProd = process.env.NODE_ENV === "production";

  // Access token cookie
  response.cookies.set("token", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: remember ? REFRESH_COOKIE_MAX_AGE : undefined,
  });

  // Refresh token cookie (14-day inactivity lifecycle)
  if (refreshToken) {
    response.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: remember ? REFRESH_COOKIE_MAX_AGE : undefined,
    });
  }

  // Client-readable metadata cookie (NON-SENSITIVE: never contains token or secret)
  // Allows client to check last active timestamp and remember state across reloads/offline
  response.cookies.set(
    "auth_session_meta",
    JSON.stringify({
      authenticated: true,
      lastActive: Date.now(),
      remember,
    }),
    {
      httpOnly: false, // Accessible to client JavaScript
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: remember ? REFRESH_COOKIE_MAX_AGE : undefined,
    },
  );
}

/**
 * Clears authentication cookies on logout or session expiration.
 */
export function clearAuthCookies(response: NextResponse): void {
  const isProd = process.env.NODE_ENV === "production";

  response.cookies.set("token", "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });

  response.cookies.set("refresh_token", "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });

  response.cookies.set("auth_session_meta", "", {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
}
