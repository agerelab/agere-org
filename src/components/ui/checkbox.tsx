"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

export type CheckboxProps = React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>;

/** shadcn: 16px box, rounded-[4px], shadow-xs. Unchecked border = border-input (Agere border.control, ≥3:1). Checked = primary fill. */
export const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <CheckboxPrimitive.Root
      ref={ref}
      data-slot="checkbox"
      className={cn(
        "peer relative grid size-4 shrink-0 place-items-center rounded-xs border border-input bg-transparent shadow-xs outline-none transition-shadow dark:bg-input/10",
        "before:absolute before:-inset-1 before:content-['']",
        "focus-ring focus-visible:border-ring",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
        // dark:bg-input/10 (above) out-ranks data-[state]:bg-primary, so the checked fill must be restated under dark:
        "dark:data-[state=checked]:bg-primary dark:data-[state=indeterminate]:bg-primary",
        "aria-[invalid=true]:border-destructive",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        {props.checked === "indeterminate" ? <Minus className="size-3.5" strokeWidth={2.5} aria-hidden /> : <Check className="size-3.5" strokeWidth={2.5} aria-hidden />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
);
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
