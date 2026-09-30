"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";

import { cn } from "@/lib/utils";

/** Arrow keys move selection within the group; Tab enters/leaves the group (WAI-ARIA radio pattern). */
export const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => <RadioGroupPrimitive.Root ref={ref} className={cn("grid gap-2.5", className)} {...props} />);
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

export const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    data-slot="radio"
    className={cn(
      "peer relative grid aspect-square size-4 shrink-0 place-items-center rounded-full border border-input bg-transparent text-primary shadow-xs outline-none transition-[color,box-shadow] duration-fast dark:bg-input/10",
      "before:absolute before:-inset-1 before:content-['']",
      "focus-ring focus-visible:border-ring",
      "data-[state=checked]:border-primary",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="size-2 rounded-full bg-primary" />
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

/** Card-style radio (plan pickers, cal.com event types). The whole card is the hit area. */
export const RadioCard = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & { title: string; description?: string }
>(({ className, title, description, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      "group/radio flex w-full items-start gap-3 rounded-xl border border-default bg-default p-4 text-left shadow-elevation-1 transition-[border-color,box-shadow]",
      "hover:bg-accent/50 focus-ring",
      "data-[state=checked]:border-primary data-[state=checked]:bg-accent/40 data-[state=checked]:shadow-[0_0_0_1px_hsl(var(--primary))]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    <span
      aria-hidden
      className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-input shadow-xs group-data-[state=checked]/radio:border-primary"
    >
      <span className="size-2 rounded-full bg-primary opacity-0 group-data-[state=checked]/radio:opacity-100" />
    </span>
    <span className="grid gap-0.5">
      <span className="text-sm font-medium leading-none text-foreground">{title}</span>
      {description && <span className="text-sm text-muted-foreground">{description}</span>}
    </span>
  </RadioGroupPrimitive.Item>
));
RadioCard.displayName = "RadioCard";
