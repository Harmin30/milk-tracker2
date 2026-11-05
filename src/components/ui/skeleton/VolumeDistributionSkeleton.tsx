"use client";

import React from "react";
import { Skeleton } from "./Skeleton";
import { SkeletonCard } from "./SkeletonCard";

/**
 * Reusable skeleton for the Volume Distribution section.
 */
export function VolumeDistributionSkeleton({ className = "" }: { className?: string }) {
  return (
    <SkeletonCard className={`space-y-4 ${className}`}>
      {/* Heading */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
        <Skeleton className="h-3.5 w-36 rounded-md" />
        <Skeleton className="h-3 w-16 rounded-md" />
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-full rounded-full" />
      </div>

      {/* Legend Items */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/70 border border-slate-100"
          >
            <Skeleton className="w-2.5 h-2.5 rounded-full flex-shrink-0" />
            <div className="space-y-1 flex-1 min-w-0">
              <Skeleton className="h-2.5 w-14 rounded-md" />
              <Skeleton className="h-2 w-10 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonCard>
  );
}
