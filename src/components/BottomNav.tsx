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
        className={`flex flex-col items-center justify-center gap-[1px] transition-all duration-200 ${
          active ? "text-blue-600" : "text-gray-500 hover:text-blue-500"
        }`}
      >
        <div
          className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 ${
            active ? "bg-blue-50 scale-105" : ""
          }`}
        >
          <i className={`fa-solid ${icon} text-[15px]`}></i>
        </div>

        <span className="text-[11px] font-bold">{label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Bottom Navigation */}
      <nav className="fixed bottom-3 left-3 right-3 z-[999] rounded-2xl border border-gray-200 bg-white/40 backdrop-blur-xl shadow-lg">
        <div className="mx-auto grid max-w-4xl grid-cols-5 items-center px-3 py-1">
          {navItem("/dashboard", "Home", "fa-house")}

          {navItem("/records", "Records", "fa-file-lines")}

          {/* CENTER ADD BUTTON */}
          <Link
            href="/entries"
            className="flex flex-col items-center justify-center gap-[1px]"
          >
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full shadow transition-all duration-200 ${
                path === "/entries"
                  ? "bg-blue-700 text-white scale-105"
                  : "bg-blue-100 text-blue-600 hover:bg-blue-200"
              }`}
            >
              <i className="fa-solid fa-plus text-[16px]"></i>
            </div>

            <span
              className={`text-[11px] font-bold ${
                path === "/entries" ? "text-blue-700" : "text-gray-700"
              }`}
            >
              Add
            </span>
          </Link>

          {navItem("/summary", "Summary", "fa-chart-column")}

          {navItem("/bills", "Bills", "fa-file-invoice")}
        </div>
      </nav>

      {/* Spacer */}
      <div className="h-[55px]" />
    </>
  );
}
