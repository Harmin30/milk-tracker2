"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const path = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Home", icon: "fa-house" },
    { href: "/records", label: "Calendar", icon: "fa-calendar-days" },
    { href: "/entries", label: "Add", icon: "fa-plus", isCenter: true },
    { href: "/summary", label: "Summary", icon: "fa-chart-column" },
    { href: "/bills", label: "Bills", icon: "fa-file-invoice" },
  ];

  return (
    <>
      {/* AUTHENTIC APPLE CONCAVE NOTCH BOTTOM NAVBAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 h-[72px]">
        {/* SVG BACKGROUND WITH CONCAVE CURVE NOTCH */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <svg
            viewBox="0 0 400 70"
            preserveAspectRatio="none"
            className="w-full h-full text-white fill-current filter drop-shadow-[0_-6px_20px_rgba(15,23,42,0.07)]"
          >
            <path d="M 0 16 L 165 16 C 176 16, 178 42, 200 42 C 222 42, 224 16, 235 16 L 400 16 L 400 70 L 0 70 Z" />
          </svg>
        </div>

        {/* NAVIGATION CONTENT */}
        <div className="relative z-10 max-w-md mx-auto grid grid-cols-5 items-center px-2 pt-3 h-full">
          {navItems.map((item) => {
            const active = path === item.href;

            if (item.isCenter) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center justify-center group cursor-pointer relative -top-3"
                >
                  {/* Floating Circular Action Button nestled inside the concave curve */}
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-95 ${
                      active
                        ? "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-indigo-500/40 ring-4 ring-indigo-100 scale-105"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30"
                    }`}
                  >
                    <i className="fa-solid fa-plus text-base"></i>
                  </div>
                  <span
                    className={`text-[10px] font-bold mt-0.5 tracking-tight ${
                      active ? "text-indigo-600 font-extrabold" : "text-slate-500"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center group cursor-pointer py-1"
              >
                <div
                  className={`flex flex-col items-center justify-center transition-all duration-200 ${
                    active
                      ? "text-indigo-600 font-extrabold scale-105"
                      : "text-slate-400 group-hover:text-slate-600 font-medium"
                  }`}
                >
                  <i className={`fa-solid ${item.icon} text-base mb-0.5`}></i>
                  <span className="text-[10px] tracking-tight">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom Navbar Spacer */}
      <div className="h-20" />
    </>
  );
}




