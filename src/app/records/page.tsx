"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

type MilkEntry = {
  id: string;
  date: string;
  milk_type: string;
  liters: number;
  price_per_liter: number;
  total_amount: number;
};

// Helper for local YYYY-MM-DD string
function getLocalDateStr(d: Date = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function RecordsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlDate = searchParams.get("date");
  const urlToast = searchParams.get("toast");

  // Today's date string YYYY-MM-DD
  const todayStr = getLocalDateStr(new Date());

  // Selected date defaults to today
  const [searchDate, setSearchDate] = useState<string>(todayStr);
  const [records, setRecords] = useState<MilkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [milkFilter, setMilkFilter] = useState<
    "all" | "cow" | "buffalo" | "packaged"
  >("all");

  const [errorMessage, setErrorMessage] = useState("");
  const [toast, setToast] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );

  const [brandMilkName, setBrandMilkName] = useState("Packaged Milk");

  /* ---------------- MILK CALENDAR PRESENTATION STATE ---------------- */
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [calendarViewMode, setCalendarViewMode] = useState<"month" | "week">(
    "month",
  );
  const [allMonthEntries, setAllMonthEntries] = useState<MilkEntry[]>([]);

  // Direction for horizontal slide animation: 1 = next/left, -1 = prev/right
  const [swipeDirection, setSwipeDirection] = useState<number>(1);

  // Touch Swipe Gesture Refs
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const isSwiping = useRef<boolean>(false);

  // Read URL search parameters (e.g. date & toast message after Add/Edit entry)
  useEffect(() => {
    if (urlDate) {
      setSearchDate(urlDate);
      setCalendarDate(new Date(urlDate + "T00:00:00"));
      setCalendarViewMode("week");
    }
    if (urlToast) {
      setToast(urlToast);
      setMessageType("success");
      const timer = setTimeout(() => {
        setToast("");
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [urlDate, urlToast]);

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

  // Fetch month entries for persistent calendar indicator dots
  useEffect(() => {
    async function loadMonthEntries() {
      try {
        const params = new URLSearchParams({
          limit: "300",
          milkType: milkFilter,
        });
        const res = await fetch(`/api/milk?${params.toString()}`);
        const data = await res.json();
        if (res.ok && data.data) {
          setAllMonthEntries(data.data);
        }
      } catch (err) {
        console.log(err);
      }
    }
    loadMonthEntries();
  }, [calendarDate, milkFilter]);

  // Load records exclusively for the selected date
  async function loadRecordsForDate(targetDate: string) {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: "1",
        limit: "100", // Load all entries for the selected day
        searchDate: targetDate,
        milkType: milkFilter,
        dateFilter: "all",
      });

      const res = await fetch(`/api/milk?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setRecords(data.data || []);
      }
    } catch (err) {
      console.log(err);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadRecordsForDate(searchDate || todayStr);
  }, [searchDate, milkFilter]);

  // Refresh records when page becomes visible (returning from edit)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadRecordsForDate(searchDate || todayStr);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [searchDate]);

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

      loadRecordsForDate(searchDate || todayStr);

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

  const filteredLiters = records.reduce(
    (acc, r) => acc + Number(r.liters || 0),
    0,
  );
  const filteredAmount = records.reduce(
    (acc, r) => acc + Number(r.total_amount || 0),
    0,
  );

  /* ---------------- CALENDAR HELPER LOGIC ---------------- */
  const recordsByDateMap = allMonthEntries.reduce<
    Record<string, { cow: boolean; buffalo: boolean; packaged: boolean }>
  >((acc, entry) => {
    const d = entry.date.split("T")[0];
    if (!acc[d]) {
      acc[d] = { cow: false, buffalo: false, packaged: false };
    }
    if (entry.milk_type === "cow") acc[d].cow = true;
    if (entry.milk_type === "buffalo") acc[d].buffalo = true;
    if (entry.milk_type === "packaged") acc[d].packaged = true;
    return acc;
  }, {});

  const activeSelectedDateStr = searchDate || todayStr;

  function handlePrev() {
    setSwipeDirection(-1);
    if (calendarViewMode === "month") {
      setCalendarDate(
        new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1),
      );
    } else {
      const newD = new Date(calendarDate);
      newD.setDate(newD.getDate() - 7);
      setCalendarDate(newD);

      // In week view, if searchDate is not in the new week, update searchDate
      const newWeekGrid = getWeekGridForDate(newD);
      const isInNewWeek = newWeekGrid.some((d) => d.dateStr === searchDate);
      if (!isInNewWeek) {
        const currentSelDate = new Date(searchDate + "T00:00:00");
        const dayOfWeekIndex = (currentSelDate.getDay() + 6) % 7;
        setSearchDate(newWeekGrid[dayOfWeekIndex].dateStr);
      }
    }
  }

  function handleNext() {
    setSwipeDirection(1);
    if (calendarViewMode === "month") {
      setCalendarDate(
        new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1),
      );
    } else {
      const newD = new Date(calendarDate);
      newD.setDate(newD.getDate() + 7);
      setCalendarDate(newD);

      // In week view, if searchDate is not in the new week, update searchDate
      const newWeekGrid = getWeekGridForDate(newD);
      const isInNewWeek = newWeekGrid.some((d) => d.dateStr === searchDate);
      if (!isInNewWeek) {
        const currentSelDate = new Date(searchDate + "T00:00:00");
        const dayOfWeekIndex = (currentSelDate.getDay() + 6) % 7;
        setSearchDate(newWeekGrid[dayOfWeekIndex].dateStr);
      }
    }
  }

  function handleGoToToday() {
    const now = new Date();
    const today = getLocalDateStr(now);
    setSwipeDirection(1);
    setCalendarDate(now);
    setSearchDate(today);
  }

  // Tapping ANY date in Month View automatically transitions to Week View
  // centered on that date's week, and selects the date!
  function handleDateClick(dateStr: string) {
    if (isSwiping.current) return;

    setSearchDate(dateStr);
    setCalendarDate(new Date(dateStr + "T00:00:00"));

    if (calendarViewMode === "month") {
      setSwipeDirection(1);
      setCalendarViewMode("week");
    }
  }

  // Generate Month Grid
  function getMonthGrid() {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;
    const totalDays = lastDay.getDate();

    const days: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
    }[] = [];

    // Prev month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const pDay = prevMonthLastDay - i;
      const pDate = new Date(year, month - 1, pDay);
      const dateStr = getLocalDateStr(pDate);
      days.push({
        dateStr,
        dayNumber: pDay,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const cDate = new Date(year, month, i);
      const dateStr = getLocalDateStr(cDate);
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
      });
    }

    // Next month padding
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nDate = new Date(year, month + 1, i);
      const dateStr = getLocalDateStr(nDate);
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
      });
    }

    return days;
  }

  // Helper to generate week grid for any reference date
  function getWeekGridForDate(refDate: Date) {
    const current = new Date(refDate);
    const dayOfWeek = (current.getDay() + 6) % 7;

    const monday = new Date(current);
    monday.setDate(current.getDate() - dayOfWeek);

    const week: {
      dateStr: string;
      dayNumber: number;
      dayLabel: string;
      isToday: boolean;
    }[] = [];

    const dayLabels = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = getLocalDateStr(d);

      week.push({
        dateStr,
        dayNumber: d.getDate(),
        dayLabel: dayLabels[i],
        isToday: dateStr === todayStr,
      });
    }

    return week;
  }

  // Generate Week Grid centered on reference date
  function getWeekGrid() {
    return getWeekGridForDate(calendarDate);
  }

  // Week range label (e.g. 10 – 16 Aug)
  function getWeekRangeLabel() {
    const week = getWeekGrid();
    if (week.length === 0) return "";
    const start = new Date(week[0].dateStr + "T00:00:00");
    const end = new Date(week[6].dateStr + "T00:00:00");

    const startDay = start.getDate();
    const endDay = end.getDate();
    const monthName = end.toLocaleDateString("en-US", { month: "short" });

    return `${startDay} – ${endDay} ${monthName}`;
  }

  // Touch gesture handlers for mobile horizontal swipe
  function handleTouchStart(e: React.TouchEvent) {
    touchStartPos.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    isSwiping.current = false;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStartPos.current) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = touchStartPos.current.x - currentX;
    const deltaY = touchStartPos.current.y - currentY;

    if (Math.abs(deltaX) > 15 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      isSwiping.current = true;
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStartPos.current) return;
    const touchEndClientX = e.changedTouches[0].clientX;
    const deltaX = touchStartPos.current.x - touchEndClientX;

    if (isSwiping.current && Math.abs(deltaX) > 40) {
      if (deltaX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }

    touchStartPos.current = null;
    setTimeout(() => {
      isSwiping.current = false;
    }, 100);
  }

  // Calculate if Today button should be displayed
  const currentRealDate = new Date();
  const currentRealYear = currentRealDate.getFullYear();
  const currentRealMonth = currentRealDate.getMonth();

  let isAwayFromToday = false;
  if (calendarViewMode === "month") {
    const viewingYear = calendarDate.getFullYear();
    const viewingMonth = calendarDate.getMonth();
    if (
      viewingYear !== currentRealYear ||
      viewingMonth !== currentRealMonth ||
      activeSelectedDateStr !== todayStr
    ) {
      isAwayFromToday = true;
    }
  } else {
    const weekDays = getWeekGrid();
    const containsToday = weekDays.some((d) => d.dateStr === todayStr);
    if (!containsToday || activeSelectedDateStr !== todayStr) {
      isAwayFromToday = true;
    }
  }

  // Framer motion variants for directional horizontal slide transition
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -100 : 100,
      opacity: 0,
    }),
  };

  /* ------------------------------------------------ */

  return (
    <>
      {/* SUCCESS / ERROR TOAST */}
      {toast && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 p-3.5 px-5 rounded-2xl border flex items-center gap-3 text-xs font-semibold transition-all duration-300 shadow-lg ${
            messageType === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-700"
          }`}
        >
          {messageType === "success" ? (
            <i className="fa-solid fa-circle-check text-emerald-500 text-sm flex-shrink-0"></i>
          ) : (
            <i className="fa-solid fa-circle-xmark text-rose-500 text-sm flex-shrink-0"></i>
          )}
          <span>{toast}</span>
        </div>
      )}

      <div className="min-h-screen bg-slate-50/70 pb-24 text-slate-900">
        <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* PAGE HEADER */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Milk Calendar
              </h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Track your daily milk records
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/entries")}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-2xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 flex-shrink-0"
            >
              <i className="fa-solid fa-plus text-xs"></i>
              <span>Add Milk Entry</span>
            </button>
          </div>

          {/* TOP CALENDAR CONTROL BAR */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs">
                <i className="fa-solid fa-calendar-days text-sm"></i>
              </div>
              <span className="text-xs font-bold text-slate-900">
                {calendarViewMode === "month"
                  ? calendarDate.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })
                  : getWeekRangeLabel()}
              </span>
            </div>

            {/* MONTH / WEEK SEGMENTED TOGGLE */}
            <div className="flex p-0.5 bg-slate-100/90 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => {
                  setSwipeDirection(1);
                  setCalendarViewMode("month");
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  calendarViewMode === "month"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <i className="fa-solid fa-calendar text-[10px]"></i>
                <span>Month</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSwipeDirection(1);
                  setCalendarViewMode("week");
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  calendarViewMode === "week"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <i className="fa-solid fa-calendar-week text-[10px]"></i>
                <span>Week</span>
              </button>
            </div>
          </div>

          {/* MAIN MILK CALENDAR CARD */}
          <div
            className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-4 sm:p-6 space-y-4 select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* MONTH / WEEK TITLE ROW & NAV ARROWS */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {calendarViewMode === "month"
                    ? calendarDate.toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })
                    : getWeekRangeLabel()}
                </h2>

                {/* TODAY BUTTON - Appears when navigated away from Today */}
                {isAwayFromToday && (
                  <button
                    type="button"
                    onClick={handleGoToToday}
                    className="px-2.5 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 active:scale-95 rounded-xl border border-blue-200/80 transition flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="Return to Today"
                  >
                    <span>Today</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="w-8 h-8 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95 flex items-center justify-center transition shadow-xs cursor-pointer"
                  title="Previous"
                  aria-label="Previous"
                >
                  <i className="fa-solid fa-chevron-left text-[11px]"></i>
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-8 h-8 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95 flex items-center justify-center transition shadow-xs cursor-pointer"
                  title="Next"
                  aria-label="Next"
                >
                  <i className="fa-solid fa-chevron-right text-[11px]"></i>
                </button>
              </div>
            </div>

            {/* MILK TYPE LEGEND BAR */}
            <div className="bg-slate-50/80 border border-slate-100 rounded-full py-1.5 px-4 flex items-center justify-center gap-4 text-[11px] font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Cow Milk</span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>Buffalo</span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Packaged</span>
              </span>
            </div>

            {/* APPLE CALENDAR MORPH TRANSITION (MONTH <-> WEEK) & HORIZONTAL SWIPE SLIDE */}
            <AnimatePresence mode="wait" initial={false}>
              {calendarViewMode === "month" ? (
                <motion.div
                  key="month-view"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="space-y-2 overflow-hidden"
                >
                  {/* WEEKDAY HEADERS */}
                  <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider py-1">
                    <span>MON</span>
                    <span>TUE</span>
                    <span>WED</span>
                    <span>THU</span>
                    <span>FRI</span>
                    <span>SAT</span>
                    <span>SUN</span>
                  </div>

                  {/* GRID DAYS WITH HORIZONTAL SWIPE SLIDE */}
                  <AnimatePresence mode="wait" initial={false} custom={swipeDirection}>
                    <motion.div
                      key={`${calendarDate.getFullYear()}-${calendarDate.getMonth()}-month-grid`}
                      custom={swipeDirection}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center"
                    >
                      {getMonthGrid().map((dayObj, idx) => {
                        const isSelected = activeSelectedDateStr === dayObj.dateStr;
                        const isToday = dayObj.dateStr === todayStr;
                        const hasRecord = recordsByDateMap[dayObj.dateStr];

                        return (
                          <div
                            key={`${dayObj.dateStr}-${idx}`}
                            className="flex flex-col items-center py-1 min-h-[44px] justify-between"
                          >
                            <button
                              type="button"
                              onClick={() => handleDateClick(dayObj.dateStr)}
                              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-blue-600 text-white font-extrabold shadow-md scale-105"
                                  : isToday
                                    ? "border-2 border-blue-600 text-blue-600 font-bold bg-blue-50/50"
                                    : dayObj.isCurrentMonth
                                      ? "text-slate-800 font-semibold hover:bg-indigo-50 hover:text-blue-600"
                                      : "text-slate-300 font-normal hover:bg-slate-50 hover:text-slate-500"
                              }`}
                            >
                              {dayObj.dayNumber}
                            </button>

                            {/* RECORD INDICATOR DOTS */}
                            <div className="flex gap-0.5 items-center justify-center h-1.5 mt-0.5">
                              {hasRecord?.buffalo && (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isSelected ? "bg-white" : "bg-blue-500"
                                  }`}
                                  title="Buffalo Milk"
                                />
                              )}
                              {hasRecord?.cow && (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isSelected ? "bg-emerald-200" : "bg-emerald-500"
                                  }`}
                                  title="Cow Milk"
                                />
                              )}
                              {hasRecord?.packaged && (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isSelected ? "bg-amber-200" : "bg-amber-500"
                                  }`}
                                  title="Packaged Milk"
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  key="week-view"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="py-1 overflow-hidden"
                >
                  <AnimatePresence mode="wait" initial={false} custom={swipeDirection}>
                    <motion.div
                      key={`${getWeekRangeLabel()}-week-grid`}
                      custom={swipeDirection}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center"
                    >
                      {getWeekGrid().map((dayObj) => {
                        const isSelected = activeSelectedDateStr === dayObj.dateStr;
                        const isToday = dayObj.dateStr === todayStr;
                        const hasRecord = recordsByDateMap[dayObj.dateStr];

                        return (
                          <div
                            key={dayObj.dateStr}
                            onClick={() => handleDateClick(dayObj.dateStr)}
                            className={`flex flex-col items-center py-1.5 px-0.5 rounded-xl cursor-pointer transition-all border min-h-[46px] justify-between ${
                              isSelected
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                : isToday
                                  ? "bg-blue-50/80 border-2 border-blue-600 text-slate-800"
                                  : "bg-slate-50/70 border-slate-200/80 hover:bg-blue-50/60 text-slate-700"
                            }`}
                          >
                            <span
                              className={`text-[9px] font-bold uppercase tracking-tight mb-0.5 ${
                                isSelected
                                  ? "text-blue-100"
                                  : isToday
                                    ? "text-blue-600 font-extrabold"
                                    : "text-slate-400"
                              }`}
                            >
                              {dayObj.dayLabel}
                            </span>

                            <span
                              className={`text-xs font-bold ${
                                isSelected
                                  ? "text-white font-extrabold"
                                  : isToday
                                    ? "text-blue-600 font-extrabold"
                                    : "text-slate-900"
                              }`}
                            >
                              {dayObj.dayNumber}
                            </span>

                            {/* RECORD INDICATOR DOTS */}
                            <div className="flex gap-0.5 items-center justify-center h-1 mt-0.5">
                              {hasRecord?.buffalo && (
                                <span
                                  className={`w-1 h-1 rounded-full ${
                                    isSelected ? "bg-white" : "bg-blue-500"
                                  }`}
                                />
                              )}
                              {hasRecord?.cow && (
                                <span
                                  className={`w-1 h-1 rounded-full ${
                                    isSelected ? "bg-emerald-200" : "bg-emerald-500"
                                  }`}
                                />
                              )}
                              {hasRecord?.packaged && (
                                <span
                                  className={`w-1 h-1 rounded-full ${
                                    isSelected ? "bg-amber-200" : "bg-amber-500"
                                  }`}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ERROR MESSAGE */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-2xl flex items-center gap-2.5">
              <i className="fa-solid fa-circle-xmark text-sm flex-shrink-0"></i>
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          {/* LOADING STATE */}
          {loading && (
            <p className="text-slate-500 text-xs font-medium text-center py-4">
              Loading daily records...
            </p>
          )}

          {/* DAILY RECORDS SECTION */}
          {!loading && (
            <div className="space-y-3 pt-2">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                DAILY RECORDS
              </p>

              {/* SELECTED DATE SUMMARY HEADER CARD */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {new Date(
                      activeSelectedDateStr + "T00:00:00",
                    ).toLocaleDateString("en-US", { weekday: "long" })}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    {formatDate(activeSelectedDateStr)}
                  </p>
                </div>

                {records.length > 0 && (
                  <div className="flex items-center gap-3 text-right bg-slate-50 border border-slate-200/70 px-3.5 py-1.5 rounded-xl">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">
                        Volume
                      </p>
                      <p className="text-xs font-extrabold text-indigo-700">
                        {filteredLiters.toFixed(2)} L
                      </p>
                    </div>
                    <div className="h-6 border-l border-slate-200"></div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">
                        Day Total
                      </p>
                      <p className="text-xs font-extrabold text-emerald-600">
                        ₹{filteredAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* EMPTY STATE FOR SELECTED DATE */}
              {records.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-xl shadow-xs">
                    <i className="fa-solid fa-droplet text-indigo-500"></i>
                  </div>
                  <div>
                    <h4 className="text-slate-900 font-extrabold text-sm">
                      No milk records
                    </h4>
                    <p className="text-slate-500 text-xs mt-1 max-w-xs mx-auto">
                      No milk was recorded for{" "}
                      {new Date(
                        activeSelectedDateStr + "T00:00:00",
                      ).toLocaleDateString("en-US", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                      .
                    </p>
                  </div>
                  <div className="pt-2 flex justify-center">
                    <button
                      onClick={() =>
                        router.push(`/entries?date=${activeSelectedDateStr}`)
                      }
                      className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs flex items-center gap-2"
                    >
                      <i className="fa-solid fa-plus text-xs"></i>
                      <span>Add Milk Entry</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SELECTED DAY MILK RECORDS CARDS */}
              {records.length > 0 && (
                <div className="space-y-2.5">
                  {records.map((entry) => (
                    <div
                      key={entry.id}
                      className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 border-l-4 transition hover:border-slate-300 ${
                        entry.milk_type === "cow"
                          ? "border-l-emerald-500"
                          : entry.milk_type === "buffalo"
                            ? "border-l-blue-500"
                            : "border-l-amber-500"
                      }`}
                    >
                      {/* BADGE + TOTAL AMOUNT */}
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[11px] px-2.5 py-0.5 rounded-lg font-semibold flex items-center gap-1 ${
                            entry.milk_type === "cow"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : entry.milk_type === "buffalo"
                                ? "bg-blue-50 text-blue-700 border border-blue-200/60"
                                : "bg-amber-50 text-amber-700 border border-amber-200/60"
                          }`}
                        >
                          {entry.milk_type === "cow"
                            ? "🐄 Cow Milk"
                            : entry.milk_type === "buffalo"
                              ? "🐃 Buffalo Milk"
                              : `🥛 ${brandMilkName}`}
                        </span>
                        <p className="text-sm font-bold text-emerald-600">
                          ₹{Number(entry.total_amount).toFixed(2)}
                        </p>
                      </div>

                      {/* COMPACT INFO ROW */}
                      <div className="flex items-center justify-between bg-slate-50/80 rounded-xl px-3 py-2 mb-2.5 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 font-medium mr-1.5">
                            Quantity:
                          </span>
                          <span className="font-bold text-slate-900">
                            {entry.liters} L
                          </span>
                        </div>
                        <div className="h-4 border-l border-slate-200"></div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-medium mr-1.5">
                            Rate:
                          </span>
                          <span className="font-bold text-slate-900">
                            ₹{entry.price_per_liter}/L
                          </span>
                        </div>
                      </div>

                      {/* ACTION BUTTONS */}
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            router.push(`/entries?id=${entry.id}`)
                          }
                          className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-50/80 text-indigo-600 py-1.5 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition border border-indigo-200/60"
                        >
                          <i className="fa-solid fa-pen text-[10px]"></i>
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => setDeleteId(entry.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-rose-50/80 text-rose-600 py-1.5 rounded-xl text-xs font-semibold hover:bg-rose-100 transition border border-rose-200/60"
                        >
                          <i className="fa-solid fa-trash text-[10px]"></i>
                          <span>Delete</span>
                        </button>
                      </div>

                      {/* DELETE CONFIRMATION DIALOG */}
                      {deleteId === entry.id && (
                        <div className="mt-3 space-y-2 bg-rose-50/90 rounded-xl p-3 border border-rose-200">
                          <div className="flex items-center gap-2 text-rose-800">
                            <i className="fa-solid fa-circle-exclamation text-xs"></i>
                            <p className="text-xs font-bold">
                              Delete this entry?
                            </p>
                          </div>
                          <p className="text-[11px] text-rose-700">
                            This action will permanently remove this milk record.
                          </p>

                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => setDeleteId(null)}
                              disabled={deleting}
                              className="flex-1 bg-white border border-slate-300 text-slate-700 text-xs py-1.5 rounded-lg font-semibold hover:bg-slate-50 transition"
                            >
                              Cancel
                            </button>

                            <button
                              onClick={() => confirmDelete(entry.id)}
                              disabled={deleting}
                              className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition"
                            >
                              {deleting ? "Deleting..." : "Confirm Delete"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function Records() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50/70 p-8 text-center text-xs font-semibold text-slate-500">
          Loading Calendar...
        </div>
      }
    >
      <RecordsContent />
    </Suspense>
  );
}

