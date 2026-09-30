"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Menu, PanelLeft, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "./button";
import { Input } from "./input";
import { Separator } from "./separator";
import { Skeleton } from "./skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

/* ==================================================================
   shadcn/ui Sidebar — the composable system behind every shadcnstudio
   "Dashboard Shell" / "Application Shell" block.

   <SidebarProvider>
     <Sidebar collapsible="icon" variant="inset">
       <SidebarHeader/> <SidebarContent><SidebarGroup/>…</SidebarContent> <SidebarFooter/>
       <SidebarRail/>
     </Sidebar>
     <SidebarInset> <header><SidebarTrigger/>…</header> … </SidebarInset>
   </SidebarProvider>

   Agere additions: works WITHOUT a provider (static sidebar — v5 AppShell code keeps working),
   optional `label` wraps the content in <nav aria-label>, ⌘B / Ctrl+B toggles, cookie persistence.
   ================================================================== */

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarContextProps = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
  /** false when rendered without <SidebarProvider> (static v5 layout) */
  managed: boolean;
};

const STATIC_CONTEXT: SidebarContextProps = {
  state: "expanded", open: true, setOpen: () => {}, openMobile: false, setOpenMobile: () => {},
  isMobile: false, toggleSidebar: () => {}, managed: false,
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

export function useSidebar() {
  return React.useContext(SidebarContext) ?? STATIC_CONTEXT;
}

export interface SidebarProviderProps extends React.ComponentProps<"div"> {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SidebarProvider({ defaultOpen = true, open: openProp, onOpenChange: setOpenProp, className, style, children, ...props }: SidebarProviderProps) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value;
      if (setOpenProp) setOpenProp(openState);
      else _setOpen(openState);
      if (typeof document !== "undefined") document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [setOpenProp, open]
  );
  const toggleSidebar = React.useCallback(() => (isMobile ? setOpenMobile((o) => !o) : setOpen((o) => !o)), [isMobile, setOpen]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  const state = open ? "expanded" : "collapsed";
  const value = React.useMemo<SidebarContextProps>(
    () => ({ state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar, managed: true }),
    [state, open, setOpen, isMobile, openMobile, toggleSidebar]
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar-wrapper"
        style={{ "--sidebar-width": SIDEBAR_WIDTH, "--sidebar-width-icon": SIDEBAR_WIDTH_ICON, ...style } as React.CSSProperties}
        className={cn("group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar", className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export interface SidebarProps extends React.ComponentProps<"div"> {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
  /** Agere: wraps content in <nav aria-label={label}> (landmark for screen readers). */
  label?: string;
}

export function Sidebar({ side = "left", variant = "sidebar", collapsible = "offcanvas", label, className, children, ...props }: SidebarProps) {
  const { isMobile, state, openMobile, setOpenMobile, managed } = useSidebar();
  const body = label ? <nav aria-label={label} className="flex h-full min-h-0 w-full flex-col">{children}</nav> : children;

  if (!managed || collapsible === "none") {
    return (
      <div
        data-slot="sidebar"
        className={cn(
          "flex h-full flex-col bg-sidebar text-sidebar-foreground",
          managed ? "w-[--sidebar-width]" : "w-full border-r border-sidebar-border",
          className
        )}
        {...props}
      >
        {body}
      </div>
    );
  }

  if (isMobile) {
    return (
      <DialogPrimitive.Root open={openMobile} onOpenChange={setOpenMobile}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-drawer bg-overlay/50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <DialogPrimitive.Content
            data-sidebar="sidebar"
            data-slot="sidebar"
            data-mobile="true"
            className={cn(
              "fixed inset-y-0 z-drawer flex h-full w-[--sidebar-width] flex-col bg-sidebar p-0 text-sidebar-foreground shadow-lg outline-none",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:duration-moderate",
              side === "left" ? "left-0 data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left" : "right-0 data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right"
            )}
            style={{ "--sidebar-width": SIDEBAR_WIDTH_MOBILE } as React.CSSProperties}
          >
            <DialogPrimitive.Title className="sr-only">Sidebar</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Displays the mobile sidebar.</DialogPrimitive.Description>
            <div className="flex h-full w-full flex-col">{body}</div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }

  return (
    <div
      className="group peer hidden text-sidebar-foreground md:block"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
    >
      {/* gap that reserves the sidebar's width in the layout */}
      <div
        data-slot="sidebar-gap"
        className={cn(
          "relative w-[--sidebar-width] bg-transparent transition-[width] duration-200 ease-linear",
          "group-data-[collapsible=offcanvas]:w-0",
          "group-data-[side=right]:rotate-180",
          variant === "floating" || variant === "inset"
            ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+theme(spacing.4))]"
            : "group-data-[collapsible=icon]:w-[--sidebar-width-icon]"
        )}
      />
      <div
        data-slot="sidebar-container"
        className={cn(
          "fixed inset-y-0 z-sticky hidden h-svh w-[--sidebar-width] transition-[left,right,width] duration-200 ease-linear md:flex",
          side === "left"
            ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
            : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
          variant === "floating" || variant === "inset"
            ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+theme(spacing.4)+2px)]"
            : "group-data-[collapsible=icon]:w-[--sidebar-width-icon] group-data-[side=left]:border-r group-data-[side=right]:border-l group-data-[side=left]:border-sidebar-border group-data-[side=right]:border-sidebar-border",
          className
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow-sm"
        >
          {body}
        </div>
      </div>
    </div>
  );
}

export function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      aria-label="Toggle sidebar"
      className={cn("size-7", className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeft aria-hidden />
    </Button>
  );
}

export function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle sidebar"
      className={cn(
        "absolute inset-y-0 z-sticky hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
        "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full hover:group-data-[collapsible=offcanvas]:bg-sidebar",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2 [[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className
      )}
      {...props}
    />
  );
}

/** Main column next to the sidebar. With variant="inset" it becomes a raised, rounded card. */
export function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      data-slot="sidebar-inset"
      className={cn(
        "relative flex w-full min-w-0 flex-1 flex-col bg-background outline-none",
        "md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2",
        className
      )}
      {...props}
    />
  );
}

export function SidebarInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return <Input data-slot="sidebar-input" data-sidebar="input" className={cn("h-8 w-full bg-background shadow-none", className)} {...props} />;
}

export function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-header" data-sidebar="header" className={cn("flex flex-col gap-2 p-2", className)} {...props} />;
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-footer" data-sidebar="footer" className={cn("mt-auto flex flex-col gap-2 p-2", className)} {...props} />;
}

