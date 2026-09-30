/**
 * Agere DS runtime theming.
 *
 *  - setTheme("light" | "dark" | "system")      toggles `.dark` on <html>
 *  - applyBrandColor(el, "#4f46e5")               white-label a subtree at runtime (cal.com-style
 *                                                  "brand color" setting) with automatic text contrast
 *  - contrastRatio(a, b)                           WCAG 2.x relative-luminance ratio
 */

export type ThemeMode = "light" | "dark" | "system";

export function setTheme(mode: ThemeMode, root: HTMLElement = document.documentElement) {
  const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
  root.dataset.themeMode = mode;
}

/* ---------------- color math ---------------- */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function hexToHslChannels(hex: string): string {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return `${h.toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
}

function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount)));
  return `#${[f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export interface BrandResult {
  /** Text color chosen for the brand fill. */
  foreground: "#ffffff" | "#000000";
  /** Contrast of `foreground` on the brand fill (≥ 4.5 passes AA for text). */
  contrast: number;
  /** Contrast of the brand fill vs. the canvas (≥ 3 passes AA non-text, WCAG 1.4.11). */
  canvasContrast: number;
  passesAA: boolean;
}

/**
 * White-label a subtree. Picks black or white text by contrast, derives the hover shade,
 * and reports whether the brand color is usable as a filled control on the canvas.
 */
export function applyBrandColor(el: HTMLElement, hex: string, canvas = "#ffffff"): BrandResult {
  const onWhite = contrastRatio(hex, "#ffffff");
  const onBlack = contrastRatio(hex, "#000000");
  const foreground = onWhite >= onBlack ? "#ffffff" : "#000000";
  const emphasis = shade(hex, foreground === "#ffffff" ? -0.15 : 0.2);
  el.style.setProperty("--ag-brand-default", hexToHslChannels(hex));
  el.style.setProperty("--ag-brand-emphasis", hexToHslChannels(emphasis));
  el.style.setProperty("--ag-brand-fg", hexToHslChannels(foreground));
  // Aliases are resolved per element, so re-declare the shadcn names on the same node.
  el.style.setProperty("--primary", "var(--ag-brand-default)");
  el.style.setProperty("--primary-foreground", "var(--ag-brand-fg)");
  el.style.setProperty("--primary-hover", "var(--ag-brand-emphasis)");
  const contrast = Math.max(onWhite, onBlack);
  const canvasContrast = contrastRatio(hex, canvas);
  return { foreground, contrast, canvasContrast, passesAA: contrast >= 4.5 && canvasContrast >= 3 };
}

export function resetBrandColor(el: HTMLElement) {
  ["--ag-brand-default", "--ag-brand-emphasis", "--ag-brand-fg", "--primary", "--primary-foreground", "--primary-hover"].forEach((p) =>
    el.style.removeProperty(p)
  );
}
