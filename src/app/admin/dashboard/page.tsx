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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex justify-between items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <span className="text-2xl">🥛</span>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
                    Admin Dashboard
                  </h1>
                  <p className="text-slate-200 text-xs sm:text-sm hidden sm:block">
                    Milk Tracker Management System
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 sm:px-6 py-2 rounded-lg font-medium text-xs sm:text-base transition whitespace-nowrap border border-white/30"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Messages */}
        {message && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 sm:gap-4 mb-6 border-b border-gray-300 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 sm:px-6 py-2 sm:py-3 font-medium border-b-2 transition text-xs sm:text-base whitespace-nowrap ${
              activeTab === "overview"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-600 hover:text-gray-800"
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-3 sm:px-6 py-2 sm:py-3 font-medium border-b-2 transition text-xs sm:text-base whitespace-nowrap ${
              activeTab === "users"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-600 hover:text-gray-800"
            }`}
          >
            👥 Users ({users.length})
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && analytics && (
          <div className="space-y-4 sm:space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                label="Total Users"
                value={analytics.total_users}
                icon="👥"
              />
              <StatCard
                label="Active Users"
                value={analytics.active_users}
                icon="✅"
              />
              <StatCard
                label="Total Entries"
                value={analytics.total_milk_entries}
                icon="🥛"
              />
              <StatCard
                label="Today's Entries"
                value={analytics.today_entries}
                icon="📝"
              />
            </div>

            {/* Monthly Trend Chart */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
                📈 Monthly Activity Trend
              </h2>
              <div className="space-y-3">
                {analytics.monthly_trend.map((item) => (
                  <div key={item.month}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">
                        {item.month}
                      </span>
                      <span className="text-sm font-semibold text-gray-800">
                        {item.entries} entries
                      </span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-orange-400 to-orange-600 h-full"
                        style={{
                          width: `${Math.min(
                            (item.entries / 1000) * 100,
                            100,
                          )}%`,
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
            <div className="bg-white rounded-lg shadow p-4">
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Found {filteredUsers.length} of {users.length} users
              </p>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-600 to-slate-700 text-white border-b">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold">
                        Email
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold">
                        Name
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold">
                        Joined
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold">
                        Status
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-8 text-center text-gray-500"
                        >
                          No users found
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
                            {user.email}
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-700">
                            {user.name || "—"}
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                            <span
                              className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                                user.is_active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {user.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => fetchUserDetails(user.id)}
                                className="px-2 sm:px-3 py-1 sm:py-2 rounded font-medium text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                              >
                                Details
                              </button>
                              <button
                                onClick={() =>
                                  handleToggleUserStatus(
                                    user.id,
                                    !user.is_active,
                                  )
                                }
                                className={`px-2 sm:px-3 py-1 sm:py-2 rounded font-medium text-xs transition ${
                                  user.is_active
                                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                                    : "bg-green-100 text-green-700 hover:bg-green-200"
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
                                className="px-2 sm:px-3 py-1 sm:py-2 rounded font-medium text-xs bg-red-600 text-white hover:bg-red-700 transition"
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
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {filteredUsers.length === 0 ? (
                <div className="bg-white rounded-lg p-6 text-center text-gray-500">
                  No users found
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500"
                  >
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 font-medium">Email</p>
                      <p className="text-sm font-semibold text-gray-900 break-all">
                        {user.email}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <p className="text-xs text-gray-500 font-medium">
                          Name
                        </p>
                        <p className="text-sm text-gray-700">
                          {user.name || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">
                          Phone
                        </p>
                        <p className="text-sm text-gray-700">
                          {user.mobile || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <p className="text-xs text-gray-500 font-medium">
                          Joined
                        </p>
                        <p className="text-sm text-gray-700">
                          {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">
                          Status
                        </p>
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                            user.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 pt-3 border-t">
                      <button
                        onClick={() => fetchUserDetails(user.id)}
                        className="w-full px-2 py-2 rounded font-medium text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                      >
                        View Details
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleToggleUserStatus(user.id, !user.is_active)
                          }
                          className={`flex-1 px-2 py-2 rounded font-medium text-xs transition ${
                            user.is_active
                              ? "bg-red-100 text-red-700 hover:bg-red-200"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
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
                          className="flex-1 px-2 py-2 rounded font-medium text-xs bg-red-600 text-white hover:bg-red-700 transition"
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
        {deleteConfirm && mounted && createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 max-w-sm w-full">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">
                Delete User Account?
              </h3>
              <p className="text-gray-600 mb-2 text-sm">
                Email:{" "}
                <strong className="break-all">{deleteConfirm.email}</strong>
              </p>
              <p className="text-red-600 text-xs sm:text-sm font-medium mb-6">
                ⚠️ This will permanently delete the account and all associated
                milk entries. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded font-medium bg-gray-200 text-gray-800 hover:bg-gray-300 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded font-medium bg-red-600 text-white hover:bg-red-700 transition text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* User Details Modal */}
        {selectedUser && mounted && createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200 p-4 sm:p-6 flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                    {selectedUser.user.name || "User Details"}
                  </h2>
                  <p className="text-gray-600 text-xs sm:text-sm mt-1 break-all">
                    {selectedUser.user.email}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-shrink-0 text-gray-500 hover:text-gray-700 text-3xl sm:text-2xl leading-none hover:bg-gray-200 rounded-full p-1 transition"
                >
                  ×
                </button>
              </div>

              {loadingUserDetails ? (
                <div className="text-center py-12 text-gray-600">
                  Loading user details...
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                  {/* User Profile */}
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 sm:p-6 border border-orange-200">
                    <h3 className="font-bold text-gray-900 mb-4 text-lg">
                      👤 Profile Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      <div className="bg-white rounded p-3">
                        <p className="text-xs text-gray-500 font-medium mb-1">
                          Email
                        </p>
                        <p className="text-sm sm:text-base text-gray-900 font-medium break-all">
                          {selectedUser.user.email}
                        </p>
                      </div>
                      <div className="bg-white rounded p-3">
                        <p className="text-xs text-gray-500 font-medium mb-1">
                          Name
                        </p>
                        <p className="text-sm sm:text-base text-gray-900 font-medium">
                          {selectedUser.user.name || "—"}
                        </p>
                      </div>
                      <div className="bg-white rounded p-3">
                        <p className="text-xs text-gray-500 font-medium mb-1">
                          Phone
                        </p>
                        <p className="text-sm sm:text-base text-gray-900 font-medium">
                          {selectedUser.user.mobile || "—"}
                        </p>
                      </div>
                      <div className="bg-white rounded p-3">
                        <p className="text-xs text-gray-500 font-medium mb-1">
                          Address
                        </p>
                        <p className="text-sm sm:text-base text-gray-900 font-medium">
                          {selectedUser.user.address || "—"}
                        </p>
                      </div>
                      <div className="bg-white rounded p-3">
                        <p className="text-xs text-gray-500 font-medium mb-1">
                          Default Cow Price
                        </p>
                        <p className="text-sm sm:text-base text-gray-900 font-bold">
                          ₹
                          {Number(selectedUser.user.default_cow_price).toFixed(
                            2,
                          )}
                        </p>
                      </div>
                      <div className="bg-white rounded p-3">
                        <p className="text-xs text-gray-500 font-medium mb-1">
                          Default Buffalo Price
                        </p>
                        <p className="text-sm sm:text-base text-gray-900 font-bold">
                          ₹
                          {Number(
                            selectedUser.user.default_buffalo_price,
                          ).toFixed(2)}
                        </p>
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
                      <h3 className="font-bold text-gray-900 mb-3 text-lg">
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
                              className="bg-gradient-to-r from-blue-50 to-blue-100 rounded p-3 border border-blue-200"
                            >
                              <div className="flex justify-between items-center mb-2">
                                <p className="font-medium text-gray-900 text-sm sm:text-base">
                                  {monthStr}
                                </p>
                                <span className="text-xs font-semibold px-2 py-1 bg-blue-200 text-blue-700 rounded">
                                  {month.entry_count} entries
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                                <div>
                                  <p className="text-gray-600">Liters</p>
                                  <p className="text-gray-900 font-semibold">
                                    {Number(month.total_liters).toFixed(2)} L
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Revenue</p>
                                  <p className="text-gray-900 font-semibold">
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
                      <h3 className="font-bold text-gray-900 mb-3 text-lg">
                        📝 Recent Entries
                      </h3>
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-xs sm:text-sm">
                          <thead className="bg-gray-900 text-white sticky top-0">
                            <tr>
                              <th className="px-2 sm:px-3 py-2 text-left font-semibold">
                                Date
                              </th>
                              <th className="px-2 sm:px-3 py-2 text-left font-semibold">
                                Type
                              </th>
                              <th className="px-2 sm:px-3 py-2 text-right font-semibold">
                                Liters
                              </th>
                              <th className="px-2 sm:px-3 py-2 text-right font-semibold hidden sm:table-cell">
                                Price/L
                              </th>
                              <th className="px-2 sm:px-3 py-2 text-right font-semibold">
                                Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {selectedUser.recentEntries.map((entry) => (
                              <tr key={entry.id} className="hover:bg-gray-50">
                                <td className="px-2 sm:px-3 py-2 text-gray-900 font-medium">
                                  {new Date(entry.date).toLocaleDateString(
                                    "en-IN",
                                  )}
                                </td>
                                <td className="px-2 sm:px-3 py-2 text-gray-600 capitalize font-medium">
                                  {entry.milk_type}
                                </td>
                                <td className="px-2 sm:px-3 py-2 text-right text-gray-900 font-semibold">
                                  {Number(entry.liters).toFixed(2)}
                                </td>
                                <td className="px-2 sm:px-3 py-2 text-right text-gray-600 hidden sm:table-cell">
                                  ₹{Number(entry.price_per_liter).toFixed(2)}
                                </td>
                                <td className="px-2 sm:px-3 py-2 text-right text-gray-900 font-bold">
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
                    <h3 className="font-bold text-gray-900 mb-3 text-lg">
                      🥛 Milk Type Breakdown
                    </h3>
                    <div className="space-y-2">
                      {selectedUser.breakdown.length === 0 ? (
                        <p className="text-sm text-gray-600 bg-gray-50 rounded p-3">
                          No entries yet
                        </p>
                      ) : (
                        selectedUser.breakdown.map((item) => (
                          <div
                            key={item.milk_type}
                            className="bg-gradient-to-r from-orange-50 to-amber-50 rounded p-3 sm:p-4 border border-orange-200"
                          >
                            <div className="flex justify-between items-center mb-3">
                              <p className="font-semibold text-gray-900 text-sm sm:text-base capitalize">
                                {item.milk_type} Milk
                              </p>
                              <span className="text-xs font-bold px-2 py-1 bg-orange-200 text-orange-700 rounded">
                                {item.entry_count} entries
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm">
                              <div className="bg-white rounded p-2 text-center">
                                <p className="text-gray-600 text-xs font-medium">
                                  Total Liters
                                </p>
                                <p className="text-gray-900 font-bold text-sm sm:text-base">
                                  {Number(item.total_liters || 0).toFixed(2)} L
                                </p>
                              </div>
                              <div className="bg-white rounded p-2 text-center">
                                <p className="text-gray-600 text-xs font-medium">
                                  Total Amount
                                </p>
                                <p className="text-gray-900 font-bold text-sm sm:text-base">
                                  ₹{Number(item.total_amount || 0).toFixed(2)}
                                </p>
                              </div>
                              <div className="bg-white rounded p-2 text-center">
                                <p className="text-gray-600 text-xs font-medium">
                                  Avg Price
                                </p>
                                <p className="text-gray-900 font-bold text-sm sm:text-base">
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
                      <h3 className="font-bold text-gray-900 mb-3 text-lg">
                        📄 Bills Generated
                      </h3>
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-xs sm:text-sm">
                          <thead className="bg-gray-900 text-white">
                            <tr>
                              <th className="px-2 sm:px-3 py-2 text-left font-semibold">
                                Bill Type
                              </th>
                              <th className="px-2 sm:px-3 py-2 text-left font-semibold hidden sm:table-cell">
                                Period
                              </th>
                              <th className="px-2 sm:px-3 py-2 text-right font-semibold">
                                Amount
                              </th>
                              <th className="px-2 sm:px-3 py-2 text-left font-semibold hidden sm:table-cell">
                                Generated
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {selectedUser.bills.map((bill) => {
                              const monthName = new Date(
                                bill.year,
                                bill.month - 1,
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                year: "numeric",
                              });
                              return (
                                <tr key={bill.id} className="hover:bg-gray-50">
                                  <td className="px-2 sm:px-3 py-2 text-gray-900 font-medium capitalize">
                                    {bill.bill_type}
                                  </td>
                                  <td className="px-2 sm:px-3 py-2 text-gray-600 hidden sm:table-cell">
                                    {monthName}
                                  </td>
                                  <td className="px-2 sm:px-3 py-2 text-right text-gray-900 font-bold">
                                    ₹{Number(bill.total_amount).toFixed(2)}
                                  </td>
                                  <td className="px-2 sm:px-3 py-2 text-gray-600 hidden sm:table-cell text-xs">
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

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 sm:p-6 flex gap-3">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 px-4 py-2 sm:py-3 rounded-lg font-medium bg-gray-200 text-gray-800 hover:bg-gray-300 transition text-sm sm:text-base"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6 border-l-4 border-orange-500">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-xs sm:text-sm font-medium">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
            {value}
          </p>
        </div>
        <div className="text-3xl sm:text-4xl">{icon}</div>
      </div>
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
    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-200">
      <p className="text-xs text-gray-600 font-medium mb-1">{label}</p>
      <p className="text-lg sm:text-xl font-bold text-gray-900">
        {value}
        {unit && <span className="text-xs ml-1">{unit}</span>}
      </p>
    </div>
  );
}
