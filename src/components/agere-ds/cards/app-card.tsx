import * as React from "react";
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardLink } from "@/components/ui/card";

/* ================================================================== */
/* AppCard — cal.com/apps store tile                                   */
/* ================================================================== */
export interface AppCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  name: string;
  /** Square logo (img or icon). */
  logo: React.ReactNode;
  category?: string;
  description: string;
  href?: string;
  /** e.g. "Installed", "Free", "Paid", "Beta" */
  badges?: { label: string; variant?: React.ComponentProps<typeof Badge>["variant"] }[];
  /** Secondary action rendered above the stretched link (z-10). Keep to one. */
  action?: React.ReactNode;
  meta?: React.ReactNode;
  headingLevel?: "h2" | "h3" | "h4";
}

export function AppCard({ name, logo, category, description, href, badges = [], action, meta, headingLevel: H = "h3", className, ...props }: AppCardProps) {
  return (
    <Card variant={href ? "interactive" : "default"} className={cn("h-full gap-4 p-5", className)} {...props}>
      <div className="flex items-start justify-between gap-3">
        <div aria-hidden className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-subtle bg-default shadow-elevation-1 [&_img]:size-full [&_img]:object-cover [&_svg]:size-6">
          {logo}
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {badges.map((b) => <Badge key={b.label} variant={b.variant ?? "gray"} size="sm">{b.label}</Badge>)}
        </div>
      </div>
      <div className="grid gap-1">
        <H className="type-heading-sm text-emphasis">
          {href ? <CardLink href={href}>{name}</CardLink> : name}
        </H>
        {category && <p className="text-xs text-subtle">{category}</p>}
      </div>
      <p className="line-clamp-3 text-sm leading-5 text-default">{description}</p>
      {(action || meta) && (
        <div className="relative z-10 mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="text-xs text-subtle">{meta}</span>
          {action}
        </div>
      )}
      {href && !action && <ArrowUpRight aria-hidden className="absolute right-4 top-4 hidden size-4 text-muted" />}
    </Card>
  );
}

/* ================================================================== */
/* StatCard — analytics dashboard KPI tile                             */
/* ================================================================== */
export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string;
  /** e.g. 12.5 (percent). Sign decides direction. */
  delta?: number;
  /** Is "up" good? (bookings: yes; churn: no) */
  positiveIsGood?: boolean;
  comparison?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function StatCard({ label, value, delta, positiveIsGood = true, comparison = "vs last period", icon, children, className, ...props }: StatCardProps) {
  const up = (delta ?? 0) >= 0;
  const good = up === positiveIsGood;
  return (
    <Card className={cn("gap-3 p-5", className)} {...props}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-subtle">{label}</p>
        {icon && <span aria-hidden className="text-subtle [&_svg]:size-4">{icon}</span>}
      </div>
      <p className="font-sans tracking-tight text-3xl font-semibold leading-9 tracking-tight text-emphasis tabular-nums">{value}</p>
      {delta !== undefined && (
        <p className="flex items-center gap-1.5 text-xs text-subtle">
          <Badge variant={good ? "success" : "error"} size="sm" startIcon={up ? <TrendingUp /> : <TrendingDown />}>
            <span className="sr-only">{up ? "Up" : "Down"} </span>
            {Math.abs(delta).toFixed(1)}%
          </Badge>
          {comparison}
        </p>
      )}
      {children}
    </Card>
  );
}
