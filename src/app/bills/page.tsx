"use client";

import { useEffect, useState } from "react";

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
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState("monthly");

  const [selectedMonth, setSelectedMonth] = useState("");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [generating, setGenerating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [message, setMessage] = useState("");

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
    loadBills();
  }, []);

  async function generateBill() {
    setMessage("");

    if (type === "monthly") {
      if (!selectedMonth) {
        setMessage("Please select a month");
        return;
      }

      if (selectedMonth > currentMonth) {
        setMessage("Future months cannot be selected");
        return;
      }
    }

    if (type === "custom") {
      if (!fromDate || !toDate) {
        setMessage("Please select both dates");
        return;
      }

      if (fromDate > toDate) {
        setMessage("From date cannot be after To date");
        return;
      }

      if (fromDate > today || toDate > today) {
        setMessage("Future dates are not allowed");
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

      loadBills();
    } catch (err) {
      console.log(err);
      setMessage("Something went wrong");
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
    } catch (err) {
      console.log(err);
      setMessage("Failed to download bill");
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
      return;
    }

    setDeleteId(null);
    setMessage("Bill deleted successfully");
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
          <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm p-3 rounded-lg">
            {message}
          </div>
        )}

        {/* BILL GENERATOR */}

        <div className="bg-white p-5 rounded-xl shadow-sm space-y-4">
          <div className="flex gap-3">
            <button
              onClick={() => setType("monthly")}
              className={`flex-1 py-2 rounded-lg border ${
                type === "monthly" ? "bg-blue-600 text-white" : "bg-white"
              }`}
            >
              Monthly
            </button>

            <button
              onClick={() => setType("custom")}
              className={`flex-1 py-2 rounded-lg border ${
                type === "custom" ? "bg-blue-600 text-white" : "bg-white"
              }`}
            >
              Custom Range
            </button>
          </div>

          {type === "monthly" && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[170px]">
                <i className="fa-solid fa-calendar-days absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>

                <input
                  type="month"
                  value={selectedMonth}
                  max={currentMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full border rounded-lg pl-10 pr-3 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {selectedMonth && (
                <button
                  onClick={() => setSelectedMonth("")}
                  className="flex items-center justify-center w-10 h-10 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>
          )}

          {type === "custom" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* From Date */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[160px]">
                  <i className="fa-solid fa-calendar absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>

                  <input
                    type="date"
                    value={fromDate}
                    max={today}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full border rounded-lg pl-10 pr-3 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {fromDate && (
                  <button
                    onClick={() => setFromDate("")}
                    className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-300 transition"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
              </div>

              {/* To Date */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[160px]">
                  <i className="fa-solid fa-calendar absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>

                  <input
                    type="date"
                    value={toDate}
                    max={today}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full border rounded-lg pl-10 pr-3 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {toDate && (
                  <button
                    onClick={() => setToDate("")}
                    className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-300 transition"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
              </div>
            </div>
          )}

          <button
            onClick={generateBill}
            className="w-full bg-green-600 text-white py-3 rounded-lg"
          >
            {generating ? "Generating..." : "Generate Bill"}
          </button>
        </div>

        {/* BILL HISTORY */}

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Bill History</h2>

          {loading && <p className="text-gray-500 text-sm">Loading bills...</p>}

          {!loading && bills.length === 0 && (
            <div className="bg-white p-6 rounded-xl text-center shadow-sm">
              <p className="text-gray-500">No bills generated yet</p>
            </div>
          )}

          {bills.map((bill) => (
            <div key={bill.id} className="bg-white p-4 rounded-xl shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">
                    {bill.bill_type === "monthly"
                      ? `Monthly Bill (${bill.month}/${bill.year})`
                      : "Custom Bill"}
                  </p>

                  <p className="text-sm text-gray-500">
                    {formatDate(bill.from_date)} - {formatDate(bill.to_date)}
                  </p>
                </div>

                <p className="text-green-600 font-semibold">
                  ₹ {bill.total_amount}
                </p>
              </div>

              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => downloadExistingBill(bill)}
                  className="flex-1 border border-blue-500 text-blue-600 py-2 rounded-lg text-sm"
                >
                  Download
                </button>

                <button
                  onClick={() => setDeleteId(bill.id)}
                  className="flex-1 border border-red-500 text-red-600 py-2 rounded-lg text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 text-center space-y-4">
            <h2 className="text-lg font-semibold">Delete Bill</h2>

            <p className="text-sm text-gray-500">
              Are you sure you want to delete this bill?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 border py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={confirmDelete}
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
