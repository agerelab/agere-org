"use client";

import * as React from "react";
import { GripVertical } from "lucide-react";
import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "@/lib/utils";

/**
 * Resizable — shadcn/ui panels on react-resizable-panels v4 (Group / Panel / Separator).
 *
 * ⚠ v4 units: NUMBERS ARE PIXELS, strings are percentages. `defaultSize="50"` (or "50%") = half;
 *   `defaultSize={50}` = 50px. Snippets written for v2/v3 (`defaultSize={50}`) must be converted.
 * Keyboard (built in): focus a handle, ←/→ (or ↑/↓ when vertical) resize, Home/End jump to min/max,
 * Enter toggles a collapsible panel. The handle is role="separator" with aria-valuenow.
 */
type Orientation = "horizontal" | "vertical";
const OrientationContext = React.createContext<Orientation>("horizontal");

export function ResizablePanelGroup({ className, orientation = "horizontal", ...props }: React.ComponentProps<typeof ResizablePrimitive.Group>) {
  return (
    <OrientationContext.Provider value={orientation}>
      <ResizablePrimitive.Group
        data-slot="resizable-panel-group"
        data-orientation={orientation}
        orientation={orientation}
        className={cn("flex h-full w-full", orientation === "vertical" && "flex-col", className)}
        {...props}
      />
    </OrientationContext.Provider>
  );
}

export function ResizablePanel(props: React.ComponentProps<typeof ResizablePrimitive.Panel>) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

export function ResizableHandle({ withHandle, className, ...props }: React.ComponentProps<typeof ResizablePrimitive.Separator> & { withHandle?: boolean }) {
  const groupOrientation = React.useContext(OrientationContext);
  const vertical = groupOrientation === "vertical"; // panels stacked → the handle is a horizontal bar
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(
        "relative flex items-center justify-center bg-border outline-none transition-colors",
        "focus-visible:bg-ring focus-visible:shadow-[0_0_0_3px_hsl(var(--ring)/var(--ring-alpha,0.5))] data-[separator=hover]:bg-ring/60 data-[separator=active]:bg-ring",
        vertical
          ? "h-px w-full after:absolute after:inset-x-0 after:top-1/2 after:h-2 after:-translate-y-1/2"
          : "w-px after:absolute after:inset-y-0 after:left-1/2 after:w-2 after:-translate-x-1/2",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div aria-hidden className={cn("z-10 flex h-4 w-3 items-center justify-center rounded-xs border border-border bg-border", vertical && "rotate-90")}>
          <GripVertical className="size-2.5" />
        </div>
      )}
    </ResizablePrimitive.Separator>
  );
}
