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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      let body: any;

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
    <div className="min-h-screen bg-gray-100 pb-24">
      <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto p-5 space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Bills</h1>
          <p className="text-sm text-gray-500">
            Generate and manage milk bills
          </p>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl border-2 flex items-center gap-3 text-sm font-medium transition-all duration-300 ${
              messageType === "success"
                ? "bg-green-50 border-green-300 text-green-700"
                : messageType === "error"
                  ? "bg-red-50 border-red-300 text-red-700"
                  : "bg-yellow-50 border-yellow-300 text-yellow-700"
            }`}
          >
            {messageType === "success" && (
              <i className="fa-solid fa-circle-check text-lg flex-shrink-0"></i>
            )}
            {messageType === "error" && (
              <i className="fa-solid fa-circle-xmark text-lg flex-shrink-0"></i>
            )}
            {messageType === "warning" && (
              <i className="fa-solid fa-triangle-exclamation text-lg flex-shrink-0"></i>
            )}
            <span>{message}</span>
          </div>
        )}

        {/* BILL GENERATOR */}

        <div className="bg-white p-4 rounded-2xl shadow-md space-y-3 border border-gray-100">
          <div className="flex gap-3">
            <button
              onClick={() => setType("monthly")}
              className={`flex-1 py-2.5 rounded-xl font-semibold transition flex items-center justify-center gap-2 text-sm ${
                type === "monthly"
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <i className="fa-solid fa-calendar-days"></i>
              Monthly
            </button>

            <button
              onClick={() => setType("custom")}
              className={`flex-1 py-2.5 rounded-xl font-semibold transition flex items-center justify-center gap-2 text-sm ${
                type === "custom"
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <i className="fa-solid fa-calendar-week"></i>
              Custom Range
            </button>
          </div>

          {type === "monthly" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                <i className="fa-solid fa-calendar text-blue-600"></i>
                Select Month
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[170px]">
                  <i className="fa-solid fa-calendar-days absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>

                  <input
                    type="month"
                    value={selectedMonth}
                    max={currentMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg pl-10 pr-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                  />
                </div>

                {selectedMonth && (
                  <button
                    onClick={() => setSelectedMonth("")}
                    className="flex items-center justify-center w-9 h-9 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition"
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
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-2 block">
                    <i className="fa-solid fa-calendar text-blue-600"></i>
                    From Date
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[160px]">
                      <i className="fa-solid fa-calendar absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>

                      <input
                        type="date"
                        value={fromDate}
                        max={today}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-lg pl-10 pr-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                      />
                    </div>

                    {fromDate && (
                      <button
                        onClick={() => setFromDate("")}
                        className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-300 transition"
                      >
                        <i className="fa-solid fa-xmark text-xs"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* To Date */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-2 block">
                    <i className="fa-solid fa-calendar text-blue-600"></i>
                    To Date
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[160px]">
                      <i className="fa-solid fa-calendar absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>

                      <input
                        type="date"
                        value={toDate}
                        max={today}
                        onChange={(e) => setToDate(e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-lg pl-10 pr-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                      />
                    </div>

                    {toDate && (
                      <button
                        onClick={() => setToDate("")}
                        className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-300 transition"
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
            className={`w-full py-2.5 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
              generating
                ? "bg-green-400 cursor-not-allowed opacity-75"
                : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md"
            }`}
          >
            {generating ? (
              <>
                <svg
                  className="w-5 h-5 animate-spin"
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
                <span>Generating...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-file-invoice"></i>
                <span>Generate Bill</span>
              </>
            )}
          </button>
        </div>

        {/* BILL HISTORY */}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <i className="fa-solid fa-file-invoice text-blue-600"></i>
              Bill History
            </h2>
          </div>

          {loading && <p className="text-gray-500 text-sm">Loading bills...</p>}

          {!loading && bills.length === 0 && (
            <div className="bg-white p-6 rounded-xl text-center shadow-sm border border-gray-100">
              <i className="fa-solid fa-receipt text-2xl text-gray-400 mb-2"></i>
              <p className="text-gray-500">No bills generated yet</p>
            </div>
          )}

          {bills.map((bill) => (
            <div
              key={bill.id}
              className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition"
            >
              {/* Top Section */}
              <div className="flex justify-between items-start mb-2">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded">
                      <i className="fa-solid fa-file-invoice text-blue-600 text-xs"></i>
                    </div>
                    <p className="font-semibold text-gray-800 text-sm">
                      {bill.bill_type === "monthly"
                        ? `Monthly Bill`
                        : `Custom Bill`}
                    </p>
                  </div>

                  <p className="text-xs text-gray-600 ml-7">
                    {formatDate(bill.from_date)}{" "}
                    <span className="text-gray-400">to</span>{" "}
                    {formatDate(bill.to_date)}
                  </p>

                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium inline-block ml-7">
                    {bill.bill_type === "monthly"
                      ? `${new Date(bill.year, bill.month - 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`
                      : "Custom Range"}
                  </span>
                </div>

                <div className="text-right bg-green-50 px-3 py-2 rounded-lg">
                  <p className="text-xl font-bold text-green-600">
                    ₹{bill.total_amount}
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => downloadExistingBill(bill)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 text-blue-600 py-2 rounded text-xs font-semibold hover:bg-blue-100 transition"
                >
                  <i className="fa-solid fa-download text-xs"></i>
                  Download
                </button>

                <button
                  onClick={() => setDeleteId(bill.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 text-red-600 py-2 rounded text-xs font-semibold hover:bg-red-100 transition"
                >
                  <i className="fa-solid fa-trash text-xs"></i>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {deleteId && mounted && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-80 text-center space-y-5 shadow-xl">
            <div className="flex justify-center">
              <div className="bg-red-100 p-3 rounded-full">
                <i className="fa-solid fa-trash text-red-600 text-2xl"></i>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-800">Delete Bill?</h2>
              <p className="text-sm text-gray-500 mt-2">
                This action cannot be undone. The bill will be permanently
                deleted.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 border-2 border-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>

              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
