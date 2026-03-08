"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

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
  const [welcomeName, setWelcomeName] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);
  const [hasTodayEntry, setHasTodayEntry] = useState(false);
  const [showReminder, setShowReminder] = useState(true);
  const now = new Date();

  const monthLabel = now.toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

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
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          .toISOString()
          .split("T")[0];

        let todayHasEntry = false;

        records.forEach((e: Entry) => {
          const d = new Date(e.date);
          const entryDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
            .toISOString()
            .split("T")[0];

          if (d.getMonth() === month && d.getFullYear() === year) {
            if (e.milk_type === "cow") cow += Number(e.liters);
            else buffalo += Number(e.liters);

            amount += Number(e.total_amount);
          }

          if (entryDate === today) {
            todayHasEntry = true;
          }
        });

        setCowLiters(cow);
        setBuffaloLiters(buffalo);
        setTotalAmount(amount);
        setHasTodayEntry(todayHasEntry);
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

  useEffect(() => {
    // Load data on mount
    loadDashboard();
    loadPrices();
  }, []);

  useEffect(() => {
    // Check for welcome name in localStorage
    const name = localStorage.getItem("welcomeName");
    if (name) {
      setWelcomeName(name);
      setShowWelcome(true);
      localStorage.removeItem("welcomeName");
    }
  }, []);

  useEffect(() => {
    // Check if reminder was dismissed today
    const today = new Date().toISOString().split("T")[0];
    const dismissedDate = localStorage.getItem("reminder_dismissed_date");

    // Only show reminder if not dismissed today
    if (dismissedDate === today) {
      setShowReminder(false);
    } else {
      setShowReminder(true);
    }
  }, []);

  useEffect(() => {
    // If welcome message is shown, hide it after 3 seconds
    if (showWelcome) {
      const timer = setTimeout(() => {
        setShowWelcome(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [showWelcome]);

  const totalMilk = cowLiters + buffaloLiters;

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* Welcome Toast */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.5 }}
            className="fixed top-8 left-0 right-0 flex justify-center z-50 pointer-events-none"
          >
            <div className="bg-gradient-to-r from-green-400 to-green-500 text-white px-8 py-4 rounded-lg shadow-xl flex items-center space-x-3 pointer-events-auto">
              <i className="fa-solid fa-check-circle text-lg"></i>
              <div>
                <p className="font-medium">Welcome back, {welcomeName}! 👋</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-gray-100 pb-24">
        <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto p-5 space-y-5">
          {/* Page Title */}
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
            <p className="text-sm text-gray-500">
              Overview of your milk records
            </p>
          </div>

          {/* Daily Reminder */}
          {showReminder && !hasTodayEntry && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 p-3 rounded-lg shadow-sm mt-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <div className="text-lg">📝</div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-800">
                      Don&apos;t forget to log today&apos;s milk!
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      You haven&apos;t added any entries yet today
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const today = new Date().toISOString().split("T")[0];
                    localStorage.setItem("reminder_dismissed_date", today);
                    setShowReminder(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-lg flex-shrink-0"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
              <button
                onClick={() => router.push("/entries")}
                className="mt-2 w-full bg-amber-500 text-white py-1.5 rounded-lg text-xs font-medium hover:bg-amber-600 transition flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-plus text-xs"></i>
                Add Entry
              </button>
            </div>
          )}

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
    </div>
  );
}
