"use client";
import { Suspense } from "react";
import { useState, useEffect } from "react";

import { useSearchParams, useRouter } from "next/navigation";

function EntriesPage() {
  const today = new Date().toISOString().split("T")[0];

  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("id");

  const [date, setDate] = useState(today);
  const [milkType, setMilkType] = useState("buffalo");
  const [liters, setLiters] = useState("");
  const [price, setPrice] = useState<string>("");

  const [cowPrice, setCowPrice] = useState(0);
  const [buffaloPrice, setBuffaloPrice] = useState(0);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [toast, setToast] = useState("");

  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Load profile prices
  useEffect(() => {
    async function loadProfile() {
      const res = await fetch("/api/profile");
      const data = await res.json();

      if (res.ok && data.data) {
        setCowPrice(data.data.default_cow_price || 0);
        setBuffaloPrice(data.data.default_buffalo_price || 0);

        if (milkType === "cow") {
          setPrice(String(data.data.default_cow_price || ""));
        } else {
          setPrice(String(data.data.default_buffalo_price || ""));
        }
      }
    }

    loadProfile();
  }, []);

  // Load entry for editing
  useEffect(() => {
    if (!editId) return;

    async function loadEntry() {
      if (!editId) return;

      try {
        const res = await fetch(`/api/milk/${editId}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          console.error("Failed to fetch entry");
          return;
        }

        const data = await res.json();

        if (!data?.data) {
          console.error("Entry not found");
          return;
        }

        const entry = data.data;

        setEditMode(true);

        const formattedDate = entry.date.split("T")[0];
        setDate(formattedDate);
        setMilkType(entry.milk_type);
        setLiters(String(entry.liters));
        setPrice(String(entry.price_per_liter));
      } catch (err) {
        console.error("Error loading entry:", err);
      }
    }

    loadEntry();
  }, [editId]);

  // Auto change price when milk type changes
  useEffect(() => {
    if (milkType === "cow") {
      setPrice((cowPrice ?? 0).toString());
    } else {
      setPrice((buffaloPrice ?? 0).toString());
    }
  }, [milkType, cowPrice, buffaloPrice]);

  const total = (Number(liters) || 0) * (Number(price) || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (!liters || Number(liters) <= 0) {
      setErrorMessage("Please enter a valid milk quantity");
      setLoading(false);
      return;
    }

    if (!price || Number(price) <= 0) {
      setErrorMessage("Please enter a valid price per liter");
      setLoading(false);
      return;
    }

    if (date > today) {
      setErrorMessage("Future date is not allowed");
      setLoading(false);
      return;
    }

    if (Number(price) <= 0) {
      setErrorMessage("Price must be greater than 0");
      setLoading(false);
      return;
    }

    try {
      let res;

      if (editMode && editId) {
        res = await fetch(`/api/milk/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            milk_type: milkType,
            liters: Number(liters),
            price_per_liter: Number(price),
          }),
        });
      } else {
        res = await fetch("/api/milk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            milk_type: milkType,
            liters: Number(liters),
            price_per_liter: Number(price),
          }),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        if (data.error) {
          setErrorMessage(data.error);
        } else {
          setErrorMessage("Something went wrong. Please try again.");
        }

        setLoading(false);
        return;
      }

      if (editMode) {
        setToast("Entry updated");
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });

        setTimeout(() => {
          setToast("");
        }, 2500);

        setTimeout(() => {
          router.push("/records");
        }, 1000);
      } else {
        setToast("Milk entry saved");
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });

        setLiters("");

        setTimeout(() => {
          setToast("");
        }, 2500);
      }
    } catch (err) {
      setErrorMessage("Something went wrong");
    }

    setLoading(false);
  }

  return (
    <>
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-white border border-green-200 shadow-lg rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
            <div className="w-6 h-6 flex items-center justify-center rounded-full bg-green-100 text-green-600 text-xs">
              ✔
            </div>

            <span className="text-gray-700 font-medium">{toast}</span>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-100 pb-24">
        <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto p-5 space-y-5">
          <h1 className="text-2xl font-semibold">
            {editMode ? "Update Milk Entry" : "Add Milk Entry"}
          </h1>
          {editMode && (
            <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm p-3 rounded-lg">
              You are editing an existing milk entry
              <p className="text-sm text-gray-500">
                Editing entry • {liters} L {milkType}
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
              {errorMessage}
            </div>
          )}

          <div
            className={`rounded-2xl shadow-md p-4 ${
              editMode ? "bg-yellow-50 border border-yellow-200" : "bg-white"
            }`}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Date */}
              <div>
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                  <i className="fa-solid fa-calendar text-blue-600"></i>
                  Date
                </label>

                <div className="relative">
                  <i className="fa-solid fa-calendar absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>

                  <input
                    type="date"
                    value={date}
                    max={today}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg pl-10 pr-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>
              </div>

              {/* Milk Type */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Milk Type
                </label>

                <div className="flex gap-3 mt-2">
                  {/* Buffalo First */}
                  <button
                    type="button"
                    onClick={() => setMilkType("buffalo")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition
        ${
          milkType === "buffalo"
            ? "bg-blue-600 text-white border-blue-600"
            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
        }`}
                  >
                    <span>🐃</span>
                    Buffalo
                  </button>

                  {/* Cow Second */}
                  <button
                    type="button"
                    onClick={() => setMilkType("cow")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition
        ${
          milkType === "cow"
            ? "bg-blue-600 text-white border-blue-600"
            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
        }`}
                  >
                    <span>🐄</span>
                    Cow
                  </button>
                </div>
              </div>

              {/* Liters */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <i className="fa-solid fa-droplet text-blue-600"></i>
                  Liters
                  {liters && Number(liters) > 0 && (
                    <span className="text-green-600 text-xs">✓</span>
                  )}
                </label>

                <div className="mb-3">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={liters}
                    onChange={(e) => {
                      const val = e.target.value;

                      if (val === "") {
                        setLiters("");
                        return;
                      }

                      const num = Number(val);

                      if (isNaN(num)) {
                        setErrorMessage("Liters must be a valid number");
                        return;
                      }

                      if (num <= 0) {
                        setErrorMessage("Liters must be greater than 0");
                        return;
                      }

                      if (num > 1000) {
                        setErrorMessage("Liters value seems too large");
                        return;
                      }

                      setErrorMessage("");
                      setLiters(val);
                    }}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    required
                  />
                </div>

                <div className="flex gap-4">
                  {[2, 4, 6, 8].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setLiters(String(preset))}
                      className="border border-blue-300 text-blue-700 px-2 py-0.5 rounded-md font-medium text-xs hover:bg-blue-50 hover:border-blue-500 transition"
                    >
                      {preset}L
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <i className="fa-solid fa-indian-rupee text-blue-600"></i>
                  Price per Liter
                  {price && Number(price) > 0 && (
                    <span className="text-green-600 text-xs">✓</span>
                  )}
                </label>

                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={price}
                  onChange={(e) => {
                    const val = e.target.value;

                    if (val === "") {
                      setPrice("");
                      return;
                    }

                    const num = Number(val);

                    if (isNaN(num)) {
                      setErrorMessage("Price must be a valid number");
                      return;
                    }

                    if (num <= 0) {
                      setErrorMessage("Price must be greater than 0");
                      return;
                    }

                    if (num > 1000) {
                      setErrorMessage("Price seems too high");
                      return;
                    }

                    setErrorMessage("");
                    setPrice(val);
                  }}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition mb-2"
                />

                <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs p-2 rounded-lg flex gap-1.5 items-center">
                  <i className="fa-solid fa-circle-info flex-shrink-0 text-sm"></i>
                  <p className="flex-1">
                    Prices auto-filled from profile.
                    <button
                      type="button"
                      onClick={() => router.push("/profile")}
                      className="ml-1 underline font-medium text-blue-700"
                    >
                      Edit
                    </button>
                  </p>
                </div>
              </div>

              {/* Total with Breakdown */}
              <div className="bg-gradient-to-r from-green-50 to-green-50 border border-green-200 p-3 rounded-lg">
                <p className="text-xs text-green-700 font-medium mb-0.5">
                  Total
                </p>
                <p className="text-sm text-green-800 font-semibold">
                  {liters || "0"}L × ₹{price || "0"} ={" "}
                  <span className="text-base font-bold">
                    ₹{total.toFixed(2)}
                  </span>
                </p>
              </div>

              <button
                type="submit"
                className={`w-full text-white py-3 rounded-xl font-medium ${
                  editMode
                    ? "bg-yellow-500 hover:bg-yellow-600"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {loading
                  ? "Saving..."
                  : editMode
                    ? "Update Entry"
                    : "Save Entry"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Entries() {
  return (
    <Suspense fallback={<div className="p-5">Loading...</div>}>
      <EntriesPage />
    </Suspense>
  );
}