export function SidebarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return <Separator data-slot="sidebar-separator" data-sidebar="separator" className={cn("mx-2 w-auto bg-sidebar-border", className)} {...props} />;
}

export function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden", className)}
      {...props}
    />
  );
}

export function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-group" data-sidebar="group" className={cn("relative flex w-full min-w-0 flex-col p-2", className)} {...props} />;
}

export function SidebarGroupLabel({ className, asChild = false, ...props }: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      className={cn(
        "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        className
      )}
      {...props}
    />
  );
}

export function SidebarGroupAction({ className, asChild = false, ...props }: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="sidebar-group-action"
      data-sidebar="group-action"
      className={cn(
        "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "after:absolute after:-inset-2 md:after:hidden group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  );
}

export function SidebarGroupContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-group-content" data-sidebar="group-content" className={cn("w-full text-sm", className)} {...props} />;
}

export function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="sidebar-menu" data-sidebar="menu" className={cn("flex w-full min-w-0 flex-col gap-1", className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="sidebar-menu-item" data-sidebar="menu-item" className={cn("group/menu-item relative", className)} {...props} />;
}

export const sidebarMenuButtonVariants = cva(
  [
    "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding]",
    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "group-has-[[data-sidebar=menu-action]]/menu-item:pr-8",
    "data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground",
    "aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-sidebar-accent-foreground",
    "data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground",
    "group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2",
    "[&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:!p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface SidebarMenuButtonProps extends React.ComponentProps<"button">, VariantProps<typeof sidebarMenuButtonVariants> {
  asChild?: boolean;
  isActive?: boolean;
  /** Shown only while the sidebar is collapsed to icons (and never on mobile). */
  tooltip?: string | React.ComponentProps<typeof TooltipContent>;
}

export function SidebarMenuButton({ asChild = false, isActive = false, variant = "default", size = "default", tooltip, className, ...props }: SidebarMenuButtonProps) {
  const Comp = asChild ? Slot : "button";
  const { isMobile, state } = useSidebar();
  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    />
  );
  if (!tooltip) return button;
  const tip = typeof tooltip === "string" ? { children: tooltip } : tooltip;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" align="center" hidden={state !== "collapsed" || isMobile} {...tip} />
    </Tooltip>
  );
}

export function SidebarMenuAction({ className, asChild = false, showOnHover = false, ...props }: React.ComponentProps<"button"> & { asChild?: boolean; showOnHover?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="sidebar-menu-action"
      data-sidebar="menu-action"
      className={cn(
        "absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
        "after:absolute after:-inset-2 md:after:hidden",
        "peer-data-[size=sm]/menu-button:top-1 peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        showOnHover &&
          "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
        className
      )}
      {...props}
    />
  );
}

export function SidebarMenuBadge({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        "pointer-events-none absolute right-1 flex h-5 min-w-5 select-none items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground",
        "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
        "peer-data-[size=sm]/menu-button:top-1 peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  );
}

export function SidebarMenuSkeleton({ className, showIcon = false, ...props }: React.ComponentProps<"div"> & { showIcon?: boolean }) {
  const width = React.useMemo(() => `${Math.floor(Math.random() * 40) + 50}%`, []);
  return (
    <div data-slot="sidebar-menu-skeleton" data-sidebar="menu-skeleton" className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)} {...props}>
      {showIcon && <Skeleton className="size-4 rounded-md" data-sidebar="menu-skeleton-icon" />}
      <Skeleton className="h-4 max-w-[--skeleton-width] flex-1" data-sidebar="menu-skeleton-text" style={{ "--skeleton-width": width } as React.CSSProperties} />
    </div>
  );
}

