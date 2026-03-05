"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import BottomNav from "../../components/BottomNav";

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

  const totalMilk = cowLiters + buffaloLiters;

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      <Header />

      <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto p-5 space-y-5">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500">Overview of your milk records</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Cow Milk */}
          <div className="bg-white rounded-2xl shadow-md p-4 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Cow Milk</p>

              <p className="text-xl font-semibold mt-1">
                {loading ? "..." : `${cowLiters} L`}
              </p>
            </div>

            <div className="bg-blue-100 text-blue-600 p-3 rounded-xl">
              <i className="fa-solid fa-cow text-lg"></i>
            </div>
          </div>

          {/* Buffalo Milk */}
          <div className="bg-white rounded-2xl shadow-md p-4 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Buffalo Milk</p>

              <p className="text-xl font-semibold mt-1">
                {loading ? "..." : `${buffaloLiters} L`}
              </p>
            </div>

            <div className="bg-purple-100 text-purple-600 p-3 rounded-xl">
              <i className="fa-solid fa-droplet text-lg"></i>
            </div>
          </div>
        </div>

        {/* Monthly Summary */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-700">Monthly Summary</h2>

              <p className="text-xs text-gray-500">{monthLabel}</p>
            </div>

            <i className="fa-solid fa-chart-column text-gray-400"></i>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <p className="text-gray-500">Total Milk</p>

              <p className="font-semibold">
                {loading ? "..." : `${totalMilk} L`}
              </p>
            </div>

            <div className="flex justify-between">
              <p className="text-gray-500">Total Amount</p>

              <p className="font-semibold text-green-600">
                {loading ? "..." : `₹${totalAmount}`}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>

          <div className="grid grid-cols-3 gap-4">
            {/* Add Entry */}

            <button
              onClick={() => router.push("/entries")}
              className="bg-white shadow-md rounded-xl p-4 text-center hover:shadow-lg transition"
            >
              <div className="text-blue-600 text-xl mb-2">
                <i className="fa-solid fa-plus"></i>
              </div>

              <p className="text-sm font-medium">Add Entry</p>
            </button>

            {/* Records */}

            <button
              onClick={() => router.push("/records")}
              className="bg-white shadow-md rounded-xl p-4 text-center hover:shadow-lg transition"
            >
              <div className="text-green-600 text-xl mb-2">
                <i className="fa-solid fa-file-lines"></i>
              </div>

              <p className="text-sm font-medium">Records</p>
            </button>

            {/* Bills */}

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

      <BottomNav />
    </div>
  );
}
