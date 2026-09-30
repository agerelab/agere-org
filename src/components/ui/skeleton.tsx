import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Skeleton — placeholder shaped like the content it replaces.
 * Decorative (aria-hidden). Put `aria-busy="true"` + a visually-hidden status on the region.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-md bg-accent animate-pulse motion-safe:animate-none",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-white/40 after:to-transparent dark:after:via-white/5",
        className
      )}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden className={cn("grid gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-3/5" : "w-full")} />
      ))}
    </div>
  );
}

/** Region wrapper that announces loading once and hides the placeholders from AT. */
export function SkeletonRegion({ label = "Loading…", children, className }: { label?: string; children: React.ReactNode; className?: string }) {
  return (
    <div aria-busy="true" className={className}>
      <span role="status" className="sr-only">{label}</span>
      {children}
    </div>
  );
}
