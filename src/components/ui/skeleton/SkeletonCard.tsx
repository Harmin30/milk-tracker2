"use client";

import React from "react";

export interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

/**
 * Reusable card shell for skeletons matching Milk Tracker's standard card styling.
 */
export function SkeletonCard({
  children,
  className = "",
  ...props
}: SkeletonCardProps) {
  return (
    <div
      aria-hidden="true"
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

