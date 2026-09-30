"use client";

import * as React from "react";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Top navigation for marketing sites and product surfaces without a sidebar.
 * Sticky, translucent (backdrop-blur-glass). Below md, links collapse into a disclosure.
 */
export interface NavbarLinkData {
  label: string;
  href: string;
  active?: boolean;
}

export interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  brand: React.ReactNode;
  links?: NavbarLinkData[];
  actions?: React.ReactNode;
  label?: string;
  menuLabel?: string;
  renderLink?: (link: NavbarLinkData, className: string) => React.ReactNode;
}

const linkBase =
  "relative inline-flex h-14 items-center px-1 text-sm font-medium text-subtle transition-colors hover:text-emphasis focus-ring-inset aria-[current=page]:text-emphasis after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent aria-[current=page]:after:bg-brand";

export function Navbar({ brand, links = [], actions, label = "Main", menuLabel = "Menu", renderLink, className, ...props }: NavbarProps) {
  const [open, setOpen] = React.useState(false);
  const panelId = React.useId();
  const render = (l: NavbarLinkData, cls: string) =>
    renderLink ? renderLink(l, cls) : (
      <a href={l.href} aria-current={l.active ? "page" : undefined} className={cls}>{l.label}</a>
    );

  return (
    <header className={cn("sticky top-0 z-header border-b border-subtle bg-default/85 backdrop-blur-glass", className)} {...props}>
      <div className="ag-container flex h-14 items-center gap-6">
        <div className="flex shrink-0 items-center">{brand}</div>
        {links.length > 0 && (
          <nav aria-label={label} className="hidden md:block">
            <ul className="flex items-center gap-5">
              {links.map((l) => <li key={l.href}>{render(l, linkBase)}</li>)}
            </ul>
          </nav>
        )}
        <div className="ml-auto flex items-center gap-2">
          {actions}
          {links.length > 0 && (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              aria-label={menuLabel}
              onClick={() => setOpen((o) => !o)}
              className="inline-flex size-9 items-center justify-center rounded-control text-subtle hover:bg-subtle hover:text-emphasis focus-ring md:hidden [&_svg]:size-5"
            >
              {open ? <X aria-hidden /> : <Menu aria-hidden />}
            </button>
          )}
        </div>
      </div>
      {links.length > 0 && (
        <nav id={panelId} aria-label={label} hidden={!open} className="border-t border-subtle bg-default md:hidden">
          <ul className="ag-container grid gap-0.5 py-2">
            {links.map((l) => (
              <li key={l.href}>
                {render(l, "flex h-10 items-center rounded-md px-2 text-sm font-medium text-default hover:bg-subtle focus-ring-inset aria-[current=page]:bg-emphasis aria-[current=page]:text-emphasis")}
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
