"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badge — shadcn/ui v4 anatomy: rounded-md, px-2 py-0.5, text-xs font-medium, border (transparent on fills).
 * shadcn variants: default · secondary · destructive · outline.
 * Agere status variants (tinted, AA-tested): gray · info · success · attention · error · special · brand.
 * Status meaning is always carried by the TEXT (never color alone, WCAG 1.4.1).
 */
export const badgeVariants = cva(
  "inline-flex w-fit max-w-full shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border font-medium transition-[color,box-shadow] [&>svg]:pointer-events-none [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "border-border text-foreground",
        gray: "border-transparent bg-secondary text-secondary-foreground",
        brand: "border-transparent bg-primary text-primary-foreground",
        info: "border-transparent bg-info-bg text-info-fg",
        success: "border-transparent bg-success-bg text-success-fg",
        attention: "border-transparent bg-attention-bg text-attention-fg",
        error: "border-transparent bg-error-bg text-error-fg",
        special: "border-transparent bg-special-bg text-special-fg",
        /* v3 aliases */
        "status-red": "border-transparent bg-error-bg text-error-fg",
        "status-amber": "border-transparent bg-attention-bg text-attention-fg",
        "status-blue": "border-transparent bg-info-bg text-info-fg",
        "status-green": "border-transparent bg-success-bg text-success-fg",
        "status-purple": "border-transparent bg-special-bg text-special-fg",
      },
      size: {
        sm: "h-[18px] px-1.5 text-2xs",
        md: "px-2 py-0.5 text-xs",
        lg: "h-6 px-2.5 text-sm",
      },
      rounded: { true: "rounded-full", false: "" },
    },
    defaultVariants: { variant: "default", size: "md", rounded: false },
  }
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  /** Leading dot in the current text color. */
  dot?: boolean;
  startIcon?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, rounded, dot, startIcon, children, ...props }, ref) => (
    <span ref={ref} data-slot="badge" className={cn(badgeVariants({ variant, size, rounded }), className)} {...props}>
      {dot && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />}
      {startIcon && <span aria-hidden className="inline-flex">{startIcon}</span>}
      {typeof children === "string" ? <span className="truncate">{children}</span> : children}
    </span>
  )
);
Badge.displayName = "Badge";
