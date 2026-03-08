"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

export default function Profile() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [mobile, setMobile] = useState("");
  const [cowPrice, setCowPrice] = useState("");
  const [buffaloPrice, setBuffaloPrice] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | "warning"
  >("success");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  // Auto-dismiss success messages after 3 seconds
  useEffect(() => {
    if (messageType === "success" && message) {
      const timer = setTimeout(() => {
        setMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, messageType]);

  async function logout() {
    await fetch("/api/logout", {
      method: "POST",
    });

    router.push("/login");
  }

  // Load profile
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();

        if (data.data) {
          setName(data.data.name || "");
          setAddress(data.data.address || "");
          setMobile(data.data.mobile || "");
          setCowPrice(data.data.default_cow_price || "");
          setBuffaloPrice(data.data.default_buffalo_price || "");
        }
      } catch (err) {
        console.log(err);
      }

      setLoading(false);
    }

    loadProfile();
  }, []);

  async function saveProfile() {
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          address,
          mobile,
          default_cow_price: cowPrice === "" ? null : Number(cowPrice),
          default_buffalo_price:
            buffaloPrice === "" ? null : Number(buffaloPrice),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Profile saved successfully");
        setMessageType("success");
        // Scroll to top to show notification
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      } else {
        setMessage(data.error || "Error updating profile");
        setMessageType("error");
      }
    } catch {
      setMessage("Something went wrong");
      setMessageType("error");
    }

    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* TOAST NOTIFICATION */}
      {message && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 p-4 rounded-xl border-2 flex items-center gap-3 text-sm font-medium transition-all duration-300 shadow-lg ${
            messageType === "success"
              ? "bg-green-50 border-green-300 text-green-700"
              : messageType === "error"
                ? "bg-red-50 border-red-300 text-red-700"
                : "bg-yellow-50 border-yellow-300 text-yellow-700"
          }`}
        >
          {messageType === "success" && (
            <i className="fa-solid fa-circle-check text-lg flex-shrink-0"></i>
          )}
          {messageType === "error" && (
            <i className="fa-solid fa-circle-xmark text-lg flex-shrink-0"></i>
          )}
          {messageType === "warning" && (
            <i className="fa-solid fa-triangle-exclamation text-lg flex-shrink-0"></i>
          )}
          <span>{message}</span>
        </div>
      )}

      <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto p-5 space-y-5">
        {/* PAGE HEADER */}

        <div>
          <h1 className="text-2xl font-semibold">Profile</h1>

          <p className="text-sm text-gray-500">
            Manage your personal details and milk pricing
          </p>
        </div>

        {loading && <p className="text-gray-500 text-sm">Loading profile...</p>}

        {!loading && (
          <>
            {/* PERSONAL INFO */}
            <div className="bg-white p-5 rounded-xl shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <i className="fa-solid fa-user text-blue-600 text-lg"></i>
                <div>
                  <h2 className="font-semibold text-gray-800">
                    Personal Information
                  </h2>
                  <p className="text-xs text-gray-500">Your basic details</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                  <i className="fa-solid fa-id-card text-blue-500 text-xs"></i>
                  Full Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                  <i className="fa-solid fa-map-pin text-blue-500 text-xs"></i>
                  Address
                </label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your address"
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                  <i className="fa-solid fa-phone text-blue-500 text-xs"></i>
                  Mobile Number
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  pattern="[0-9]{10}"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="10 digit number"
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter 10-digit mobile number without country code
                </p>
              </div>
            </div>

            {/* MILK PRICES */}
            <div className="bg-white p-5 rounded-xl shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <i className="fa-solid fa-tag text-green-600 text-lg"></i>
                <div>
                  <h2 className="font-semibold text-gray-800">Milk Pricing</h2>
                  <p className="text-xs text-gray-500">
                    Default prices for entries
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Buffalo First */}
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                    <i className="fa-solid fa-cow text-blue-500 text-xs"></i>
                    🐃 Buffalo Price
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={buffaloPrice}
                    onChange={(e) => setBuffaloPrice(e.target.value)}
                    placeholder="Price/L"
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>

                {/* Cow Second */}
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                    <i className="fa-solid fa-cow text-green-500 text-xs"></i>
                    🐄 Cow Price
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cowPrice}
                    onChange={(e) => setCowPrice(e.target.value)}
                    placeholder="Price/L"
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs p-3 rounded-lg flex gap-2 items-start">
                <i className="fa-solid fa-circle-info text-sm flex-shrink-0 mt-0.5"></i>
                <p>
                  These prices will auto-fill when adding milk entries. You can
                  edit them anytime.
                </p>
              </div>
            </div>

            {/* SAVE BUTTON */}

            <button
              onClick={saveProfile}
              disabled={saving}
              className={`w-full py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-md ${
                saving
                  ? "bg-blue-400 cursor-not-allowed opacity-75 text-white"
                  : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              }`}
            >
              {saving ? (
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
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-save"></i>
                  <span>Save Profile</span>
                </>
              )}
            </button>

            {/* LOGOUT */}

            <div className="mt-6 mb-2">
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300 py-3 rounded-xl font-medium transition-all duration-200"
              >
                <i className="fa-solid fa-right-from-bracket"></i>
                Logout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
