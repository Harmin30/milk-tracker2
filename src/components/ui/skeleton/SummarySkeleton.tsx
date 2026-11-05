"use client";

import React from "react";
import { Skeleton } from "./Skeleton";
import { SkeletonCard } from "./SkeletonCard";
import { CategoryBreakdownSkeleton } from "./CategoryBreakdownSkeleton";
import { VolumeDistributionSkeleton } from "./VolumeDistributionSkeleton";

/**
 * Loading skeleton matching the Monthly Summary page layout:
 * - 2 Primary Statistics cards (Total Milk, Total Earnings).
 * - Category Breakdown section with item rows.
 * - Volume Distribution section.
 */
export function SummarySkeleton() {
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. PRIMARY STATISTICS (2 CARDS) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Total Milk */}
        <SkeletonCard className="flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-2.5 w-16 sm:w-20 rounded-md" />
            <Skeleton className="w-8 h-8 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-6 sm:h-7 w-20 sm:w-24 rounded-md" />
            <Skeleton className="h-2.5 w-14 rounded-md" />
          </div>
        </SkeletonCard>

        {/* Total Earnings */}
        <SkeletonCard className="flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-2.5 w-16 sm:w-20 rounded-md" />
            <Skeleton className="w-8 h-8 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-6 sm:h-7 w-20 sm:w-24 rounded-md" />
            <Skeleton className="h-2.5 w-14 rounded-md" />
          </div>
        </SkeletonCard>
      </div>

      {/* 2. MILK CATEGORY BREAKDOWN */}
      <SkeletonCard className="space-y-3.5">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <Skeleton className="h-3.5 w-32 rounded-md" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
        <CategoryBreakdownSkeleton rows={3} />
      </SkeletonCard>

      {/* 3. VOLUME DISTRIBUTION */}
      <VolumeDistributionSkeleton />
    </div>
  );
}
