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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 via-green-50 to-gray-50 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-3 rounded-xl">
              <i className="fa-solid fa-user-plus text-xl"></i>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Create Account</h1>
          <p className="text-gray-500 text-sm">
            Start tracking your milk records today
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation"></i>
            {error}
          </div>
        )}

        {/* Success Message with Animation */}
        {success && (
          <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-400 text-green-700 p-4 rounded-xl flex items-start gap-3 shadow-lg animate-pulse">
            <div className="text-2xl flex-shrink-0">✅</div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Account Created Successfully!</p>
              <p className="text-xs text-green-600 mt-1">Redirecting to login page...</p>
            </div>
          </div>
        )}

        <form onSubmit={handleRegister} className={`space-y-4 ${success ? "opacity-50 pointer-events-none" : ""}`}>
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
                placeholder="you@example.com"
                className={`w-full border-2 rounded-lg pl-11 pr-4 py-3 text-sm focus:outline-none transition ${
                  fieldErrors.email
                    ? "border-red-300 focus:ring-2 focus:ring-red-500"
                    : "border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                placeholder="Create a password"
                className={`w-full border-2 rounded-lg pl-11 pr-11 py-3 text-sm focus:outline-none transition ${
                  fieldErrors.password
                    ? "border-red-300 focus:ring-2 focus:ring-red-500"
                    : "border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                } absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600 transition`}
                onClick={() => !loading && !success && setShowPassword(!showPassword)}
              ></i>
            </div>
            {fieldErrors.password && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <i className="fa-solid fa-exclamation-circle text-xs"></i>
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Register Button */}
          <button
            type="submit"
            disabled={loading || success}
            className={`w-full py-3 rounded-lg font-semibold transition flex items-center justify-center space-x-2 mt-6 ${
              loading || success
                ? "bg-green-400 cursor-not-allowed opacity-75"
                : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
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
                <span>Creating account...</span>
              </>
            ) : success ? (
              <>
                <i className="fa-solid fa-check-circle"></i>
                <span>Account Created!</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-check-circle"></i>
                <span>Create Account</span>
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
            <span className="px-2 bg-white text-gray-500">
              Already registered?
            </span>
          </div>
        </div>

        {/* Login Link */}
        <a href="/login">
          <button className="w-full border-2 border-gray-200 py-3 rounded-lg text-gray-700 font-semibold hover:border-green-400 hover:bg-green-50 transition">
            Login to Account
          </button>
        </a>
      </div>
    </div>
  );
}
