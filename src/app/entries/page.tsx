"use client";
import { Suspense } from "react";
import { useState, useEffect } from "react";
import Header from "../../components/Header";
import BottomNav from "../../components/BottomNav";
import { useSearchParams, useRouter } from "next/navigation";

function EntriesPage() {
  const today = new Date().toLocaleDateString("en-CA");

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
      const res = await fetch("/api/milk");
      const data = await res.json();

      if (res.ok) {
        type MilkEntry = {
          id: string;
          date: string;
          milk_type: string;
          liters: number;
          price_per_liter: number;
        };

        const entry = data.data.find((e: MilkEntry) => e.id === editId);

        if (entry) {
          setEditMode(true);

          const localDate = new Date(entry.date);
          const formattedDate = localDate.toLocaleDateString("en-CA");

          setDate(formattedDate);
          setMilkType(entry.milk_type);
          setLiters(Number(entry.liters).toString());
          setPrice(Number(entry.price_per_liter).toString());
        }
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
            liters: Number(liters),
            price: Number(price),
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
        setSuccessMessage("Entry updated successfully");

        setTimeout(() => {
          router.push("/records");
        }, 1000);
      } else {
        setSuccessMessage("Milk entry added successfully");
        setLiters("");
      }
    } catch (err) {
      setErrorMessage("Something went wrong");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      <Header />

      <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto p-5 space-y-5">
        <h1 className="text-2xl font-semibold">
          {editMode ? "Update Milk Entry" : "Add Milk Entry"}
        </h1>

        {editMode && (
          <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm p-3 rounded-lg">
            You are editing an existing milk entry
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm p-3 rounded-lg">
            {successMessage}
          </div>
        )}

        <div
          className={`rounded-2xl shadow-md p-5 ${
            editMode ? "bg-yellow-50 border border-yellow-200" : "bg-white"
          }`}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Date */}
            <div>
              <label className="text-sm text-gray-600">Date</label>
              <input
                type="date"
                value={date}
                max={today}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border rounded-lg px-4 py-3 mt-1"
              />
            </div>

            {/* Milk Type */}
            <div>
              <label className="text-sm text-gray-600">Milk Type</label>

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
              <label className="text-sm text-gray-600">Liters</label>

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
                className="w-full border rounded-lg px-4 py-3 mt-1"
                required
              />
            </div>

            {/* Price */}
            <div>
              <label className="text-sm text-gray-600">Price per liter</label>

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
                className="w-full border rounded-lg px-4 py-3 mt-1"
              />

              <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs p-3 rounded-lg mt-2 flex gap-2 items-start">
                <i className="fa-solid fa-circle-info mt-[2px]"></i>

                <p>
                  Prices from your profile will automatically appear here. You
                  can still edit them manually.
                  <button
                    type="button"
                    onClick={() => router.push("/profile")}
                    className="ml-1 underline font-medium text-blue-700"
                  >
                    (Set prices)
                  </button>
                </p>
              </div>
            </div>

            {/* Total */}
            <div className="bg-gray-50 p-3 rounded-lg flex justify-between">
              <span className="text-gray-600">Total Amount</span>

              <span className="font-semibold text-green-600">
                ₹ {total.toFixed(2)}
              </span>
            </div>

            <button
              type="submit"
              className={`w-full text-white py-3 rounded-xl font-medium ${
                editMode
                  ? "bg-yellow-500 hover:bg-yellow-600"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "Saving..." : editMode ? "Update Entry" : "Save Entry"}
            </button>
          </form>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

export default function Entries() {
  return (
    <Suspense fallback={<div className="p-5">Loading...</div>}>
      <EntriesPage />
    </Suspense>
  );
}
