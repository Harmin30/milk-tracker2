"use client";

import { useRouter } from "next/navigation";

export default function Header() {

  const router = useRouter();

  async function logout() {
    await fetch("/api/logout", {
      method: "POST"
    });

    router.push("/login");
  }

  return (

    <div className="w-full bg-white border-b border-gray-200 shadow-sm">

      <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">

        {/* App Logo / Name */}
        <div className="flex items-center space-x-2">

          <div className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center">
            <i className="fa-solid fa-glass-water text-sm"></i>
          </div>

          <span className="font-semibold text-gray-800 text-lg">
            Milk Tracker
          </span>

        </div>


        {/* Logout Button */}
        <button
          onClick={logout}
          className="flex items-center space-x-2 text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition"
        >
          <i className="fa-solid fa-right-from-bracket"></i>
          <span>Logout</span>
        </button>

      </div>

    </div>

  );
}