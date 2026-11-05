"use client";

import React from "react";
import { Skeleton } from "./Skeleton";
import { SkeletonCard } from "./SkeletonCard";

/**
 * Loading skeleton matching the Bills History page.
 */
export function BillsSkeleton() {
  return (
    <div className="space-y-3.5 pt-1">
      {/* Year Filter Chips Skeleton */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <Skeleton className="h-8 w-20 rounded-xl flex-shrink-0" />
        <Skeleton className="h-8 w-20 rounded-xl flex-shrink-0" />
        <Skeleton className="h-8 w-24 rounded-xl flex-shrink-0" />
      </div>

      {/* Overview Bar Skeleton */}
      <div className="bg-slate-100/70 border border-slate-200/80 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
        <Skeleton className="h-3.5 w-32 rounded-md" />
        <Skeleton className="h-3.5 w-20 rounded-md" />
      </div>

      {/* Bill Cards Skeletons */}
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonCard key={i} className="space-y-3">
            <div className="flex justify-between items-start gap-3">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-4 w-20 rounded-md" />
                </div>
                <Skeleton className="h-3 w-32 rounded-md" />
              </div>
              <Skeleton className="h-10 w-20 rounded-xl flex-shrink-0" />
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Skeleton className="h-9 flex-1 rounded-xl" />
              <Skeleton className="h-9 w-20 rounded-xl" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}
