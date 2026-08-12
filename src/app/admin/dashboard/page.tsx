"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

type User = {
  id: string;
  email: string;
  name: string;
  mobile: string;
  created_at: string;
  is_active: boolean;
};

type UserDetails = {
  user: User & {
    address?: string;
    default_cow_price: number;
    default_buffalo_price: number;
    brand_milk_name?: string;
    default_brand_price?: number;
  };
  stats: {
    total_entries: number;
    total_liters: number;
    total_revenue: number;
    last_entry_date: string | null;
    account_age_days: number;
    avg_liters_per_entry: number;
    unique_entry_days: number;
  };
  breakdown: Array<{
    milk_type: string;
    total_liters: number;
    total_amount: number;
    entry_count: number;
    avg_price: number;
  }>;
  recentEntries: Array<{
    id: string;
    date: string;
    milk_type: string;
    liters: number;
    price_per_liter: number;
    total_amount: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    entry_count: number;
    total_liters: number;
    total_amount: number;
  }>;
  bills: Array<{
    id: string;
    bill_type: string;
    year: number;
    month: number;
    from_date: string;
    to_date: string;
    total_amount: number;
    created_at: string;
  }>;
};

type Analytics = {
  total_users: number;
  active_users: number;
  inactive_users: number;
  total_milk_entries: number;
  today_entries: number;
  monthly_trend: { month: string; entries: number }[];
};

