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

  const [milkFilter, setMilkFilter] = useState<
    "all" | "cow" | "buffalo" | "packaged"
  >("all");
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "week" | "month"
  >("all");

  const [errorMessage, setErrorMessage] = useState("");
  const [toast, setToast] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 6;
  const [brandMilkName, setBrandMilkName] = useState("Packaged Milk");

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

      setToast("Entry deleted successfully");
      setMessageType("success");

      loadRecords(currentPage);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      setTimeout(() => {
        setToast("");
      }, 3000);

      setDeleting(false);
    } catch (err) {
      setErrorMessage("Something went wrong while deleting");
      setMessageType("error");
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
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 p-4 rounded-xl border-2 flex items-center gap-3 text-sm font-medium transition-all duration-300 shadow-lg ${
            messageType === "success"
              ? "bg-green-50 border-green-300 text-green-700"
              : "bg-red-50 border-red-300 text-red-700"
          }`}
        >
          {messageType === "success" ? (
            <i className="fa-solid fa-circle-check text-lg flex-shrink-0"></i>
          ) : (
            <i className="fa-solid fa-circle-xmark text-lg flex-shrink-0"></i>
          )}
          <span>{toast}</span>
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
          <div className="bg-white rounded-2xl shadow-md p-4 space-y-3 border border-gray-100">
            {/* DATE SEARCH LABEL */}
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-2">
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
                  className={`px-3 py-1.5 text-xs rounded-full border font-medium transition ${
                    dateFilter === type
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-600 shadow-sm"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100"
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
                className={`px-3 py-1.5 text-xs rounded-full border font-medium transition ${
                  milkFilter === "all"
                    ? "bg-gray-800 text-white border-gray-800 shadow-sm"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                }`}
              >
                All
              </button>

              <button
                onClick={() => setMilkFilter("buffalo")}
                className={`px-3 py-1.5 text-xs rounded-full border font-medium transition ${
                  milkFilter === "buffalo"
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-600 shadow-sm"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                }`}
              >
                🐃 Buffalo
              </button>

              <button
                onClick={() => setMilkFilter("cow")}
                className={`px-3 py-1.5 text-xs rounded-full border font-medium transition ${
                  milkFilter === "cow"
                    ? "bg-gradient-to-r from-green-600 to-green-700 text-white border-green-600 shadow-sm"
                    : "bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                }`}
              >
                🐄 Cow
              </button>

              <button
                onClick={() => setMilkFilter("packaged")}
                className={`px-3 py-1.5 text-xs rounded-full border font-medium transition ${
                  milkFilter === "packaged"
                    ? "bg-gradient-to-r from-orange-600 to-orange-700 text-white border-orange-600 shadow-sm"
                    : "bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200"
                }`}
              >
                🥛 Packaged
              </button>
            </div>
          </div>
          {/* ERROR MESSAGE */}

          {errorMessage && (
            <div className="bg-red-50 border-2 border-red-300 text-red-700 text-sm p-4 rounded-xl flex items-center gap-3">
              <i className="fa-solid fa-circle-xmark text-lg flex-shrink-0"></i>
              <span className="font-medium">{errorMessage}</span>
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
              <div className="bg-white rounded-2xl shadow-md p-8 text-center border border-gray-100">
                <i className="fa-solid fa-database text-gray-300 text-4xl mb-3"></i>

                <p className="text-gray-600 font-medium">No milk entries yet</p>
                <p className="text-gray-500 text-sm mt-1">
                  Start by adding your first milk entry
                </p>
              </div>
            )}

          {/* NO SEARCH RESULTS STATE */}

          {!loading &&
            records.length === 0 &&
            (searchDate || milkFilter !== "all" || dateFilter !== "all") && (
              <div className="bg-white rounded-2xl shadow-md p-8 text-center border border-gray-100">
                <i className="fa-solid fa-magnifying-glass text-gray-300 text-4xl mb-3"></i>

                <p className="text-gray-600 font-medium">No records found</p>

                <p className="text-gray-500 text-sm mt-1">
                  Try changing your search or filters
                </p>

                <button
                  onClick={() => {
                    setSearchDate("");
                    setMilkFilter("all");
                    setDateFilter("all");
                  }}
                  className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
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
                          className={`bg-white rounded-xl shadow-md p-4 border-l-4 hover:shadow-lg transition ${
                            entry.milk_type === "cow"
                              ? "border-green-500"
                              : entry.milk_type === "buffalo"
                                ? "border-blue-500"
                                : "border-orange-500"
                          }`}
                        >
                          {/* HEADER - BADGE + TOTAL */}
                          <div className="flex items-center justify-between mb-3">
                            <span
                              className={`text-xs px-3 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                                entry.milk_type === "cow"
                                  ? "bg-green-100 text-green-700"
                                  : entry.milk_type === "buffalo"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-orange-100 text-orange-700"
                              }`}
                            >
                              {entry.milk_type === "cow"
                                ? "🐄 Cow"
                                : entry.milk_type === "buffalo"
                                  ? "🐃 Buffalo"
                                  : `🥛 ${brandMilkName}`}
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
                                <p className="text-sm font-semibold text-gray-800">
                                  {entry.liters}L
                                </p>
                              </div>
                            </div>

                            {/* SEPARATOR */}
                            <div className="h-8 border-l border-gray-300 flex-shrink-0"></div>

                            {/* PRICE PER LITER */}
                            <div>
                              <p className="text-xs text-gray-500">Price/L</p>
                              <p className="text-sm font-semibold text-gray-800">
                                ₹{entry.price_per_liter}
                              </p>
                            </div>
                          </div>

                          {/* ACTION BUTTONS */}
                          <div className="flex gap-2 pt-0.5">
                            <button
                              onClick={() =>
                                router.push(`/entries?id=${entry.id}`)
                              }
                              className="flex-1 max-w-sm flex items-center justify-center gap-1 bg-blue-50 text-blue-600 py-2 rounded-lg text-xs font-semibold hover:bg-blue-100 transition border border-blue-200"
                            >
                              <i className="fa-solid fa-pen text-xs"></i>
                              Edit
                            </button>

                            <button
                              onClick={() => setDeleteId(entry.id)}
                              className="flex-1 max-w-sm flex items-center justify-center gap-1 bg-red-50 text-red-600 py-2 rounded-lg text-xs font-semibold hover:bg-red-100 transition border border-red-200"
                            >
                              <i className="fa-solid fa-trash text-xs"></i>
                              Delete
                            </button>
                          </div>

                          {/* DELETE CONFIRM */}
                          {deleteId === entry.id && (
                            <div className="mt-3 border-t pt-3 space-y-2.5 bg-red-50 rounded-lg p-3 border border-red-200">
                              <div className="flex items-center gap-2">
                                <i className="fa-solid fa-exclamation-circle text-red-600 text-sm"></i>
                                <p className="text-xs font-semibold text-red-700">
                                  Delete this entry?
                                </p>
                              </div>

                              <p className="text-xs text-red-600 ml-5">
                                This action cannot be undone.
                              </p>

                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={() => setDeleteId(null)}
                                  disabled={deleting}
                                  className="flex-1 border-2 border-gray-300 text-gray-700 text-xs py-2 rounded-lg font-semibold hover:bg-gray-100 disabled:opacity-50 transition"
                                >
                                  Cancel
                                </button>

                                <button
                                  onClick={() => confirmDelete(entry.id)}
                                  disabled={deleting}
                                  className={`flex-1 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 font-semibold transition ${
                                    deleting
                                      ? "bg-red-400 text-white cursor-not-allowed opacity-75"
                                      : "bg-red-600 text-white hover:bg-red-700 shadow-sm"
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
                                      <span>Deleting...</span>
                                    </>
                                  ) : (
                                    <>
                                      <i className="fa-solid fa-trash text-xs"></i>
                                      <span>Delete</span>
                                    </>
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
            <div className="flex justify-center items-center gap-2 pt-6 flex-wrap">
              <button
                disabled={currentPage === 1}
                onClick={() => goToPage(currentPage - 1)}
                className="px-3 py-2 border-0 bg-gradient-to-r from-gray-500 to-gray-700 hover:from-gray-600 hover:to-gray-800 text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition shadow-md"
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>

              {Array.from({ length: totalPages }).map((_, index) => {
                const page = index + 1;

                return (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition ${
                      currentPage === page
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                disabled={currentPage === totalPages}
                onClick={() => goToPage(currentPage + 1)}
                className="px-3 py-2 border-0 bg-gradient-to-r from-gray-500 to-gray-700 hover:from-gray-600 hover:to-gray-800 text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition shadow-md"
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
