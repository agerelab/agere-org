"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

export interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  /** Accessible names per thumb, e.g. ["Minimum price", "Maximum price"]. */
  thumbLabels?: string[];
  /** Formats aria-valuetext ("Rp 50.000"). */
  getValueText?: (value: number) => string;
}

/** Arrow keys ±step, PageUp/PageDown ±10 steps, Home/End min/max. */
export const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
  ({ className, thumbLabels, getValueText, value, defaultValue, ...props }, ref) => {
    const count = (value ?? defaultValue ?? [0]).length;
    const current = value ?? defaultValue ?? [0];
    return (
      <SliderPrimitive.Root
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        className={cn("relative flex h-5 w-full touch-none select-none items-center data-[disabled]:opacity-50", className)}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        {Array.from({ length: count }).map((_, i) => (
          <SliderPrimitive.Thumb
            key={i}
            aria-label={thumbLabels?.[i]}
            aria-valuetext={getValueText ? getValueText(current[i] ?? 0) : undefined}
            className="block size-4 shrink-0 rounded-full border border-primary bg-background shadow-sm outline-none transition-[color,box-shadow] duration-fast hover:shadow-[0_0_0_4px_hsl(var(--ring)/0.5)] focus-ring disabled:pointer-events-none"
          />
        ))}
      </SliderPrimitive.Root>
    );
  }
);
Slider.displayName = SliderPrimitive.Root.displayName;
