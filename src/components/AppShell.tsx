"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BottomNav from "./BottomNav";
import Header from "./Header";
import {
  isClientInactivityExceeded,
  recordMeaningfulActivity,
  clearClientSession,
} from "../lib/authClient";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/admin/login" ||
    pathname.startsWith("/admin/");

  const hideNav = isPublicRoute;

  // Session restoration state
  const [isRestoring, setIsRestoring] = useState(!isPublicRoute);
  const [isOffline, setIsOffline] = useState(false);

  // 1. Initial Session Restoration on App Launch
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      // If client inactivity is already 14 days or more, require login immediately
      if (isClientInactivityExceeded()) {
        clearClientSession();
        if (isMounted) {
          setIsRestoring(false);
          router.replace("/login?reason=inactivity");
        }
        return;
      }

      if (isPublicRoute) {
        setIsRestoring(false);
        return;
      }

      try {
        const res = await fetch("/api/auth/session", {
          credentials: "include",
        });

        if (!isMounted) return;

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setIsRestoring(false);
            return;
          }
        }

        if (res.status === 401 || res.status === 403) {
          // Inactivity expired, revoked, or deactivated
          clearClientSession();
          router.replace("/login");
          return;
        }

        // Server error or unexpected: don't immediately destroy session
        setIsRestoring(false);
      } catch (err) {
        // Network error / offline: preserve session and don't force logout
        console.warn("Session check offline or network error:", err);
        if (isMounted) {
          setIsRestoring(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [pathname, isPublicRoute, router]);

  // 2. Activity Tracking on Foreground / Visibility Change
  useEffect(() => {
    function handleVisibilityOrFocus() {
      if (document.visibilityState === "visible") {
        // Check if 14 days inactivity has elapsed while app was in background
        if (isClientInactivityExceeded()) {
          clearClientSession();
          router.replace("/login?reason=inactivity");
          return;
        }

        // Meaningful activity: app brought to foreground
        if (!isPublicRoute) {
          recordMeaningfulActivity();
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, [isPublicRoute, router]);

  // 3. Online / Offline Edge Case Handling
  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
      // Re-verify session when network returns
      if (!isPublicRoute) {
        recordMeaningfulActivity();
      }
    }

    function handleOffline() {
      setIsOffline(true);
    }

    if (typeof navigator !== "undefined") {
      setIsOffline(!navigator.onLine);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isPublicRoute]);

  // Show splash screen while restoring session on protected routes
  if (isRestoring && !isPublicRoute) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50/90 text-slate-900">
        <div className="flex flex-col items-center space-y-4 animate-in fade-in duration-200">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
            <i className="fa-solid fa-glass-water text-2xl"></i>
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-base font-bold text-slate-800">Milk Tracker</h2>
            <p className="text-xs text-slate-400 font-medium">Restoring your session...</p>
          </div>
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mt-2"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {isOffline && (
        <div className="bg-amber-500 text-white text-xs font-semibold px-4 py-2 text-center sticky top-0 z-50 shadow-xs flex items-center justify-center gap-2">
          <i className="fa-solid fa-wifi"></i>
          <span>You are offline. Changes will sync when connectivity returns.</span>
        </div>
      )}

      {!hideNav && <Header />}

      <main className="flex-1">{children}</main>

      {!hideNav && <BottomNav />}
    </>
  );
}
