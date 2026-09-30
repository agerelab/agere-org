"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

export interface LabelProps extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  /** Adds a visual asterisk; the control itself must carry `required` / `aria-required`. */
  required?: boolean;
  /** Visual "(optional)" suffix — preferred over asterisks when most fields are required. */
  optional?: boolean | string;
}

export const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, LabelProps>(
  ({ className, required, optional, children, ...props }, ref) => (
    <LabelPrimitive.Root
      ref={ref}
      className={cn("flex select-none items-center gap-1 text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50", className)}
      {...props}
    >
      {children}
      {required && <span aria-hidden className="text-destructive">*</span>}
      {optional && <span className="font-normal text-muted-foreground">{typeof optional === "string" ? optional : "(optional)"}</span>}
    </LabelPrimitive.Root>
  )
);
Label.displayName = "Label";
