"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import BottomNav from "../../components/BottomNav";

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

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full border rounded-lg px-4 py-3"
              />

              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Address"
                className="w-full border rounded-lg px-4 py-3"
              />

              <input
                type="tel"
                maxLength={10}
                pattern="[0-9]{10}"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Mobile Number"
                className="w-full border rounded-lg px-4 py-3"
              />
            </div>

            {/* MILK PRICES */}

            <div className="bg-white p-5 rounded-xl shadow-sm space-y-4">
              <h2 className="font-semibold text-gray-700">Milk Pricing</h2>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cowPrice}
                  onChange={(e) => setCowPrice(e.target.value)}
                  placeholder="Cow Price / Liter"
                  className="w-full border rounded-lg px-4 py-3"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={buffaloPrice}
                  onChange={(e) => setBuffaloPrice(e.target.value)}
                  placeholder="Buffalo Price / Liter"
                  className="w-full border rounded-lg px-4 py-3"
                />
              </div>
              <p className="text-xs text-gray-500">
                These prices are used as default when adding milk entries. The
                price will automatically appear while entering milk records.
              </p>
            </div>

            {/* SAVE BUTTON */}

            <button
              onClick={saveProfile}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
