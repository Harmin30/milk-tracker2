"use client";

// Client-side authentication and session restoration utilities
export const INACTIVITY_TIMEOUT_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

interface SessionMeta {
  authenticated: boolean;
  lastActive: number;
  remember?: boolean;
}

// Mutex / singleton promise for concurrency-safe token refresh
let refreshPromise: Promise<boolean> | null = null;

/**
 * Reads non-sensitive session metadata from document.cookie
 */
export function getSessionMeta(): SessionMeta | null {
  if (typeof document === "undefined") return null;

  try {
    const cookies = document.cookie.split("; ");
    const metaCookie = cookies.find((c) => c.startsWith("auth_session_meta="));
    if (!metaCookie) return null;

    const raw = decodeURIComponent(metaCookie.substring("auth_session_meta=".length));
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Checks if the client-side inactivity has exceeded 14 days.
 */
export function isClientInactivityExceeded(): boolean {
  const meta = getSessionMeta();
  if (!meta || !meta.lastActive) return false;

  const elapsed = Date.now() - meta.lastActive;
  return elapsed >= INACTIVITY_TIMEOUT_MS;
}

/**
 * Performs concurrency-safe refresh of the session using the refresh token.
 * Prevents multiple simultaneous refresh requests when multiple API calls encounter 401.
 */
export async function refreshAuthSession(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      // Check network status before attempting refresh
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        // Offline: do not log out user due to network disconnection
        return false;
      }

      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (res.ok) {
        return true;
      }

      if (res.status === 401 || res.status === 403) {
        // Inactivity exceeded, revoked, or account deactivated
        return false;
      }

      return false;
    } catch (err) {
      // Network failure or offline: preserve session and don't force logout
      console.warn("Session refresh network error (preserving session):", err);
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Authenticated Fetch wrapper:
 * 1. Automatically attaches credentials (HttpOnly cookies).
 * 2. On 401 Unauthorized, automatically triggers concurrency-safe token refresh and retries the request once.
 * 3. Gracefully preserves session on temporary internet disconnections.
 */
export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const options: RequestInit = {
    ...init,
    credentials: "include",
  };

  try {
    let res = await fetch(input, options);

    // If 401 Unauthorized, attempt automatic token refresh
    if (res.status === 401) {
      const refreshed = await refreshAuthSession();

      if (refreshed) {
        // Retry original request with newly issued session cookie
        res = await fetch(input, options);
      }
    }

    return res;
  } catch (err) {
    // If offline or network error, let caller handle display without logging user out
    throw err;
  }
}

/**
 * Records meaningful authenticated activity to the backend (throttled).
 */
export async function recordMeaningfulActivity(): Promise<void> {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    await fetch("/api/auth/activity", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Ignore background network errors
  }
}

/**
 * Clears client-side session information.
 */
export function clearClientSession(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem("welcomeName");
  } catch {
    // Ignore
  }
}

