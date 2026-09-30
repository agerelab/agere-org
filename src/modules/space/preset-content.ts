// What each Titik mulai seeds (PRD-02 v1.2 §8.1, D30). Plain data, shared by the onboarding preview
// (client) and seedPreset (server).
import type { MessageKey } from "@/i18n";

export const PRESETS = ["marketing", "product", "empty"] as const;
export type Preset = (typeof PRESETS)[number];

export const PRESET_CONTENT: Record<Preset, { space: MessageKey; icon: string; projects: MessageKey[] }> = {
  marketing: { space: "preset.marketing.space", icon: "megaphone", projects: ["preset.start", "preset.marketing.p1", "preset.marketing.p2"] },
  product: { space: "preset.product.space", icon: "rocket", projects: ["preset.start", "preset.product.p1", "preset.product.p2"] },
  empty: { space: "preset.empty.space", icon: "layers", projects: ["preset.start"] },
};
