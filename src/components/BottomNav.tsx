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
        className={`flex flex-col items-center justify-center text-xs transition ${
          active ? "text-blue-600" : "text-gray-500 hover:text-blue-500"
        }`}
      >
        <i
          className={`fa-solid ${icon} text-lg mb-1 ${
            active ? "text-blue-600" : ""
          }`}
        ></i>

        <span className={active ? "font-semibold" : ""}>{label}</span>
      </Link>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto py-2 px-2 grid grid-cols-6">
        {navItem("/dashboard", "Home", "fa-house")}

        {navItem("/entries", "Add", "fa-plus")}

        {navItem("/records", "Records", "fa-file-lines")}

        {navItem("/summary", "Summary", "fa-chart-column")}

        {navItem("/bills", "Bills", "fa-file-invoice")}

        {navItem("/profile", "Profile", "fa-user")}
      </div>
    </div>
  );
}
