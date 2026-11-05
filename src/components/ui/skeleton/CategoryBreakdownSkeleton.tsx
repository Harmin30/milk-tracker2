"use client";

import React from "react";
import { Skeleton } from "./Skeleton";

export interface CategoryBreakdownSkeletonProps {
  rows?: number;
  className?: string;
}

/**
 * Reusable skeleton for milk category rows (Cow, Buffalo, Packaged).
 */
export function CategoryBreakdownSkeleton({
  rows = 2,
  className = "",
}: CategoryBreakdownSkeletonProps) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100"
        >
          {/* Left: Icon + Name & Rate */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
            <div className="space-y-1.5 flex-1 max-w-[130px]">
              <Skeleton className="h-3.5 w-24 rounded-md" />
              <Skeleton className="h-2.5 w-16 rounded-md" />
            </div>
          </div>

          {/* Right: Quantity + Amount */}
          <div className="space-y-1.5 text-right flex-shrink-0 ml-2">
            <Skeleton className="h-3.5 w-14 rounded-md ml-auto" />
            <Skeleton className="h-3 w-12 rounded-md ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}
