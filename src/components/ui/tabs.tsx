"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

type TabsVariant = "default" | "underline" | "segmented" | "pills";
const TabsVariantContext = React.createContext<TabsVariant>("default");

/**
 * Tabs — four looks, one behavior (roving tabindex, ←/→, Home/End, automatic activation).
 *  - default:   shadcn/ui — muted track, active tab lifts to bg-background + shadow-sm (v6 default)
 *  - segmented: alias of default (kept for v5 code)
 *  - underline: page-level sections (settings, profile)
 *  - pills:     compact filters
 */
export interface TabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  variant?: TabsVariant;
}

export const Tabs = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Root>, TabsProps>(({ variant = "default", ...props }, ref) => (
  <TabsVariantContext.Provider value={variant}>
    <TabsPrimitive.Root ref={ref} {...props} />
  </TabsVariantContext.Provider>
));
Tabs.displayName = "Tabs";

const listVariants = cva("inline-flex items-center", {
  variants: {
    variant: {
      default: "h-9 w-fit justify-center rounded-lg bg-muted p-[3px] text-muted-foreground",
      segmented: "h-9 w-fit justify-center rounded-lg bg-muted p-[3px] text-muted-foreground",
      underline: "w-full gap-4 border-b border-border",
      pills: "gap-1",
    },
  },
});

const triggerVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium outline-none transition-[color,background-color,box-shadow,border-color] duration-base ease-standard disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "h-[calc(100%-1px)] flex-1 rounded-md border border-transparent px-2 py-1 text-foreground focus-ring focus-visible:border-ring dark:text-muted-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm dark:data-[state=active]:border-input/40 dark:data-[state=active]:bg-input/20 dark:data-[state=active]:text-foreground",
        segmented: "h-[calc(100%-1px)] flex-1 rounded-md border border-transparent px-2 py-1 text-foreground focus-ring focus-visible:border-ring dark:text-muted-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm dark:data-[state=active]:border-input/40 dark:data-[state=active]:bg-input/20 dark:data-[state=active]:text-foreground",
        underline:
          "-mb-px h-10 border-b-2 border-transparent px-0.5 text-muted-foreground hover:text-foreground focus-ring-inset data-[state=active]:border-primary data-[state=active]:text-foreground",
        pills:
          "h-8 rounded-md px-2.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-ring data-[state=active]:bg-secondary data-[state=active]:text-foreground",
      },
    },
  }
);

export const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
  ({ className, ...props }, ref) => {
    const variant = React.useContext(TabsVariantContext);
    return <TabsPrimitive.List ref={ref} className={cn(listVariants({ variant }), className)} {...props} />;
  }
);
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & { count?: number }
>(({ className, count, children, ...props }, ref) => {
  const variant = React.useContext(TabsVariantContext);
  return (
    <TabsPrimitive.Trigger ref={ref} className={cn(triggerVariants({ variant }), className)} {...props}>
      {children}
      {count !== undefined && (
        <span className="rounded-sm bg-muted-foreground/10 px-1 py-0.5 text-2xs leading-none text-muted-foreground tabular-nums">{count}</span>
      )}
    </TabsPrimitive.Trigger>
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => <TabsPrimitive.Content ref={ref} className={cn("flex-1 rounded-md outline-none focus-ring", className)} {...props} />);
TabsContent.displayName = TabsPrimitive.Content.displayName;
