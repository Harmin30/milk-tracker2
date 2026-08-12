"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Bill = {
  id: string;
  bill_type: string;
  year: number;
  month: number;
  from_date: string;
  to_date: string;
  total_amount: number;
  created_at: string;
};

export default function BillsPage() {
  const [mounted, setMounted] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState("monthly");

  const [selectedMonth, setSelectedMonth] = useState("");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [generating, setGenerating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | "warning"
  >("success");

  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = new Date().toISOString().slice(0, 7);

  async function loadBills() {
    try {
      const res = await fetch("/api/bills");
      const data = await res.json();

      if (res.ok) {
        setBills(data || []);
      }
    } catch (err) {
      console.log(err);
    }

    setLoading(false);
  }

  useEffect(() => {
    setMounted(true);
    loadBills();
  }, []);

  // Auto-dismiss success messages after 3 seconds
  useEffect(() => {
    if (messageType === "success" && message) {
      const timer = setTimeout(() => {
        setMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, messageType]);

  async function generateBill() {
    setMessage("");

    if (type === "monthly") {
      if (!selectedMonth) {
        setMessage("Please select a month");
        setMessageType("warning");
        return;
      }

      if (selectedMonth > currentMonth) {
        setMessage("Future months cannot be selected");
        setMessageType("warning");
        return;
      }
    }

    if (type === "custom") {
      if (!fromDate || !toDate) {
        setMessage("Please select both dates");
        setMessageType("warning");
        return;
      }

      if (fromDate > toDate) {
        setMessage("From date cannot be after To date");
        setMessageType("warning");
        return;
      }

      if (fromDate > today || toDate > today) {
        setMessage("Future dates are not allowed");
        setMessageType("warning");
        return;
      }
    }

    setGenerating(true);

    try {
      let body: Record<string, unknown>;

      if (type === "monthly") {
        const [year, month] = selectedMonth.split("-");

        body = {
          type: "monthly",
          year,
          month: Number(month),
        };
      } else {
        body = {
          type: "custom",
          from_date: fromDate,
          to_date: toDate,
        };
      }

      const res = await fetch("/api/bill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessage(err.error || "No data available for this selection");
        setMessageType("error");
        setGenerating(false);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "milk-bill.pdf";
      a.click();

      setMessage("Bill generated successfully");
      setMessageType("success");

      loadBills();
    } catch (err) {
      console.log(err);
      setMessage("Something went wrong");
      setMessageType("error");
    }

    setGenerating(false);
  }

  async function downloadExistingBill(bill: Bill) {
    try {
      const body =
        bill.bill_type === "monthly"
          ? {
              type: "monthly",
              year: bill.year,
              month: bill.month,
            }
          : {
              type: "custom",
              from_date: bill.from_date,
              to_date: bill.to_date,
            };

      const res = await fetch("/api/bill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "milk-bill.pdf";
      a.click();

      setMessage("Bill downloaded successfully");
      setMessageType("success");
    } catch (err) {
      console.log(err);
      setMessage("Failed to download bill");
      setMessageType("error");
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;

    const res = await fetch(`/api/bills/${deleteId}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Failed to delete bill");
      setMessageType("error");
      return;
    }

    setDeleteId(null);
    setMessage("Bill deleted successfully");
    setMessageType("success");
    loadBills();
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-24 text-slate-900">
      <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bills</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Generate and manage milk statement bills
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

        {/* BILL GENERATOR */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
          <div className="flex gap-2">
            <button
              onClick={() => setType("monthly")}
              className={`flex-1 py-2.5 rounded-xl font-semibold transition flex items-center justify-center gap-2 text-xs border ${
                type === "monthly"
                  ? "bg-gradient-to-r from-indigo-100 via-indigo-50 to-blue-100 text-indigo-950 border-indigo-400 font-bold shadow-xs ring-1 ring-indigo-400/20"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <i className="fa-solid fa-calendar-days text-xs"></i>
              <span>Monthly</span>
            </button>

            <button
              onClick={() => setType("custom")}
              className={`flex-1 py-2.5 rounded-xl font-semibold transition flex items-center justify-center gap-2 text-xs border ${
                type === "custom"
                  ? "bg-gradient-to-r from-indigo-100 via-indigo-50 to-blue-100 text-indigo-950 border-indigo-400 font-bold shadow-xs ring-1 ring-indigo-400/20"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <i className="fa-solid fa-calendar-week text-xs"></i>
              <span>Custom Range</span>
            </button>
          </div>

          {type === "monthly" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <i className="fa-solid fa-calendar text-indigo-600 text-xs"></i>
                Select Month
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[170px]">
                  <i className="fa-solid fa-calendar-days absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>

                  <input
                    type="month"
                    value={selectedMonth}
                    max={currentMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-xs font-medium"
                  />
                </div>

                {selectedMonth && (
                  <button
                    onClick={() => setSelectedMonth("")}
                    className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 transition"
                  >
                    <i className="fa-solid fa-xmark text-xs"></i>
                  </button>
                )}
              </div>
            </div>
          )}

          {type === "custom" && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* From Date */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5 block">
                    <i className="fa-solid fa-calendar text-indigo-600 text-xs"></i>
                    From Date
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[160px]">
                      <i className="fa-solid fa-calendar absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>

                      <input
                        type="date"
                        value={fromDate}
                        max={today}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-xs font-medium"
                      />
                    </div>

                    {fromDate && (
                      <button
                        onClick={() => setFromDate("")}
                        className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 transition"
                      >
                        <i className="fa-solid fa-xmark text-xs"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* To Date */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5 block">
                    <i className="fa-solid fa-calendar text-indigo-600 text-xs"></i>
                    To Date
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[160px]">
                      <i className="fa-solid fa-calendar absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>

                      <input
                        type="date"
                        value={toDate}
                        max={today}
                        onChange={(e) => setToDate(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-xs font-medium"
                      />
                    </div>

                    {toDate && (
                      <button
                        onClick={() => setToDate("")}
                        className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 transition"
                      >
                        <i className="fa-solid fa-xmark text-xs"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={generateBill}
            disabled={generating}
            className={`w-full py-2.5 rounded-xl font-semibold transition flex items-center justify-center gap-2 text-xs ${
              generating
                ? "bg-emerald-400 cursor-not-allowed opacity-75 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            }`}
          >
            {generating ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Generating Bill...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-file-invoice text-xs"></i>
                <span>Generate Bill</span>
              </>
            )}
          </button>
        </div>

        {/* BILL HISTORY */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <i className="fa-solid fa-file-invoice text-indigo-600 text-xs"></i>
              <span>Bill History</span>
            </h2>
          </div>

          {loading && <p className="text-slate-500 text-xs font-medium text-center py-4">Loading bills...</p>}

          {!loading && bills.length === 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 text-center shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-base">
                <i className="fa-solid fa-receipt"></i>
              </div>
              <p className="text-slate-600 text-xs font-medium">No bills generated yet</p>
            </div>
          )}

          {bills.map((bill) => (
            <div
              key={bill.id}
              className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition space-y-3"
            >
              {/* Top Section */}
              <div className="flex justify-between items-start">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                      <i className="fa-solid fa-file-invoice text-xs"></i>
                    </div>
                    <p className="font-bold text-slate-900 text-xs">
                      {bill.bill_type === "monthly"
                        ? `Monthly Statement`
                        : `Custom Range Statement`}
                    </p>
                  </div>

                  <p className="text-[11px] text-slate-600 ml-9">
                    {formatDate(bill.from_date)}{" "}
                    <span className="text-slate-400">to</span>{" "}
                    {formatDate(bill.to_date)}
                  </p>

                  <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold inline-block ml-9">
                    {bill.bill_type === "monthly"
                      ? `${new Date(bill.year, bill.month - 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`
                      : "Custom Range"}
                  </span>
                </div>

                <div className="text-right bg-emerald-50/80 border border-emerald-100 px-3 py-1.5 rounded-xl">
                  <p className="text-sm font-bold text-emerald-600">
                    ₹{bill.total_amount}
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => downloadExistingBill(bill)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-50/80 text-indigo-600 py-2 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition border border-indigo-200/60"
                >
                  <i className="fa-solid fa-download text-[10px]"></i>
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={() => setDeleteId(bill.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-rose-50/80 text-rose-600 py-2 rounded-xl text-xs font-semibold hover:bg-rose-100 transition border border-rose-200/60"
                >
                  <i className="fa-solid fa-trash text-[10px]"></i>
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {deleteId &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center space-y-4 shadow-xl border border-slate-200">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl">
                <i className="fa-solid fa-trash"></i>
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Delete Bill?
                </h2>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  This action cannot be undone. The statement bill record will be permanently removed.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>

                <button
                  onClick={confirmDelete}
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
