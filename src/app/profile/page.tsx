"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

export default function Profile() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [mobile, setMobile] = useState("");
  const [cowPrice, setCowPrice] = useState("");
  const [buffaloPrice, setBuffaloPrice] = useState("");
  const [brandMilkName, setBrandMilkName] = useState("");
  const [brandMilkPrice, setBrandMilkPrice] = useState("");

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
          setBrandMilkName(data.data.brand_milk_name || "Packaged Milk");
          setBrandMilkPrice(data.data.default_brand_price || "");
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
          brand_milk_name: brandMilkName || "Packaged Milk",
          default_brand_price:
            brandMilkPrice === "" ? null : Number(brandMilkPrice),
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
    <div className="min-h-screen bg-slate-50/70 pb-24 text-slate-900">
      {/* TOAST NOTIFICATION */}
      {message && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 p-3.5 px-5 rounded-2xl border flex items-center gap-3 text-xs font-semibold transition-all duration-300 shadow-lg ${
            messageType === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : messageType === "error"
                ? "bg-rose-50 border-rose-200 text-rose-700"
                : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          {messageType === "success" && (
            <i className="fa-solid fa-circle-check text-emerald-500 text-sm flex-shrink-0"></i>
          )}
          {messageType === "error" && (
            <i className="fa-solid fa-circle-xmark text-rose-500 text-sm flex-shrink-0"></i>
          )}
          {messageType === "warning" && (
            <i className="fa-solid fa-triangle-exclamation text-amber-500 text-sm flex-shrink-0"></i>
          )}
          <span>{message}</span>
        </div>
      )}

      <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
        {/* PAGE HEADER */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Manage your personal details and default milk pricing
          </p>
        </div>

        {loading && <p className="text-slate-500 text-xs font-medium text-center py-4">Loading profile...</p>}

        {!loading && (
          <>
            {/* PERSONAL INFO */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs">
                  <i className="fa-solid fa-user"></i>
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-sm tracking-tight">
                    Personal Information
                  </h2>
                  <p className="text-[11px] text-slate-500">Your basic user details</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                  <i className="fa-solid fa-id-card text-indigo-600 text-xs"></i>
                  Full Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                  <i className="fa-solid fa-map-pin text-indigo-600 text-xs"></i>
                  Address
                </label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your address"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                  <i className="fa-solid fa-phone text-indigo-600 text-xs"></i>
                  Mobile Number
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  pattern="[0-9]{10}"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="10 digit number"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Enter 10-digit mobile number without country code
                </p>
              </div>
            </div>

            {/* MILK PRICES */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
                  <i className="fa-solid fa-tag"></i>
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-sm tracking-tight">Milk Pricing</h2>
                  <p className="text-[11px] text-slate-500">
                    Default prices auto-filled on entry page
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Buffalo First */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1.5">
                    <span>🐃 Buffalo Price</span>
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={buffaloPrice}
                    onChange={(e) => setBuffaloPrice(e.target.value)}
                    placeholder="Price/L"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                  />
                </div>

                {/* Cow Second */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1.5">
                    <span>🐄 Cow Price</span>
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cowPrice}
                    onChange={(e) => setCowPrice(e.target.value)}
                    placeholder="Price/L"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                  />
                </div>
              </div>

              {/* Packaged Milk Section */}
              <div className="border-t border-slate-100 pt-3 mt-3 space-y-2.5">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>🥛 Packaged Milk Defaults</span>
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {/* Brand Name */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                      Brand Name
                    </label>
                    <input
                      type="text"
                      value={brandMilkName}
                      onChange={(e) => setBrandMilkName(e.target.value)}
                      placeholder="e.g., Amul, Mother Dairy"
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                    />
                  </div>

                  {/* Brand Price */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                      Price/Liter
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={brandMilkPrice}
                      onChange={(e) => setBrandMilkPrice(e.target.value)}
                      placeholder="Price/L"
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/70 text-slate-600 text-[11px] p-2.5 rounded-xl flex gap-2 items-center">
                <i className="fa-solid fa-circle-info text-xs text-indigo-600 flex-shrink-0"></i>
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
              className={`w-full py-3 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2 shadow-xs ${
                saving
                  ? "bg-indigo-400 cursor-not-allowed opacity-75 text-white"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              {saving ? (
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
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-save text-xs"></i>
                  <span>Save Profile</span>
                </>
              )}
            </button>

            {/* LOGOUT */}
            <div className="pt-2">
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 border border-rose-200 text-rose-600 bg-rose-50/80 hover:bg-rose-100 py-3 rounded-xl font-semibold text-xs transition-all duration-200"
              >
                <i className="fa-solid fa-right-from-bracket text-xs"></i>
                <span>Logout</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
