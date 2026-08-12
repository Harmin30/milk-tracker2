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
  const [hasTodayEntry, setHasTodayEntry] = useState<boolean | null>(null);
  const [showReminder, setShowReminder] = useState(true);
  const [todayEntries, setTodayEntries] = useState<Entry[]>([]);
  const [todayMilk, setTodayMilk] = useState(0);
  const [todayAmount, setTodayAmount] = useState(0);
  const now = new Date();

  const monthLabel = now.toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

  async function loadDashboard() {
    try {
      const res = await fetch("/api/milk?limit=1000");
      const data = await res.json();

      if (res.ok) {
        const records = data.data || [];
        setEntries(records);

        let cow = 0;
        let buffalo = 0;
        let amount = 0;
        let todayMilkSum = 0;
        let todayAmountSum = 0;
        const todaysEntries: Entry[] = [];

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
            todaysEntries.push(e);
            todayMilkSum += Number(e.liters);
            todayAmountSum += Number(e.total_amount);
          }
        });

        setCowLiters(cow);
        setBuffaloLiters(buffalo);
        setTotalAmount(amount);
        setTodayEntries(todaysEntries);
        setTodayMilk(todayMilkSum);
        setTodayAmount(todayAmountSum);
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
    <div className="min-h-screen bg-slate-50/70 pb-24 text-slate-900">
      {/* Welcome Toast */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.4 }}
            className="fixed top-6 left-0 right-0 flex justify-center z-50 pointer-events-none px-4"
          >
            <div className="bg-emerald-50 text-emerald-900 px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-3 pointer-events-auto border border-emerald-200 text-sm font-semibold">
              <i className="fa-solid fa-circle-check text-emerald-500 text-base"></i>
              <p className="font-medium">Welcome back, {welcomeName}! 👋</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Overview of your daily milk records
          </p>
        </div>

        {/* Daily Reminder */}
        {showReminder && hasTodayEntry === false && (
          <div className="bg-amber-50/90 border border-amber-200/80 p-3.5 rounded-2xl shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-100/90 text-amber-700 flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                  📝
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    Don&apos;t forget to log today&apos;s milk!
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
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
                className="text-slate-400 hover:text-slate-600 p-1 transition flex-shrink-0"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
            <button
              onClick={() => router.push("/entries")}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-xs"
            >
              <i className="fa-solid fa-plus text-[11px]"></i>
              <span>Add Entry</span>
            </button>
          </div>
        )}

        {/* Today's Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between pb-1">
            <div>
              <h2 className="font-bold text-slate-900 text-sm tracking-tight">
                Today&apos;s Status
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>

            <div
              className={`flex items-center justify-center w-8 h-8 rounded-xl transition-colors ${
                hasTodayEntry
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <i
                className={`fa-solid text-sm ${
                  hasTodayEntry ? "fa-check-circle" : "fa-circle"
                }`}
              ></i>
            </div>
          </div>

          {hasTodayEntry ? (
            <div className="space-y-2">
              {todayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition ${
                    entry.milk_type === "cow"
                      ? "bg-emerald-50/50 border-emerald-100"
                      : entry.milk_type === "buffalo"
                        ? "bg-blue-50/50 border-blue-100"
                        : "bg-amber-50/50 border-amber-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="text-base flex-shrink-0">
                      {entry.milk_type === "cow"
                        ? "🐄"
                        : entry.milk_type === "buffalo"
                          ? "🐃"
                          : "🥛"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 capitalize">
                        {entry.milk_type === "cow"
                          ? "Cow Milk"
                          : entry.milk_type === "buffalo"
                            ? "Buffalo Milk"
                            : "Packaged Milk"}
                      </p>
                      <p className="text-[11px] font-medium text-slate-500">
                        {Number(entry.liters)} L
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-xs font-bold text-emerald-700">
                      ₹{Number(entry.total_amount)}
                    </p>
                  </div>
                </div>
              ))}

              <div className="border-t border-slate-100 pt-2.5 mt-2.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-medium text-slate-500">Total Today</span>
                  <div className="text-right">
                    <p className="text-base font-bold text-slate-900">
                      {todayMilk} L
                    </p>
                    <p className="text-xs font-bold text-emerald-600">
                      ₹{todayAmount}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-base">
                <i className="fa-solid fa-droplet"></i>
              </div>
              <p className="text-slate-600 text-xs font-medium">
                No entries logged yet today
              </p>
              <button
                onClick={() => router.push("/entries")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition shadow-xs inline-flex items-center gap-1.5"
              >
                <i className="fa-solid fa-plus text-[11px]"></i>
                <span>Add Entry</span>
              </button>
            </div>
          )}
        </div>

        {/* Monthly Milk Summary */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-sm tracking-tight">
                Monthly Summary
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">{monthLabel}</p>
            </div>

            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-xs">
              <i className="fa-solid fa-chart-column"></i>
            </div>
          </div>

          {/* Milk Stats */}
          <div className="space-y-3 text-xs">
            {/* Buffalo */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 border border-slate-100">
              <div className="flex items-center gap-2.5 text-slate-700">
                <span className="text-base">🐃</span>
                <div>
                  <p className="font-semibold text-slate-900">Buffalo Milk</p>
                  <p className="text-[10px] text-slate-500">₹{buffaloPrice}/L</p>
                </div>
              </div>

              <span className="font-bold text-slate-900">
                {loading ? "..." : `${buffaloLiters} L`}
              </span>
            </div>

            {/* Cow */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 border border-slate-100">
              <div className="flex items-center gap-2.5 text-slate-700">
                <span className="text-base">🐄</span>
                <div>
                  <p className="font-semibold text-slate-900">Cow Milk</p>
                  <p className="text-[10px] text-slate-500">₹{cowPrice}/L</p>
                </div>
              </div>

              <span className="font-bold text-slate-900">
                {loading ? "..." : `${cowLiters} L`}
              </span>
            </div>

            {/* Total Milk */}
            <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
              <span className="text-slate-600 font-medium">Total Volume</span>
              <span className="font-bold text-slate-900 text-sm">
                {loading ? "..." : `${totalMilk} L`}
              </span>
            </div>

            {/* Total Amount */}
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium">Total Amount</span>
              <span className="font-bold text-emerald-600 text-base">
                {loading ? "..." : `₹${totalAmount}`}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
            Quick Actions
          </h2>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => router.push("/entries")}
              className="bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-md rounded-2xl p-3.5 text-center transition flex flex-col items-center justify-center gap-1.5"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm">
                <i className="fa-solid fa-plus"></i>
              </div>
              <p className="text-xs font-semibold text-slate-800">Add Entry</p>
            </button>

            <button
              onClick={() => router.push("/records")}
              className="bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-md rounded-2xl p-3.5 text-center transition flex flex-col items-center justify-center gap-1.5"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">
                <i className="fa-solid fa-list"></i>
              </div>
              <p className="text-xs font-semibold text-slate-800">Records</p>
            </button>

            <button
              onClick={() => router.push("/bills")}
              className="bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-md rounded-2xl p-3.5 text-center transition flex flex-col items-center justify-center gap-1.5"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm">
                <i className="fa-solid fa-file-invoice"></i>
              </div>
              <p className="text-xs font-semibold text-slate-800">Bills</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
