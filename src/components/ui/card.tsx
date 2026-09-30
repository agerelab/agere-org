"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Card — shadcn/ui v4 anatomy: rounded-xl (14px), border, shadow-sm, py-6 with a 24px gap between
 * header / content / footer. Header is a grid: title + description on the left, <CardAction> top-right.
 * `interactive` lifts on hover; wrap the primary link with <CardLink> so the whole card is clickable
 * while keeping ONE focusable element (no nested interactive traps).
 */
export const cardVariants = cva("relative flex flex-col gap-6 rounded-xl border py-6 text-card-foreground", {
  variants: {
    variant: {
      default: "border-border bg-card shadow-sm",
      interactive:
        "border-border bg-card shadow-sm transition-[border-color,box-shadow] duration-base ease-standard hover:border-border-strong hover:shadow-md has-[a[data-card-link]:focus-visible]:shadow-[0_0_0_3px_hsl(var(--ring)/var(--ring-alpha,0.5))]",
      muted: "border-border bg-muted/50 shadow-none",
      outline: "border-dashed border-border bg-card shadow-none",
      ghost: "border-transparent bg-transparent py-0 shadow-none",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, variant, ...props }, ref) => (
  <div ref={ref} data-slot="card" className={cn(cardVariants({ variant }), className)} {...props} />
));
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-header"
    className={cn(
      "grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-[>[data-slot=card-action]]:grid-cols-[1fr_auto] [&.border-b]:pb-6",
      className
    )}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Heading level; keep the document outline correct. Use `as="div"` inside stat tiles that aren't sections. */
  as?: "h1" | "h2" | "h3" | "h4" | "div";
}

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(({ className, as: Tag = "h3", ...props }, ref) => (
  <Tag ref={ref as React.Ref<HTMLHeadingElement>} data-slot="card-title" className={cn("font-semibold leading-none tracking-tight text-card-foreground", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p ref={ref} data-slot="card-description" className={cn("text-sm text-muted-foreground", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

/** Top-right slot of the header (menu, badge, "View all" button). */
export const CardAction = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} data-slot="card-action" className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)} {...props} />
));
CardAction.displayName = "CardAction";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} data-slot="card-content" className={cn("px-6", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} data-slot="card-footer" className={cn("mt-auto flex items-center gap-2 px-6 [&.border-t]:pt-6", className)} {...props} />
));
CardFooter.displayName = "CardFooter";

/** Stretched link: makes the whole card clickable via ::after, keeps a single tab stop. */
export const CardLink = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement>>(({ className, ...props }, ref) => (
  <a ref={ref} data-card-link className={cn("outline-none after:absolute after:inset-0 after:rounded-xl after:content-['']", className)} {...props} />
));
CardLink.displayName = "CardLink";
