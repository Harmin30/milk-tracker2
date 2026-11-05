"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardSkeleton } from "../../components/ui/skeleton";

type Entry = {
  id: string;
  milk_type: string;
  liters: number;
  total_amount: number;
  date: string;
};

// Module-level cache to enable instantaneous render when returning to Dashboard
let cachedDashboard: {
  cowPrice: number;
  buffaloPrice: number;
  brandMilkName: string;
  brandMilkPrice: number;
  cowRate: number;
  buffaloRate: number;
  packagedRate: number;
  cowLiters: number;
  buffaloLiters: number;
  packagedLiters: number;
  totalAmount: number;
  todayEntries: Entry[];
  todayMilk: number;
  todayAmount: number;
  hasTodayEntry: boolean | null;
} | null = null;

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(!cachedDashboard);
  const [errorMessage, setErrorMessage] = useState("");
  const [cowPrice, setCowPrice] = useState(cachedDashboard?.cowPrice || 0);
  const [buffaloPrice, setBuffaloPrice] = useState(cachedDashboard?.buffaloPrice || 0);
  const [brandMilkName, setBrandMilkName] = useState(cachedDashboard?.brandMilkName || "Packaged Milk");
  const [brandMilkPrice, setBrandMilkPrice] = useState(cachedDashboard?.brandMilkPrice || 0);
  const [cowRate, setCowRate] = useState(cachedDashboard?.cowRate || 0);
  const [buffaloRate, setBuffaloRate] = useState(cachedDashboard?.buffaloRate || 0);
  const [packagedRate, setPackagedRate] = useState(cachedDashboard?.packagedRate || 0);
  const [cowLiters, setCowLiters] = useState(cachedDashboard?.cowLiters || 0);
  const [buffaloLiters, setBuffaloLiters] = useState(cachedDashboard?.buffaloLiters || 0);
  const [packagedLiters, setPackagedLiters] = useState(cachedDashboard?.packagedLiters || 0);
  const [totalAmount, setTotalAmount] = useState(cachedDashboard?.totalAmount || 0);
  const [welcomeName, setWelcomeName] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);
  const [hasTodayEntry, setHasTodayEntry] = useState<boolean | null>(
    cachedDashboard ? cachedDashboard.hasTodayEntry : null,
  );
  const [showReminder, setShowReminder] = useState(true);
  const [todayEntries, setTodayEntries] = useState<Entry[]>(cachedDashboard?.todayEntries || []);
  const [todayMilk, setTodayMilk] = useState(cachedDashboard?.todayMilk || 0);
  const [todayAmount, setTodayAmount] = useState(cachedDashboard?.todayAmount || 0);
  const now = new Date();

  const monthLabel = now.toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const loadAllData = useCallback(async (isBackground = false) => {
    if (!isBackground && !cachedDashboard) {
      setLoading(true);
    }
    setErrorMessage("");

    try {
      const nowDate = new Date();
      const currentYear = nowDate.getFullYear();
      const currentMonth = nowDate.getMonth() + 1; // 1-12
      const pad = (n: number) => String(n).padStart(2, "0");
      const todayStr = `${currentYear}-${pad(currentMonth)}-${pad(nowDate.getDate())}`;

      // Parallelize monthly summary (authoritative DB aggregation covering 100% of records),
      // today's entries (exact date-filtered query), and profile prices
      const [summaryRes, todayRes, profileRes] = await Promise.all([
        fetch(`/api/summary/monthly?year=${currentYear}&month=${currentMonth}`),
        fetch(`/api/milk?searchDate=${todayStr}&limit=50`),
        fetch("/api/profile"),
      ]);

      const [summaryData, todayData, profileData] = await Promise.all([
        summaryRes.json(),
        todayRes.json(),
        profileRes.json(),
      ]);

      let newCowPrice = cowPrice;
      let newBuffaloPrice = buffaloPrice;
      let newBrandMilkName = brandMilkName;
      let newBrandMilkPrice = brandMilkPrice;

      if (profileRes.ok && profileData.data) {
        newCowPrice = profileData.data.default_cow_price || 0;
        newBuffaloPrice = profileData.data.default_buffalo_price || 0;
        newBrandMilkName = profileData.data.brand_milk_name || "Packaged Milk";
        newBrandMilkPrice = profileData.data.default_brand_price || 0;

        setCowPrice(newCowPrice);
        setBuffaloPrice(newBuffaloPrice);
        setBrandMilkName(newBrandMilkName);
        setBrandMilkPrice(newBrandMilkPrice);
      }

      let roundCow = cowLiters;
      let roundBuffalo = buffaloLiters;
      let roundPackaged = packagedLiters;
      let roundAmount = totalAmount;
      let newCowRate = cowRate;
      let newBuffaloRate = buffaloRate;
      let newPackagedRate = packagedRate;

      if (summaryRes.ok && summaryData) {
        roundCow = Math.round(Number(summaryData.cow_liters || 0) * 100) / 100;
        roundBuffalo = Math.round(Number(summaryData.buffalo_liters || 0) * 100) / 100;
        roundPackaged = Math.round(Number(summaryData.packaged_liters || 0) * 100) / 100;
        roundAmount = Math.round(Number(summaryData.total_amount || 0) * 100) / 100;
        newCowRate = Number(summaryData.cow_rate || 0);
        newBuffaloRate = Number(summaryData.buffalo_rate || 0);
        newPackagedRate = Number(summaryData.packaged_rate || 0);

        setCowLiters(roundCow);
        setBuffaloLiters(roundBuffalo);
        setPackagedLiters(roundPackaged);
        setTotalAmount(roundAmount);
        setCowRate(newCowRate);
        setBuffaloRate(newBuffaloRate);
        setPackagedRate(newPackagedRate);
      } else if (!summaryRes.ok) {
        setErrorMessage(summaryData.error || "Failed to load monthly summary");
      }

      let roundTodayMilk = todayMilk;
      let roundTodayAmount = todayAmount;
      let todaysEntries: Entry[] = todayEntries;
      let todayHasEntry = hasTodayEntry ?? false;

      if (todayRes.ok && todayData.data) {
        todaysEntries = todayData.data || [];
        let todayMilkSum = 0;
        let todayAmountSum = 0;

        todaysEntries.forEach((e: Entry) => {
          todayMilkSum += Number(e.liters);
          todayAmountSum += Number(e.total_amount);
        });

        roundTodayMilk = Math.round(todayMilkSum * 100) / 100;
        roundTodayAmount = Math.round(todayAmountSum * 100) / 100;
        todayHasEntry = todaysEntries.length > 0;

        setTodayEntries(todaysEntries);
        setTodayMilk(roundTodayMilk);
        setTodayAmount(roundTodayAmount);
        setHasTodayEntry(todayHasEntry);
      }

      // Save in module cache for instant re-render on next visit
      cachedDashboard = {
        cowPrice: newCowPrice,
        buffaloPrice: newBuffaloPrice,
        brandMilkName: newBrandMilkName,
        brandMilkPrice: newBrandMilkPrice,
        cowRate: newCowRate,
        buffaloRate: newBuffaloRate,
        packagedRate: newPackagedRate,
        cowLiters: roundCow,
        buffaloLiters: roundBuffalo,
        packagedLiters: roundPackaged,
        totalAmount: roundAmount,
        todayEntries: todaysEntries,
        todayMilk: roundTodayMilk,
        todayAmount: roundTodayAmount,
        hasTodayEntry: todayHasEntry,
      };
    } catch (err) {
      console.error("Dashboard data load error:", err);
      setErrorMessage("Could not connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [
    cowPrice,
    buffaloPrice,
    brandMilkName,
    brandMilkPrice,
    cowRate,
    buffaloRate,
    packagedRate,
    cowLiters,
    buffaloLiters,
    packagedLiters,
    totalAmount,
    todayMilk,
    todayAmount,
    todayEntries,
    hasTodayEntry,
  ]);

  useEffect(() => {
    // Background revalidation if cache exists, otherwise full load
    loadAllData(!!cachedDashboard);
  }, [loadAllData]);

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

  const totalMilk = Math.round((cowLiters + buffaloLiters + packagedLiters) * 100) / 100;

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

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between">
            <span className="font-medium">{errorMessage}</span>
            <button
              onClick={() => loadAllData(false)}
              className="text-xs font-bold underline ml-2 hover:text-rose-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* LOADING SKELETON OR ACTUAL CONTENT */}
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
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
                                : (brandMilkName || "Packaged Milk")}
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
                {(buffaloLiters > 0 || totalMilk === 0) && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 border border-slate-100">
                    <div className="flex items-center gap-2.5 text-slate-700">
                      <span className="text-base">🐃</span>
                      <div>
                        <p className="font-semibold text-slate-900">Buffalo Milk</p>
                        <p className="text-[10px] text-slate-500">₹{buffaloRate > 0 ? buffaloRate : buffaloPrice}/L</p>
                      </div>
                    </div>

                    <span className="font-bold text-slate-900">
                      {`${buffaloLiters} L`}
                    </span>
                  </div>
                )}

                {/* Cow */}
                {(cowLiters > 0 || totalMilk === 0) && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 border border-slate-100">
                    <div className="flex items-center gap-2.5 text-slate-700">
                      <span className="text-base">🐄</span>
                      <div>
                        <p className="font-semibold text-slate-900">Cow Milk</p>
                        <p className="text-[10px] text-slate-500">₹{cowRate > 0 ? cowRate : cowPrice}/L</p>
                      </div>
                    </div>

                    <span className="font-bold text-slate-900">
                      {`${cowLiters} L`}
                    </span>
                  </div>
                )}

                {/* Packaged / Brand Milk */}
                {(packagedLiters > 0 ||
                  (totalMilk === 0 &&
                    (Number(brandMilkPrice) > 0 ||
                      (brandMilkName && brandMilkName !== "Packaged Milk")))) && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 border border-slate-100">
                    <div className="flex items-center gap-2.5 text-slate-700">
                      <span className="text-base">🥛</span>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {brandMilkName || "Packaged Milk"}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          ₹{packagedRate > 0 ? packagedRate : brandMilkPrice}/L
                        </p>
                      </div>
                    </div>

                    <span className="font-bold text-slate-900">
                      {`${packagedLiters} L`}
                    </span>
                  </div>
                )}

                {/* Total Milk */}
                <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Total Volume</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {`${totalMilk} L`}
                  </span>
                </div>

                {/* Total Amount */}
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Total Amount</span>
                  <span className="font-bold text-emerald-600 text-base">
                    {`₹${totalAmount}`}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

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
