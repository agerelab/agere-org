"use client";

import * as React from "react";
import * as MenubarPrimitive from "@radix-ui/react-menubar";
import { Check, ChevronRight, Circle } from "lucide-react";

import { cn } from "@/lib/utils";
import { menuItemClass } from "./context-menu";

/**
 * Menubar — shadcn/ui desktop-app menu bar (File · Edit · View) on Radix.
 * Use for editor-like tools (docs, spreadsheets, design) where users expect an application menu.
 * Keyboard: ←/→ move between menus (and open the neighbour when one is open), ↓ opens, Esc closes.
 */
export const MenubarMenu = MenubarPrimitive.Menu;
export const MenubarGroup = MenubarPrimitive.Group;
export const MenubarPortal = MenubarPrimitive.Portal;
export const MenubarSub = MenubarPrimitive.Sub;
export const MenubarRadioGroup = MenubarPrimitive.RadioGroup;

const content =
  "z-popover min-w-[12rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95";
const destructive = "text-destructive focus:bg-destructive/10 focus:text-destructive dark:focus:bg-destructive/20 [&_svg]:!text-destructive";

export const Menubar = React.forwardRef<React.ElementRef<typeof MenubarPrimitive.Root>, React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <MenubarPrimitive.Root ref={ref} data-slot="menubar" className={cn("flex h-9 items-center gap-1 rounded-md border border-border bg-background p-1 shadow-xs", className)} {...props} />
  )
);
Menubar.displayName = "Menubar";

export const MenubarTrigger = React.forwardRef<React.ElementRef<typeof MenubarPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Trigger>>(
  ({ className, ...props }, ref) => (
    <MenubarPrimitive.Trigger
      ref={ref}
      data-slot="menubar-trigger"
      className={cn("flex select-none items-center rounded-sm px-2 py-1 text-sm font-medium outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground", className)}
      {...props}
    />
  )
);
MenubarTrigger.displayName = "MenubarTrigger";

export const MenubarContent = React.forwardRef<React.ElementRef<typeof MenubarPrimitive.Content>, React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Content>>(
  ({ className, align = "start", alignOffset = -4, sideOffset = 8, ...props }, ref) => (
    <MenubarPrimitive.Portal>
      <MenubarPrimitive.Content ref={ref} data-slot="menubar-content" align={align} alignOffset={alignOffset} sideOffset={sideOffset} className={cn(content, className)} {...props} />
    </MenubarPrimitive.Portal>
  )
);
MenubarContent.displayName = "MenubarContent";

export const MenubarItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Item> & { inset?: boolean; variant?: "default" | "destructive" }
>(({ className, inset, variant = "default", ...props }, ref) => (
  <MenubarPrimitive.Item ref={ref} data-slot="menubar-item" data-inset={inset || undefined} data-variant={variant} className={cn(menuItemClass, variant === "destructive" && destructive, className)} {...props} />
));
MenubarItem.displayName = "MenubarItem";

export const MenubarCheckboxItem = React.forwardRef<React.ElementRef<typeof MenubarPrimitive.CheckboxItem>, React.ComponentPropsWithoutRef<typeof MenubarPrimitive.CheckboxItem>>(
  ({ className, children, checked, ...props }, ref) => (
    <MenubarPrimitive.CheckboxItem ref={ref} checked={checked} className={cn(menuItemClass, "pl-8", className)} {...props}>
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <MenubarPrimitive.ItemIndicator><Check className="!text-foreground" aria-hidden /></MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.CheckboxItem>
  )
);
MenubarCheckboxItem.displayName = "MenubarCheckboxItem";

export const MenubarRadioItem = React.forwardRef<React.ElementRef<typeof MenubarPrimitive.RadioItem>, React.ComponentPropsWithoutRef<typeof MenubarPrimitive.RadioItem>>(
  ({ className, children, ...props }, ref) => (
    <MenubarPrimitive.RadioItem ref={ref} className={cn(menuItemClass, "pl-8", className)} {...props}>
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <MenubarPrimitive.ItemIndicator><Circle className="size-2 fill-current !text-foreground" aria-hidden /></MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.RadioItem>
  )
);
MenubarRadioItem.displayName = "MenubarRadioItem";

export const MenubarLabel = React.forwardRef<React.ElementRef<typeof MenubarPrimitive.Label>, React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Label> & { inset?: boolean }>(
  ({ className, inset, ...props }, ref) => <MenubarPrimitive.Label ref={ref} data-inset={inset || undefined} className={cn("px-2 py-1.5 text-sm font-medium data-[inset]:pl-8", className)} {...props} />
);
MenubarLabel.displayName = "MenubarLabel";

export const MenubarSeparator = React.forwardRef<React.ElementRef<typeof MenubarPrimitive.Separator>, React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Separator>>(
  ({ className, ...props }, ref) => <MenubarPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
);
MenubarSeparator.displayName = "MenubarSeparator";

export function MenubarShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)} {...props} />;
}

export const MenubarSubTrigger = React.forwardRef<React.ElementRef<typeof MenubarPrimitive.SubTrigger>, React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubTrigger> & { inset?: boolean }>(
  ({ className, inset, children, ...props }, ref) => (
    <MenubarPrimitive.SubTrigger ref={ref} data-inset={inset || undefined} className={cn(menuItemClass, "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground", className)} {...props}>
      {children}
      <ChevronRight className="ml-auto" aria-hidden />
    </MenubarPrimitive.SubTrigger>
  )
);
MenubarSubTrigger.displayName = "MenubarSubTrigger";

export const MenubarSubContent = React.forwardRef<React.ElementRef<typeof MenubarPrimitive.SubContent>, React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubContent>>(
  ({ className, ...props }, ref) => <MenubarPrimitive.SubContent ref={ref} className={cn(content, "shadow-lg", className)} {...props} />
);
MenubarSubContent.displayName = "MenubarSubContent";
