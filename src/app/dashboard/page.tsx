"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Entry = {
  id: string;
  milk_type: string;
  liters: number;
  total_amount: number;
  date: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [cowPrice, setCowPrice] = useState(0);
  const [buffaloPrice, setBuffaloPrice] = useState(0);
  const [cowLiters, setCowLiters] = useState(0);
  const [buffaloLiters, setBuffaloLiters] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const now = new Date();

  const monthLabel = now.toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    loadDashboard();
    loadPrices();
  }, []);

  async function loadDashboard() {
    try {
      const res = await fetch("/api/milk");
      const data = await res.json();

      if (res.ok) {
        const records = data.data || [];
        setEntries(records);

        let cow = 0;
        let buffalo = 0;
        let amount = 0;

        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();

        records.forEach((e: Entry) => {
          const d = new Date(e.date);

          if (d.getMonth() === month && d.getFullYear() === year) {
            if (e.milk_type === "cow") cow += Number(e.liters);
            else buffalo += Number(e.liters);

            amount += Number(e.total_amount);
          }
        });

        setCowLiters(cow);
        setBuffaloLiters(buffalo);
        setTotalAmount(amount);
      }
    } catch (err) {
      console.log(err);
    }

    setLoading(false);
  }

  async function loadPrices() {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();

      if (res.ok && data.data) {
        setCowPrice(data.data.default_cow_price || 0);
        setBuffaloPrice(data.data.default_buffalo_price || 0);
      }
    } catch (err) {
      console.log(err);
    }
  }

  const totalMilk = cowLiters + buffaloLiters;

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto p-5 space-y-5">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500">Overview of your milk records</p>
        </div>

        {/* Monthly Milk Summary */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-700">Monthly Summary</h2>
              <p className="text-xs text-gray-500">{monthLabel}</p>
            </div>

            <div className="bg-gray-100 text-gray-600 p-2 rounded-lg">
              <i className="fa-solid fa-chart-column"></i>
            </div>
          </div>

          {/* Milk Stats */}
          <div className="space-y-3 text-sm">
            {/* Buffalo */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600">
                <div className="flex flex-col">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">🐃</span>
                    Buffalo Milk
                  </span>

                  <span className="text-xs text-gray-500">
                    ₹{buffaloPrice}/L
                  </span>
                </div>
              </div>

              <span className="font-semibold">
                {loading ? "..." : `${buffaloLiters} L`}
              </span>
            </div>

            {/* Cow */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600">
                <div className="flex flex-col">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">🐄</span>
                    Cow Milk
                  </span>

                  <span className="text-xs text-gray-500">₹{cowPrice}/L</span>
                </div>
              </div>

              <span className="font-semibold">
                {loading ? "..." : `${cowLiters} L`}
              </span>
            </div>

            {/* Divider */}
            <div className="border-t pt-3 mt-3"></div>

            {/* Total Milk */}
            <div className="flex justify-between">
              <span className="text-gray-600">Total Milk</span>

              <span className="font-semibold">
                {loading ? "..." : `${totalMilk} L`}
              </span>
            </div>

            {/* Total Amount */}
            <div className="flex justify-between">
              <span className="text-gray-600">Total Amount</span>

              <span className="font-semibold text-green-600">
                {loading ? "..." : `₹${totalAmount}`}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>

          {/* Primary action */}
          <button
            onClick={() => router.push("/entries")}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium mb-4 hover:bg-blue-700 transition"
          >
            <i className="fa-solid fa-plus mr-2"></i>
            Add Milk Entry
          </button>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => router.push("/records")}
              className="bg-white shadow-md rounded-xl p-4 text-center hover:shadow-lg transition"
            >
              <div className="text-green-600 text-xl mb-2">
                <i className="fa-solid fa-file-lines"></i>
              </div>

              <p className="text-sm font-medium">Records</p>
            </button>

            <button
              onClick={() => router.push("/bills")}
              className="bg-white shadow-md rounded-xl p-4 text-center hover:shadow-lg transition"
            >
              <div className="text-purple-600 text-xl mb-2">
                <i className="fa-solid fa-file-invoice"></i>
              </div>

              <p className="text-sm font-medium">Bills</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
