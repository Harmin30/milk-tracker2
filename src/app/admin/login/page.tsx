"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Admin login failed");
        setLoading(false);
        return;
      }

      // Redirect to admin dashboard
      router.push("/admin/dashboard");
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-block bg-gradient-to-r from-orange-500 to-red-500 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-3 sm:mb-4">
            <span className="text-white font-semibold text-xs sm:text-sm">
              ADMIN PANEL
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Admin Access
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm">
            Manage the Milk Tracker app
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800 rounded-xl sm:rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-700">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 px-3 sm:px-4 py-2 sm:py-3 rounded-lg mb-6 text-xs sm:text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4 sm:space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                Admin Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-700 border border-slate-600 rounded-lg text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                placeholder="admin@example.com"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-700 border border-slate-600 rounded-lg text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 text-lg"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 sm:py-3 rounded-lg transition duration-200 mt-6 text-sm sm:text-base"
            >
              {loading ? "Signing in..." : "Sign In as Admin"}
            </button>
          </form>

          {/* Back to User Login */}
          <div className="mt-6 text-center border-t border-slate-700 pt-6">
            <p className="text-gray-400 text-xs sm:text-sm mb-3">
              Regular user?
            </p>
            <Link
              href="/login"
              className="text-orange-400 hover:text-orange-300 font-medium transition text-sm sm:text-base"
            >
              Go to User Login →
            </Link>
          </div>
        </div>

        {/* Footer Info */}
        <p className="text-center text-gray-500 text-xs mt-6">
          Only admin credentials allowed
        </p>
      </div>
    </div>
  );
}
