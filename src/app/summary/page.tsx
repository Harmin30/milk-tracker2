"use client";

import { useState } from "react";



type SummaryData = {
  cow_liters: number;
  buffalo_liters: number;
  cow_amount: number;
  buffalo_amount: number;
  total_liters: number;
  total_amount: number;
};

export default function Summary() {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  async function fetchSummary() {
    if (!selectedMonth) return;

    const [year, month] = selectedMonth.split("-");

    setLoading(true);

    try {
      const res = await fetch(
        `/api/summary/monthly?year=${year}&month=${Number(month)}`,
      );

      const result = await res.json();

      setData(result);
    } catch (err) {
      console.log(err);
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
      }
    } catch (err) {
      console.log(err);
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

        {/* Month Picker */}

        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <label className="text-sm text-gray-600">Select Month</label>

          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full border rounded-lg px-4 py-3"
          />

          <button
            onClick={fetchSummary}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
          >
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

        {!loading && !data && selectedMonth && (
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
                <p className="font-semibold">{data.cow_liters} L</p>
              </div>

              <p className="text-green-600 font-medium">₹ {data.cow_amount}</p>
            </div>

            {/* Buffalo */}

            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <p className="text-sm text-gray-500">🐃 Buffalo Milk</p>
                <p className="font-semibold">{data.buffalo_liters} L</p>
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 text-center space-y-4">
            <h2 className="text-lg font-semibold text-red-600 flex items-center justify-center gap-2">
              <i className="fa-solid fa-triangle-exclamation"></i>
              Delete {monthLabel} Data
            </h2>
            <p className="text-sm text-gray-600">
              This will delete all milk entries and bills for {monthLabel}.
            </p>

            <p className="text-xs text-red-500 font-medium">
              This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 border py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={deleteMonthData}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg"
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
