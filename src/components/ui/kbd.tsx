"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/** Keyboard key. Use inside text ("Press <Kbd>⌘</Kbd><Kbd>K</Kbd>") — screen readers read the glyph. */
export const Kbd = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => (
  <kbd
    ref={ref}
    className={cn(
      "pointer-events-none inline-flex h-5 w-fit min-w-5 select-none items-center justify-center gap-1 rounded-sm bg-muted px-1 font-sans text-xs font-medium text-muted-foreground [&_svg:not([class*='size-'])]:size-3",
      className
    )}
    {...props}
  />
));
Kbd.displayName = "Kbd";
