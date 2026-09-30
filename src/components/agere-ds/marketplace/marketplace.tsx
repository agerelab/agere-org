"use client";

import * as React from "react";
import { BadgeCheck, ExternalLink, ShieldCheck, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface MarketplaceApp {
  id: string;
  name: string;
  publisher: string;
  category: string;
  description: string;
  longDescription?: string;
  logo: React.ReactNode;
  installs?: number;
  rating?: number;
  price?: "Free" | "Paid" | string;
  verified?: boolean;
  installed?: boolean;
  permissions?: string[];
  website?: string;
}

/* ================================================================== */
/* AppSearchHeader                                                     */
/* ================================================================== */
export function AppSearchHeader({
  title = "App Store", description = "Connect your favorite tools to your workspace.", query, onQueryChange, resultCount, actions,
}: {
  title?: string;
  description?: string;
  query: string;
  onQueryChange: (q: string) => void;
  resultCount?: number;
  actions?: React.ReactNode;
}) {
  return (
    <header className="grid gap-4 border-b border-subtle pb-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1"><h1 className="type-heading-xl text-emphasis">{title}</h1><p className="text-sm text-subtle">{description}</p></div>
        {actions}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-md"><SearchInput size="lg" aria-label="Search apps" placeholder="Search apps" value={query} onChange={(e) => onQueryChange(e.target.value)} onClear={() => onQueryChange("")} shortcut="/" /></div>
        {resultCount !== undefined && <p role="status" className="text-sm text-subtle tabular-nums">{resultCount} apps</p>}
      </div>
    </header>
  );
}

/* ================================================================== */
/* CategorySidebar                                                     */
/* ================================================================== */
export function CategorySidebar({
  categories, value, onValueChange, label = "Categories", className,
}: {
  categories: { id: string; label: string; count: number; icon?: React.ReactNode }[];
  value: string;
  onValueChange: (id: string) => void;
  label?: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("grid content-start gap-0.5", className)}>
      <p className="text-xs font-medium text-muted-foreground px-2 pb-1 text-muted">{label}</p>
      <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:mx-0 lg:grid lg:gap-0.5 lg:overflow-visible lg:px-0">
        {categories.map((c) => {
          const on = c.id === value;
          return (
            <li key={c.id} className="shrink-0">
              <button
                type="button"
                aria-current={on ? "true" : undefined}
                onClick={() => onValueChange(c.id)}
                className={cn(
                  "flex h-9 w-full items-center gap-2.5 whitespace-nowrap rounded-md px-2.5 text-left text-sm font-medium transition-colors focus-ring-inset lg:h-8",
                  on ? "bg-emphasis text-emphasis" : "text-default hover:bg-subtle hover:text-emphasis",
                  "border border-subtle lg:border-0"
                )}
              >
                {c.icon && <span aria-hidden className="inline-flex text-subtle [&_svg]:size-4">{c.icon}</span>}
                <span className="flex-1">{c.label}</span>
                <span className="text-xs text-subtle tabular-nums">{c.count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ================================================================== */
/* AppDetailSheet                                                      */
/* ================================================================== */
export function AppDetailSheet({
  app, open, onOpenChange, onInstall, onUninstall, installing,
}: {
  app?: MarketplaceApp;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onInstall: (id: string) => void;
  onUninstall?: (id: string) => void;
  installing?: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="md">
        {app && (
          <>
            <SheetHeader className="gap-4">
              <div className="flex items-start gap-4">
                <span aria-hidden className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-subtle bg-default shadow-elevation-1 [&_svg]:size-7">{app.logo}</span>
                <div className="grid min-w-0 gap-1">
                  <SheetTitle className="flex items-center gap-1.5">{app.name}{app.verified && <BadgeCheck aria-label="Verified publisher" role="img" className="size-4 text-info" />}</SheetTitle>
                  <SheetDescription>{app.publisher} · {app.category}</SheetDescription>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-subtle">
                    {app.rating !== undefined && <span className="inline-flex items-center gap-1"><Star aria-hidden className="size-3.5 fill-current text-brand-accent" />{app.rating.toFixed(1)}</span>}
                    {app.installs !== undefined && <span>{new Intl.NumberFormat("id-ID", { notation: "compact" }).format(app.installs)} installs</span>}
                    {app.price && <Badge size="sm" variant="gray">{app.price}</Badge>}
                    {app.installed && <Badge size="sm" variant="success" dot>Installed</Badge>}
                  </div>
                </div>
              </div>
            </SheetHeader>
            <SheetBody>
              <Tabs defaultValue="overview" variant="underline">
                <TabsList aria-label={`${app.name} details`}><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="permissions">Permissions</TabsTrigger></TabsList>
                <TabsContent value="overview" className="grid gap-4 pt-4 text-sm leading-6 text-default">
                  <p>{app.longDescription ?? app.description}</p>
                  <div className="grid aspect-video place-items-center rounded-xl border border-subtle bg-muted text-xs text-subtle">Screenshot</div>
                  {app.website && <a href={app.website} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1 rounded-sm text-sm font-medium text-emphasis underline underline-offset-2 focus-ring">Visit website <ExternalLink aria-hidden className="size-3.5" /></a>}
                </TabsContent>
                <TabsContent value="permissions" className="pt-4">
                  <ul className="grid gap-2">
                    {(app.permissions ?? ["Read your workspace name", "Create tasks in lists you choose"]).map((p) => (
                      <li key={p} className="flex items-start gap-2 text-sm text-default"><ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />{p}</li>
                    ))}
                  </ul>
                </TabsContent>
              </Tabs>
            </SheetBody>
            <SheetFooter>
              {app.installed ? (
                <>
                  <Button variant="destructive-outline" onClick={() => onUninstall?.(app.id)}>Uninstall</Button>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                  <Button loading={installing} onClick={() => onInstall(app.id)}>{installing ? "Installing…" : `Install ${app.name}`}</Button>
                </>
              )}
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
