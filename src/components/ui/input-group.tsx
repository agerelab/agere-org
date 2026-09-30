"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";

/**
 * InputGroup — shadcn/ui field with addons: icons, text, buttons, keyboard hints, counters — inline (start/end)
 * or as a block row above/below (textarea toolbars). One frame, one focus ring, one border (border-input ≥3:1).
 * The group is role="group"; give it an aria-label only when the addons carry meaning of their own.
 */
export function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        "group/input-group relative flex h-9 w-full min-w-0 items-center rounded-md border border-input shadow-xs outline-none transition-[color,box-shadow] dark:bg-input/10",
        "has-[>textarea]:h-auto",
        "has-[>[data-align=inline-start]]:[&>input]:pl-2 has-[>[data-align=inline-end]]:[&>input]:pr-2",
        "has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3",
        "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3",
        "has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:shadow-[0_0_0_3px_hsl(var(--ring)/var(--ring-alpha,0.5))]",
        "has-[[data-slot][aria-invalid=true]]:border-destructive",
        className
      )}
      {...props}
    />
  );
}

const addonVariants = cva(
  "flex h-auto cursor-text select-none items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        "inline-start": "order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]",
        "inline-end": "order-last pr-3 has-[>button]:mr-[-0.45rem] has-[>kbd]:mr-[-0.35rem]",
        "block-start": "order-first w-full justify-start px-3 pt-3 [.border-b]:pb-3 group-has-[>input]/input-group:pt-2.5",
        "block-end": "order-last w-full justify-start px-3 pb-3 [.border-t]:pt-3 group-has-[>input]/input-group:pb-2.5",
      },
    },
    defaultVariants: { align: "inline-start" },
  }
);

export function InputGroupAddon({ className, align = "inline-start", onClick, ...props }: React.ComponentProps<"div"> & VariantProps<typeof addonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(addonVariants({ align }), className)}
      {...props}
      onClick={(e) => {
        onClick?.(e); // the caller's handler runs first and can preventDefault() to opt out
        if (e.defaultPrevented || (e.target as HTMLElement).closest("button, a, [role=button]")) return;
        e.currentTarget.parentElement?.querySelector<HTMLElement>("[data-slot=input-group-control]")?.focus(); // mouse convenience only
      }}
    />
  );
}

const groupButtonVariants = cva("flex items-center gap-2 text-sm shadow-none", {
  variants: {
    size: {
      xs: "h-6 gap-1 rounded-[calc(var(--radius)-5px)] px-2 has-[>svg]:px-2 [&>svg:not([class*='size-'])]:size-3.5",
      sm: "h-8 gap-1.5 rounded-md px-2.5 has-[>svg]:px-2.5",
      "icon-xs": "size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0",
      "icon-sm": "size-8 p-0 has-[>svg]:p-0",
    },
  },
  defaultVariants: { size: "xs" },
});

export function InputGroupButton({ className, type = "button", variant = "ghost", size = "xs", ...props }: Omit<React.ComponentProps<typeof Button>, "size"> & VariantProps<typeof groupButtonVariants>) {
  return <Button type={type} data-size={size} variant={variant} className={cn(groupButtonVariants({ size }), className)} {...props} />;
}

export function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="input-group-text" className={cn("flex items-center gap-2 text-sm text-muted-foreground [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none", className)} {...props} />;
}

export const InputGroupInput = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(({ className, ...props }, ref) => (
  <Input
    ref={ref}
    data-slot="input-group-control"
    className={cn("flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:border-0 focus-visible:shadow-none dark:bg-transparent", className)}
    {...props}
  />
));
InputGroupInput.displayName = "InputGroupInput";

export const InputGroupTextarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<typeof Textarea>>(({ className, ...props }, ref) => (
  <Textarea
    ref={ref}
    data-slot="input-group-control"
    className={cn("flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus-visible:border-0 focus-visible:shadow-none dark:bg-transparent", className)}
    {...props}
  />
));
InputGroupTextarea.displayName = "InputGroupTextarea";
