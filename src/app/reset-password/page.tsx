"use client";

import { useState } from "react";
import Link from "next/link";

export default function ResetPassword() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function validateInputs() {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email";
    }

    if (!password) {
      errors.password = "New password is required";
    } else if (password.length < 4) {
      errors.password = "Password must be at least 4 characters";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!validateInputs()) {
      return;
    }

    setLoading(true);

    const res = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        newPassword: password,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setSuccess(true);
      setMessage("Password reset successful! Redirecting to login...");
      setTimeout(() => {
        // Redirect to login
        window.location.href = "/login";
      }, 2000);
    } else {
      setMessage(data.error || "Failed to reset password");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-100 via-amber-50 to-gray-50 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-3 rounded-xl">
              <i className="fa-solid fa-key text-xl"></i>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Reset Password</h1>
          <p className="text-gray-500 text-sm">
            Enter your email and create a new password
          </p>
        </div>

        {/* Success Alert */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-lg flex items-center gap-2">
            <i className="fa-solid fa-circle-check"></i>
            {message}
          </div>
        )}

        {/* Error Alert */}
        {message && !success && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation"></i>
            {message}
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Email Address
              </label>
              <div className="relative">
                <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                  type="email"
                  name="email"
                  placeholder="your@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors({});
                  }}
                  className={`w-full border-2 rounded-lg pl-11 pr-4 py-3 text-sm focus:outline-none transition ${
                    fieldErrors.email
                      ? "border-red-300 focus:ring-2 focus:ring-red-500"
                      : "border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  }`}
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
                New Password
              </label>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create a new password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({});
                  }}
                  className={`w-full border-2 rounded-lg pl-11 pr-11 py-3 text-sm focus:outline-none transition ${
                    fieldErrors.password
                      ? "border-red-300 focus:ring-2 focus:ring-red-500"
                      : "border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  }`}
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

            {/* Reset Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold transition flex items-center justify-center space-x-2 mt-6 ${
                loading
                  ? "bg-amber-400 cursor-not-allowed opacity-75"
                  : "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
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
                  <span>Resetting...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check-circle"></i>
                  <span>Reset Password</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Back to Login */}
        {!success && (
          <div className="mt-4">
            <Link href="/login">
              <button className="w-full border-2 border-gray-300 bg-white hover:bg-amber-50 hover:border-amber-500 py-3 rounded-lg text-amber-600 font-semibold transition shadow-md">
                <i className="fa-solid fa-arrow-left mr-2"></i>
                Back to Login
              </button>
            </Link>
          </div>
        )}

        {/* Success - Back to Login Button */}
        {success && (
          <div className="mt-4">
            <Link href="/login">
              <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-lg font-semibold transition">
                Go to Login
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