export default function AdminDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "users">("overview");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    userId: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Filter users based on search query
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (user) =>
            user.email.toLowerCase().includes(query) ||
            (user.name && user.name.toLowerCase().includes(query)),
        ),
      );
    }
  }, [searchQuery, users]);

  useEffect(() => {
    // Check session when tab becomes visible (switching between tabs)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab is now visible, verify session is still valid
        fetch("/api/admin/analytics")
          .then((res) => {
            if (res.status === 401 || res.status === 403) {
              setError("Session expired. Redirecting to login...");
              setTimeout(() => {
                router.push("/admin/login");
              }, 1000);
            }
          })
          .catch(() => {
            // Network error, don't redirect
          });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  function handleAuthError(status: number) {
    if (status === 401 || status === 403) {
      setError("Session expired. Redirecting to login...");
      setTimeout(() => {
        router.push("/admin/login");
      }, 1000);
      return true;
    }
    return false;
  }

  async function fetchAdminData() {
    try {
      const res = await fetch("/api/admin/analytics");
      if (!res.ok) {
        if (handleAuthError(res.status)) return;
        throw new Error("Failed to load analytics");
      }
      const data = await res.json();
      setAnalytics(data);

      const usersRes = await fetch("/api/admin/users");
      if (!usersRes.ok) {
        if (handleAuthError(usersRes.status)) return;
      } else {
        const usersData = await usersRes.json();
        setUsers(usersData.data || []);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleUserStatus(userId: string, newStatus: boolean) {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, is_active: newStatus }),
      });

      if (!res.ok) {
        if (handleAuthError(res.status)) return;
        throw new Error("Failed to update user status");
      }

      setMessage(
        `User ${newStatus ? "activated" : "deactivated"} successfully`,
      );
      fetchAdminData();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleDeleteUser() {
    if (!deleteConfirm) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deleteConfirm.userId }),
      });

      if (!res.ok) {
        if (handleAuthError(res.status)) return;
        throw new Error("Failed to delete user");
      }

      setMessage("User account deleted successfully");
      setDeleteConfirm(null);
      if (selectedUser?.user.id === deleteConfirm.userId) {
        setSelectedUser(null);
      }
      fetchAdminData();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(String(err));
    }
  }

  async function fetchUserDetails(userId: string) {
    setLoadingUserDetails(true);
    try {
      const res = await fetch(`/api/admin/user-details?userId=${userId}`);
      if (!res.ok) {
        throw new Error("Failed to load user details");
      }
      const data = await res.json();
      setSelectedUser(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoadingUserDetails(false);
    }
  }

  async function handleLogout() {
    const res = await fetch("/api/logout", { method: "POST" });
    if (res.ok) {
      router.push("/admin/login");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-xs font-semibold">
        <span>Loading admin dashboard...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-24 text-slate-900">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xs">
                <i className="fa-solid fa-user-shield text-sm"></i>
              </div>
              <div>
                <h1 className="text-base font-bold text-white tracking-tight">
                  Admin Dashboard
                </h1>
                <p className="text-slate-400 text-[11px] font-medium hidden sm:block">
                  Milk Tracker Management Console
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 bg-rose-600/90 text-white rounded-xl font-semibold text-xs hover:bg-rose-600 transition shadow-xs flex items-center gap-1.5"
            >
              <i className="fa-solid fa-right-from-bracket text-[10px]"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Messages */}
        {message && (
          <div className="bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-2xl text-xs font-semibold shadow-lg flex items-center gap-2">
            <i className="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <i className="fa-solid fa-circle-xmark text-rose-500 text-sm"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-slate-200/60 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 font-semibold text-xs rounded-xl transition ${
              activeTab === "overview"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 font-semibold text-xs rounded-xl transition ${
              activeTab === "users"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            👥 Users ({users.length})
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && analytics && (
          <div className="space-y-5">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Users"
                value={analytics.total_users}
                color="bg-white border-slate-200/80"
                icon="👥"
              />
              <StatCard
                label="Active Users"
                value={analytics.active_users}
                color="bg-white border-slate-200/80"
                icon="✓"
              />
              <StatCard
                label="Total Entries"
                value={analytics.total_milk_entries}
                color="bg-white border-slate-200/80"
                icon="📝"
              />
              <StatCard
                label="Today's Entries"
                value={analytics.today_entries}
                color="bg-white border-slate-200/80"
                icon="🌟"
              />
            </div>

            {/* Monthly Trend */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <i className="fa-solid fa-chart-column text-indigo-600 text-xs"></i>
                <span>Monthly Activity Trend</span>
              </h2>
              <div className="space-y-3.5">
                {analytics.monthly_trend.map((item) => (
                  <div key={item.month} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-700">
                        {item.month}
                      </span>
                      <span className="text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg text-[11px]">
                        {item.entries} entries
                      </span>
                    </div>
                    <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full transition-all rounded-full"
                        style={{
                          width: `${Math.min((item.entries / 1000) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input
                  type="text"
                  placeholder="Search users by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                />
              </div>
              <span className="text-xs text-slate-500 font-semibold px-2">
                Showing {filteredUsers.length} of {users.length} users
              </span>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200/80">
                  <tr>
                    <th className="px-5 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-5 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-5 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-5 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-5 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-8 text-center text-slate-500 font-medium"
                      >
                        No users found matching your search
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-3.5 font-bold text-slate-900">
                          {user.email}
                        </td>
                        <td className="px-5 py-3.5 text-slate-700 font-medium">
                          {user.name || "—"}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              user.is_active
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                : "bg-slate-100 text-slate-600 border border-slate-200/60"
                            }`}
                          >
                            {user.is_active ? "✓ Active" : "⊗ Inactive"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => fetchUserDetails(user.id)}
                              className="px-2.5 py-1 bg-indigo-50 text-indigo-600 border border-indigo-200/60 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition"
                            >
                              Details
                            </button>
                            <button
                              onClick={() =>
                                handleToggleUserStatus(user.id, !user.is_active)
                              }
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
                                user.is_active
                                  ? "bg-amber-50 text-amber-700 border-amber-200/60 hover:bg-amber-100"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200/60 hover:bg-emerald-100"
                              }`}
                            >
                              {user.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  userId: user.id,
                                  email: user.email,
                                })
                              }
                              className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-200/60 rounded-lg text-xs font-semibold hover:bg-rose-100 transition"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {filteredUsers.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 text-center text-slate-500 text-xs font-medium">
                  No users found
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-xs"
                  >
                    <div className="flex justify-between items-start pb-2 border-b border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-900 break-all">
                          {user.email}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {user.name || "No name set"}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          user.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                            : "bg-slate-100 text-slate-600 border border-slate-200/60"
                        }`}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => fetchUserDetails(user.id)}
                        className="flex-1 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200/60 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition"
                      >
                        Details
                      </button>
                      <button
                        onClick={() =>
                          handleToggleUserStatus(user.id, !user.is_active)
                        }
                        className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition border ${
                          user.is_active
                            ? "bg-amber-50 text-amber-700 border-amber-200/60 hover:bg-amber-100"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200/60 hover:bg-emerald-100"
                        }`}
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() =>
                          setDeleteConfirm({
                            userId: user.id,
                            email: user.email,
                          })
                        }
                        className="flex-1 py-1.5 bg-rose-50 text-rose-600 border border-rose-200/60 rounded-xl text-xs font-semibold hover:bg-rose-100 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm &&
          mounted &&
          createPortal(
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center space-y-4 shadow-xl border border-slate-200">
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl">
                  <i className="fa-solid fa-user-xmark"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Delete User Account?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 break-all">
                    {deleteConfirm.email}
                  </p>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-left">
                  <p className="text-rose-800 text-[11px] font-semibold">
                    Warning: All milk records and bills belonging to this user will be permanently deleted.
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteUser}
                    className="flex-1 bg-rose-600 text-white py-2 rounded-xl text-xs font-semibold hover:bg-rose-700 transition shadow-xs"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}

        {/* User Details Modal */}
        {selectedUser &&
          mounted &&
          createPortal(
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] border-2 border-gray-300 flex flex-col">
                {/* Modal Header */}
                <div className="bg-slate-900 border-b border-slate-800 p-5 sm:p-6 flex justify-between items-center gap-3 flex-shrink-0 rounded-t-2xl">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold text-white truncate tracking-tight">
                      👤 {selectedUser.user.name || "User Details"}
                    </h2>
                    <p className="text-slate-400 text-xs mt-0.5 break-all font-medium">
                      {selectedUser.user.email}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition text-sm font-semibold"
                  >
                    ✕
                  </button>
                </div>

                {/* Scrollable Content Area */}
                <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-5">
                  {loadingUserDetails ? (
                    <div className="text-center py-12 text-slate-500 text-xs font-semibold">
                      Loading user details...
                    </div>
                  ) : (
                    <>
                      {/* User Profile */}
                      <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 sm:p-5 space-y-3.5">
                        <h3 className="font-bold text-xs text-slate-900 tracking-tight flex items-center gap-2">
                          <i className="fa-solid fa-id-card text-indigo-600 text-xs"></i>
                          <span>Profile Information</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-xs">
                            <p className="text-[10px] text-slate-500 font-medium">Email</p>
                            <p className="text-xs font-bold text-slate-900 break-all">{selectedUser.user.email}</p>
                          </div>
                          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-xs">
                            <p className="text-[10px] text-slate-500 font-medium">Name</p>
                            <p className="text-xs font-bold text-slate-900">{selectedUser.user.name || "—"}</p>
                          </div>
                          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-xs">
                            <p className="text-[10px] text-slate-500 font-medium">Phone</p>
                            <p className="text-xs font-bold text-slate-900">{selectedUser.user.mobile || "—"}</p>
                          </div>
                          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-xs">
                            <p className="text-[10px] text-slate-500 font-medium">Address</p>
                            <p className="text-xs font-bold text-slate-900">{selectedUser.user.address || "—"}</p>
                          </div>
                          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-xs">
                            <p className="text-[10px] text-slate-500 font-medium">Cow Price</p>
                            <p className="text-xs font-bold text-slate-900">₹{Number(selectedUser.user.default_cow_price).toFixed(2)}</p>
                          </div>
                          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-xs">
                            <p className="text-[10px] text-slate-500 font-medium">Buffalo Price</p>
                            <p className="text-xs font-bold text-slate-900">₹{Number(selectedUser.user.default_buffalo_price).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Statistics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <StatBox
                          label="Total Entries"
                          value={selectedUser.stats.total_entries}
                        />
                        <StatBox
                          label="Total Liters"
                          value={Number(selectedUser.stats.total_liters || 0).toFixed(2)}
                          unit="L"
                        />
                        <StatBox
                          label="Total Revenue"
                          value={`₹${Number(selectedUser.stats.total_revenue || 0).toFixed(2)}`}
                        />
                        <StatBox
                          label="Last Entry"
                          value={
                            selectedUser.stats.last_entry_date
                              ? new Date(selectedUser.stats.last_entry_date).toLocaleDateString()
                              : "—"
                          }
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="bg-slate-50 border-t border-slate-200/80 p-4 flex justify-end flex-shrink-0 rounded-b-2xl">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="px-4 py-2 rounded-xl font-semibold bg-slate-900 text-white hover:bg-slate-800 transition text-xs shadow-xs"
                  >
                    Close Window
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color?: string;
  icon?: string;
}) {
  return (
    <div
      className={`${color || "bg-white border-slate-200/80"} rounded-2xl border p-5 text-center shadow-xs space-y-1`}
    >
      {icon && <div className="text-xl mb-1">{icon}</div>}
      <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function StatBox({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs space-y-0.5">
      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-slate-900">
        {value}
        {unit && <span className="text-[10px] ml-1 text-slate-500 font-medium">{unit}</span>}
      </p>
    </div>
  );
}
