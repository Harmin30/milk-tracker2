"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { BillsSkeleton } from "../../components/ui/skeleton";

// Helper: Format YYYY-MM to readable month (e.g., "November 2026")
function formatMonthValue(val: string): string {
  if (!val) return "";
  const [year, month] = val.split("-").map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

// Helper: Format YYYY-MM-DD to readable date (e.g., "01 November 2026")
function formatDateValue(val: string): string {
  if (!val) return "";
  const [year, month, day] = val.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const dayStr = String(day).padStart(2, "0");
  const monthStr = d.toLocaleDateString("en-IN", { month: "long" });
  return `${dayStr} ${monthStr} ${year}`;
}

// Helper: Extract numeric year from a bill
function getBillYear(bill: Bill): number {
  if (bill.year) return Number(bill.year);
  if (bill.from_date) {
    const d = new Date(bill.from_date);
    if (!isNaN(d.getFullYear())) return d.getFullYear();
    const parts = String(bill.from_date).split("-");
    if (parts[0] && parts[0].length === 4) return Number(parts[0]);
  }
  if (bill.created_at) {
    const d = new Date(bill.created_at);
    if (!isNaN(d.getFullYear())) return d.getFullYear();
  }
  return new Date().getFullYear();
}

// Helper: Format readable monthly title e.g. "November 2026 Bill"
function getMonthlyBillTitle(bill: Bill): string {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const mIndex = Math.max(0, Math.min(11, (Number(bill.month) || 1) - 1));
  const mName = monthNames[mIndex];
  const yr = bill.year || getBillYear(bill);
  return `${mName} ${yr} Bill`;
}

// Helper: Format readable date range e.g. "01 Oct – 15 Oct 2026"
function formatRangeDates(fromStr: string, toStr: string): string {
  if (!fromStr && !toStr) return "";
  if (!fromStr) return formatDateValue(toStr);
  if (!toStr) return formatDateValue(fromStr);

  const fromD = new Date(fromStr);
  const toD = new Date(toStr);

  if (isNaN(fromD.getTime()) || isNaN(toD.getTime())) {
    return `${fromStr} – ${toStr}`;
  }

  // If same calendar year: "01 Oct – 15 Oct 2026"
  if (fromD.getFullYear() === toD.getFullYear()) {
    const fromPart = fromD.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
    const toPart = toD.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return `${fromPart} – ${toPart}`;
  }

  // Different calendar years
  const fromFull = fromD.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const toFull = toD.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return `${fromFull} – ${toFull}`;
}

// Helper: Chronological descending comparator (newest bills first)
function compareBillsDescending(a: Bill, b: Bill): number {
  const dateA =
    a.from_date ||
    (a.year && a.month
      ? `${a.year}-${String(a.month).padStart(2, "0")}-01`
      : "") ||
    a.created_at;
  const dateB =
    b.from_date ||
    (b.year && b.month
      ? `${b.year}-${String(b.month).padStart(2, "0")}-01`
      : "") ||
    b.created_at;

  if (dateA && dateB && dateA !== dateB) {
    return dateB.localeCompare(dateA);
  }
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function DatePickerField({
  type,
  value,
  placeholder,
  label,
  max,
  min,
  onChange,
  onClear,
}: {
  type: "month" | "date";
  value: string;
  placeholder: string;
  label: string;
  max?: string;
  min?: string;
  onChange: (val: string) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const displayValue =
    type === "month" ? formatMonthValue(value) : formatDateValue(value);

  const handleTriggerClick = () => {
    if (inputRef.current) {
      if ("showPicker" in inputRef.current && typeof inputRef.current.showPicker === "function") {
        try {
          inputRef.current.showPicker();
          return;
        } catch {
          // Fallback to focus
        }
      }
      inputRef.current.focus();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div
        onClick={handleTriggerClick}
        className="relative flex-1 group cursor-pointer"
      >
        {/* VISIBLE ACCESSIBLE DISPLAY LAYER */}
        <div className="w-full min-h-[44px] h-[44px] border border-slate-200 rounded-xl pl-9 pr-8 flex items-center justify-between bg-slate-50/50 group-hover:bg-white group-focus-within:bg-white group-focus-within:ring-2 group-focus-within:ring-indigo-500/20 group-focus-within:border-indigo-500 transition shadow-2xs">
          {/* Calendar icon */}
          <i className="fa-solid fa-calendar absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none group-hover:text-indigo-600 transition"></i>

          {/* Formatted Selected Value or Visible Placeholder */}
          {displayValue ? (
            <span className="text-xs font-semibold text-slate-800 truncate">
              {displayValue}
            </span>
          ) : (
            <span className="text-xs font-normal text-slate-400 truncate select-none">
              {placeholder}
            </span>
          )}

          {/* Subtle dropdown chevron */}
          <i className="fa-solid fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
        </div>

        {/* NATIVE INPUT OVERLAY - Covers entire container, accessible, opens native OS picker */}
        <input
          ref={inputRef}
          type={type}
          value={value}
          max={max}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-base z-10"
        />
      </div>

      {/* Clear Button */}
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label={`Clear ${label}`}
          title={`Clear ${label}`}
          className="flex items-center justify-center w-[44px] h-[44px] rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition active:scale-95 flex-shrink-0"
        >
          <i className="fa-solid fa-xmark text-xs"></i>
        </button>
      )}
    </div>
  );
}

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

  const [activeYear, setActiveYear] = useState<number | "all">("all");
  const hasUserSelectedYearRef = useRef(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | "warning"
  >("success");

  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Dynamically detect years with bills, newest first
  const availableYears = useMemo(() => {
    const yearSet = new Set<number>();
    bills.forEach((b) => {
      const yr = getBillYear(b);
      if (yr) yearSet.add(yr);
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [bills]);

  // Default to current year when it has bills; otherwise to newest year with bills
  useEffect(() => {
    if (!hasUserSelectedYearRef.current && bills.length > 0) {
      const currentYear = new Date().getFullYear();
      if (availableYears.includes(currentYear)) {
        setActiveYear(currentYear);
      } else if (availableYears.length > 0) {
        setActiveYear(availableYears[0]);
      }
    }
  }, [bills, availableYears]);

  const handleSelectYear = (yr: number | "all") => {
    hasUserSelectedYearRef.current = true;
    setActiveYear(yr);
  };

  // Filter bills based on selected year
  const filteredBills = useMemo(() => {
    if (activeYear === "all") {
      return [...bills].sort(compareBillsDescending);
    }
    return bills
      .filter((b) => getBillYear(b) === activeYear)
      .sort(compareBillsDescending);
  }, [bills, activeYear]);

  // Total financial sum for the filtered bills
  const totalArchiveAmount = useMemo(() => {
    return filteredBills.reduce(
      (sum, b) => sum + (Number(b.total_amount) || 0),
      0,
    );
  }, [filteredBills]);

  // Grouped bills for "all" view
  const groupedBills = useMemo(() => {
    if (activeYear !== "all") return [];
    const groups: { [year: number]: Bill[] } = {};
    filteredBills.forEach((b) => {
      const yr = getBillYear(b);
      if (!groups[yr]) groups[yr] = [];
      groups[yr].push(b);
    });

    Object.keys(groups).forEach((yr) => {
      groups[Number(yr)].sort(compareBillsDescending);
    });

    return Object.keys(groups)
      .map(Number)
      .sort((a, b) => b - a)
      .map((yr) => ({
        year: yr,
        bills: groups[yr],
      }));
  }, [filteredBills, activeYear]);

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

  function renderBillCard(bill: Bill) {
    const isMonthly = bill.bill_type === "monthly";
    const title = isMonthly ? getMonthlyBillTitle(bill) : "Custom Bill";
    const dateRangeText = formatRangeDates(bill.from_date, bill.to_date);

    return (
      <div
        key={bill.id}
        className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition space-y-3"
      >
        {/* Top Section */}
        <div className="flex justify-between items-start gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            {/* Bill Title & Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight truncate">
                {title}
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border inline-flex items-center gap-1 shrink-0 ${
                  isMonthly
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200/60"
                    : "bg-amber-50 text-amber-700 border-amber-200/60"
                }`}
              >
                <i
                  className={`text-[9px] fa-solid ${
                    isMonthly ? "fa-calendar-days" : "fa-calendar-week"
                  }`}
                ></i>
                {isMonthly ? "Monthly Bill" : "Custom Range"}
              </span>
            </div>

            {/* Date Range */}
            {dateRangeText && (
              <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                <i className="fa-regular fa-calendar text-[10px] text-slate-400"></i>
                <span>{dateRangeText}</span>
              </p>
            )}
          </div>

          {/* Amount Pill */}
          <div className="text-right bg-emerald-50/90 border border-emerald-200/70 px-3 py-1.5 rounded-xl shrink-0">
            <p className="text-[10px] font-medium text-emerald-700 leading-none mb-0.5">
              Total
            </p>
            <p className="text-sm sm:text-base font-extrabold text-emerald-700 leading-tight">
              ₹{Number(bill.total_amount).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => downloadExistingBill(bill)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-50/80 text-indigo-600 hover:bg-indigo-100 py-2.5 rounded-xl text-xs font-semibold transition border border-indigo-200/60 active:scale-[0.98]"
          >
            <i className="fa-solid fa-download text-[11px]"></i>
            <span>Download PDF</span>
          </button>

          <button
            onClick={() => setDeleteId(bill.id)}
            className="flex items-center justify-center gap-1.5 px-3.5 bg-rose-50/80 text-rose-600 hover:bg-rose-100 py-2.5 rounded-xl text-xs font-semibold transition border border-rose-200/60 active:scale-[0.98]"
            title="Delete Bill"
          >
            <i className="fa-solid fa-trash text-[11px]"></i>
            <span>Delete</span>
          </button>
        </div>
      </div>
    );
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
                Select month
              </label>

              <DatePickerField
                type="month"
                value={selectedMonth}
                placeholder="Choose a month"
                label="Select month"
                max={currentMonth}
                onChange={setSelectedMonth}
                onClear={() => setSelectedMonth("")}
              />
            </div>
          )}

          {type === "custom" && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Start Date */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <i className="fa-solid fa-calendar text-indigo-600 text-xs"></i>
                    Start date
                  </label>

                  <DatePickerField
                    type="date"
                    value={fromDate}
                    placeholder="Select start date"
                    label="Start date"
                    max={toDate || today}
                    onChange={setFromDate}
                    onClear={() => setFromDate("")}
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <i className="fa-solid fa-calendar text-indigo-600 text-xs"></i>
                    End date
                  </label>

                  <DatePickerField
                    type="date"
                    value={toDate}
                    placeholder="Select end date"
                    label="End date"
                    min={fromDate || undefined}
                    max={today}
                    onChange={setToDate}
                    onClear={() => setToDate("")}
                  />
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

        {/* BILL HISTORY ARCHIVE */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <i className="fa-solid fa-box-archive text-indigo-600 text-xs"></i>
              <span>Bill History</span>
            </h2>
            {bills.length > 0 && (
              <span className="text-[11px] font-semibold text-slate-500">
                {bills.length} total {bills.length === 1 ? "bill" : "bills"}
              </span>
            )}
          </div>

          {/* DYNAMIC YEAR FILTER BAR */}
          {!loading && availableYears.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
              {availableYears.map((yr) => {
                const count = bills.filter((b) => getBillYear(b) === yr).length;
                const isActive = activeYear === yr;
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => handleSelectYear(yr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 active:scale-95 ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span>{yr}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}

              {/* All Years Option */}
              <button
                type="button"
                onClick={() => handleSelectYear("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 active:scale-95 ${
                  activeYear === "all"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span>All Years</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeYear === "all"
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {bills.length}
                </span>
              </button>
            </div>
          )}

          {/* COMPACT ARCHIVE OVERVIEW BAR */}
          {!loading && bills.length > 0 && (
            <div className="bg-slate-100/70 border border-slate-200/80 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">
                  {activeYear === "all"
                    ? "All Years Archive"
                    : `${activeYear} Archive`}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-[11px] font-medium text-slate-500">
                  {filteredBills.length}{" "}
                  {filteredBills.length === 1 ? "bill statement" : "bill statements"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <span className="text-[11px] font-normal text-slate-500">Total:</span>
                <span className="text-emerald-700">
                  ₹{totalArchiveAmount.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {loading && <BillsSkeleton />}

          {!loading && bills.length === 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 text-center shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-base">
                <i className="fa-solid fa-receipt"></i>
              </div>
              <p className="text-slate-600 text-xs font-medium">
                No bills generated yet.
              </p>
            </div>
          )}

          {!loading && bills.length > 0 && filteredBills.length === 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 text-center shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-base">
                <i className="fa-solid fa-calendar-xmark"></i>
              </div>
              <p className="text-slate-600 text-xs font-medium">
                No bills found for this year.
              </p>
            </div>
          )}

          {/* ALL YEARS VIEW: GROUPED BY YEAR */}
          {!loading && activeYear === "all" && (
            <div className="space-y-5">
              {groupedBills.map((group) => (
                <div key={group.year} className="space-y-2.5">
                  <div className="flex items-center gap-2 pt-1">
                    <div className="h-3.5 w-1 bg-indigo-600 rounded-full"></div>
                    <h3 className="text-xs font-bold text-slate-800 tracking-wide">
                      {group.year}
                    </h3>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {group.bills.length}{" "}
                      {group.bills.length === 1 ? "bill" : "bills"}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {group.bills.map(renderBillCard)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SINGLE YEAR VIEW */}
          {!loading && activeYear !== "all" && (
            <div className="space-y-3">
              {filteredBills.map(renderBillCard)}
            </div>
          )}
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
