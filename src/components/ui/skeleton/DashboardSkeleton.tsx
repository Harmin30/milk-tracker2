"use client";

import React from "react";
import { Skeleton } from "./Skeleton";
import { SkeletonCard } from "./SkeletonCard";

/**
 * Loading skeleton matching the Dashboard layout:
 * - Today's Status card (header, date, category rows, today total).
 * - Monthly Summary card (month label, category breakdown, total volume & amount).
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* 1. Today's Status Skeleton Card */}
      <SkeletonCard className="space-y-3.5">
        {/* Header: Title + Date + Status Icon */}
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-28 rounded-md" />
            </div>
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
          <Skeleton className="w-6 h-6 rounded-full" />
        </div>

        {/* Today's Entries Placeholder Rows */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <Skeleton className="w-8 h-8 rounded-xl flex-shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-24 rounded-md" />
                <Skeleton className="h-2.5 w-14 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-3.5 w-14 rounded-md ml-2" />
          </div>

          {/* Today Total Row */}
          <div className="border-t border-slate-100 pt-2.5 mt-2.5 flex justify-between items-baseline">
            <Skeleton className="h-3 w-16 rounded-md" />
            <div className="space-y-1 text-right">
              <Skeleton className="h-4 w-14 rounded-md ml-auto" />
              <Skeleton className="h-3 w-12 rounded-md ml-auto" />
            </div>
          </div>
        </div>
      </SkeletonCard>

      {/* 2. Monthly Summary Skeleton Card */}
      <SkeletonCard className="space-y-4">
        {/* Header: Month Label + Chart Icon */}
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-3 w-24 rounded-md" />
          </div>
          <Skeleton className="w-8 h-8 rounded-xl" />
        </div>

        {/* Milk Stats Rows */}
        <div className="space-y-2.5 text-xs">
          {/* Row 1 (e.g. Buffalo) */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 border border-slate-100">
            <div className="flex items-center gap-2.5">
              <Skeleton className="w-7 h-7 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-2 w-14 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-3.5 w-12 rounded-md" />
          </div>

          {/* Row 2 (e.g. Cow) */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 border border-slate-100">
            <div className="flex items-center gap-2.5">
              <Skeleton className="w-7 h-7 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-16 rounded-md" />
                <Skeleton className="h-2 w-14 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-3.5 w-12 rounded-md" />
          </div>

          {/* Total Volume */}
          <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-4 w-14 rounded-md" />
          </div>

          {/* Total Amount */}
          <div className="flex justify-between items-center">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
        </div>
      </SkeletonCard>
    </div>
  );
}
