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

  // Load saved email and remember preference on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedRemember = localStorage.getItem("rememberMe") === "true";

    if (savedEmail && savedRemember) {
      setEmail(savedEmail);
      setRemember(true);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-blue-50 to-gray-50 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-4 space-y-3">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-3 rounded-xl">
              <i className="fa-solid fa-droplet text-xl"></i>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Milk Tracker</h1>
          <p className="text-gray-500 text-sm">
            Login to manage your milk records
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-gray-700">
                Email Address
              </label>
              {email && localStorage.getItem("rememberedEmail") === email && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1">
                  <i className="fa-solid fa-check text-xs"></i>
                  Auto-filled
                </span>
              )}
            </div>
            <div className="relative">
              <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                className={`w-full border-2 rounded-lg pl-11 pr-4 py-3 text-sm focus:outline-none transition ${
                  fieldErrors.email
                    ? "border-red-300 focus:ring-2 focus:ring-red-500"
                    : "border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <p className="text-red-500 text-xs flex items-center gap-1">
                <i className="fa-solid fa-exclamation-circle text-xs"></i>
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Password
            </label>
            <div className="relative">
              <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                className={`w-full border-2 rounded-lg pl-11 pr-11 py-3 text-sm focus:outline-none transition ${
                  fieldErrors.password
                    ? "border-red-300 focus:ring-2 focus:ring-red-500"
                    : "border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                } absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600 transition`}
                onClick={() => !loading && setShowPassword(!showPassword)}
              ></i>
            </div>
            {fieldErrors.password && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <i className="fa-solid fa-exclamation-circle text-xs"></i>
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Remember + Forgot */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <span>Remember me</span>
                {remember && (
                  <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    <i className="fa-solid fa-check-circle text-xs"></i>
                    Remembered
                  </span>
                )}
              </label>
              <a
                href="/reset-password"
                className="text-blue-600 hover:text-blue-700 font-medium transition"
              >
                Forgot?
              </a>
            </div>

            {email && remember && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs p-2 rounded-lg flex items-center gap-2">
                <i className="fa-solid fa-info-circle"></i>
                <span>Your email will be auto-filled on this device</span>
              </div>
            )}
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold transition flex items-center justify-center space-x-2 mt-6 ${
              loading
                ? "bg-blue-400 cursor-not-allowed opacity-75"
                : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            } text-white`}
          >
            {loading ? (
              <>
                <svg
                  className="w-5 h-5 animate-spin"
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
                <i className="fa-solid fa-sign-in-alt"></i>
                <span>Login</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">New user?</span>
          </div>
        </div>

        {/* Register Link */}
        <a href="/register">
          <button className="w-full border-2 border-gray-200 py-3 rounded-lg text-gray-700 font-semibold hover:border-blue-400 hover:bg-blue-50 transition">
            Create Account
          </button>
        </a>

        {/* Admin Link */}
        <div className="border-t border-gray-200 pt-4 text-center">
          <a
            href="/admin/login"
            className="text-xs text-gray-500 hover:text-gray-700 transition font-medium"
          >
            Admin Portal →
          </a>
        </div>
      </div>
    </div>
  );
}
