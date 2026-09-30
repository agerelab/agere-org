"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

export interface BreadcrumbItemData {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItemData[];
  /** Collapse middle items into "…" beyond this count (first + last N-1 are kept). */
  maxItems?: number;
  /** Render links with your router: (item, className) => <Link …/> */
  renderLink?: (item: BreadcrumbItemData, className: string) => React.ReactNode;
  label?: string;
}

const linkClass = "inline-flex items-center gap-1.5 rounded-md px-1 text-subtle transition-colors hover:text-emphasis focus-ring [&_svg]:size-4";

/** nav[aria-label=Breadcrumb] > ol. Last item is plain text with aria-current="page". */
export function Breadcrumb({ items, maxItems = 4, renderLink, label = "Breadcrumb", className, ...props }: BreadcrumbProps) {
  const [expanded, setExpanded] = React.useState(false);
  const collapse = !expanded && items.length > maxItems;
  const visible: (BreadcrumbItemData | "ellipsis")[] = collapse
    ? [items[0], "ellipsis", ...items.slice(items.length - (maxItems - 1))]
    : items;

  return (
    <nav aria-label={label} className={cn("min-w-0", className)} {...props}>
      <ol className="flex min-w-0 flex-wrap items-center gap-0.5 text-sm">
        {visible.map((item, i) => {
          const last = i === visible.length - 1;
          return (
            <li key={item === "ellipsis" ? "ellipsis" : `${item.label}-${i}`} className="inline-flex min-w-0 items-center gap-0.5">
              {item === "ellipsis" ? (
                <button type="button" aria-label={`Show ${items.length - maxItems + 1} more`} onClick={() => setExpanded(true)} className={linkClass}>
                  <MoreHorizontal aria-hidden />
                </button>
              ) : last ? (
                <span aria-current="page" className="inline-flex min-w-0 items-center gap-1.5 truncate px-1 font-medium text-emphasis [&_svg]:size-4">
                  {item.icon && <span aria-hidden className="inline-flex">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </span>
              ) : renderLink ? (
                renderLink(item, linkClass)
              ) : (
                <a href={item.href} className={linkClass}>
                  {item.icon && <span aria-hidden className="inline-flex">{item.icon}</span>}
                  {item.label}
                </a>
              )}
              {!last && <ChevronRight aria-hidden className="size-3.5 shrink-0 text-muted" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Low-level slot if you need custom markup. */
export const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement> & { asChild?: boolean }>(
  ({ asChild, className, ...props }, ref) => {
    const Comp = asChild ? Slot : "a";
    return <Comp ref={ref} className={cn(linkClass, className)} {...props} />;
  }
);
BreadcrumbLink.displayName = "BreadcrumbLink";
