"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const trackVariants = cva(
  [
    "peer relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-xs outline-none transition-all duration-base ease-standard",
    "before:absolute before:-inset-1.5 before:content-['']",
    "focus-ring focus-visible:border-ring",
    "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ],
  { variants: { size: { sm: "h-4 w-7", md: "h-[1.15rem] w-8" } }, defaultVariants: { size: "md" } }
);
const thumbVariants = cva(
  "pointer-events-none block rounded-full bg-background ring-0 transition-transform duration-base ease-emphasized data-[state=unchecked]:translate-x-0 dark:data-[state=checked]:bg-primary-foreground dark:data-[state=unchecked]:bg-foreground",
  { variants: { size: { sm: "size-3 data-[state=checked]:translate-x-[calc(100%-1px)]", md: "size-4 data-[state=checked]:translate-x-[calc(100%-2px)]" } }, defaultVariants: { size: "md" } }
);

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>, VariantProps<typeof trackVariants> {}

/**
 * Immediate-effect toggle (role="switch"). Use Checkbox instead when the change is
 * applied later by a Save button. shadcn anatomy (32×18); the off-track uses bg-input (Agere border.control) so it stays ≥3:1 (WCAG 1.4.11).
 */
export const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, SwitchProps>(({ className, size, ...props }, ref) => (
  <SwitchPrimitive.Root ref={ref} data-slot="switch" className={cn(trackVariants({ size }), className)} {...props}>
    <SwitchPrimitive.Thumb className={thumbVariants({ size })} />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;
