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
    <div className="w-full bg-white/90 backdrop-blur border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}

        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <i className="fa-solid fa-glass-water text-sm"></i>
          </div>

          <span className="font-semibold text-gray-800 text-[17px]">
            Milk Tracker
          </span>
        </div>

        {/* Profile */}

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2"
          >
            {/* Avatar */}

            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-sm font-semibold hover:scale-105 transition-transform">
              {initial}
            </div>

            {/* Arrow */}

            <i
              className={`fa-solid fa-chevron-down text-xs text-gray-400 transition-transform ${
                menuOpen ? "rotate-180" : ""
              }`}
            ></i>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-3 w-52 bg-white border border-gray-200 rounded-xl shadow-lg ring-1 ring-gray-100 overflow-hidden">
              {/* User Info */}

              <div className="px-4 py-3 border-b bg-gray-50">
                <p className="text-sm font-semibold text-gray-800">
                  {name || "User"}
                </p>

                <p className="text-xs text-gray-500">Milk Tracker Account</p>
              </div>

              {/* Profile */}

              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/profile");
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                <i className="fa-solid fa-user text-gray-400"></i>
                Profile
              </button>

              <div className="border-t"></div>

              {/* Logout */}

              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
              >
                <i className="fa-solid fa-right-from-bracket"></i>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
