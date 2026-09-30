"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

import { cn } from "@/lib/utils";

const alertVariants = cva("relative flex w-full gap-3 rounded-lg border px-4 py-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0", {
  variants: {
    variant: {
      default: "border-border bg-card text-card-foreground [&>svg]:text-current",
      neutral: "border-border bg-card text-card-foreground [&>svg]:text-current",
      destructive: "border-border bg-card text-destructive [&>svg]:text-current [&_[data-slot=alert-description]]:text-destructive/90",
      info: "border-info-border bg-info-bg text-info-fg",
      success: "border-success-border bg-success-bg text-success-fg",
      attention: "border-attention-border bg-attention-bg text-attention-fg",
      error: "border-error-border bg-error-bg text-error-fg",
    },
  },
  defaultVariants: { variant: "neutral" },
});

const ICONS = { default: Info, neutral: Info, destructive: AlertCircle, info: Info, success: CheckCircle2, attention: AlertTriangle, error: AlertCircle } as const;

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">, VariantProps<typeof alertVariants> {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  /**
   * `polite` (default for error/attention) announces when inserted dynamically.
   * Use `off` for alerts present on page load.
   */
  live?: "polite" | "assertive" | "off";
  icon?: React.ReactNode | false;
}

/** Inline, contextual message. Never auto-dismisses. */
export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "neutral", title, actions, onDismiss, dismissLabel = "Dismiss", live, icon, children, ...props }, ref) => {
    const Icon = ICONS[variant ?? "neutral"];
    const politeness = live ?? (variant === "error" || variant === "destructive" || variant === "attention" ? "polite" : "off");
    return (
      <div
        ref={ref}
        role={variant === "error" || variant === "destructive" ? "alert" : "status"}
        aria-live={politeness === "off" ? undefined : politeness}
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        {icon === false ? null : icon ?? <Icon aria-hidden />}
        <div className="grid min-w-0 flex-1 gap-0.5">
          {title && <p data-slot="alert-title" className="font-medium leading-5 tracking-tight">{title}</p>}
          {children && <div data-slot="alert-description" className={cn("leading-relaxed [&_a]:font-medium [&_a]:underline", (variant === "neutral" || variant === "default") && "text-muted-foreground")}>{children}</div>}
          {actions && <div className="mt-2 flex flex-wrap gap-2">{actions}</div>}
        </div>
        {onDismiss && (
          <button
            type="button"
            aria-label={dismissLabel}
            onClick={onDismiss}
            className="-m-1 inline-flex size-6 shrink-0 items-center justify-center rounded-md opacity-70 transition-opacity hover:opacity-100 focus-ring [&_svg]:size-4"
          >
            <X aria-hidden />
          </button>
        )}
      </div>
    );
  }
);
Alert.displayName = "Alert";

/** Full-width, page-level banner (trial ending, maintenance, impersonation). */
export function Banner({
  variant = "neutral", children, action, onDismiss, dismissLabel = "Dismiss", className,
}: {
  variant?: "neutral" | "brand" | "info" | "attention" | "error";
  children: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
}) {
  const tone = {
    neutral: "bg-primary text-primary-foreground",
    brand: "bg-brand text-brand-fg",
    info: "bg-info-bg text-info-fg border-b border-info-border",
    attention: "bg-attention-bg text-attention-fg border-b border-attention-border",
    error: "bg-error-bg text-error-fg border-b border-error-border",
  }[variant];
  return (
    <div role="region" aria-label="Announcement" className={cn("flex min-h-10 items-center justify-center gap-3 px-4 py-2 text-sm", tone, className)}>
      <p className="text-center font-medium">{children}</p>
      {action}
      {onDismiss && (
        <button type="button" aria-label={dismissLabel} onClick={onDismiss} className="inline-flex size-6 items-center justify-center rounded-md opacity-80 hover:opacity-100 focus-ring [&_svg]:size-4">
          <X aria-hidden />
        </button>
      )}
    </div>
  );
}
