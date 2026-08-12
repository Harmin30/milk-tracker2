"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.push("/login");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [success, router]);

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

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!validateInputs()) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      // Set success state to show success message
      setSuccess(true);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/80 px-4 py-8 text-slate-900">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-lg p-6 sm:p-8 space-y-4">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-xs">
              <i className="fa-solid fa-user-plus text-lg"></i>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create Account</h1>
          <p className="text-xs text-slate-500 font-medium">
            Start tracking your daily milk records
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2 font-medium">
            <i className="fa-solid fa-circle-exclamation text-rose-500"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl flex items-start gap-3 shadow-xs">
            <div className="text-base flex-shrink-0 text-emerald-600">
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <div className="flex-1">
              <p className="font-bold text-xs">
                Account Created Successfully!
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Redirecting to login page...
              </p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleRegister}
          className={`space-y-3.5 ${success ? "opacity-50 pointer-events-none" : ""}`}
        >
          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Email Address
            </label>
            <div className="relative">
              <i className="fa-solid fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                className={`w-full border rounded-xl pl-9 pr-3.5 py-2.5 text-xs bg-slate-50/50 focus:bg-white focus:outline-none transition ${
                  fieldErrors.email
                    ? "border-rose-300 focus:ring-2 focus:ring-rose-500/20"
                    : "border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                }`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors({});
                }}
                disabled={loading || success}
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
                placeholder="Create a password"
                className={`w-full border rounded-xl pl-9 pr-10 py-2.5 text-xs bg-slate-50/50 focus:bg-white focus:outline-none transition ${
                  fieldErrors.password
                    ? "border-rose-300 focus:ring-2 focus:ring-rose-500/20"
                    : "border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                }`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors({});
                }}
                disabled={loading || success}
              />
              <i
                className={`fa-solid ${
                  showPassword ? "fa-eye-slash" : "fa-eye"
                } absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600 text-xs transition`}
                onClick={() =>
                  !loading && !success && setShowPassword(!showPassword)
                }
              ></i>
            </div>
            {fieldErrors.password && (
              <p className="text-rose-600 text-[11px] font-medium flex items-center gap-1">
                <i className="fa-solid fa-exclamation-circle text-[10px]"></i>
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Register Button */}
          <button
            type="submit"
            disabled={loading || success}
            className={`w-full py-2.5 rounded-xl font-semibold text-xs transition flex items-center justify-center space-x-2 shadow-xs mt-4 ${
              loading || success
                ? "bg-emerald-400 cursor-not-allowed opacity-75 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
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
                <span>Creating account...</span>
              </>
            ) : success ? (
              <>
                <i className="fa-solid fa-check-circle text-xs"></i>
                <span>Account Created!</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-check-circle text-xs"></i>
                <span>Create Account</span>
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
            <span className="px-3 bg-white text-slate-400 font-medium">
              Already registered?
            </span>
          </div>
        </div>

        {/* Login Link */}
        <a href="/login" className="block">
          <button className="w-full border border-slate-200 bg-slate-50/80 hover:bg-slate-100 py-2.5 rounded-xl text-slate-700 font-semibold text-xs transition">
            Login to Account
          </button>
        </a>
      </div>
    </div>
  );
}
