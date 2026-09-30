"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Agere spot illustrations — line style that matches the icon grid.
 *  - 160×120 artboard, 2px stroke (scales), round caps/joins
 *  - Colors come ONLY from tokens, so they follow light/dark and white-label brands:
 *      line = fg-subtle · fill = bg-default / bg-subtle · ground = bg-emphasis · accent = brand-accent
 *  - Decorative by default (aria-hidden). Pass `title` to make one meaningful.
 */
export interface IllustrationProps extends Omit<React.SVGAttributes<SVGSVGElement>, "children"> {
  size?: number;
  title?: string;
}

const L = "stroke-[hsl(var(--ag-fg-subtle))]";
const F0 = "fill-[hsl(var(--ag-bg-default))]";
const F1 = "fill-[hsl(var(--ag-bg-subtle))]";
const G = "fill-[hsl(var(--ag-bg-emphasis))]";
const A = "fill-[hsl(var(--ag-brand-accent))]";
const AS = "fill-[hsl(var(--ag-brand-accent-subtle))]";
const AL = "stroke-[hsl(var(--ag-brand-accent))]";

function Frame({ size = 160, title, className, children, ...props }: IllustrationProps & { children: React.ReactNode }) {
  const id = React.useId();
  return (
    <svg
      viewBox="0 0 160 120"
      width={size}
      height={(size * 120) / 160}
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-labelledby={title ? id : undefined}
      aria-hidden={title ? undefined : true}
      className={cn("shrink-0", className)}
      {...props}
    >
      {title && <title id={id}>{title}</title>}
      <ellipse cx="80" cy="110" rx="52" ry="5" className={G} />
      {children}
    </svg>
  );
}

const Spark = ({ x, y, s = 6 }: { x: number; y: number; s?: number }) => (
  <rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx={s / 5} transform={`rotate(45 ${x} ${y})`} className={A} />
);

/** Empty collection / first use. */
export function IllustrationEmpty(p: IllustrationProps) {
  return (
    <Frame {...p}>
      <rect x="42" y="34" width="76" height="52" rx="8" className={cn(F1, L)} />
      <rect x="54" y="22" width="52" height="42" rx="5" className={cn(F0, L)} />
      <path d="M63 34h26M63 42h34M63 50h18" className={L} />
      <path d="M34 66h26l6 9h28l6-9h26v28a8 8 0 0 1-8 8H42a8 8 0 0 1-8-8V66Z" className={cn(F0, L)} />
      <Spark x={120} y={22} />
      <circle cx="132" cy="36" r="2.5" className={A} />
    </Frame>
  );
}

/** No search results / filters too narrow. */
export function IllustrationNoResults(p: IllustrationProps) {
  return (
    <Frame {...p}>
      <rect x="30" y="30" width="64" height="70" rx="8" className={cn(F1, L)} />
      <path d="M42 46h40M42 56h28M42 66h34M42 76h22" className={L} />
      <circle cx="102" cy="58" r="22" className={cn(F0, L)} />
      <path d="m118 74 16 16" strokeWidth={6} className={L} />
      <path d="m95 51 14 14M109 51 95 65" className={AL} strokeWidth={2.5} />
      <Spark x={130} y={30} s={5} />
    </Frame>
  );
}

/** Something broke (500, failed load). */
export function IllustrationError(p: IllustrationProps) {
  return (
    <Frame {...p}>
      <rect x="28" y="24" width="104" height="76" rx="10" className={cn(F0, L)} />
      <path d="M28 40h104" className={L} />
      <circle cx="40" cy="32" r="2" className={G} /><circle cx="48" cy="32" r="2" className={G} /><circle cx="56" cy="32" r="2" className={G} />
      <path d="m66 58 8 8 8-8 8 8 8-8" className={L} />
      <path d="M60 86c6-6 34-6 40 0" className={L} />
      <path d="M118 12 110 28h10l-8 16" className={AL} strokeWidth={3} />
    </Frame>
  );
}

/** Success / done. */
export function IllustrationSuccess(p: IllustrationProps) {
  return (
    <Frame {...p}>
      <circle cx="80" cy="60" r="32" className={cn(AS)} />
      <circle cx="80" cy="60" r="24" className={cn(F0, L)} />
      <path d="m69 60 8 8 15-16" strokeWidth={3} className={L} />
      <Spark x={38} y={34} s={6} />
      <Spark x={124} y={28} s={5} />
      <circle cx="126" cy="80" r="3" className={A} />
      <circle cx="36" cy="82" r="2.5" className={G} />
      <path d="M46 20v6M43 23h6M114 94v6M111 97h6" className={L} />
    </Frame>
  );
}

/** Upload / import. */
export function IllustrationUpload(p: IllustrationProps) {
  return (
    <Frame {...p}>
      <path d="M52 84a18 18 0 0 1-2-35.9A26 26 0 0 1 100 42a20 20 0 0 1 10 38.6" className={cn(F1, L)} />
      <rect x="62" y="62" width="36" height="42" rx="6" className={cn(F0, L)} />
      <path d="M80 92V72m-8 8 8-8 8 8" className={AL} strokeWidth={2.5} />
      <Spark x={120} y={30} s={5} />
    </Frame>
  );
}

/** Offline / connection lost. */
export function IllustrationOffline(p: IllustrationProps) {
  return (
    <Frame {...p}>
      <path d="M40 54a56 56 0 0 1 80 0" className={L} />
      <path d="M52 66a38 38 0 0 1 56 0" className={L} />
      <path d="M64 78a20 20 0 0 1 32 0" className={L} />
      <circle cx="80" cy="92" r="5" className={cn(F0, L)} />
      <path d="M44 28 116 100" strokeWidth={3} className={AL} />
    </Frame>
  );
}

/** Permission required / locked. */
export function IllustrationLocked(p: IllustrationProps) {
  return (
    <Frame {...p}>
      <path d="M64 52V40a16 16 0 0 1 32 0v12" strokeWidth={4} className={L} />
      <rect x="50" y="52" width="60" height="48" rx="10" className={cn(F0, L)} />
      <circle cx="80" cy="72" r="6" className={A} />
      <path d="M80 78v8" strokeWidth={3} className={AL} />
      <Spark x={122} y={36} s={5} />
    </Frame>
  );
}

/** Welcome / onboarding / launch. */
export function IllustrationLaunch(p: IllustrationProps) {
  return (
    <Frame {...p}>
      <path d="M80 16c14 10 20 26 18 48H62c-2-22 4-38 18-48Z" className={cn(F0, L)} />
      <circle cx="80" cy="40" r="7" className={cn(AS, L)} />
      <path d="M62 64 50 76v10l14-8M98 64l12 12v10l-14-8" className={cn(F1, L)} />
      <path d="M72 72h16l-2 10H74l-2-10Z" className={cn(F1, L)} />
      <path d="M76 88c0 6 4 10 4 14 0-4 4-8 4-14" className={AL} strokeWidth={2.5} />
      <Spark x={122} y={26} s={6} />
      <circle cx="36" cy="44" r="2.5" className={A} />
      <path d="M40 90v6M37 93h6" className={L} />
    </Frame>
  );
}

export const ILLUSTRATIONS = {
  empty: IllustrationEmpty,
  "no-results": IllustrationNoResults,
  error: IllustrationError,
  success: IllustrationSuccess,
  upload: IllustrationUpload,
  offline: IllustrationOffline,
  locked: IllustrationLocked,
  launch: IllustrationLaunch,
} as const;
