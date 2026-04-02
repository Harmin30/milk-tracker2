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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700 shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center text-2xl shadow-lg">
                🥛
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-gray-300 text-xs hidden sm:block">Milk Tracker Management</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium text-sm hover:bg-orange-700 transition shadow-md"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Messages */}
        {message && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            ✓ {message}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            ✕ {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b-2 border-gray-300">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-3 font-semibold text-sm border-b-3 transition ${
              activeTab === "overview"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-3 font-semibold text-sm border-b-3 transition ${
              activeTab === "users"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            👥 Users ({users.length})
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && analytics && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Users" value={analytics.total_users} color="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200" icon="👥" />
              <StatCard label="Active Users" value={analytics.active_users} color="bg-gradient-to-br from-green-50 to-green-100 border-green-200" icon="✓" />
              <StatCard label="Total Entries" value={analytics.total_milk_entries} color="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200" icon="📝" />
              <StatCard label="Today's Entries" value={analytics.today_entries} color="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200" icon="🌟" />
            </div>

            {/* Monthly Trend */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg border-2 border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent mb-6">📈 Monthly Activity</h2>
              <div className="space-y-4">
                {analytics.monthly_trend.map((item) => (
                  <div key={item.month}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-700 font-semibold">{item.month}</span>
                      <span className="text-sm font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">{item.entries}</span>
                    </div>
                    <div className="bg-gray-300 rounded-full h-3 overflow-hidden shadow-inner">
                      <div
                        className="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 h-full transition-all rounded-full"
                        style={{ width: `${Math.min((item.entries / 1000) * 100, 100)}%` }}
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
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border-2 border-blue-200 p-4 shadow-sm">
              <input
                type="text"
                placeholder="🔍 Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm bg-white"
              />
              <p className="text-xs text-blue-700 font-semibold mt-2">
                ✓ Found {filteredUsers.length} of {users.length} users
              </p>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-lg border-2 border-gray-300 overflow-hidden shadow-md">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-blue-700 border-b-2 border-blue-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-blue-50 transition">
                        <td className="px-6 py-3 text-sm text-gray-900 font-semibold">{user.email}</td>
                        <td className="px-6 py-3 text-sm text-gray-700">{user.name || "—"}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <span
                            className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                              user.is_active
                                ? "bg-gradient-to-r from-green-100 to-green-200 text-green-800"
                                : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800"
                            }`}
                          >
                            {user.is_active ? "✓ Active" : "⊗ Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => fetchUserDetails(user.id)}
                              className="px-3 py-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded text-xs font-medium hover:shadow-md transition"
                            >
                              Details
                            </button>
                            <button
                              onClick={() =>
                                handleToggleUserStatus(user.id, !user.is_active)
                              }
                              className={`px-3 py-1 rounded text-xs font-medium transition ${
                                user.is_active
                                  ? "bg-gradient-to-r from-red-100 to-red-200 text-red-700 hover:from-red-200 hover:to-red-300"
                                  : "bg-gradient-to-r from-green-100 to-green-200 text-green-700 hover:from-green-200 hover:to-green-300"
                              }`}
                            >
                              {user.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirm({ userId: user.id, email: user.email })
                              }
                              className="px-3 py-1 bg-gradient-to-r from-red-600 to-red-700 text-white rounded text-xs font-medium hover:shadow-md transition"
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
                <div className="bg-white rounded-lg p-6 text-center text-gray-500 text-sm">
                  No users found
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="mb-3 pb-3 border-b border-gray-200">
                      <p className="text-xs text-gray-500 font-semibold mb-1">Email</p>
                      <p className="text-sm font-semibold text-gray-900 break-all">{user.email}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3 pb-3 border-b border-gray-200">
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-1">Name</p>
                        <p className="text-sm text-gray-700">{user.name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-1">Status</p>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            user.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => fetchUserDetails(user.id)}
                        className="w-full px-3 py-2 bg-gray-900 text-white rounded text-xs font-medium hover:bg-gray-800 transition"
                      >
                        View Details
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleToggleUserStatus(user.id, !user.is_active)
                          }
                          className={`flex-1 px-3 py-2 rounded text-xs font-medium transition ${
                            user.is_active
                              ? "bg-red-100 text-red-700 hover:bg-red-200"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          }`}
                        >
                          {user.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm({ userId: user.id, email: user.email })
                          }
                          className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition"
                        >
                          Delete
                        </button>
                      </div>
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
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 sm:p-6">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 border-b-4 border-red-800">
                  <h3 className="text-lg font-bold text-white">🗑️ Delete Account</h3>
                </div>
                <div className="p-6 space-y-3">
                  <p className="text-gray-700 text-sm">
                    Email: <strong className="break-all text-red-600">{deleteConfirm.email}</strong>
                  </p>
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
                    <p className="text-red-800 text-sm font-bold">⚠️ This action cannot be undone. All data will be permanently deleted.</p>
                  </div>
                </div>
                <div className="border-t-2 border-gray-300 p-6 flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-900 hover:bg-gray-300 transition text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteUser}
                    className="flex-1 px-4 py-2 rounded-lg font-bold bg-gradient-to-r from-red-600 to-red-700 text-white hover:shadow-lg transition text-sm"
                  >
                    Delete
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
                {/* Modal Header - Fixed */}
                <div className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 border-b-2 border-slate-900 p-6 flex justify-between items-start gap-3 flex-shrink-0">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold text-white truncate">
                      👤 {selectedUser.user.name || "User Details"}
                    </h2>
                    <p className="text-slate-200 text-sm mt-1 break-all">
                      {selectedUser.user.email}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="flex-shrink-0 text-slate-200 hover:text-white hover:bg-slate-600 text-2xl leading-none rounded-lg p-2 transition font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Scrollable Content Area */}
                <div className="overflow-y-auto flex-1">
                  {loadingUserDetails ? (
                    <div className="text-center py-12 text-gray-600">
                      Loading user details...
                    </div>
                  ) : (
                    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                    {/* User Profile */}
                    <div className="bg-white rounded-xl border-2 border-orange-200 shadow-lg overflow-hidden">
                      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 sm:p-6">
                        <h3 className="font-bold text-lg sm:text-xl">👤 Profile Information</h3>
                      </div>
                      <div className="p-4 sm:p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                          <div className="bg-white rounded-lg p-4 border-2 border-gray-300 shadow-sm hover:shadow-md transition relative overflow-hidden">
                            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-slate-400 to-slate-500"></div>
                            <p className="text-xs text-slate-600 font-bold mb-2 uppercase">📧 Email</p>
                            <p className="text-sm sm:text-base text-gray-900 font-bold break-all">
                              {selectedUser.user.email}
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-4 border-2 border-gray-300 shadow-sm hover:shadow-md transition relative overflow-hidden">
                            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-blue-400 to-blue-500"></div>
                            <p className="text-xs text-blue-600 font-bold mb-2 uppercase">👤 Name</p>
                            <p className="text-sm sm:text-base text-gray-900 font-bold">
                              {selectedUser.user.name || "—"}
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-4 border-2 border-gray-300 shadow-sm hover:shadow-md transition relative overflow-hidden">
                            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-teal-400 to-teal-500"></div>
                            <p className="text-xs text-teal-600 font-bold mb-2 uppercase">📱 Phone</p>
                            <p className="text-sm sm:text-base text-gray-900 font-bold">
                              {selectedUser.user.mobile || "—"}
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-4 border-2 border-gray-300 shadow-sm hover:shadow-md transition relative overflow-hidden">
                            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-cyan-400 to-cyan-500"></div>
                            <p className="text-xs text-cyan-600 font-bold mb-2 uppercase">📍 Address</p>
                            <p className="text-sm sm:text-base text-gray-900 font-bold">
                              {selectedUser.user.address || "—"}
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-4 border-2 border-gray-300 shadow-sm hover:shadow-md transition relative overflow-hidden">
                            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-green-400 to-green-500"></div>
                            <p className="text-xs text-green-600 font-bold mb-2 uppercase">🐄 Cow Price</p>
                            <p className="text-sm sm:text-base text-gray-900 font-bold">
                              ₹{Number(
                              selectedUser.user.default_cow_price,
                            ).toFixed(2)}
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-4 border-2 border-gray-300 shadow-sm hover:shadow-md transition relative overflow-hidden">
                            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-amber-400 to-amber-500"></div>
                            <p className="text-xs text-amber-600 font-bold mb-2 uppercase">🐃 Buffalo Price</p>
                            <p className="text-sm sm:text-base text-gray-900 font-bold">
                              ₹{Number(
                              selectedUser.user.default_buffalo_price,
                            ).toFixed(2)}
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-4 border-2 border-gray-300 shadow-sm hover:shadow-md transition relative overflow-hidden sm:col-span-2 lg:col-span-1">
                            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-orange-400 to-orange-500"></div>
                            <p className="text-xs text-orange-600 font-bold mb-2 uppercase">🥛 Brand Name</p>
                            <p className="text-sm sm:text-base text-gray-900 font-bold">
                              {selectedUser.user.brand_milk_name || "Packaged Milk"}
                            </p>
                          </div>
                          {selectedUser.user.default_brand_price && (
                            <div className="bg-white rounded-lg p-4 border-2 border-gray-300 shadow-sm hover:shadow-md transition relative overflow-hidden sm:col-span-2 lg:col-span-1">
                              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-red-400 to-red-500"></div>
                              <p className="text-xs text-red-600 font-bold mb-2 uppercase">💰 Brand Price</p>
                              <p className="text-sm sm:text-base text-gray-900 font-bold">
                                ₹{Number(
                                selectedUser.user.default_brand_price,
                              ).toFixed(2)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                      <StatBox
                        label="Total Entries"
                        value={selectedUser.stats.total_entries}
                      />
                      <StatBox
                        label="Total Liters"
                        value={Number(
                          selectedUser.stats.total_liters || 0,
                        ).toFixed(2)}
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
                            ? new Date(
                                selectedUser.stats.last_entry_date,
                              ).toLocaleDateString()
                            : "—"
                        }
                      />
                    </div>

                    {/* Account Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                      <StatBox
                        label="Account Age"
                        value={Math.floor(
                          selectedUser.stats.account_age_days / 30,
                        )}
                        unit="months"
                      />
                      <StatBox
                        label="Active Days"
                        value={selectedUser.stats.unique_entry_days}
                      />
                      <StatBox
                        label="Avg per Entry"
                        value={Number(
                          selectedUser.stats.avg_liters_per_entry,
                        ).toFixed(2)}
                        unit="L"
                      />
                    </div>

                    {/* Monthly Trends */}
                    {selectedUser.monthlyTrends.length > 0 && (
                      <div>
                        <h3 className="font-bold text-slate-800 mb-3 text-lg">
                          📈 Monthly Activity
                        </h3>
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
                          {selectedUser.monthlyTrends.map((month) => {
                            const monthStr = new Date(
                              month.month,
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              year: "numeric",
                            });
                            return (
                              <div
                                key={month.month}
                                className="bg-white rounded-lg p-4 border-2 border-slate-300 shadow-sm hover:shadow-md transition relative overflow-hidden"
                              >
                                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-orange-400 to-orange-500"></div>
                                <div className="flex justify-between items-center mb-3">
                                  <p className="font-bold text-slate-900 text-sm sm:text-base">
                                    {monthStr}
                                  </p>
                                  <span className="text-xs font-bold px-3 py-1 bg-gradient-to-r from-orange-100 to-orange-50 text-orange-700 rounded-full border border-orange-200">
                                    {month.entry_count} entries
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                                  <div>
                                    <p className="text-gray-700 font-semibold">Liters</p>
                                    <p className="text-gray-900 font-bold text-base">
                                      {Number(month.total_liters).toFixed(2)} L
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-700 font-semibold">Revenue</p>
                                    <p className="text-orange-600 font-bold text-base">
                                      ₹{Number(month.total_amount).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Recent Entries */}
                    {selectedUser.recentEntries.length > 0 && (
                      <div>
                        <h3 className="font-bold text-slate-800 mb-3 text-lg">
                          📝 Recent Entries
                        </h3>
                        <div className="overflow-x-auto rounded-lg border-2 border-slate-300 shadow-sm">
                          <table className="w-full text-xs sm:text-sm">
                            <thead className="bg-gradient-to-r from-slate-700 to-slate-800 text-white border-b-2 border-slate-900">
                              <tr>
                                <th className="px-2 sm:px-3 py-2 text-left font-bold uppercase">
                                  Date
                                </th>
                                <th className="px-2 sm:px-3 py-2 text-left font-bold uppercase">
                                  Type
                                </th>
                                <th className="px-2 sm:px-3 py-2 text-right font-bold uppercase">
                                  Liters
                                </th>
                                <th className="px-2 sm:px-3 py-2 text-right font-bold uppercase hidden sm:table-cell">
                                  Price/L
                                </th>
                                <th className="px-2 sm:px-3 py-2 text-right font-bold uppercase">
                                  Amount
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-300">
                              {selectedUser.recentEntries.map((entry) => (
                                <tr key={entry.id} className="hover:bg-blue-50 transition">
                                  <td className="px-2 sm:px-3 py-2 text-gray-900 font-semibold">
                                    {new Date(entry.date).toLocaleDateString(
                                      "en-IN",
                                    )}
                                  </td>
                                  <td className="px-2 sm:px-3 py-2 text-gray-700 capitalize font-semibold">
                                    {entry.milk_type}
                                  </td>
                                  <td className="px-2 sm:px-3 py-2 text-right text-gray-900 font-bold">
                                    {Number(entry.liters).toFixed(2)}
                                  </td>
                                  <td className="px-2 sm:px-3 py-2 text-right text-gray-600 hidden sm:table-cell">
                                    ₹{Number(entry.price_per_liter).toFixed(2)}
                                  </td>
                                  <td className="px-2 sm:px-3 py-2 text-right text-blue-600 font-bold">
                                    ₹{Number(entry.total_amount).toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Milk Type Breakdown */}
                    <div>
                      <h3 className="font-bold text-slate-800 mb-4 text-base">🥛 Milk Type Breakdown</h3>
                      <div className="space-y-2">
                        {selectedUser.breakdown.length === 0 ? (
                          <p className="text-sm text-gray-600 bg-gray-50 rounded p-3 border border-gray-200">
                            No entries yet
                          </p>
                        ) : (
                          selectedUser.breakdown.map((item) => (
                            <div
                              key={item.milk_type}
                              className="bg-white border-2 border-slate-300 rounded-lg p-4 shadow-sm hover:shadow-md transition relative overflow-hidden"
                            >
                              <div className={`absolute top-0 left-0 h-1 w-full ${
                                item.milk_type === 'cow' ? 'bg-gradient-to-r from-green-400 to-green-500' :
                                item.milk_type === 'buffalo' ? 'bg-gradient-to-r from-amber-500 to-amber-600' :
                                'bg-gradient-to-r from-orange-400 to-orange-500'
                              }`}></div>
                              <div className="flex justify-between items-center mb-3">
                                <p className="font-bold text-slate-900 text-sm capitalize">
                                  {item.milk_type === 'cow' ? '🐄' : item.milk_type === 'buffalo' ? '🐃' : '🥛'} {item.milk_type} Milk
                                </p>
                                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                                  item.milk_type === 'cow' ? 'bg-green-100 text-green-700 border-green-300' :
                                  item.milk_type === 'buffalo' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                                  'bg-orange-100 text-orange-700 border-orange-300'
                                }`}>
                                  {item.entry_count} entries
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-xs">
                                <div className="text-center">
                                  <p className="text-slate-700 text-xs font-bold mb-1">Liters</p>
                                  <p className="text-slate-900 font-bold text-sm">
                                    {Number(item.total_liters || 0).toFixed(2)} L
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-slate-700 text-xs font-bold mb-1">Amount</p>
                                  <p className="text-slate-900 font-bold text-sm">
                                    ₹{Number(item.total_amount || 0).toFixed(2)}
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-slate-700 text-xs font-bold mb-1">Avg</p>
                                  <p className="text-slate-900 font-bold text-sm">
                                    ₹{Number(item.avg_price || 0).toFixed(2)}/L
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Bills Generated */}
                    {selectedUser.bills.length > 0 && (
                      <div>
                        <h3 className="font-bold text-slate-800 mb-4 text-base">📄 Bills Generated</h3>
                        <div className="overflow-x-auto rounded-lg border-2 border-slate-300 shadow-sm">
                          <table className="w-full text-xs">
                            <thead className="bg-gradient-to-r from-purple-600 to-purple-700 text-white border-b-2 border-purple-800">
                              <tr>
                                <th className="px-3 py-2 text-left font-bold uppercase">Bill Type</th>
                                <th className="px-3 py-2 text-left font-bold uppercase hidden sm:table-cell">Period</th>
                                <th className="px-3 py-2 text-right font-bold uppercase">Amount</th>
                                <th className="px-3 py-2 text-left font-bold uppercase hidden sm:table-cell">Generated</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-300">
                              {selectedUser.bills.map((bill) => {
                                const monthName = new Date(
                                  bill.year,
                                  bill.month - 1,
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  year: "numeric",
                                });
                                return (
                                  <tr
                                    key={bill.id}
                                    className="hover:bg-purple-50 transition"
                                  >
                                    <td className="px-3 py-2 text-gray-900 font-semibold capitalize">
                                      {bill.bill_type}
                                    </td>
                                    <td className="px-3 py-2 text-gray-700 hidden sm:table-cell font-medium">
                                      {monthName}
                                    </td>
                                    <td className="px-3 py-2 text-right text-purple-600 font-bold">
                                      ₹{Number(bill.total_amount).toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 text-gray-600 hidden sm:table-cell text-xs">
                                      {new Date(
                                        bill.created_at,
                                      ).toLocaleDateString()}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                </div>

                {/* Modal Footer - Fixed */}
                <div className="bg-slate-50 border-t-2 border-slate-300 p-6 flex gap-3 flex-shrink-0">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="flex-1 px-4 py-2 rounded-lg font-bold bg-gradient-to-r from-slate-700 to-slate-800 text-white hover:from-slate-800 hover:to-slate-900 transition text-sm"
                  >
                    Close
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
    <div className={`${color || "bg-white border-gray-200"} rounded-lg border-2 p-6 text-center shadow-sm hover:shadow-md transition`}>
      {icon && <div className="text-3xl mb-2">{icon}</div>}
      <p className="text-gray-700 text-sm font-semibold mb-2">{label}</p>
      <p className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{value}</p>
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
    <div className="bg-white rounded-lg border-2 border-slate-300 p-3 shadow-sm hover:shadow-md transition relative overflow-hidden">
      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-slate-500 to-slate-600"></div>
      <p className="text-xs text-slate-600 font-bold mb-1 uppercase">{label}</p>
      <p className="text-base font-bold text-slate-900">
        {value}
        {unit && <span className="text-xs ml-1 text-slate-600">{unit}</span>}
      </p>
    </div>
  );
}
