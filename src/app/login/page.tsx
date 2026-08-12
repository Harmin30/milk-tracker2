"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  const [autoFilled, setAutoFilled] = useState(false);

  // Load saved email and remember preference on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedRemember = localStorage.getItem("rememberMe") === "true";

    if (savedEmail && savedRemember) {
      setEmail(savedEmail);
      setRemember(true);
      setAutoFilled(true);
    }
  }, []);

  function validateInputs() {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 4) {
      errors.password = "Password must be at least 4 characters";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!validateInputs()) {
      return;
    }

    setLoading(true);

    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        remember,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Login failed");
      setLoading(false);
      return;
    }

    // Save email and remember preference if checked
    if (remember) {
      localStorage.setItem("rememberedEmail", email);
      localStorage.setItem("rememberMe", "true");
    } else {
      // Clear saved email if not remembering
      localStorage.removeItem("rememberedEmail");
      localStorage.removeItem("rememberMe");
    }

    // Fetch user profile to get their name and store it
    try {
      const profileRes = await fetch("/api/profile");
      const profileData = await profileRes.json();

      if (profileData.data && profileData.data.name) {
        // Store name in localStorage for dashboard to display
        localStorage.setItem("welcomeName", profileData.data.name);
      }
    } catch (err) {
      console.log("Could not fetch profile:", err);
    }

    // Redirect to dashboard
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/80 px-4 py-8 text-slate-900">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-lg p-6 sm:p-8 space-y-4">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xs">
              <i className="fa-solid fa-droplet text-lg"></i>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Milk Tracker</h1>
          <p className="text-xs text-slate-500 font-medium">
            Sign in to manage your daily milk records
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2 font-medium">
            <i className="fa-solid fa-circle-exclamation text-rose-500"></i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3.5">
          {/* Email */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-700">
                Email Address
              </label>
              {autoFilled && email && (
                <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <i className="fa-solid fa-check text-[10px]"></i>
                  Auto-filled
                </span>
              )}
            </div>
            <div className="relative">
              <i className="fa-solid fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                className={`w-full border rounded-xl pl-9 pr-3.5 py-2.5 text-xs bg-slate-50/50 focus:bg-white focus:outline-none transition ${
                  fieldErrors.email
                    ? "border-rose-300 focus:ring-2 focus:ring-rose-500/20"
                    : "border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                }`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors({});
                }}
                disabled={loading}
              />
            </div>
            {fieldErrors.email && (
              <p className="text-rose-600 text-[11px] font-medium flex items-center gap-1">
                <i className="fa-solid fa-exclamation-circle text-[10px]"></i>
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Password
            </label>
            <div className="relative">
              <i className="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                className={`w-full border rounded-xl pl-9 pr-10 py-2.5 text-xs bg-slate-50/50 focus:bg-white focus:outline-none transition ${
                  fieldErrors.password
                    ? "border-rose-300 focus:ring-2 focus:ring-rose-500/20"
                    : "border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                }`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors({});
                }}
                disabled={loading}
              />
              <i
                className={`fa-solid ${
                  showPassword ? "fa-eye-slash" : "fa-eye"
                } absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600 text-xs transition`}
                onClick={() => !loading && setShowPassword(!showPassword)}
              ></i>
            </div>
            {fieldErrors.password && (
              <p className="text-rose-600 text-[11px] font-medium flex items-center gap-1">
                <i className="fa-solid fa-exclamation-circle text-[10px]"></i>
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Remember + Forgot */}
          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-center text-xs">
              <label className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={loading}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                />
                <span className="font-medium">Remember me</span>
                {remember && (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-1.5 py-0.5 rounded-md text-[10px] font-semibold">
                    <i className="fa-solid fa-check text-[9px]"></i>
                    Saved
                  </span>
                )}
              </label>
              <a
                href="/reset-password"
                className="text-indigo-600 hover:text-indigo-700 font-semibold transition"
              >
                Forgot?
              </a>
            </div>

            {email && remember && (
              <div className="bg-slate-50 border border-slate-200 text-slate-600 text-[11px] p-2 rounded-xl flex items-center gap-2">
                <i className="fa-solid fa-info-circle text-indigo-600"></i>
                <span>Your email will be auto-filled on this device</span>
              </div>
            )}
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-xl font-semibold text-xs transition flex items-center justify-center space-x-2 shadow-xs mt-4 ${
              loading
                ? "bg-indigo-400 cursor-not-allowed opacity-75 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {loading ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Logging in...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-sign-in-alt text-xs"></i>
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative pt-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-white text-slate-400 font-medium">New to Milk Tracker?</span>
          </div>
        </div>

        {/* Register Link */}
        <a href="/register" className="block">
          <button className="w-full border border-slate-200 bg-slate-50/80 hover:bg-slate-100 py-2.5 rounded-xl text-slate-700 font-semibold text-xs transition">
            Create Account
          </button>
        </a>

        {/* Admin Link */}
        <div className="border-t border-slate-100 pt-3 text-center">
          <a
            href="/admin/login"
            className="text-[11px] text-slate-500 hover:text-slate-800 transition font-medium"
          >
            Admin Portal →
          </a>
        </div>
      </div>
    </div>
  );
}
