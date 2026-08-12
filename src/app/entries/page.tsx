"use client";
import { Suspense } from "react";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

function EntriesPage() {
  const today = new Date().toISOString().split("T")[0];

  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("id");

  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [date, setDate] = useState(today);
  const [milkType, setMilkType] = useState("buffalo");
  const [liters, setLiters] = useState("");
  const [price, setPrice] = useState<string>("");

  const [cowPrice, setCowPrice] = useState(0);
  const [buffaloPrice, setBuffaloPrice] = useState(0);
  const [brandMilkName, setBrandMilkName] = useState("Packaged Milk");
  const [brandMilkPrice, setBrandMilkPrice] = useState(0);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | "warning"
  >("success");

  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [hasAnyEntries, setHasAnyEntries] = useState(true); // Default to true to hide banner until we check

  // Cleanup redirect timer on unmount
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
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

  // Load profile prices and check if user has any entries
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();

        if (res.ok && data.data) {
          setCowPrice(data.data.default_cow_price || 0);
          setBuffaloPrice(data.data.default_buffalo_price || 0);
          setBrandMilkName(data.data.brand_milk_name || "Packaged Milk");
          setBrandMilkPrice(data.data.default_brand_price || 0);

          if (milkType === "cow") {
            setPrice(String(data.data.default_cow_price || ""));
          } else if (milkType === "packaged") {
            setPrice(String(data.data.default_brand_price || ""));
          } else {
            setPrice(String(data.data.default_buffalo_price || ""));
          }
        }

        // Check if user has any entries
        const entriesRes = await fetch("/api/milk?limit=1");
        const entriesData = await entriesRes.json();
        setHasAnyEntries((entriesData.total || 0) > 0);
      } catch (err) {
        console.log(err);
        setHasAnyEntries(true); // Default to true on error to hide banner
      }
    }

    loadProfile();
  }, []);

  // Load entry for editing
  useEffect(() => {
    if (!editId) return;

    async function loadEntry() {
      if (!editId) return;

      try {
        const res = await fetch(`/api/milk/${editId}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          console.error("Failed to fetch entry");
          return;
        }

        const data = await res.json();

        if (!data?.data) {
          console.error("Entry not found");
          return;
        }

        const entry = data.data;

        setEditMode(true);

        const formattedDate = entry.date.split("T")[0];
        setDate(formattedDate);
        setMilkType(entry.milk_type);
        setLiters(String(entry.liters));
        setPrice(String(entry.price_per_liter));
      } catch (err) {
        console.error("Error loading entry:", err);
      }
    }

    loadEntry();
  }, [editId]);

  // Auto change price when milk type changes
  useEffect(() => {
    if (milkType === "cow") {
      setPrice((cowPrice ?? 0).toString());
    } else if (milkType === "packaged") {
      setPrice((brandMilkPrice ?? 0).toString());
    } else {
      setPrice((buffaloPrice ?? 0).toString());
    }
  }, [milkType, cowPrice, buffaloPrice, brandMilkPrice]);

  const total = (Number(liters) || 0) * (Number(price) || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    if (!liters || Number(liters) <= 0) {
      setMessage("Please enter a valid milk quantity");
      setMessageType("error");
      setLoading(false);
      return;
    }

    if (!price || Number(price) <= 0) {
      setMessage(
        `Price is required. Please set default ${milkType === "cow" ? "Cow" : milkType === "buffalo" ? "Buffalo" : "Packaged Milk"} price in your Profile first.`,
      );
      setMessageType("error");
      setLoading(false);
      return;
    }

    if (date > today) {
      setMessage("Future date is not allowed");
      setMessageType("error");
      setLoading(false);
      return;
    }

    if (Number(price) <= 0) {
      setMessage("Price must be greater than 0");
      setMessageType("error");
      setLoading(false);
      return;
    }

    try {
      let res;

      if (editMode && editId) {
        res = await fetch(`/api/milk/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            milk_type: milkType,
            liters: Number(liters),
            price_per_liter: Number(price),
          }),
        });
      } else {
        res = await fetch("/api/milk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            milk_type: milkType,
            liters: Number(liters),
            price_per_liter: Number(price),
          }),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        if (data.error) {
          setMessage(data.error);
        } else {
          setMessage("Something went wrong. Please try again.");
        }
        setMessageType("error");
        setLoading(false);
        return;
      }

      // Successful submission — trigger polished confirmation micro-interaction
      setShowSuccess(true);
      setLoading(false);

      const toastMsg = editMode ? "Entry updated successfully" : "Milk entry saved successfully";

      // Display full success screen for ~1700ms (fast animation + ~1s hold) before redirecting to calendar
      redirectTimerRef.current = setTimeout(() => {
        router.push(`/records?date=${date}&toast=${encodeURIComponent(toastMsg)}`);
      }, 1700);
      return;
    } catch (err) {
      setMessage("Something went wrong");
      setMessageType("error");
    }

    setLoading(false);
  }

  return (
    <>
      {message && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 p-3.5 px-5 rounded-2xl border flex items-center gap-3 text-xs font-semibold transition-all duration-300 shadow-lg ${
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

      <div className="min-h-screen bg-slate-50/70 pb-24 text-slate-900">
        <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto p-3 sm:p-6">
          <AnimatePresence mode="wait">
            {showSuccess ? (
              <motion.div
                key="full-page-success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="min-h-[70vh] sm:min-h-[75vh] flex flex-col items-center justify-center text-center px-4 py-8 space-y-6 max-w-xl mx-auto"
              >
                {/* SUCCESS CHECKMARK WITH EXPANDING RIPPLE RING */}
                <div className="relative flex items-center justify-center">
                  {/* Single subtle expanding ripple ring */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0.6 }}
                    animate={{ scale: 1.35, opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                    className="absolute w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 border-emerald-400/60 bg-emerald-100/30"
                  />

                  {/* Large Success Circle (96px mobile / 112px desktop) */}
                  <motion.div
                    initial={{ scale: 0.65, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 22,
                      delay: 0.05,
                    }}
                    className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-emerald-50 border-2 border-emerald-200/90 text-emerald-600 flex items-center justify-center shadow-xs"
                  >
                    <motion.i
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.18, delay: 0.16 }}
                      className="fa-solid fa-check text-4xl sm:text-5xl"
                    ></motion.i>
                  </motion.div>
                </div>

                {/* PRIMARY HEADING & SECONDARY TEXT */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: 0.25 }}
                  className="space-y-2 max-w-md mx-auto"
                >
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {editMode ? "Entry updated" : "Milk entry saved"}
                  </h2>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">
                    {editMode
                      ? "Your milk record has been updated successfully."
                      : "Your record has been added successfully."}
                  </p>
                </motion.div>

                {/* CONTEXTUAL DETAIL CHIP */}
                {liters && Number(liters) > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.22, delay: 0.38 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-200/80 shadow-2xs text-xs font-bold text-slate-700 mt-2"
                  >
                    <span className="capitalize text-indigo-600 font-extrabold">
                      {milkType === "packaged" ? brandMilkName : milkType}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-900">{liters} L</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-emerald-600">₹{total.toFixed(2)}</span>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="form-content"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-3 sm:space-y-5"
              >
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                    {editMode ? "Update Milk Entry" : "Add Milk Entry"}
                  </h1>
                  <p className="text-[11px] sm:text-xs font-medium text-slate-500 mt-0.5">
                    {editMode
                      ? "Modify existing record details"
                      : "Log a new daily milk record"}
                  </p>
                </div>

                {!editMode &&
                  !hasAnyEntries &&
                  !cowPrice &&
                  !buffaloPrice &&
                  !brandMilkPrice && (
                    <div className="bg-indigo-50/80 border border-indigo-200/80 text-indigo-900 text-xs p-3 rounded-xl flex gap-2.5 items-center shadow-xs">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 text-xs">
                        💡
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs mb-0.5">Quick Setup</p>
                        <p className="text-[11px] text-indigo-700">
                          Set default milk prices in your Profile to auto-fill entries
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push("/profile")}
                        className="px-2.5 py-1 bg-indigo-600 text-white text-xs rounded-lg font-semibold hover:bg-indigo-700 transition flex-shrink-0 shadow-xs"
                      >
                        Set Now →
                      </button>
                    </div>
                  )}

                {editMode && (
                  <div className="bg-amber-50/90 border border-amber-200/80 text-amber-900 text-xs p-2.5 px-3 rounded-xl shadow-xs">
                    <p className="font-semibold text-xs">You are editing an existing milk entry</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Editing entry • {liters} L {milkType}
                    </p>
                  </div>
                )}

                <div
                  className={`rounded-2xl border shadow-xs p-3.5 sm:p-6 ${
                    editMode
                      ? "bg-amber-50/30 border-amber-200/80"
                      : "bg-white border-slate-200/80"
                  }`}
                >
                  <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                    {/* Date */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                        <i className="fa-solid fa-calendar text-indigo-600 text-xs"></i>
                        <span>Date</span>
                      </label>

                      <div className="relative">
                        <i className="fa-solid fa-calendar absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>

                        <input
                          type="date"
                          value={date}
                          max={today}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs h-10 min-h-[40px] bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Milk Type */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1 block">
                        Milk Type
                      </label>

                      <div className="grid grid-cols-3 gap-1.5 mt-1">
                        {/* Buffalo First */}
                        <button
                          type="button"
                          onClick={() => setMilkType("buffalo")}
                          className={`flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl border text-xs font-semibold transition whitespace-nowrap h-10 min-h-[40px]
              ${
                milkType === "buffalo"
                  ? "bg-gradient-to-r from-blue-100/90 via-blue-50 to-indigo-100/90 text-blue-950 border-blue-500 ring-2 ring-blue-500/20 shadow-xs font-bold"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50/50 hover:border-blue-200"
              }`}
                        >
                          <span>🐃</span>
                          <span>Buffalo</span>
                        </button>

                        {/* Cow Second */}
                        <button
                          type="button"
                          onClick={() => setMilkType("cow")}
                          className={`flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl border text-xs font-semibold transition whitespace-nowrap h-10 min-h-[40px]
              ${
                milkType === "cow"
                  ? "bg-gradient-to-r from-emerald-100/90 via-emerald-50 to-teal-100/90 text-emerald-950 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs font-bold"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50/50 hover:border-emerald-200"
              }`}
                        >
                          <span>🐄</span>
                          <span>Cow</span>
                        </button>

                        {/* Packaged Milk Third */}
                        <button
                          type="button"
                          onClick={() => setMilkType("packaged")}
                          className={`flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl border text-xs font-semibold transition whitespace-nowrap h-10 min-h-[40px] truncate
              ${
                milkType === "packaged"
                  ? "bg-gradient-to-r from-amber-100/90 via-amber-50 to-orange-100/90 text-amber-950 border-amber-500 ring-2 ring-amber-500/20 shadow-xs font-bold"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50/50 hover:border-amber-200"
              }`}
                        >
                          <span>🥛</span>
                          <span className="truncate">{brandMilkName}</span>
                        </button>
                      </div>
                    </div>

                    {/* Liters */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <i className="fa-solid fa-droplet text-indigo-600 text-xs"></i>
                          Liters
                        </span>
                        {liters && Number(liters) > 0 && (
                          <span className="text-emerald-600 text-[11px] font-bold">✓ Valid</span>
                        )}
                      </label>

                      <div className="mb-1.5">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="0.0"
                          value={liters}
                          onChange={(e) => {
                            const val = e.target.value;

                            if (val === "") {
                              setLiters("");
                              setMessage("");
                              return;
                            }

                            const num = Number(val);

                            if (isNaN(num)) {
                              setMessage("Liters must be a valid number");
                              setMessageType("error");
                              return;
                            }

                            if (num <= 0) {
                              setMessage("Liters must be greater than 0");
                              setMessageType("error");
                              return;
                            }

                            if (num > 100) {
                              setMessage("Cannot exceed 100 liters per entry");
                              setMessageType("error");
                              return;
                            }

                            setMessage("");
                            setLiters(val);
                          }}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs h-10 min-h-[40px] bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                          required
                        />
                      </div>

                      <div className="flex gap-1.5">
                        {[2, 4, 6, 8].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setLiters(String(preset))}
                            className="border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-semibold text-[11px] h-8 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition"
                          >
                            {preset}L
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Price */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <i className="fa-solid fa-indian-rupee text-indigo-600 text-xs"></i>
                          Price per Liter
                        </span>
                        {price && Number(price) > 0 && (
                          <span className="text-emerald-600 text-[11px] font-bold">✓ Valid</span>
                        )}
                      </label>

                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="0.00"
                        value={price}
                        onChange={(e) => {
                          const val = e.target.value;

                          if (val === "") {
                            setPrice("");
                            setMessage("");
                            return;
                          }

                          const num = Number(val);

                          if (isNaN(num)) {
                            setMessage("Price must be a valid number");
                            setMessageType("error");
                            return;
                          }

                          if (num <= 0) {
                            setMessage("Price must be greater than 0");
                            setMessageType("error");
                            return;
                          }

                          if (num > 1000) {
                            setMessage("Price seems too high");
                            setMessageType("error");
                            return;
                          }

                          setMessage("");
                          setPrice(val);
                        }}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs h-10 min-h-[40px] bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition mb-1.5"
                      />

                      <div className="bg-slate-50 border border-slate-200/70 text-slate-600 text-[11px] p-2 px-3 rounded-xl flex gap-2 items-center">
                        <i className="fa-solid fa-circle-info flex-shrink-0 text-xs text-indigo-600"></i>
                        <p className="flex-1">
                          Prices auto-filled from profile.
                          <button
                            type="button"
                            onClick={() => router.push("/profile")}
                            className="ml-1 underline font-semibold text-indigo-600"
                          >
                            Edit
                          </button>
                        </p>
                      </div>
                    </div>

                    {/* Total with Breakdown */}
                    <div className="bg-slate-50 border border-slate-200/80 p-2.5 px-3 rounded-xl">
                      <p className="text-[10px] text-slate-500 font-medium mb-0.5">
                        Total Breakdown
                      </p>
                      <p className="text-xs text-slate-700 font-semibold">
                        {liters || "0"}L × ₹{price || "0"} ={" "}
                        <span className="text-sm font-bold text-emerald-600">
                          ₹{total.toFixed(2)}
                        </span>
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || showSuccess}
                      className={`w-full text-white py-2.5 rounded-xl font-semibold text-xs h-10 min-h-[40px] sm:h-11 sm:min-h-[44px] shadow-xs transition ${
                        editMode
                          ? "bg-amber-600 hover:bg-amber-700"
                          : "bg-indigo-600 hover:bg-indigo-700"
                      }`}
                    >
                      {loading
                        ? "Saving..."
                        : editMode
                          ? "Update Entry"
                          : "Save Entry"}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

export default function Entries() {
  return (
    <Suspense fallback={<div className="p-5">Loading...</div>}>
      <EntriesPage />
    </Suspense>
  );
}
