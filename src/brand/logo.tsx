"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { LOGO, type LogoGeometry } from "./logo-paths";

/**
 * Agere logo — renders the brand masters in assets/brand/svg (via logo-paths.ts), recolored per theme.
 *
 *  variant: "lockup"   primary horizontal logo (symbol + wordmark) — default
 *           "stacked"  symbol above wordmark (hero, splash, ≥48px high)
 *           "mark"     symbol only (three nodes)
 *           "wordmark" "agere" only
 *           "app-icon" symbol in a rounded square tile (22.37% radius) — rails, avatars, favicons
 *  tone:    "auto" follows the theme (ink on light, white on dark) · "ink" #111111 · "inverse" white · "mono" currentColor
 *  cut:     "auto" switches to the small-size cut below 24px (lockup & mark) · "regular" · "small"
 *
 * Rules (assets/brand/README.md): 1X = one node diameter. Clear space ≥ 1X on every side ·
 * min 24px high for lockup & symbol (small cut 16–23px) · stacked ≥ 48px · one colour only —
 * never gradients, a second colour, outlines, effects, stretching or rotation.
 */
export interface LogoProps extends Omit<React.SVGAttributes<SVGSVGElement>, "children"> {
  variant?: "lockup" | "stacked" | "mark" | "wordmark" | "app-icon";
  tone?: "auto" | "ink" | "inverse" | "mono";
  cut?: "auto" | "regular" | "small";
  /** Rendered height in px (width follows the aspect ratio). */
  height?: number;
  /** Accessible name. Pass "" when a visible product name sits next to the logo. */
  title?: string;
}

/** Master ink from the brand files. The UI token `brand` stays Agere Ink #111827. */
export const LOGO_INK = "#111111";

const FILL = {
  auto: "fill-[hsl(var(--ag-fg-emphasis))]",
  ink: "fill-[#111111]",
  inverse: "fill-white",
  mono: "fill-current",
} as const;

/** App-icon tile/glyph pairs: auto = dark tile on light UI, light tile on dark UI. */
const TILE = {
  auto: { tile: "fill-[hsl(var(--ag-fg-emphasis))]", glyph: "fill-[hsl(var(--ag-bg-default))]" },
  ink: { tile: "fill-[#111111]", glyph: "fill-white" },
  inverse: { tile: "fill-white", glyph: "fill-[#111111]" },
  mono: { tile: "fill-current", glyph: "fill-[hsl(var(--ag-bg-default))]" },
} as const;

/** Small-size cut threshold (px of rendered height). */
export const LOGO_SMALL_CUT_BELOW = 24;

function pick(variant: NonNullable<LogoProps["variant"]>, small: boolean): LogoGeometry {
  switch (variant) {
    case "mark": return small ? LOGO.symbolSmall : LOGO.symbol;
    case "wordmark": return LOGO.wordmark;
    case "stacked": return LOGO.stacked;
    case "app-icon": return LOGO.appIcon;
    default: return small ? LOGO.primarySmall : LOGO.primary;
  }
}

export function Logo({ variant = "lockup", tone = "auto", cut = "auto", height = 24, title = "agere", className, ...props }: LogoProps) {
  const id = React.useId();
  const small = cut === "small" || (cut === "auto" && height < LOGO_SMALL_CUT_BELOW && (variant === "lockup" || variant === "mark"));
  const g = pick(variant, small);

  const body =
    variant === "app-icon" ? (
      <>
        <rect width={g.width} height={g.height} rx={g.tileRadius} className={TILE[tone].tile} />
        {g.paths.map((p, i) => <path key={i} d={p.d} transform={p.transform} className={TILE[tone].glyph} />)}
      </>
    ) : (
      g.paths.map((p, i) => <path key={i} d={p.d} transform={p.transform} className={FILL[tone]} />)
    );

  return (
    <svg
      viewBox={`0 0 ${g.width} ${g.height}`}
      height={height}
      width={Math.round(((height * g.width) / g.height) * 100) / 100}
      role={title ? "img" : undefined}
      aria-labelledby={title ? id : undefined}
      aria-hidden={title ? undefined : true}
      data-slot="logo"
      data-variant={variant}
      data-cut={small ? "small" : "regular"}
      className={cn("shrink-0", className)}
      {...props}
    >
      {title && <title id={id}>{title}</title>}
      {body}
    </svg>
  );
}
