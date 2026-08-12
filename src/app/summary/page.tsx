"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

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

export default function Summary() {
  const [mounted, setMounted] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [data, setData] = useState<SummaryData | null>(null);
  const [brandMilkName, setBrandMilkName] = useState("Packaged Milk");
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searched, setSearched] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | "warning"
  >("success");

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
        console.log(err);
      }
    }
    loadProfile();
  }, []);

  const currentMonth = new Date().toISOString().slice(0, 7);

  // Auto-dismiss success messages after 3 seconds
  useEffect(() => {
    if (messageType === "success" && message) {
      const timer = setTimeout(() => {
        setMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, messageType]);

  async function fetchSummary() {
    if (!selectedMonth) {
      setMessage("Please select a month");
      setMessageType("warning");
      return;
    }

    const [year, month] = selectedMonth.split("-");

    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(
        `/api/summary/monthly?year=${year}&month=${Number(month)}`,
      );

      const result = await res.json();

      if (result && result.total_liters) {
        setData(result);
        setMessage("Summary loaded successfully");
        setMessageType("success");
      } else {
        setData(result);
      }
    } catch (err) {
      console.log(err);
      setMessage("Failed to load summary");
      setMessageType("error");
    }

    setLoading(false);
  }

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
        setData(null);
        setMessage(`${monthLabel} data deleted successfully`);
        setMessageType("success");
      } else {
        setMessage("Failed to delete month data");
        setMessageType("error");
      }
    } catch (err) {
      console.log(err);
      setMessage("An error occurred while deleting data");
      setMessageType("error");
    }
  }

  function formatMonth(month: string) {
    const date = new Date(month + "-01");
    return date.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
  }

  const monthLabel = selectedMonth
    ? new Date(selectedMonth + "-01").toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div className="min-h-screen bg-slate-50/70 pb-24 text-slate-900">
      <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Monthly Summary</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            View milk production and total earnings for a specific month
          </p>
        </div>

        {message && (
          <div
            className={`p-3.5 px-5 rounded-2xl border flex items-center gap-3 text-xs font-semibold transition-all duration-300 shadow-lg ${
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
            <span>{message}</span>
          </div>
        )}

        {/* Month Picker */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <i className="fa-solid fa-calendar text-indigo-600 text-xs"></i>
            Select Month
          </label>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Month selector */}
            <div className="relative flex-1 min-w-[170px]">
              <i className="fa-solid fa-calendar-days absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>

              <input
                type="month"
                value={selectedMonth}
                max={currentMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setData(null);
                  setSearched(false);
                }}
                className="w-full border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-xs font-medium"
              />
            </div>

            {/* Clear button */}
            {selectedMonth && (
              <button
                onClick={() => {
                  setSelectedMonth("");
                  setData(null);
                  setSearched(false);
                }}
                className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 transition"
              >
                <i className="fa-solid fa-xmark text-xs"></i>
              </button>
            )}
          </div>

          <button
            onClick={fetchSummary}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-semibold shadow-xs transition flex items-center justify-center gap-1.5 text-xs"
          >
            <i className="fa-solid fa-magnifying-glass text-xs"></i>
            <span>Get Summary</span>
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <p className="text-slate-500 text-xs font-medium text-center py-4">
            Loading monthly summary...
          </p>
        )}

        {/* Empty State */}
        {!loading && !data && searched && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 text-center shadow-xs">
            <p className="text-slate-500 text-xs font-medium">No data available for this month</p>
          </div>
        )}

        {/* Summary Card */}
        {data && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            {/* Month Header */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <p className="text-[11px] text-slate-500 font-medium">Summary For</p>
                <p className="text-base font-bold text-slate-900">
                  {formatMonth(selectedMonth)}
                </p>
              </div>

              <button
                onClick={() => setShowDeleteModal(true)}
                className="text-rose-600 border border-rose-200 hover:bg-rose-50 px-3 py-1 rounded-xl text-xs font-semibold transition"
              >
                Delete Month
              </button>
            </div>

            {/* Cow */}
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50/70 border border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-900">🐄 Cow Milk</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">{data.cow_liters} L</p>
                <p className="text-[10px] text-slate-500">
                  ₹{Number(data.cow_rate).toFixed(2)} / L{" "}
                  {data.cow_rate_changed && (
                    <span className="text-[10px] text-amber-600 font-semibold">
                      (Avg)
                    </span>
                  )}
                </p>
              </div>

              <p className="text-emerald-600 font-bold text-sm">₹{data.cow_amount}</p>
            </div>

            {/* Buffalo */}
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50/70 border border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-900">🐃 Buffalo Milk</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">{data.buffalo_liters} L</p>
                <p className="text-[10px] text-slate-500">
                  ₹{Number(data.buffalo_rate).toFixed(2)} / L{" "}
                  {data.buffalo_rate_changed && (
                    <span className="text-[10px] text-amber-600 font-semibold">
                      (Avg)
                    </span>
                  )}
                </p>
              </div>

              <p className="text-emerald-600 font-bold text-sm">
                ₹{data.buffalo_amount}
              </p>
            </div>

            {/* Packaged Milk - Show only if bought */}
            {data.packaged_liters > 0 && (
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <div>
                  <p className="text-xs font-semibold text-slate-900">🥛 {brandMilkName}</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{data.packaged_liters} L</p>
                  <p className="text-[10px] text-slate-500">
                    ₹{Number(data.packaged_rate).toFixed(2)} / L{" "}
                    {data.packaged_rate_changed && (
                      <span className="text-[10px] text-amber-600 font-semibold">
                        (Avg)
                      </span>
                    )}
                  </p>
                </div>

                <p className="text-emerald-600 font-bold text-sm">
                  ₹{data.packaged_amount}
                </p>
              </div>
            )}
            {/* Volume Distribution Ratio Bar */}
            {data.total_liters > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500">
                  <span>Volume Distribution</span>
                  <span>{data.total_liters}L Total</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-slate-100 flex">
                  {data.cow_liters > 0 && (
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{
                        width: `${(data.cow_liters / data.total_liters) * 100}%`,
                      }}
                      title={`Cow: ${data.cow_liters}L`}
                    />
                  )}
                  {data.buffalo_liters > 0 && (
                    <div
                      className="bg-blue-600 h-full transition-all"
                      style={{
                        width: `${(data.buffalo_liters / data.total_liters) * 100}%`,
                      }}
                      title={`Buffalo: ${data.buffalo_liters}L`}
                    />
                  )}
                  {data.packaged_liters > 0 && (
                    <div
                      className="bg-amber-500 h-full transition-all"
                      style={{
                        width: `${(data.packaged_liters / data.total_liters) * 100}%`,
                      }}
                      title={`Packaged: ${data.packaged_liters}L`}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <div>
                <p className="text-[11px] text-slate-500 font-medium">Total Volume</p>
                <p className="text-lg font-bold text-slate-900">{data.total_liters} L</p>
              </div>

              <div className="text-right">
                <p className="text-[11px] text-slate-500 font-medium">Total Amount</p>
                <p className="text-lg font-bold text-emerald-600">
                  ₹{data.total_amount}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DELETE MODAL */}
      {showDeleteModal &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center space-y-4 shadow-xl border border-slate-200">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl">
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
                  className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>

                <button
                  onClick={deleteMonthData}
                  className="flex-1 bg-rose-600 text-white py-2 rounded-xl text-xs font-semibold hover:bg-rose-700 transition shadow-xs"
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
