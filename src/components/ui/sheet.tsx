"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const sheetVariants = cva(
  "fixed z-drawer flex flex-col bg-background text-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:duration-slow data-[state=closed]:duration-moderate",
  {
    variants: {
      side: {
        right: "inset-y-0 right-0 h-full w-full border-l border-border data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
        left: "inset-y-0 left-0 h-full w-full border-r border-border data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
        bottom: "inset-x-0 bottom-0 max-h-[90dvh] w-full rounded-t-xl border-t border-border data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
      },
      size: { sm: "", md: "", lg: "", xl: "" },
    },
    compoundVariants: [
      { side: ["right", "left"], size: "sm", className: "sm:max-w-sm" },
      { side: ["right", "left"], size: "md", className: "sm:max-w-[560px]" },
      { side: ["right", "left"], size: "lg", className: "sm:max-w-[760px]" },
      { side: ["right", "left"], size: "xl", className: "sm:max-w-[960px]" },
    ],
    defaultVariants: { side: "right", size: "md" },
  }
);

export interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, VariantProps<typeof sheetVariants> {
  closeLabel?: string;
  /** Non-modal sheets keep the page interactive (ClickUp task side-panel). */
  overlay?: boolean;
}

/** Side panel (task details, app details, filters on mobile). Modal by default: focus trap, Esc, focus return. */
export const SheetContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, SheetContentProps>(
  ({ side, size, className, children, closeLabel = "Close", overlay = true, ...props }, ref) => (
    <DialogPrimitive.Portal>
      {overlay && <DialogPrimitive.Overlay className="fixed inset-0 z-drawer bg-overlay/50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />}
      <DialogPrimitive.Content ref={ref} className={cn(sheetVariants({ side, size }), className)} {...props}>
        {children}
        <DialogPrimitive.Close aria-label={closeLabel} className="absolute right-4 top-4 inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground opacity-70 outline-none transition-opacity hover:bg-accent hover:text-accent-foreground hover:opacity-100 focus-ring [&_svg]:size-4">
          <X aria-hidden />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
);
SheetContent.displayName = "SheetContent";

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 p-6 pb-4 pr-14", className)} {...props} />;
}
export function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto px-6 pb-6", className)} {...props} />;
}
export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-auto flex flex-col-reverse gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-end", className)} {...props} />;
}
export const SheetTitle = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(
  ({ className, ...props }, ref) => <DialogPrimitive.Title ref={ref} className={cn("font-semibold text-foreground", className)} {...props} />
);
SheetTitle.displayName = "SheetTitle";
export const SheetDescription = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Description>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>>(
  ({ className, ...props }, ref) => <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
);
SheetDescription.displayName = "SheetDescription";
