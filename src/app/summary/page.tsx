"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

type SummaryData = {
  cow_liters: number;
  buffalo_liters: number;
  packaged_liters: number;
  cow_amount: number;
  buffalo_amount: number;
  packaged_amount: number;
  total_liters: number;
  total_amount: number;

  cow_rate: number;
  buffalo_rate: number;
  packaged_rate: number;
  cow_rate_changed: boolean;
  buffalo_rate_changed: boolean;
  packaged_rate_changed: boolean;
};

// Helper: Get local YYYY-MM string
function getCurrentMonthString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// Helper: Calculate previous month YYYY-MM
function getPreviousMonth(monthStr: string): string {
  if (!monthStr) return getCurrentMonthString();
  const [year, month] = monthStr.split("-").map(Number);
  const prevDate = new Date(year, month - 2, 1);
  return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
}

// Helper: Calculate next month YYYY-MM
function getNextMonth(monthStr: string): string {
  if (!monthStr) return getCurrentMonthString();
  const [year, month] = monthStr.split("-").map(Number);
  const nextDate = new Date(year, month, 1);
  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
}

// Helper: Format YYYY-MM to readable string (e.g., "November 2026")
function formatMonthDisplay(monthStr: string): string {
  if (!monthStr) return "";
  const [year, month] = monthStr.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export default function Summary() {
  const router = useRouter();
  const currentMonth = getCurrentMonthString();

  const [mounted, setMounted] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [data, setData] = useState<SummaryData | null>(null);
  const [brandMilkName, setBrandMilkName] = useState("Packaged Milk");
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "warning">("success");

  const monthInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load brand milk name from profile
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        if (res.ok && data.data?.brand_milk_name) {
          setBrandMilkName(data.data.brand_milk_name);
        }
      } catch (err) {
        console.log("Could not load profile:", err);
      }
    }
    loadProfile();
  }, []);

  // Auto-dismiss messages after 3.5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage("");
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Automatically fetch summary whenever selectedMonth changes (or on initial load)
  useEffect(() => {
    let isCurrent = true;

    async function loadMonthlySummary() {
      if (!selectedMonth) return;

      const [year, month] = selectedMonth.split("-");
      setLoading(true);

      try {
        const res = await fetch(
          `/api/summary/monthly?year=${year}&month=${Number(month)}`,
        );
        const result = await res.json();

        if (!isCurrent) return;

        if (res.ok) {
          setData(result);
        } else {
          setData(null);
          setMessage(result.error || "Failed to load summary");
          setMessageType("error");
        }
      } catch (err) {
        if (!isCurrent) return;
        console.error("Error loading summary:", err);
        setMessage("Could not connect to server");
        setMessageType("error");
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }

    loadMonthlySummary();

    return () => {
      isCurrent = false;
    };
  }, [selectedMonth]);

  // Open native month picker on tap
  function handleOpenPicker() {
    if (monthInputRef.current) {
      if ("showPicker" in HTMLInputElement.prototype) {
        try {
          monthInputRef.current.showPicker();
          return;
        } catch {
          // Fallback to click
        }
      }
      monthInputRef.current.focus();
      monthInputRef.current.click();
    }
  }

  // Delete all entries for current selected month
  async function deleteMonthData() {
    if (!selectedMonth) return;

    const [year, month] = selectedMonth.split("-");

    try {
      const res = await fetch("/api/summary/delete-month", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          year,
          month: Number(month),
        }),
      });

      if (res.ok) {
        setShowDeleteModal(false);
        setData({
          cow_liters: 0,
          buffalo_liters: 0,
          packaged_liters: 0,
          cow_amount: 0,
          buffalo_amount: 0,
          packaged_amount: 0,
          total_liters: 0,
          total_amount: 0,
          cow_rate: 0,
          buffalo_rate: 0,
          packaged_rate: 0,
          cow_rate_changed: false,
          buffalo_rate_changed: false,
          packaged_rate_changed: false,
        });
        setMessage(`${formatMonthDisplay(selectedMonth)} data deleted successfully`);
        setMessageType("success");
      } else {
        setMessage("Failed to delete month data");
        setMessageType("error");
      }
    } catch (err) {
      console.error("Error deleting month data:", err);
      setMessage("An error occurred while deleting data");
      setMessageType("error");
    }
  }

  const isCurrentMonth = selectedMonth === currentMonth;
  const monthLabel = formatMonthDisplay(selectedMonth);

  const hasData = Boolean(data && data.total_liters > 0);

  return (
    <div className="min-h-screen bg-slate-50/70 pb-28 text-slate-900">
      <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
        {/* Dashboard Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Monthly Summary
            </h1>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Your milk production and earnings overview
            </p>
          </div>

          {/* Delete Month button (only visible when month has data) */}
          {hasData && !loading && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 flex-shrink-0"
              title="Delete Month Data"
            >
              <i className="fa-solid fa-trash text-[11px]"></i>
              <span className="hidden sm:inline">Delete Month</span>
            </button>
          )}
        </div>

        {/* Status Toast Notification */}
        {message && (
          <div
            className={`p-3 px-4 rounded-2xl border flex items-center gap-2.5 text-xs font-semibold transition-all shadow-md ${
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
            <span className="flex-1">{message}</span>
            <button
              onClick={() => setMessage("")}
              className="text-slate-400 hover:text-slate-600 p-0.5 transition"
            >
              <i className="fa-solid fa-xmark text-xs"></i>
            </button>
          </div>
        )}

        {/* Compact Month Navigation Component */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-xs flex items-center justify-between gap-1 sm:gap-2">
          {/* Previous Month Arrow */}
          <button
            onClick={() => setSelectedMonth((m) => getPreviousMonth(m))}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100/80 transition active:scale-95 flex-shrink-0"
            title="Previous Month"
            aria-label="Previous Month"
          >
            <i className="fa-solid fa-chevron-left text-xs"></i>
          </button>

          {/* Month Display & Tap-to-Pick */}
          <div
            onClick={handleOpenPicker}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl hover:bg-slate-50/80 cursor-pointer transition select-none group min-w-0"
            title="Tap to pick a month"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleOpenPicker();
              }
            }}
          >
            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs flex-shrink-0 group-hover:bg-indigo-100 transition">
              <i className="fa-solid fa-calendar-days text-[11px]"></i>
            </div>

            <span className="font-bold text-xs sm:text-sm text-slate-800 truncate">
              {monthLabel}
            </span>

            {isCurrentMonth && (
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200/60 flex-shrink-0">
                This Month
              </span>
            )}

            <i className="fa-solid fa-caret-down text-slate-400 text-xs flex-shrink-0 ml-0.5"></i>

            {/* Hidden native month input triggered on tap */}
            <input
              ref={monthInputRef}
              type="month"
              value={selectedMonth}
              max={currentMonth}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedMonth(e.target.value);
                }
              }}
              className="sr-only"
              aria-label="Select Month"
            />
          </div>

          {/* Next Month Arrow (disabled for future months) */}
          <button
            disabled={isCurrentMonth}
            onClick={() => setSelectedMonth((m) => getNextMonth(m))}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition active:scale-95 flex-shrink-0 ${
              isCurrentMonth
                ? "text-slate-300 cursor-not-allowed opacity-40"
                : "text-slate-600 hover:bg-slate-100/80"
            }`}
            title={isCurrentMonth ? "Cannot select future months" : "Next Month"}
            aria-label="Next Month"
          >
            <i className="fa-solid fa-chevron-right text-xs"></i>
          </button>
        </div>

        {/* LOADING SKELETON */}
        {loading && (
          <div className="space-y-4 animate-pulse">
            {/* Primary Stat Skeletons */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 h-24"></div>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 h-24"></div>
            </div>
            {/* Breakdown Skeleton */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 h-44"></div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && !hasData && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-10 text-center shadow-xs space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-2xl shadow-xs">
              <i className="fa-solid fa-droplet"></i>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                {isCurrentMonth ? "No milk records yet" : `No records for ${monthLabel}`}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed font-medium">
                {isCurrentMonth
                  ? "Your production and earnings will appear here once you add your first milk entry."
                  : `No milk entries were logged during ${monthLabel}.`}
              </p>
            </div>
            <button
              onClick={() => router.push("/entries")}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition active:scale-95"
            >
              <i className="fa-solid fa-plus text-xs"></i>
              <span>Add Milk Entry</span>
            </button>
          </div>
        )}

        {/* ACTIVE DASHBOARD CONTENT */}
        {!loading && hasData && data && (
          <div className="space-y-4 sm:space-y-5">
            {/* 1. PRIMARY STATISTICS (2 PROMINENT CARDS) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Total Milk */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Total Milk
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-glass-water"></i>
                  </div>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                    {data.total_liters}{" "}
                    <span className="text-xs sm:text-sm font-semibold text-slate-500">L</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Total Volume
                  </p>
                </div>
              </div>

              {/* Total Earnings */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Total Earnings
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-indian-rupee-sign"></i>
                  </div>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600">
                    ₹{Number(data.total_amount).toLocaleString("en-IN")}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Total Revenue
                  </p>
                </div>
              </div>
            </div>

            {/* 2. MILK CATEGORY BREAKDOWN */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Category Breakdown
                </h2>
                <span className="text-[10px] font-semibold text-slate-500">
                  {monthLabel}
                </span>
              </div>

              <div className="space-y-2.5">
                {/* Buffalo Milk */}
                {data.buffalo_liters > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-base flex-shrink-0">
                        🐃
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          Buffalo Milk
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          ₹{Number(data.buffalo_rate).toFixed(2)}/L
                          {data.buffalo_rate_changed && (
                            <span className="text-amber-600 font-semibold ml-1 text-[10px]">
                              (Avg)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-xs font-bold text-slate-900">
                        {data.buffalo_liters} L
                      </p>
                      <p className="text-xs font-bold text-emerald-600">
                        ₹{data.buffalo_amount}
                      </p>
                    </div>
                  </div>
                )}

                {/* Cow Milk */}
                {data.cow_liters > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-base flex-shrink-0">
                        🐄
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          Cow Milk
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          ₹{Number(data.cow_rate).toFixed(2)}/L
                          {data.cow_rate_changed && (
                            <span className="text-amber-600 font-semibold ml-1 text-[10px]">
                              (Avg)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-xs font-bold text-slate-900">
                        {data.cow_liters} L
                      </p>
                      <p className="text-xs font-bold text-emerald-600">
                        ₹{data.cow_amount}
                      </p>
                    </div>
                  </div>
                )}

                {/* Packaged / Brand Milk */}
                {data.packaged_liters > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-base flex-shrink-0">
                        🥛
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {brandMilkName || "Packaged Milk"}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          ₹{Number(data.packaged_rate).toFixed(2)}/L
                          {data.packaged_rate_changed && (
                            <span className="text-amber-600 font-semibold ml-1 text-[10px]">
                              (Avg)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-xs font-bold text-slate-900">
                        {data.packaged_liters} L
                      </p>
                      <p className="text-xs font-bold text-emerald-600">
                        ₹{data.packaged_amount}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. VOLUME DISTRIBUTION */}
            {data.total_liters > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Volume Distribution
                  </h2>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    {data.total_liters} L Total
                  </span>
                </div>

                {/* Segmented Progress Bar */}
                <div className="h-2.5 rounded-full overflow-hidden bg-slate-100 flex gap-0.5">
                  {data.buffalo_liters > 0 && (
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(data.buffalo_liters / data.total_liters) * 100}%`,
                      }}
                      title={`Buffalo: ${data.buffalo_liters}L`}
                    />
                  )}
                  {data.cow_liters > 0 && (
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(data.cow_liters / data.total_liters) * 100}%`,
                      }}
                      title={`Cow: ${data.cow_liters}L`}
                    />
                  )}
                  {data.packaged_liters > 0 && (
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(data.packaged_liters / data.total_liters) * 100}%`,
                      }}
                      title={`Packaged: ${data.packaged_liters}L`}
                    />
                  )}
                </div>

                {/* Distribution Legend */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-medium pt-1 text-slate-600">
                  {data.buffalo_liters > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 flex-shrink-0"></span>
                      <span>
                        Buffalo:{" "}
                        <strong className="text-slate-900">
                          {((data.buffalo_liters / data.total_liters) * 100).toFixed(0)}%
                        </strong>
                      </span>
                    </div>
                  )}
                  {data.cow_liters > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                      <span>
                        Cow:{" "}
                        <strong className="text-slate-900">
                          {((data.cow_liters / data.total_liters) * 100).toFixed(0)}%
                        </strong>
                      </span>
                    </div>
                  )}
                  {data.packaged_liters > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0"></span>
                      <span>
                        {brandMilkName || "Packaged"}:{" "}
                        <strong className="text-slate-900">
                          {((data.packaged_liters / data.total_liters) * 100).toFixed(0)}%
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Action Footer */}
            <div className="flex items-center justify-between pt-1 px-1">
              <button
                onClick={() => router.push("/entries")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
              >
                <i className="fa-solid fa-plus text-[11px]"></i>
                <span>Add Milk Entry</span>
              </button>

              <button
                onClick={() => router.push("/bills")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
              >
                <i className="fa-solid fa-file-invoice text-[11px]"></i>
                <span>Generate Bill</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DELETE MODAL (PRESERVED) */}
      {showDeleteModal &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-6 w-full max-w-xs text-center space-y-4 shadow-xl border border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-xl border border-rose-100">
                <i className="fa-solid fa-trash"></i>
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Delete {monthLabel}?
                </h2>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  This will delete all milk entries and bills for {monthLabel}.
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-50 transition active:scale-95"
                >
                  Cancel
                </button>

                <button
                  onClick={deleteMonthData}
                  className="flex-1 bg-rose-600 text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-rose-700 transition shadow-xs active:scale-95"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
