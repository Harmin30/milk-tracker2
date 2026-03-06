"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";

import { useRouter } from "next/navigation";

export default function Profile() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [mobile, setMobile] = useState("");
  const [cowPrice, setCowPrice] = useState("");
  const [buffaloPrice, setBuffaloPrice] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const router = useRouter();

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
    setError("");

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
        setMessage("Profile updated successfully");
      } else {
        setError(data.error || "Error updating profile");
      }
    } catch (err) {
      setError("Something went wrong");
    }

    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      <Header />

      <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto p-5 space-y-5">
        {/* PAGE HEADER */}

        <div>
          <h1 className="text-2xl font-semibold">Profile</h1>

          <p className="text-sm text-gray-500">
            Manage your personal details and milk pricing
          </p>
        </div>

        {/* ALERTS */}

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-lg">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        {loading && <p className="text-gray-500 text-sm">Loading profile...</p>}

        {!loading && (
          <>
            {/* PERSONAL INFO */}

            <div className="bg-white p-5 rounded-xl shadow-sm space-y-4">
              <h2 className="font-semibold text-gray-700">
                Personal Information
              </h2>

              <div>
                <label className="text-sm text-gray-600">Full Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full border rounded-lg px-4 py-3 mt-1"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Address</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your address"
                  className="w-full border rounded-lg px-4 py-3 mt-1"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Mobile Number</label>
                <input
                  type="tel"
                  maxLength={10}
                  pattern="[0-9]{10}"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="10 digit mobile number"
                  className="w-full border rounded-lg px-4 py-3 mt-1"
                />
              </div>
            </div>

            {/* MILK PRICES */}

            <div className="bg-white p-5 rounded-xl shadow-sm space-y-4">
              <h2 className="font-semibold text-gray-700">Milk Pricing</h2>

              <div className="grid grid-cols-2 gap-3">
                {/* Buffalo First */}
                <div>
                  <label className="text-sm text-gray-600 flex items-center gap-1">
                    🐃 Buffalo Price
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={buffaloPrice}
                    onChange={(e) => setBuffaloPrice(e.target.value)}
                    placeholder="Price / Liter"
                    className="w-full border rounded-lg px-4 py-3 mt-1"
                  />
                </div>

                {/* Cow Second */}
                <div>
                  <label className="text-sm text-gray-600 flex items-center gap-1">
                    🐄 Cow Price
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cowPrice}
                    onChange={(e) => setCowPrice(e.target.value)}
                    placeholder="Price / Liter"
                    className="w-full border rounded-lg px-4 py-3 mt-1"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs p-3 rounded-lg">
                Default prices will automatically appear when adding milk
                entries. You can still edit the price during entry if needed.
              </div>
            </div>

            {/* SAVE BUTTON */}

            <button
              onClick={saveProfile}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition"
            >
              {saving ? "Saving..." : "Save Profile"}
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
