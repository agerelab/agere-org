"use client";

// The 10 built-in space icons (PRD-06 §6.9) and uploaded ones (US-14). An uploaded icon that cannot
// be loaded falls back to the built-in icon (§10: "layers" unless another was picked).
import * as React from "react";
import { Briefcase, Code2, Heart, Layers, Megaphone, Palette, Rocket, Sparkles, Users, Wallet, type LucideIcon } from "lucide-react";

export const SPACE_ICON: Record<string, LucideIcon> = {
  layers: Layers,
  megaphone: Megaphone,
  palette: Palette,
  code: Code2,
  briefcase: Briefcase,
  rocket: Rocket,
  users: Users,
  wallet: Wallet,
  heart: Heart,
  sparkles: Sparkles,
};

export const assetUrl = (orgId: string, assetId: string | null | undefined) => (assetId ? `/api/assets/${orgId}/${assetId}` : null);

export function SpaceIcon({ iconKey, src, className }: { iconKey: string; src?: string | null; className?: string }) {
  const [broken, setBroken] = React.useState<string | null>(null);
  if (src && broken !== src)
    // eslint-disable-next-line @next/next/no-img-element -- a small private asset; next/image would proxy it
    return <img src={src} alt="" aria-hidden onError={() => setBroken(src)} className={`${className ?? ""} rounded-sm object-cover`} />;
  const Icon = SPACE_ICON[iconKey] ?? Layers;
  return <Icon aria-hidden className={className} />;
}

/** Two-letter tile for projects ("Studio Desain" → "SD"). */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";