export function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn("mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5 group-data-[collapsible=icon]:hidden", className)}
      {...props}
    />
  );
}

export function SidebarMenuSubItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="sidebar-menu-sub-item" data-sidebar="menu-sub-item" className={cn("group/menu-sub-item relative", className)} {...props} />;
}

export function SidebarMenuSubButton({ asChild = false, size = "md", isActive = false, className, ...props }: React.ComponentProps<"a"> & { asChild?: boolean; size?: "sm" | "md"; isActive?: boolean }) {
  const Comp = asChild ? Slot : "a";
  return (
    <Comp
      data-slot="sidebar-menu-sub-button"
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  );
}

/* ==================================================================
   v5 compatibility layer — AppShell · SidebarSection · SidebarItem
   Same props as v5, now drawn with the shadcn sidebar tokens.
   New code: SidebarProvider + Sidebar + SidebarInset (see blocks/dashboard-shell).
   ================================================================== */
export interface AppShellProps {
  sidebar: React.ReactNode;
  mobileBrand?: React.ReactNode;
  mobileActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  skipLinkLabel?: string;
  menuLabel?: string;
}

const MobileNavContext = React.createContext<(() => void) | null>(null);

/** @deprecated v6 — prefer SidebarProvider + Sidebar + SidebarInset. Kept for v5 layouts. */
export function AppShell({ sidebar, mobileBrand, mobileActions, children, className, skipLinkLabel = "Skip to content", menuLabel = "Open navigation" }: AppShellProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className={cn("flex min-h-dvh bg-background", className)}>
      <a href="#main-content" className="sr-only z-tooltip rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        {skipLinkLabel}
      </a>
      <div className="sticky top-0 hidden h-dvh w-sidebar shrink-0 md:flex">{sidebar}</div>
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-header flex h-14 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-glass md:hidden">
            <DialogPrimitive.Trigger aria-label={menuLabel} className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-ring [&_svg]:size-5">
              <Menu aria-hidden />
            </DialogPrimitive.Trigger>
            <div className="min-w-0 flex-1">{mobileBrand}</div>
            {mobileActions}
          </header>
          <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 outline-none">{children}</main>
        </div>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-overlay bg-overlay/50 data-[state=open]:animate-in data-[state=open]:fade-in-0 md:hidden" />
          <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-modal flex w-[min(288px,85vw)] shadow-lg outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=open]:duration-moderate md:hidden">
            <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
            <MobileNavContext.Provider value={() => setOpen(false)}>{sidebar}</MobileNavContext.Provider>
            <DialogPrimitive.Close aria-label="Close navigation" className="absolute right-2 top-3 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent focus-ring [&_svg]:size-4">
              <X aria-hidden />
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}

/** @deprecated v6 — use SidebarGroup + SidebarGroupLabel + SidebarMenu. */
export function SidebarSection({ label, children, className }: { label?: string; children: React.ReactNode; className?: string }) {
  const id = React.useId();
  return (
    <SidebarGroup className={cn("px-0 py-0", className)} role="group" aria-labelledby={label ? id : undefined}>
      {label && <SidebarGroupLabel id={id}>{label}</SidebarGroupLabel>}
      <SidebarMenu>{children}</SidebarMenu>
    </SidebarGroup>
  );
}

export interface SidebarItemProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  icon?: React.ReactNode;
  active?: boolean;
  badge?: React.ReactNode;
  asChild?: boolean;
}

/** @deprecated v6 — use SidebarMenuItem + SidebarMenuButton asChild. Link row with aria-current. */
export const SidebarItem = React.forwardRef<HTMLAnchorElement, SidebarItemProps>(({ icon, active, badge, asChild, className, children, onClick, ...props }, ref) => {
  const closeMobile = React.useContext(MobileNavContext);
  const Comp = asChild ? Slot : "a";
  return (
    <SidebarMenuItem>
      <Comp
        ref={ref}
        aria-current={active ? "page" : undefined}
        data-active={active || undefined}
        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
          onClick?.(e);
          closeMobile?.();
        }}
        className={cn(sidebarMenuButtonVariants(), "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-sidebar-foreground/70 aria-[current=page]:[&_svg]:text-sidebar-accent-foreground", className)}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {icon && <span aria-hidden className="inline-flex">{icon}</span>}
            <span className="min-w-0 flex-1 truncate">{children}</span>
            {badge !== undefined && <span className="ml-auto text-xs text-sidebar-foreground/70 tabular-nums">{badge}</span>}
          </>
        )}
      </Comp>
    </SidebarMenuItem>
  );
});
SidebarItem.displayName = "SidebarItem";
