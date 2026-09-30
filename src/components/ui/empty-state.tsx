import * as React from "react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Lucide icon (shown in a soft circle) or a full illustration via `illustration`. */
  icon?: React.ReactNode;
  illustration?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  /** Primary action first, then secondary. Max two. */
  actions?: React.ReactNode;
  variant?: "dashed" | "plain";
  size?: "sm" | "md" | "lg";
  headingLevel?: "h2" | "h3" | "h4";
}

/**
 * cal.com EmptyScreen. Anatomy: visual → title (what's missing) → description (why it matters /
 * what to do) → 1 primary action. Three flavors via copy: first-use, no-results, cleared.
 */
export function EmptyState({
  icon, illustration, title, description, actions, variant = "dashed", size = "md", headingLevel: H = "h3", className, ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        variant === "dashed" && "rounded-xl border border-dashed border-default",
        size === "sm" && "gap-2 p-6",
        size === "md" && "gap-3 p-10",
        size === "lg" && "gap-4 p-16",
        className
      )}
      {...props}
    >
      {illustration ? (
        <div aria-hidden className="mb-1 text-subtle">{illustration}</div>
      ) : icon ? (
        <div aria-hidden className={cn("mb-1 grid place-items-center rounded-lg bg-muted text-foreground", size === "sm" ? "size-10 [&_svg]:size-5" : "size-14 [&_svg]:size-6")}>
          {icon}
        </div>
      ) : null}
      <H className={cn(size === "sm" ? "type-heading-sm" : "type-heading-xl", "text-emphasis")}>{title}</H>
      {description && <p className="max-w-md text-sm text-subtle">{description}</p>}
      {actions && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{actions}</div>}
    </div>
  );
}
