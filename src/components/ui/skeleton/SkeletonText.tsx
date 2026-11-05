"use client";

import React from "react";
import { Skeleton } from "./Skeleton";

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
  lineHeight?: "xs" | "sm" | "md" | "lg" | "xl";
  widths?: string[];
}

const heightMap = {
  xs: "h-2.5",
  sm: "h-3.5",
  md: "h-4",
  lg: "h-5",
  xl: "h-7",
};

/**
 * Skeleton placeholder for textual lines with natural width distribution.
 */
export function SkeletonText({
  lines = 1,
  className = "",
  lineHeight = "sm",
  widths,
}: SkeletonTextProps) {
  const defaultWidths = ["w-full", "w-4/5", "w-3/5", "w-2/3"];

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => {
        const width =
          widths && widths[i]
            ? widths[i]
            : defaultWidths[i % defaultWidths.length];

        return (
          <Skeleton
            key={i}
            className={`${heightMap[lineHeight]} ${width} rounded-md`}
          />
        );
      })}
    </div>
  );
}
