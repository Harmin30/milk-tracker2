"use client";

import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";
import Header from "./Header";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const hideNav =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/admin/login" ||
    pathname.startsWith("/admin/");

  return (
    <>
      {!hideNav && <Header />}

      <main className="flex-1">
        {children}
      </main>

      {!hideNav && <BottomNav />}
    </>
  );
}