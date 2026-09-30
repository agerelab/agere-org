"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Separator } from "./separator";

/**
 * Item — shadcn/ui flexible row (media · title · description · actions) for settings rows, people, files, notifications.
 * Agere fix: shadcn's ItemGroup is role="list" but its Items carry no role (an axe "list" violation). Here every Item
 * inside an ItemGroup is a listitem; with `asChild` (e.g. a link) the listitem is a wrapper so the link keeps its role.
 */
const InGroup = React.createContext(false);

export function ItemGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <InGroup.Provider value>
      <div role="list" data-slot="item-group" className={cn("group/item-group flex flex-col", className)} {...props} />
    </InGroup.Provider>
  );
}

export function ItemSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return <Separator data-slot="item-separator" orientation="horizontal" className={cn("my-0", className)} {...props} />;
}

export const itemVariants = cva(
  "group/item flex flex-wrap items-center rounded-md border border-transparent text-sm outline-none transition-colors duration-100 focus-visible:border-ring focus-visible:shadow-[0_0_0_3px_hsl(var(--ring)/var(--ring-alpha,0.5))] [a&]:transition-colors [a&]:hover:bg-accent/50",
  {
    variants: {
      variant: { default: "bg-transparent", outline: "border-border", muted: "bg-muted/50" },
      size: { default: "gap-4 p-4", sm: "gap-2.5 px-4 py-3" },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export function Item({ className, variant = "default", size = "default", asChild = false, ...props }: React.ComponentProps<"div"> & VariantProps<typeof itemVariants> & { asChild?: boolean }) {
  const inGroup = React.useContext(InGroup);
  const Comp = asChild ? Slot : "div";
  const el = <Comp data-slot="item" data-variant={variant} data-size={size} role={inGroup && !asChild ? "listitem" : undefined} className={cn(itemVariants({ variant, size }), className)} {...props} />;
  return inGroup && asChild ? <div role="listitem">{el}</div> : el;
}

const mediaVariants = cva("flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:translate-y-0.5 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none", {
  variants: {
    variant: {
      default: "bg-transparent",
      icon: "size-8 rounded-sm border border-border bg-muted [&_svg:not([class*='size-'])]:size-4",
      image: "size-10 overflow-hidden rounded-sm [&_img]:size-full [&_img]:object-cover",
    },
  },
  defaultVariants: { variant: "default" },
});

export function ItemMedia({ className, variant = "default", ...props }: React.ComponentProps<"div"> & VariantProps<typeof mediaVariants>) {
  return <div data-slot="item-media" data-variant={variant} className={cn(mediaVariants({ variant }), className)} {...props} />;
}
export function ItemContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-content" className={cn("flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none", className)} {...props} />;
}
export function ItemTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-title" className={cn("flex w-fit items-center gap-2 text-sm font-medium leading-snug", className)} {...props} />;
}
export function ItemDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="item-description" className={cn("line-clamp-2 text-balance text-sm font-normal leading-normal text-muted-foreground [&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4", className)} {...props} />;
}
export function ItemActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-actions" className={cn("flex items-center gap-2", className)} {...props} />;
}
export function ItemHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-header" className={cn("flex basis-full items-center justify-between gap-2", className)} {...props} />;
}
export function ItemFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-footer" className={cn("flex basis-full items-center justify-between gap-2", className)} {...props} />;
}
