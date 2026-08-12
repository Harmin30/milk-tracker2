"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

export default function Header() {
  const router = useRouter();

  const [name, setName] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  const menuRef = useRef<HTMLDivElement | null>(null);

  async function logout() {
    await fetch("/api/logout", {
      method: "POST",
    });

    router.push("/login");
  }

  // Load user profile
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();

        if (res.ok && data.data) {
          setName(data.data.name || "");
        }
      } catch (err) {
        console.log(err);
      }
    }

    loadProfile();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const initial = name ? name.charAt(0).toUpperCase() : "U";

  return (
    <header className="w-full sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md shadow-xs">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <i className="fa-solid fa-glass-water text-sm"></i>
          </div>

          <span className="font-bold text-slate-900 text-lg tracking-tight">
            Milk Tracker
          </span>
        </button>

        {/* Profile */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 p-1 rounded-full hover:bg-slate-100/80 transition"
          >
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs border border-indigo-200/50">
              {initial}
            </div>

            {/* Arrow */}
            <i
              className={`fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform duration-200 pr-1 ${
                menuOpen ? "rotate-180" : ""
              }`}
            ></i>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200/90 rounded-2xl shadow-lg overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* User Info */}
              <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/70">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {name || "User"}
                </p>

                <p className="text-[11px] text-slate-500 mt-0.5">Account & Settings</p>
              </div>

              <div className="p-1">
                {/* Profile */}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/profile");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100/80 rounded-xl transition"
                >
                  <i className="fa-solid fa-user text-indigo-600 w-4 text-center"></i>
                  <span>Profile Settings</span>
                </button>

                {/* Logout */}
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition"
                >
                  <i className="fa-solid fa-right-from-bracket text-rose-500 w-4 text-center"></i>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
