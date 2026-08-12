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

  const [literPresets, setLiterPresets] = useState<number[]>([2, 4, 6, 8]);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | "warning"
  >("success");

  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [hasAnyEntries, setHasAnyEntries] = useState(true); // Default to true to hide banner until we check

  // Calculate smart personalized liter recommendations based on frequency + recency
  function calculateLiterSuggestions(
    entries: Array<{ id: string | number; liters: number | string }>,
    currentEditId?: string | null,
  ): number[] {
    const DEFAULT_PRESETS = [2, 4, 6, 8];
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return DEFAULT_PRESETS;
    }

    // Filter out invalid entries and current entry being edited
    const filtered = entries.filter((e) => {
      if (!e || e.liters === undefined || e.liters === null) return false;
      if (currentEditId && String(e.id) === String(currentEditId)) return false;
      const num = Number(e.liters);
      return !isNaN(num) && num > 0;
    });

    if (filtered.length === 0) {
      return DEFAULT_PRESETS;
    }

    // Score each distinct liter value: Weight = (0.92)^index for exponential recency decay
    const scoreMap: Record<number, number> = {};
    const recencyMap: Record<number, number> = {};
    const frequencyMap: Record<number, number> = {};

    filtered.forEach((entry, idx) => {
      const l = Number(entry.liters);
      const weight = Math.pow(0.92, idx);
      scoreMap[l] = (scoreMap[l] || 0) + weight;
      frequencyMap[l] = (frequencyMap[l] || 0) + 1;
      if (recencyMap[l] === undefined) {
        recencyMap[l] = idx;
      }
    });

    const uniqueLiters = Object.keys(scoreMap).map(Number);

    // Sort descending by score, tie-break by recency, then frequency
    uniqueLiters.sort((a, b) => {
      const scoreDiff = scoreMap[b] - scoreMap[a];
      if (Math.abs(scoreDiff) > 0.001) {
        return scoreDiff;
      }
      const recencyDiff = recencyMap[a] - recencyMap[b];
      if (recencyDiff !== 0) {
        return recencyDiff;
      }
      return frequencyMap[b] - frequencyMap[a];
    });

    // Take top distinct suggestions up to 4
    const suggestions = uniqueLiters.slice(0, 4);

    // Fill remaining slots with fallbacks if fewer than 4 distinct historical values
    if (suggestions.length < 4) {
      for (const def of DEFAULT_PRESETS) {
        if (!suggestions.includes(def)) {
          suggestions.push(def);
          if (suggestions.length === 4) break;
        }
      }
    }

    return suggestions;
  }

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

  // Load profile prices and check user milk history for suggestions
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

        // Fetch recent milk entries to calculate personalized liter suggestions
        const entriesRes = await fetch("/api/milk?limit=50");
        const entriesData = await entriesRes.json();
        const historyData = entriesData.data || [];
        setHasAnyEntries((entriesData.total || 0) > 0);

        // Update smart liter presets
        const suggestions = calculateLiterSuggestions(historyData, editId);
        setLiterPresets(suggestions);
      } catch (err) {
        console.log(err);
        setHasAnyEntries(true); // Default to true on error to hide banner
      }
    }

    loadProfile();
  }, [editId]);

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

  // Reset scroll when success state triggers
  useEffect(() => {
    if (showSuccess) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [showSuccess]);

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
        <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto px-4 py-4 sm:px-6 sm:py-6">
          <AnimatePresence mode="wait">
            {showSuccess ? (
              <motion.div
                key="full-page-success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="fixed inset-0 z-30 pt-16 pb-[72px] bg-slate-50/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto"
              >
                <div className="flex flex-col items-center justify-center text-center space-y-5 max-w-sm sm:max-w-md mx-auto my-auto">
                  {/* SUCCESS CHECKMARK WITH EXPANDING RIPPLE RING */}
                  <div className="relative flex items-center justify-center">
                    {/* Single subtle expanding ripple ring */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0.6 }}
                      animate={{ scale: 1.35, opacity: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                      className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-emerald-400/60 bg-emerald-100/30"
                    />

                    {/* Success Circle */}
                    <motion.div
                      initial={{ scale: 0.65, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 22,
                        delay: 0.05,
                      }}
                      className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-50 border-2 border-emerald-200/90 text-emerald-600 flex items-center justify-center shadow-xs"
                    >
                      <motion.i
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.18, delay: 0.16 }}
                        className="fa-solid fa-check text-3xl sm:text-4xl"
                      ></motion.i>
                    </motion.div>
                  </div>

                  {/* PRIMARY HEADING & SECONDARY TEXT */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: 0.25 }}
                    className="space-y-1.5 max-w-md mx-auto"
                  >
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                      {editMode ? "Entry updated" : "Milk entry saved"}
                    </h2>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 leading-relaxed">
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
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-xs font-bold text-slate-700 mt-1"
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
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form-content"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-3.5 sm:space-y-5"
              >
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                    {editMode ? "Update Milk Entry" : "Add Milk Entry"}
                  </h1>
                  <p className="text-xs font-medium text-slate-500 mt-0.5 sm:text-[13px]">
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
                    <div className="bg-indigo-50/80 border border-indigo-200/80 text-indigo-900 text-xs p-3 rounded-2xl flex gap-2.5 items-center shadow-xs">
                      <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 text-xs">
                        💡
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs mb-0.5">Quick Setup</p>
                        <p className="text-[11px] sm:text-xs text-indigo-700">
                          Set default milk prices in your Profile to auto-fill entries
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push("/profile")}
                        className="px-2.5 py-1 bg-indigo-600 text-white text-xs rounded-xl font-bold hover:bg-indigo-700 transition flex-shrink-0 shadow-xs cursor-pointer"
                      >
                        Set Now →
                      </button>
                    </div>
                  )}

                {editMode && (
                  <div className="bg-amber-50/90 border border-amber-200/80 text-amber-900 text-xs p-2.5 px-3.5 rounded-2xl shadow-xs">
                    <p className="font-bold text-xs">You are editing an existing milk entry</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Editing entry • {liters} L {milkType}
                    </p>
                  </div>
                )}

                <div
                  className={`rounded-2xl border shadow-xs p-3.5 sm:p-5 ${
                    editMode
                      ? "bg-amber-50/30 border-amber-200/80"
                      : "bg-white border-slate-200/80"
                  }`}
                >
                  <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
                    {/* Date */}
                    <div>
                      <label className="text-xs sm:text-[13px] font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                        <i className="fa-solid fa-calendar text-indigo-600 text-xs"></i>
                        <span>Date</span>
                      </label>

                      <div className="relative">
                        <i className="fa-solid fa-calendar absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none z-10"></i>

                        <input
                          type="date"
                          value={date}
                          max={today}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl pl-11 pr-3 py-2 text-xs sm:text-sm font-medium h-[42px] min-h-[42px] sm:h-11 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Milk Type */}
                    <div>
                      <label className="text-xs sm:text-[13px] font-bold text-slate-700 mb-1.5 block">
                        Milk Type
                      </label>

                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                        {/* Buffalo First */}
                        <button
                          type="button"
                          onClick={() => setMilkType("buffalo")}
                          className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl border text-[11px] sm:text-xs font-semibold transition whitespace-nowrap h-9 min-h-[36px] sm:h-[38px] shadow-2xs cursor-pointer
              ${
                milkType === "buffalo"
                  ? "bg-gradient-to-r from-blue-100/90 via-blue-50 to-indigo-100/90 text-blue-950 border-blue-500 ring-2 ring-blue-500/20 shadow-xs font-bold"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50/50 hover:border-blue-200"
              }`}
                        >
                          <span className="text-xs sm:text-sm">🐃</span>
                          <span>Buffalo</span>
                        </button>

                        {/* Cow Second */}
                        <button
                          type="button"
                          onClick={() => setMilkType("cow")}
                          className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl border text-[11px] sm:text-xs font-semibold transition whitespace-nowrap h-9 min-h-[36px] sm:h-[38px] shadow-2xs cursor-pointer
              ${
                milkType === "cow"
                  ? "bg-gradient-to-r from-emerald-100/90 via-emerald-50 to-teal-100/90 text-emerald-950 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs font-bold"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50/50 hover:border-emerald-200"
              }`}
                        >
                          <span className="text-xs sm:text-sm">🐄</span>
                          <span>Cow</span>
                        </button>

                        {/* Packaged Milk Third */}
                        <button
                          type="button"
                          onClick={() => setMilkType("packaged")}
                          className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl border text-[11px] sm:text-xs font-semibold transition whitespace-nowrap h-9 min-h-[36px] sm:h-[38px] shadow-2xs cursor-pointer overflow-hidden
              ${
                milkType === "packaged"
                  ? "bg-gradient-to-r from-amber-100/90 via-amber-50 to-orange-100/90 text-amber-950 border-amber-500 ring-2 ring-amber-500/20 shadow-xs font-bold"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50/50 hover:border-amber-200"
              }`}
                        >
                          <span className="text-xs sm:text-sm flex-shrink-0">🥛</span>
                          <span className="truncate">{brandMilkName}</span>
                        </button>
                      </div>
                    </div>

                    {/* Liters */}
                    <div>
                      <label className="text-xs sm:text-[13px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <i className="fa-solid fa-droplet text-indigo-600 text-xs"></i>
                          Liters
                        </span>
                        {liters && Number(liters) > 0 && (
                          <span className="text-emerald-600 text-xs font-bold">✓ Valid</span>
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
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium h-[42px] min-h-[42px] sm:h-11 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-slate-400">Suggested</p>

                        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                          {literPresets.map((preset, idx) => {
                            const isSelected =
                              liters !== "" && Number(liters) === Number(preset);
                            const isTopRecommendation =
                              idx === 0 && hasAnyEntries && !isSelected;

                            return (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setLiters(String(preset))}
                                className={`px-2 py-0.5 rounded-lg text-[11px] h-7 min-h-[28px] sm:h-7.5 transition active:scale-95 flex items-center justify-center cursor-pointer ${
                                  isSelected
                                    ? "bg-indigo-600 text-white font-bold border border-indigo-600 shadow-xs ring-2 ring-indigo-500/20"
                                    : isTopRecommendation
                                      ? "bg-slate-100/90 border border-slate-300/80 text-slate-800 font-semibold"
                                      : "bg-white border border-slate-200/60 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/40 hover:border-indigo-200/80 font-semibold"
                                }`}
                              >
                                {preset}L
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div>
                      <label className="text-xs sm:text-[13px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <i className="fa-solid fa-indian-rupee text-indigo-600 text-xs"></i>
                          Price per Liter
                        </span>
                        {price && Number(price) > 0 && (
                          <span className="text-emerald-600 text-xs font-bold">✓ Valid</span>
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
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium h-[42px] min-h-[42px] sm:h-11 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition mb-1.5"
                      />

                      <div className="bg-slate-50/90 border border-slate-200/80 text-slate-600 text-[11px] sm:text-xs p-2 px-3 rounded-xl flex gap-2 items-center">
                        <i className="fa-solid fa-circle-info flex-shrink-0 text-xs text-indigo-600"></i>
                        <p className="flex-1">
                          Prices auto-filled from profile.
                          <button
                            type="button"
                            onClick={() => router.push("/profile")}
                            className="ml-1 underline font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                          >
                            Edit
                          </button>
                        </p>
                      </div>
                    </div>

                    {/* Total with Breakdown */}
                    <div className="bg-slate-50/90 border border-slate-200/80 p-2.5 px-3.5 rounded-xl flex flex-col justify-center space-y-0.5">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        Total Breakdown
                      </p>
                      <p className="text-xs sm:text-sm text-slate-700 font-semibold flex items-center justify-between">
                        <span>
                          {liters || "0"}L × ₹{price || "0"}
                        </span>
                        <span className="text-sm sm:text-base font-extrabold text-emerald-600">
                          ₹{total.toFixed(2)}
                        </span>
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || showSuccess}
                      className={`w-full text-white py-2.5 rounded-xl font-bold text-xs sm:text-sm h-11 min-h-[44px] sm:h-12 shadow-xs hover:shadow-sm transition active:scale-[0.99] cursor-pointer mt-0.5 ${
                        editMode
                          ? "bg-amber-600 hover:bg-amber-700 active:bg-amber-800"
                          : "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800"
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
