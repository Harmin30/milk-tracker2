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

      const res = await fetch(`/api/milk?page=${page}&limit=${recordsPerPage}`);
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
    loadRecords(1);
  }, []);

  async function confirmDelete(id: string) {
    setErrorMessage("");

    try {
      const res = await fetch(`/api/milk/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to delete entry");
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
    } catch (err) {
      setErrorMessage("Something went wrong while deleting");
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

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const filteredRecords = records.filter((r) => {
    const entryDate = new Date(r.date);
    const entryDateStr = r.date.split("T")[0];

    // Search by exact date
    if (searchDate && !entryDateStr.startsWith(searchDate)) {
      return false;
    }

    // Milk type filter
    if (milkFilter !== "all" && r.milk_type !== milkFilter) {
      return false;
    }

    // Date quick filters
    if (dateFilter === "today") {
      if (entryDateStr !== todayStr) return false;
    }

    if (dateFilter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      if (entryDate < weekAgo) return false;
    }

    if (dateFilter === "month") {
      if (
        entryDate.getMonth() !== today.getMonth() ||
        entryDate.getFullYear() !== today.getFullYear()
      ) {
        return false;
      }
    }

    return true;
  });

  const groupedRecords = filteredRecords.reduce(
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
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            {/* HELPER TEXT */}
            <p className="text-xs text-gray-500">
              Search by date or filter records
            </p>

            {/* DATE SEARCH */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />

              {(searchDate || milkFilter !== "all" || dateFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchDate("");
                    setMilkFilter("all");
                    setDateFilter("all");
                  }}
                  className="text-sm text-gray-500 hover:text-red-500"
                >
                  ✕
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

          {/* EMPTY STATE */}

          {!loading && records.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center">
              <i className="fa-solid fa-database text-gray-300 text-3xl mb-3"></i>

              <p className="text-gray-500">No milk entries yet</p>
            </div>
          )}

          {/* RECORDS LIST */}

          {filteredRecords.length === 0 ? (
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
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedRecords)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([date, entries]) => (
                  <div key={date}>
                    {/* DATE HEADER */}
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-lg font-semibold text-gray-800">
                        {formatDate(date)}
                      </p>

                      <span className="text-xs text-gray-500">
                        {entries.length}{" "}
                        {entries.length === 1 ? "entry" : "entries"}
                      </span>
                    </div>

                    <div className="border-b mb-4"></div>

                    {/* ENTRIES */}
                    <div className="space-y-4">
                      {entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="bg-white rounded-2xl shadow-md p-4"
                        >
                          {/* ENTRY ROW */}
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex flex-col gap-1">
                                {entry.milk_type === "cow" ? (
                                  <span className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-xs px-2.5 py-1 rounded-full w-fit">
                                    🐄 Cow
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs px-2.5 py-1 rounded-full w-fit">
                                    🐃 Buffalo
                                  </span>
                                )}

                                <span className="text-xs text-gray-500 font-medium">
                                  ₹{entry.price_per_liter}/L
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-lg font-semibold text-green-600">
                                ₹{Number(entry.total_amount).toFixed(2)}
                              </p>

                              <p className="text-sm font-semibold text-gray-800">
                                {entry.liters} L
                              </p>
                            </div>
                          </div>

                          {/* ACTION BUTTONS */}

                          <div className="flex gap-3 mt-3">
                            <button
                              onClick={() =>
                                router.push(`/entries?id=${entry.id}`)
                              }
                              className="flex-1 flex items-center justify-center gap-2 border border-blue-400 text-blue-600 py-2 rounded-xl text-sm font-medium hover:bg-blue-50 transition"
                            >
                              <i className="fa-solid fa-pen text-xs"></i>
                              Edit
                            </button>

                            <button
                              onClick={() => setDeleteId(entry.id)}
                              className="flex-1 flex items-center justify-center gap-2 border border-red-400 text-red-600 py-2 rounded-xl text-sm font-medium hover:bg-red-50 transition"
                            >
                              <i className="fa-solid fa-trash text-xs"></i>
                              Delete
                            </button>
                          </div>

                          {/* DELETE CONFIRM */}

                          {deleteId === entry.id && (
                            <div className="mt-4 border-t pt-4 space-y-3">
                              <p className="text-sm text-gray-600">
                                Are you sure you want to delete this entry?
                              </p>

                              <div className="flex gap-3">
                                <button
                                  onClick={() => setDeleteId(null)}
                                  className="flex-1 border py-2 rounded-lg text-sm"
                                >
                                  Cancel
                                </button>

                                <button
                                  onClick={() => confirmDelete(entry.id)}
                                  className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm"
                                >
                                  Delete
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
