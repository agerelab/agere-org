"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const indicatorVariants = cva("h-full w-full flex-1 rounded-full transition-transform duration-slow ease-standard", {
  variants: {
    tone: { default: "bg-primary", success: "bg-success-solid", destructive: "bg-error-solid", info: "bg-info-solid", attention: "bg-attention-solid" },
  },
  defaultVariants: { tone: "default" },
});

export interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>, VariantProps<typeof indicatorVariants> {
  /** Unknown duration: animated bar, `aria-valuenow` omitted. */
  indeterminate?: boolean;
  size?: "sm" | "md";
}

/** Always pair with a visible label or `aria-label` ("Uploading report.pdf"). */
export const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  ({ className, value = 0, tone, indeterminate, size = "sm", ...props }, ref) => (
    <ProgressPrimitive.Root
      ref={ref}
      value={indeterminate ? null : value}
      className={cn("relative w-full overflow-hidden rounded-full bg-primary/20", size === "sm" ? "h-1.5" : "h-2", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(indicatorVariants({ tone }), indeterminate && "w-2/5 animate-indeterminate")}
        style={indeterminate ? undefined : { transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
);
Progress.displayName = ProgressPrimitive.Root.displayName;
