"use client";

import React from "react";
import { Skeleton } from "./Skeleton";
import { SkeletonCard } from "./SkeletonCard";

/**
 * Loading skeleton matching the Records page (Daily records & summary).
 */
export function RecordsSkeleton() {
  return (
    <div className="space-y-3 pt-2">
      <Skeleton className="h-3 w-28 rounded-md" />

      {/* Selected Date Summary Header Card Skeleton */}
      <SkeletonCard className="flex justify-between items-center">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
        <div className="text-right space-y-1">
          <Skeleton className="h-5 w-16 rounded-md ml-auto" />
          <Skeleton className="h-3 w-12 rounded-md ml-auto" />
        </div>
      </SkeletonCard>

      {/* Record Cards Skeletons */}
      <div className="space-y-2.5 pt-1">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonCard key={i} className="space-y-3 border-l-4 border-l-slate-300">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-28 rounded-md" />
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="space-y-1">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-2.5 w-14 rounded-md" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="w-8 h-8 rounded-xl" />
                <Skeleton className="w-8 h-8 rounded-xl" />
              </div>
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}
