"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const path = usePathname();

  const navItem = (href: string, label: string, icon: string) => {
    const active = path === href;

    return (
      <Link
        href={href}
        className={`flex flex-col items-center justify-center text-xs py-1 rounded-lg transition-all duration-200 ${
          active
            ? "bg-blue-50 text-blue-600"
            : "text-gray-500 hover:text-blue-500"
        }`}
      >
        <i className={`fa-solid ${icon} text-[18px] mb-[2px]`}></i>

        <span className={`text-[11px] ${active ? "font-medium" : ""}`}>
          {label}
        </span>
      </Link>
    );
  };

  return (
    <>
      {/* Bottom Navigation */}

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-t border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto grid grid-cols-6 gap-1 px-2 py-1.5">
          {navItem("/dashboard", "Home", "fa-house")}
          {navItem("/entries", "Add", "fa-plus")}
          {navItem("/records", "Records", "fa-file-lines")}
          {navItem("/summary", "Summary", "fa-chart-column")}
          {navItem("/bills", "Bills", "fa-file-invoice")}
          {navItem("/profile", "Profile", "fa-user")}
        </div>
      </div>

      {/* Spacer to prevent content overlap */}

      <div className="h-16"></div>
    </>
  );
}
