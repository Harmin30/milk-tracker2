"use client";

import { useState } from "react";
import Link from "next/link";

export default function ResetPassword() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

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
      setMessage("Password reset successful");
    } else {
      setMessage(data.error);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">

        {/* Title */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-gray-800">
            Reset Password
          </h1>
          <p className="text-gray-500 text-sm">
            Enter your email and new password
          </p>
        </div>

        {message && !success && (
          <p className="text-red-500 text-sm text-center">{message}</p>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div className="relative">
              <i className="fa-solid fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>

              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Password */}
            <div className="relative">
              <i className="fa-solid fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>

              <input
                type={showPassword ? "text" : "password"}
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-lg pl-10 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />

              <i
                className={`fa-solid ${
                  showPassword ? "fa-eye-slash" : "fa-eye"
                } absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500`}
                onClick={() => setShowPassword(!showPassword)}
              ></i>
            </div>

            {/* Button */}
            <button className="w-full bg-green-600 hover:bg-green-700 transition text-white py-3 rounded-lg font-medium">
              Reset Password
            </button>
          </form>
        )}

        {/* Success UI */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center space-y-3">

            <i className="fa-solid fa-circle-check text-green-600 text-3xl"></i>

            <p className="text-green-700 font-medium">
              Password reset successfully
            </p>

            <Link href="/login">
              <button className="w-full bg-blue-600 hover:bg-blue-700 transition text-white py-3 rounded-lg">
                Go to Login
              </button>
            </Link>
          </div>
        )}

        {/* Back button */}
        {!success && (
          <div>
            <Link href="/login">
              <button className="w-full border border-gray-300 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition">
                Back to Login
              </button>
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}