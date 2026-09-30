"use client";

import * as React from "react";
import type { LucideIcon, LucideProps } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Iconography — Lucide is the base set (24px grid, 2px stroke, round caps/joins).
 * Custom Agere icons below follow the same grid so they sit in the same UI without drift.
 *
 * Sizes: xs 12 · sm 14 · md 16 (default in UI) · lg 20 · xl 24 (empty states, marketing)
 */
export const ICON_SIZES = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 } as const;
export type IconSize = keyof typeof ICON_SIZES;

export interface IconProps extends Omit<LucideProps, "size" | "ref"> {
  icon: LucideIcon | React.ComponentType<LucideProps>;
  size?: IconSize;
  /** Meaningful icon: announced with this label. Omit for decorative icons (aria-hidden). */
  label?: string;
}

export function Icon({ icon: Glyph, size = "md", label, className, strokeWidth, ...props }: IconProps) {
  const px = ICON_SIZES[size];
  return (
    <Glyph
      width={px}
      height={px}
      strokeWidth={strokeWidth ?? (px >= 24 ? 1.75 : 2)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      focusable="false"
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Custom Agere glyphs (venture-studio vocabulary)                     */
/* ------------------------------------------------------------------ */
function make(name: string, paths: React.ReactNode) {
  const C = React.forwardRef<SVGSVGElement, LucideProps>(({ size = 24, strokeWidth = 2, color = "currentColor", className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("agere-icon", `agere-icon-${name}`, className)}
      {...props}
    >
      {paths}
    </svg>
  ));
  C.displayName = name;
  return C;
}

/** Idea → MVP launch. */
export const LaunchIcon = make("launch", <>
  <path d="M5 19c1.5-1.5 2-4 2-4l2 2s-2.5.5-4 2Z" />
  <path d="M9 15 7.5 13.5a10 10 0 0 1 9.5-9.5h3v3a10 10 0 0 1-9.5 9.5Z" />
  <circle cx="15" cy="9" r="1.5" />
  <path d="M8.5 11.5H5l2.5-3H11" /><path d="M12.5 15.5V19l3-2.5V13" />
</>);

/** Hypothesis validated. */
export const ValidateIcon = make("validate", <>
  <path d="M9 3h6" /><path d="M10 3v6l-5.2 9A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-3L14 9V3" />
  <path d="m9.5 15.5 1.75 1.75L15 13.5" />
</>);

/** Strategic pivot. */
export const PivotIcon = make("pivot", <>
  <path d="M4 20v-6a6 6 0 0 1 6-6h9" /><path d="m15 4 4 4-4 4" /><circle cx="4" cy="20" r="0.5" />
</>);

/** Cross-functional squad. */
export const SquadIcon = make("squad", <>
  <circle cx="12" cy="7" r="3" /><circle cx="5" cy="10" r="2" /><circle cx="19" cy="10" r="2" />
  <path d="M7 20v-1a5 5 0 0 1 10 0v1" /><path d="M2 19v-.5A3 3 0 0 1 5 15.5" /><path d="M22 19v-.5a3 3 0 0 0-3-3" />
</>);

/** Milestone reached. */
export const MilestoneIcon = make("milestone", <>
  <path d="M6 21V4" /><path d="M6 4h11l-2 3.5L17 11H6" /><path d="M3 21h8" />
</>);

/** Portfolio of ventures. */
export const PortfolioIcon = make("portfolio", <>
  <rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="4" />
  <rect x="3" y="13" width="8" height="8" rx="4" /><path d="M17 13v8" /><path d="M13 17h8" />
</>);

export const AGERE_ICONS = { LaunchIcon, ValidateIcon, PivotIcon, SquadIcon, MilestoneIcon, PortfolioIcon } as const;
