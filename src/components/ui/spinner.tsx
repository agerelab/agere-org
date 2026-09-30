"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const spinnerVariants = cva("inline-block shrink-0 animate-spin", {
  variants: { size: { xs: "size-3.5", sm: "size-4", md: "size-5", lg: "size-6", xl: "size-8" } },
  defaultVariants: { size: "sm" },
});

export interface SpinnerProps extends Omit<React.SVGAttributes<SVGSVGElement>, "children">, VariantProps<typeof spinnerVariants> {
  /**
   * Announced text. Default "Loading…". Pass `null` when the spinner sits inside
   * something that already announces busy state (e.g. a Button with aria-busy).
   */
  label?: string | null;
}

/** Two-tone ring spinner. Track uses currentColor at 20% so it adapts to any surface. */
export const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(({ className, size, label = "Loading…", ...props }, ref) => {
  const svg = (
    <svg ref={ref} viewBox="0 0 24 24" fill="none" aria-hidden className={cn(spinnerVariants({ size }), className)} {...props}>
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
  if (label === null) return svg;
  return (
    <span role="status" className="inline-flex items-center">
      {svg}
      <span className="sr-only">{label}</span>
    </span>
  );
});
Spinner.displayName = "Spinner";

/** Full-area loading state: centered spinner + optional caption. */
export function Loader({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center justify-center gap-3 p-8 text-subtle", className)}>
      <Spinner size="lg" label={null} />
      <span className="type-caption">{label}</span>
    </div>
  );
}
