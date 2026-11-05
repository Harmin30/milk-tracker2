"use client";

import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: "rounded" | "circular" | "pill" | "card";
}

/**
 * Universal Skeleton primitive.
 * Features a subtle shimmer / pulse animation with motion-safe support for prefers-reduced-motion.
 */
export function Skeleton({
  className = "",
  variant = "rounded",
  ...props
}: SkeletonProps) {
  const variantStyles = {
    rounded: "rounded-xl",
    circular: "rounded-full",
    pill: "rounded-full",
    card: "rounded-2xl",
  }[variant];

  return (
    <div
      aria-hidden="true"
      className={`bg-slate-200/80 motion-safe:animate-pulse motion-reduce:animate-none ${variantStyles} ${className}`}
      {...props}
    />
  );
}

