"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import BottomNav from "../../components/BottomNav";

type MilkEntry = {
  id: string;
  date: string;
  milk_type: string;
  liters: number;
  total_amount: number;
};

export default function Records() {
  const router = useRouter();

  const [records, setRecords] = useState<MilkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

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

  async function confirmDelete() {
    if (!deleteId) return;

    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch(`/api/milk/${deleteId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to delete entry");
        return;
      }

      setSuccessMessage("Milk entry deleted successfully");

      setDeleteId(null);
      loadRecords(currentPage);

      setTimeout(() => {
        setSuccessMessage("");
      }, 2500);
    } catch (err) {
      setErrorMessage("Something went wrong while deleting");
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
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

  /* ------------------------------------------------ */

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      <Header />

      <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto p-5 space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Milk Records</h1>

          <p className="text-sm text-gray-500">
            View and manage your milk entries
          </p>
        </div>

        {/* Messages */}

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm p-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Loading */}

        {loading && <p className="text-gray-500 text-sm">Loading records...</p>}

        {/* Empty State */}

        {!loading && records.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <i className="fa-solid fa-database text-gray-300 text-3xl mb-3"></i>

            <p className="text-gray-500">No milk entries yet</p>
          </div>
        )}

        {/* Records List */}

        <div className="space-y-4">
          {records.map((entry) => {
            return (
              <div
                key={entry.id}
                className="bg-white rounded-2xl shadow-md p-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {formatDate(entry.date)}
                    </p>

                    <p className="text-sm text-gray-500 mt-1">
                      {entry.milk_type === "cow" ? "🐄 Cow" : "🐃 Buffalo"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold">{Number(entry.liters)} L</p>

                    <p className="text-green-600 font-medium">
                      ₹ {entry.total_amount}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => router.push(`/entries?id=${entry.id}`)}
                    className="flex-1 border border-blue-500 text-blue-600 py-2 rounded-lg text-sm"
                  >
                    <i className="fa-solid fa-pen mr-1"></i>
                    Edit
                  </button>

                  <button
                    onClick={() => setDeleteId(entry.id)}
                    className="flex-1 border border-red-500 text-red-600 py-2 rounded-lg text-sm"
                  >
                    <i className="fa-solid fa-trash mr-1"></i>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}

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

      {/* DELETE MODAL */}

      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 text-center space-y-4">
            <h2 className="text-lg font-semibold">Delete Entry</h2>

            <p className="text-sm text-gray-500">
              Are you sure you want to delete this milk entry?
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

      <BottomNav />
    </div>
  );
}
