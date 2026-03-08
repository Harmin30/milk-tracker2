"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MilkEntry = {
  id: string;
  date: string;
  milk_type: string;
  liters: number;
  price_per_liter: number;
  total_amount: number;
};

export default function Records() {
  const router = useRouter();
  const [searchDate, setSearchDate] = useState("");
  const [records, setRecords] = useState<MilkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);

  const [milkFilter, setMilkFilter] = useState<"all" | "cow" | "buffalo">(
    "all",
  );
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "week" | "month"
  >("all");

  const [errorMessage, setErrorMessage] = useState("");
  const [toast, setToast] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 6;

  async function loadRecords(page = 1) {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        limit: String(recordsPerPage),
        searchDate,
        milkType: milkFilter,
        dateFilter,
      });

      const res = await fetch(`/api/milk?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setRecords(data.data || []);
        setTotalRecords(data.total || 0);
      }
    } catch (err) {
      console.log(err);
    }

    setLoading(false);
  }

  useEffect(() => {
    setCurrentPage(1);
    loadRecords(1);
  }, [searchDate, milkFilter, dateFilter]);

  // Refresh records when page becomes visible (returning from edit)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadRecords(currentPage);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentPage]);

  async function confirmDelete(id: string) {
    setErrorMessage("");
    setDeleting(true);

    try {
      const res = await fetch(`/api/milk/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to delete entry");
        setDeleting(false);
        return;
      }

      setDeleteId(null);

      setToast("Entry deleted");

      loadRecords(currentPage);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      setTimeout(() => {
        setToast("");
      }, 2500);

      setDeleting(false);
    } catch (err) {
      setErrorMessage("Something went wrong while deleting");
      setDeleting(false);
    }
  }

  function formatDate(date: string) {
    const d = date.split("T")[0];

    const [year, month, day] = d.split("-");

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
  }

  /* ---------------- PAGINATION ---------------- */

  const totalPages = Math.ceil(totalRecords / recordsPerPage);

  function goToPage(page: number) {
    setCurrentPage(page);
    loadRecords(page);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const groupedRecords = records.reduce(
    (groups: Record<string, MilkEntry[]>, entry) => {
      const dateKey = entry.date.split("T")[0];

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }

      groups[dateKey].push(entry);

      return groups;
    },
    {},
  );

  /* ------------------------------------------------ */

  return (
    <>
      {/* SUCCESS TOAST */}

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-white border border-green-200 shadow-lg rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
            <div className="w-6 h-6 flex items-center justify-center rounded-full bg-green-100 text-green-600 text-xs">
              ✔
            </div>

            <span className="text-gray-700 font-medium">{toast}</span>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-100 pb-24">
        <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto p-5 space-y-5">
          {/* PAGE HEADER */}

          <div>
            <h1 className="text-2xl font-semibold">Milk Records</h1>

            <p className="text-sm text-gray-500">
              View and manage your milk entries
            </p>
          </div>

          {/* SEARCH BAR */}
          <div className="bg-white rounded-xl shadow-sm p-3 space-y-3">
            {/* DATE SEARCH LABEL */}
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <i className="fa-solid fa-calendar text-blue-600"></i>
              Search by Date
            </label>

            {/* DATE SEARCH */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <i className="fa-solid fa-calendar absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>

                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="w-full border-2 border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              {(searchDate || milkFilter !== "all" || dateFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchDate("");
                    setMilkFilter("all");
                    setDateFilter("all");
                  }}
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              )}
            </div>

            {/* QUICK DATE FILTERS */}
            <div className="flex gap-2 flex-wrap">
              {["today", "week", "month"].map((type) => (
                <button
                  key={type}
                  onClick={() =>
                    setDateFilter(type as "today" | "week" | "month")
                  }
                  className={`px-3 py-1 text-xs rounded-full border ${
                    dateFilter === type
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-50"
                  }`}
                >
                  {type === "today"
                    ? "Today"
                    : type === "week"
                      ? "This Week"
                      : "This Month"}
                </button>
              ))}
            </div>

            {/* MILK TYPE FILTER */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setMilkFilter("all")}
                className={`px-3 py-1 text-xs rounded-full border ${
                  milkFilter === "all"
                    ? "bg-gray-800 text-white border-gray-800"
                    : "bg-gray-50"
                }`}
              >
                All
              </button>

              <button
                onClick={() => setMilkFilter("buffalo")}
                className={`px-3 py-1 text-xs rounded-full border ${
                  milkFilter === "buffalo"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-blue-50"
                }`}
              >
                🐃 Buffalo
              </button>

              <button
                onClick={() => setMilkFilter("cow")}
                className={`px-3 py-1 text-xs rounded-full border ${
                  milkFilter === "cow"
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-green-50"
                }`}
              >
                🐄 Cow
              </button>
            </div>
          </div>
          {/* ERROR MESSAGE */}

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
              {errorMessage}
            </div>
          )}

          {/* LOADING */}

          {loading && (
            <p className="text-gray-500 text-sm">Loading records...</p>
          )}

          {/* EMPTY STATE - NO RECORDS & NO FILTERS */}

          {!loading &&
            records.length === 0 &&
            !searchDate &&
            milkFilter === "all" &&
            dateFilter === "all" && (
              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <i className="fa-solid fa-database text-gray-300 text-3xl mb-3"></i>

                <p className="text-gray-500">No milk entries yet</p>
              </div>
            )}

          {/* NO SEARCH RESULTS STATE */}

          {!loading &&
            records.length === 0 &&
            (searchDate || milkFilter !== "all" || dateFilter !== "all") && (
              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <i className="fa-solid fa-magnifying-glass text-gray-300 text-3xl mb-3"></i>

                <p className="text-gray-500 font-medium">No records found</p>

                <p className="text-xs text-gray-400 mt-1">
                  Try changing search or filters
                </p>

                <button
                  onClick={() => {
                    setSearchDate("");
                    setMilkFilter("all");
                    setDateFilter("all");
                  }}
                  className="mt-3 text-sm text-blue-600 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}

          {/* RECORDS LIST */}

          {records.length > 0 && (
            <div className="space-y-6">
              {Object.entries(groupedRecords)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([date, entries]) => (
                  <div key={date}>
                    {/* DATE HEADER */}
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-sm font-semibold text-gray-800">
                        {formatDate(date)}
                      </p>

                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {entries.length}
                      </span>
                    </div>

                    <div className="border-b mb-3"></div>

                    {/* ENTRIES */}
                    <div className="space-y-2.5">
                      {entries.map((entry) => (
                        <div
                          key={entry.id}
                          className={`bg-white rounded-lg shadow-sm p-3.5 border-l-4 ${
                            entry.milk_type === "cow" ? "border-green-500" : "border-blue-500"
                          }`}
                        >
                          {/* HEADER - BADGE + TOTAL */}
                          <div className="flex items-center justify-between mb-3">
                            <span className={`text-xs px-3 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                              entry.milk_type === "cow" 
                                ? "bg-green-100 text-green-700" 
                                : "bg-blue-100 text-blue-700"
                            }`}>
                              {entry.milk_type === "cow" ? "🐄 Cow" : "🐃 Buffalo"}
                            </span>
                            <p className="text-sm font-bold text-green-600">
                              ₹{Number(entry.total_amount).toFixed(2)}
                            </p>
                          </div>

                          {/* INFO ROW - HORIZONTAL */}
                          <div className="flex items-center justify-between gap-4 mb-4">
                            {/* LITERS */}
                            <div className="flex items-center gap-2.5">
                              <i className="fa-solid fa-droplet text-blue-500 text-sm flex-shrink-0"></i>
                              <div>
                                <p className="text-xs text-gray-500">Liters</p>
                                <p className="text-sm font-semibold text-gray-800">{entry.liters}L</p>
                              </div>
                            </div>

                            {/* SEPARATOR */}
                            <div className="h-8 border-l border-gray-300 flex-shrink-0"></div>

                            {/* PRICE PER LITER */}
                            <div>
                              <p className="text-xs text-gray-500">Price/L</p>
                              <p className="text-sm font-semibold text-gray-800">₹{entry.price_per_liter}</p>
                            </div>
                          </div>

                          {/* ACTION BUTTONS */}
                          <div className="flex gap-2 pt-0.5">
                            <button
                              onClick={() =>
                                router.push(`/entries?id=${entry.id}`)
                              }
                              className="flex-1 max-w-sm flex items-center justify-center gap-1 border border-blue-300 text-blue-600 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-50 transition"
                            >
                              <i className="fa-solid fa-pen text-xs"></i>
                              Edit
                            </button>

                            <button
                              onClick={() => setDeleteId(entry.id)}
                              className="flex-1 max-w-sm flex items-center justify-center gap-1 border border-red-300 text-red-600 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50 transition"
                            >
                              <i className="fa-solid fa-trash text-xs"></i>
                              Delete
                            </button>
                          </div>

                          {/* DELETE CONFIRM */}
                          {deleteId === entry.id && (
                            <div className="mt-2.5 border-t pt-2.5 space-y-2">
                              <p className="text-xs text-gray-600">
                                Delete this entry?
                              </p>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => setDeleteId(null)}
                                  disabled={deleting}
                                  className="flex-1 border text-xs py-1.5 rounded disabled:opacity-50"
                                >
                                  Cancel
                                </button>

                                <button
                                  onClick={() => confirmDelete(entry.id)}
                                  disabled={deleting}
                                  className={`flex-1 py-1.5 rounded text-xs flex items-center justify-center gap-1 transition ${
                                    deleting
                                      ? "bg-red-400 text-white cursor-not-allowed opacity-75"
                                      : "bg-red-600 text-white hover:bg-red-700"
                                  }`}
                                >
                                  {deleting ? (
                                    <>
                                      <svg
                                        className="w-3 h-3 animate-spin"
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
                                      <span>Deleting</span>
                                    </>
                                  ) : (
                                    "Delete"
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* PAGINATION */}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-4 flex-wrap">
              <button
                disabled={currentPage === 1}
                onClick={() => goToPage(currentPage - 1)}
                className="px-3 py-1 border rounded-md text-sm disabled:opacity-40"
              >
                Prev
              </button>

              {Array.from({ length: totalPages }).map((_, index) => {
                const page = index + 1;

                return (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`px-3 py-1 rounded-md text-sm border ${
                      currentPage === page
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                disabled={currentPage === totalPages}
                onClick={() => goToPage(currentPage + 1)}
                className="px-3 py-1 border rounded-md text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
