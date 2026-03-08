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
    <header className="w-full sticky top-0 z-40 border-b border-gray-200 bg-white/40 backdrop-blur-xl shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center border border-blue-400 shadow-sm hover:shadow-md transition">
            <i className="fa-solid fa-glass-water text-sm"></i>
          </div>

          <span className="font-bold text-gray-800 text-lg tracking-tight">
            Milk Tracker
          </span>
        </div>

        {/* Profile */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 hover:opacity-75 transition"
          >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-md transition hover:shadow-lg hover:scale-110">
              {initial}
            </div>

            {/* Arrow */}
            <i
              className={`fa-solid fa-chevron-down text-xs text-gray-500 transition-transform duration-200 ${
                menuOpen ? "rotate-180" : ""
              }`}
            ></i>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-white border border-gray-200 rounded-2xl shadow-xl ring-1 ring-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* User Info */}
              <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <p className="text-sm font-bold text-gray-800">
                  {name || "User"}
                </p>

                <p className="text-xs text-gray-500 mt-0.5">Account Settings</p>
              </div>

              {/* Profile */}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/profile");
                }}
                className="w-full flex items-center gap-3 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 transition border-b border-gray-100"
              >
                <i className="fa-solid fa-user text-blue-500 w-5 text-center"></i>
                <span>Profile Settings</span>
              </button>

              {/* Logout */}
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-5 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition"
              >
                <i className="fa-solid fa-right-from-bracket text-red-500 w-5 text-center"></i>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
