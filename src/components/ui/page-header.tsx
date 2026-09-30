"use client";

import * as React from "react";
import { ChevronLeft, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { devWarn } from "@/lib/dev";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button, IconButton } from "./button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./dropdown-menu";

/**
 * PageHeader (v6.4) — the top of an app page: back link, leading tile, title + badges, description, meta and actions.
 *
 * `PageHeaderActions` encodes the action hierarchy so screens can't drift:
 *   - `primary`   → one `default` button, always labelled (the page's forward action).
 *   - `secondary` → at most two `outline` buttons (type-enforced). Below `md` they move into the ⋯ menu as its first items.
 *   - `menu`      → the ⋯ overflow for rare or risky actions. An action lives in ONE place per breakpoint:
 *                   never pass the same action to `secondary` and `menu`.
 * When the page shows an EmptyState that owns the primary action, omit `primary` here.
 */

export interface PageHeaderAction {
  /** Verb + object, sentence case ("Invite member"). Use a general verb when formats may grow ("Import", not "Import .md"). */
  label: string;
  icon?: React.ReactNode;
  onSelect?: () => void;
  href?: string;
  disabled?: boolean;
  /** Menu items only — renders the destructive menu style. */
  destructive?: boolean;
}
export type PageHeaderMenuEntry = PageHeaderAction | "separator";

export function PageHeader({ className, ...props }: React.ComponentProps<"header">) {
  return <header data-slot="page-header" className={cn("flex flex-wrap items-start gap-x-4 gap-y-3", className)} {...props} />;
}

export function PageHeaderLeading({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-header-leading"
      aria-hidden
      className={cn("grid size-12 shrink-0 place-items-center rounded-xl border border-border bg-background text-base font-semibold text-foreground max-md:hidden [&_svg]:size-5", className)}
      {...props}
    />
  );
}

export function PageHeaderContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="page-header-content" className={cn("grid min-w-0 flex-1 basis-80 gap-1", className)} {...props} />;
}

export function PageHeaderBack({ href, children, className, ...props }: React.ComponentProps<"a"> & { href: string }) {
  return (
    <a
      data-slot="page-header-back"
      href={href}
      className={cn("inline-flex w-fit items-center gap-1 rounded-sm text-sm text-muted-foreground hover:text-foreground focus-ring", className)}
      {...props}
    >
      <ChevronLeft aria-hidden className="size-3.5" />
      {children}
    </a>
  );
}

export function PageHeaderTitle({ as: Tag = "h1", badges, className, children, ...props }: React.ComponentProps<"h1"> & { as?: "h1" | "h2"; badges?: React.ReactNode }) {
  return (
    <div data-slot="page-header-title-row" className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Tag data-slot="page-header-title" className={cn("type-heading-xl text-foreground", className)} {...props}>{children}</Tag>
      {badges && <div data-slot="page-header-badges" className="flex flex-wrap items-center gap-2">{badges}</div>}
    </div>
  );
}

export function PageHeaderDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="page-header-description" className={cn("max-w-prose text-sm text-muted-foreground", className)} {...props} />;
}

export function PageHeaderMeta({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="page-header-meta" className={cn("mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground [&_svg]:size-3.5", className)} {...props} />;
}

export interface PageHeaderActionsProps extends Omit<React.ComponentProps<"div">, "children"> {
  primary?: PageHeaderAction;
  /** Max two (type-enforced). Hidden below `md`, where they become the first ⋯ items. */
  secondary?: [PageHeaderAction] | [PageHeaderAction, PageHeaderAction];
  menu?: PageHeaderMenuEntry[];
  /** Accessible name of the ⋯ trigger. */
  menuLabel?: string;
  /** Non-action content before the buttons, e.g. an avatar stack of who has access. Hidden below `md`. */
  leading?: React.ReactNode;
}

function ActionButton({ action, variant, className }: { action: PageHeaderAction; variant: "default" | "outline"; className?: string }) {
  const icon = action.icon ? <span aria-hidden className="inline-flex">{action.icon}</span> : null;
  if (action.href && !action.disabled) {
    return (
      <Button asChild variant={variant} className={className}>
        <a href={action.href} onClick={action.onSelect}>{icon}{action.label}</a>
      </Button>
    );
  }
  return (
    <Button variant={variant} className={className} disabled={action.disabled} onClick={action.onSelect}>
      {icon}{action.label}
    </Button>
  );
}

export function PageHeaderActions({ primary, secondary, menu, menuLabel = "More actions", leading, className, ...props }: PageHeaderActionsProps) {
  const isMobile = useIsMobile();
  const sec: PageHeaderAction[] = secondary ?? [];
  const rest = menu ?? [];
  // One action, one place: an action shown as a button must not repeat in the ⋯ menu (below md the component moves it there itself).
  const shown = new Set([primary?.label, ...sec.map((a) => a.label)].filter(Boolean) as string[]);
  rest.forEach((e) => {
    if (e !== "separator" && shown.has(e.label)) devWarn(`PageHeaderActions: "${e.label}" is both a button and a ⋯ item. Pass it once — the component moves secondary actions into ⋯ below md.`);
  });
  const entries: PageHeaderMenuEntry[] = isMobile && sec.length ? [...sec, ...(rest.length ? (["separator"] as const) : []), ...rest] : rest;
  return (
    <div data-slot="page-header-actions" className={cn("flex flex-wrap items-center justify-end gap-2 max-md:w-full", className)} {...props}>
      {leading && <div data-slot="page-header-actions-leading" className="flex items-center max-md:hidden">{leading}</div>}
      {sec.map((a) => <ActionButton key={a.label} action={a} variant="outline" className="max-md:hidden" />)}
      {primary && <ActionButton action={primary} variant="default" className="max-md:flex-1" />}
      {entries.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton label={menuLabel} icon={<MoreHorizontal />} variant="ghost" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            {entries.map((e, i) =>
              e === "separator" ? (
                <DropdownMenuSeparator key={`sep-${i}`} />
              ) : e.href && !e.disabled ? (
                <DropdownMenuItem key={e.label} asChild destructive={e.destructive}>
                  {/* Slot needs ONE child: the icon lives inside the link. */}
                  <a href={e.href} onClick={e.onSelect}>{e.icon && <span aria-hidden className="inline-flex">{e.icon}</span>}{e.label}</a>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem key={e.label} destructive={e.destructive} startIcon={e.icon} disabled={e.disabled} onSelect={e.onSelect}>
                  {e.label}
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
