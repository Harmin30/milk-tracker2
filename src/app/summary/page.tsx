"use client";

import { useState, useEffect } from "react";

type SummaryData = {
  cow_liters: number;
  buffalo_liters: number;
  cow_amount: number;
  buffalo_amount: number;
  total_liters: number;
  total_amount: number;

  cow_rate: number;
  buffalo_rate: number;
  cow_rate_changed: boolean;
  buffalo_rate_changed: boolean;
};

export default function Summary() {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searched, setSearched] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | "warning"
  >("success");

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
    <div className="min-h-screen bg-gray-100 pb-24">
      <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto p-5 space-y-5">
        {/* Page Title */}

        <div>
          <h1 className="text-2xl font-semibold">Monthly Summary</h1>
          <p className="text-sm text-gray-500">
            View milk production and earnings for a specific month
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

        {/* Month Picker */}

        <div className="bg-white rounded-2xl shadow-md p-4 space-y-3 border border-gray-100">
          <label className="text-xs font-semibold text-gray-700 flex items-center gap-2">
            <i className="fa-solid fa-calendar text-blue-600"></i>
            Select Month
          </label>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Month selector */}
            <div className="relative flex-1 min-w-[170px]">
              <i className="fa-solid fa-calendar-days absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>

              <input
                type="month"
                value={selectedMonth}
                max={currentMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setData(null);
                  setSearched(false);
                }}
                className="w-full border-2 border-gray-200 rounded-lg pl-11 pr-4 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
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
                className="flex items-center justify-center w-9 h-9 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition"
              >
                <i className="fa-solid fa-xmark text-xs"></i>
              </button>
            )}
          </div>

          <button
            onClick={fetchSummary}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl font-semibold shadow-md transition flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-magnifying-glass"></i>
            Get Summary
          </button>
        </div>

        {/* Loading */}

        {loading && (
          <p className="text-gray-500 text-sm text-center">
            Loading summary...
          </p>
        )}

        {/* Empty State */}

        {!loading && !data && searched && (
          <div className="bg-white p-6 rounded-xl text-center shadow-sm">
            <p className="text-gray-500">No data available for this month</p>
          </div>
        )}

        {/* Summary Card */}

        {data && (
          <div className="bg-white rounded-2xl shadow-md p-6 space-y-6">
            {/* Month Header */}

            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-500 text-sm">Summary For</p>
                <p className="text-lg font-semibold">
                  {formatMonth(selectedMonth)}
                </p>
              </div>

              <button
                onClick={() => setShowDeleteModal(true)}
                className="text-red-600 border border-red-500 px-3 py-1 rounded-lg text-sm"
              >
                Delete Month
              </button>
            </div>

            {/* Cow */}

            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <p className="text-sm text-gray-500">🐄 Cow Milk</p>

                <div>
                  <p className="font-semibold">{data.cow_liters} L</p>
                  <p className="text-xs text-gray-400">
                    ₹ {Number(data.cow_rate).toFixed(2)} / L{" "}
                    {data.cow_rate_changed && (
                      <span className="text-[10px] text-orange-500 font-medium">
                        (Avg)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <p className="text-green-600 font-medium">₹ {data.cow_amount}</p>
            </div>

            {/* Buffalo */}

            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <p className="text-sm text-gray-500">🐃 Buffalo Milk</p>

                <div>
                  <p className="font-semibold">{data.buffalo_liters} L</p>
                  <p className="text-xs text-gray-400">
                    ₹ {Number(data.buffalo_rate).toFixed(2)} / L{" "}
                    {data.buffalo_rate_changed && (
                      <span className="text-[10px] text-orange-500 font-medium">
                        (Avg)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <p className="text-green-600 font-medium">
                ₹ {data.buffalo_amount}
              </p>
            </div>

            {/* Total */}

            <div className="flex justify-between items-center pt-2">
              <div>
                <p className="text-sm text-gray-500">Total Litres</p>
                <p className="text-xl font-semibold">{data.total_liters} L</p>
              </div>

              <p className="text-xl font-semibold text-blue-600">
                ₹ {data.total_amount}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* DELETE MODAL */}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-80 text-center space-y-5 shadow-xl">
            <div className="flex justify-center">
              <div className="bg-red-100 p-3 rounded-full">
                <i className="fa-solid fa-trash text-red-600 text-2xl"></i>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-800">
                Delete {monthLabel}?
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                This will delete all milk entries and bills for {monthLabel}.
                This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 border-2 border-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>

              <button
                onClick={deleteMonthData}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
