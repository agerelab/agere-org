"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";

import { cn } from "@/lib/utils";

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  /** Icon-only segment: label becomes the accessible name + tooltip. */
  iconOnly?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentedControlOption<T>[];
  "aria-label": string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Single-select toggle group (cal.com ToggleGroup). Use for modes that change the SAME content
 * (Board / Calendar / Table). Use <Tabs> when each option has its own panel.
 */
export function SegmentedControl<T extends string>({ value, onValueChange, options, size = "md", className, ...aria }: SegmentedControlProps<T>) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v as T)}
      aria-label={aria["aria-label"]}
      className={cn("inline-flex w-fit items-center rounded-lg bg-muted p-[3px] text-muted-foreground", className)}
    >
      {options.map((o) => (
        <ToggleGroupPrimitive.Item
          key={o.value}
          value={o.value}
          aria-label={o.iconOnly ? o.label : undefined}
          title={o.iconOnly ? o.label : undefined}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-md border border-transparent font-medium text-foreground outline-none transition-[background-color,color,box-shadow] duration-base dark:text-muted-foreground",
            "focus-ring focus-visible:border-ring [&_svg]:size-4",
            "data-[state=on]:bg-background data-[state=on]:shadow-sm dark:data-[state=on]:bg-input/20 dark:data-[state=on]:text-foreground",
            size === "sm" ? "h-7 px-2 text-xs" : "h-[calc(2.25rem-7px)] px-2.5 text-sm",
            o.iconOnly && (size === "sm" ? "w-6 px-0" : "w-7 px-0")
          )}
        >
          {o.icon && <span aria-hidden className="inline-flex">{o.icon}</span>}
          {!o.iconOnly && o.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}
