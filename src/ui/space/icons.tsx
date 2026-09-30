// The 10 built-in space icons (PRD-06 §6.9). Uploaded icons arrive with Vercel Blob; a missing
// icon falls back to "layers" (§10).
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

export function SpaceIcon({ iconKey, className }: { iconKey: string; className?: string }) {
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
