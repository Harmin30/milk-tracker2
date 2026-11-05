"use client";

import React from "react";
import { Skeleton } from "./Skeleton";
import { SkeletonCard } from "./SkeletonCard";

/**
 * Loading skeleton matching the Profile / Settings page.
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-4 pt-1">
      {/* Account Info Skeleton */}
      <SkeletonCard className="space-y-3">
        <Skeleton className="h-4 w-32 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </SkeletonCard>

      {/* Pricing Defaults Skeleton */}
      <SkeletonCard className="space-y-3.5">
        <div className="flex items-center gap-2">
          <Skeleton className="w-7 h-7 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-2.5 w-36 rounded-md" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-100">
          <Skeleton className="h-3.5 w-40 rounded-md" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </SkeletonCard>
    </div>
  );
}
