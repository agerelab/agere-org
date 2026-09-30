import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import animate from "tailwindcss-animate";
import { TYPE_STYLES } from "./src/tokens/type-styles";

/**
 * Agere DS v6 — Tailwind preset (shadcn/ui visual language, Tailwind 3.4).
 *
 * Every value resolves to a CSS custom property produced by the token pipeline
 * (scripts/build-tokens.mjs → src/styles/tokens.{light,dark}.css). Themes, dark mode and
 * white-label brands are swapped by changing variables — never class names.
 *
 * Governance: the raw Tailwind palette (gray-500, red-600 …) is intentionally REMOVED.
 * Components can only reach semantic colors. See docs/foundations/color.md.
 *
 * Consumers: `presets: [require("@agere/design-system/tailwind.preset")]`.
 */
const c = (token: string) => `hsl(var(--ag-${token}) / <alpha-value>)`;
const alias = (token: string) => `hsl(var(--${token}) / <alpha-value>)`;

const status = (name: "info" | "success" | "attention" | "error" | "special") => ({
  DEFAULT: c(`${name}-icon`),
  bg: c(`${name}-bg`),
  fg: c(`${name}-fg`),
  border: c(`${name}-border`),
  solid: c(`${name}-solid`),
  "on-solid": c(`${name}-on-solid`),
  /** v6.4 — status-coloured text on neutral surfaces (card, page, muted). `fg` stays for text on the status `bg`. */
  "on-surface": c(`${name}-on-surface`),
  foreground: c(`${name}-on-solid`),
});

export { TYPE_STYLES };

const agerePlugin = plugin(({ addComponents, addUtilities }) => {
  /* Composite typography: className="type-heading-lg" */
  addComponents(
    Object.fromEntries(
      TYPE_STYLES.map((name) => [
        `.type-${name}`,
        {
          fontFamily: `var(--ag-type-${name}-font-family)`,
          fontWeight: `var(--ag-type-${name}-font-weight)`,
          fontSize: `var(--ag-type-${name}-font-size)`,
          lineHeight: `var(--ag-type-${name}-line-height)`,
          letterSpacing: `var(--ag-type-${name}-letter-spacing)`,
          ...(name === "overline" ? { textTransform: "uppercase" } : {}),
        },
      ])
    )
  );

  /* Focus — shadcn look: 3px translucent ring + ring-colored border.
     The transparent outline is what Windows forced-colors paints (box-shadow is stripped there). */
  const ring = "0 0 0 3px hsl(var(--ring) / var(--ring-alpha, 0.5))";
  addUtilities({
    ".focus-ring": {
      "&:focus-visible": { outline: "2px solid transparent", outlineOffset: "2px", boxShadow: ring },
    },
    ".focus-ring-inset": {
      "&:focus-visible": { outline: "2px solid transparent", outlineOffset: "-2px", boxShadow: "inset 0 0 0 2px hsl(var(--ring) / var(--ring-alpha, 0.5))" },
    },
    ".focus-ring-field": {
      "&:focus-visible, &:focus-within": { outline: "2px solid transparent", borderColor: "hsl(var(--ring))", boxShadow: ring },
    },
  });

  /* Responsive layout grid: 4 / 8 / 12 columns with token gutters + margins. */
  addComponents({
    ".ag-container": {
      width: "100%",
      marginInline: "auto",
      maxWidth: "var(--ag-grid-max-width-content)",
      paddingInline: "var(--ag-grid-margin-mobile)",
      "@media (min-width: 768px)": { paddingInline: "var(--ag-grid-margin-tablet)" },
      "@media (min-width: 1024px)": { paddingInline: "var(--ag-grid-margin-desktop)" },
    },
    ".ag-grid": {
      display: "grid",
      gridTemplateColumns: "repeat(var(--ag-grid-columns-mobile), minmax(0, 1fr))",
      columnGap: "var(--ag-grid-gutter-mobile)",
      "@media (min-width: 768px)": {
        gridTemplateColumns: "repeat(var(--ag-grid-columns-tablet), minmax(0, 1fr))",
        columnGap: "var(--ag-grid-gutter-tablet)",
      },
      "@media (min-width: 1024px)": {
        gridTemplateColumns: "repeat(var(--ag-grid-columns-desktop), minmax(0, 1fr))",
        columnGap: "var(--ag-grid-gutter-desktop)",
      },
    },
  });
});

export default {
  darkMode: ["variant", ["&:is(.dark *)", "&:is([data-theme=\"dark\"] *)"]],
  content: [],
  theme: {
    screens: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px", "2xl": "1440px" },
    container: { center: true, padding: "1rem", screens: { "2xl": "1440px" } },
    /* Raw palette removed on purpose — semantic only. */
    colors: {
      inherit: "inherit",
      current: "currentColor",
      transparent: "transparent",
      white: "#ffffff",
      black: "#000000",

      /* ---- Agere semantic ---------------------------------------- */
      brand: {
        DEFAULT: c("brand-default"),
        emphasis: c("brand-emphasis"),
        subtle: c("brand-subtle"),
        fg: c("brand-fg"),
        foreground: c("brand-fg"),
        accent: c("brand-accent"),
        "accent-subtle": c("brand-accent-subtle"),
      },
      info: status("info"),
      success: status("success"),
      attention: status("attention"),
      warning: status("attention"),
      error: status("error"),
      special: status("special"),
      overlay: c("bg-overlay"),
      "task-status": Object.fromEntries(
        ["backlog", "todo", "in-progress", "review", "blocked", "complete"].map((k) => [
          k,
          { DEFAULT: c(`task-status-${k}-solid`), bg: c(`task-status-${k}-bg`), fg: c(`task-status-${k}-fg`) },
        ])
      ),
      priority: { urgent: c("priority-urgent"), high: c("priority-high"), normal: c("priority-normal"), low: c("priority-low") },
      focus: c("focus-ring"),
      viz: Object.fromEntries(
        [1, 2, 3, 4, 5, 6, 7].map((i) => [i, { DEFAULT: c(`viz-${i}-emphasis`), subtle: c(`viz-${i}-subtle`), fg: c(`viz-${i}-fg`) }])
      ),

      /* ---- shadcn/ui compatibility aliases (see globals.css) ------ */
      background: alias("background"),
      foreground: alias("foreground"),
      card: { DEFAULT: alias("card"), foreground: alias("card-foreground") },
      popover: { DEFAULT: alias("popover"), foreground: alias("popover-foreground") },
      primary: { DEFAULT: alias("primary"), foreground: alias("primary-foreground"), hover: alias("primary-hover") },
      secondary: { DEFAULT: alias("secondary"), foreground: alias("secondary-foreground") },
      muted: { DEFAULT: alias("muted"), foreground: alias("muted-foreground") },
      accent: { DEFAULT: alias("accent"), foreground: alias("accent-foreground") },
      destructive: { DEFAULT: alias("destructive"), foreground: alias("destructive-foreground") },
      border: alias("border"),
      "border-strong": alias("border-strong"),
      input: alias("input"),
      ring: alias("ring"),
      "surface-hover": alias("surface-hover"),
      chart: { 1: alias("chart-1"), 2: alias("chart-2"), 3: alias("chart-3"), 4: alias("chart-4"), 5: alias("chart-5") },
      sidebar: {
        DEFAULT: alias("sidebar"),
        foreground: alias("sidebar-foreground"),
        primary: alias("sidebar-primary"),
        "primary-foreground": alias("sidebar-primary-foreground"),
        accent: alias("sidebar-accent"),
        "accent-foreground": alias("sidebar-accent-foreground"),
        border: alias("sidebar-border"),
        ring: alias("sidebar-ring"),
      },
    },
    extend: {
      /* cal.com-style tiers: same word, different property. bg-subtle ≠ text-subtle ≠ border-subtle. */
      backgroundColor: {
        default: c("bg-default"),
        surface: c("bg-surface"),
        muted: { DEFAULT: c("bg-muted"), foreground: c("fg-subtle") },
        subtle: c("bg-subtle"),
        emphasis: c("bg-emphasis"),
        inverted: c("bg-inverted"),
      },
      textColor: {
        emphasis: c("fg-emphasis"),
        default: c("fg-default"),
        subtle: c("fg-subtle"),
        muted: { DEFAULT: c("fg-muted"), foreground: c("fg-subtle") },
        disabled: c("fg-disabled"),
        inverted: c("fg-inverted"),
      },
      borderColor: {
        DEFAULT: alias("border"),
        default: c("border-default"),
        subtle: c("border-subtle"),
        muted: c("border-muted"),
        emphasis: c("border-emphasis"),
        control: c("border-control"),
        "control-hover": c("fg-subtle"),
      },
      ringColor: { DEFAULT: alias("ring") },
      outlineColor: { focus: c("focus-ring") },
      ringOffsetColor: { DEFAULT: c("bg-default") },
      fontFamily: {
        sans: "var(--ag-font-family-sans)",
        display: "var(--ag-font-family-display)",
        mono: "var(--ag-font-family-mono)",
      },
      fontSize: { "2xs": ["10px", "14px"], "13": ["13px", "18px"], dense: ["var(--ag-dense-font)", "var(--ag-dense-line)"] },
      /* shadcn radius scale — every step derives from --radius (0.625rem), so one variable re-rounds the product */
      borderRadius: {
        none: "var(--ag-radius-none)",
        xs: "var(--ag-radius-xs)",
        sm: "calc(var(--radius) * 0.6)",
        DEFAULT: "calc(var(--radius) * 0.8)",
        md: "calc(var(--radius) * 0.8)",
        lg: "var(--radius)",
        control: "calc(var(--radius) * 0.8)",
        xl: "calc(var(--radius) * 1.4)",
        "2xl": "calc(var(--radius) * 1.8)",
        "3xl": "calc(var(--radius) * 2.2)",
        "4xl": "calc(var(--radius) * 2.6)",
        full: "var(--ag-radius-full)",
      },
      /* Tailwind v4 shadow scale (what shadcn/ui v4 components are drawn with) */
      boxShadow: {
        none: "none",
        "elevation-0": "var(--ag-shadow-elevation-0)",
        "elevation-1": "var(--ag-shadow-elevation-1)",
        "elevation-2": "var(--ag-shadow-elevation-2)",
        "elevation-3": "var(--ag-shadow-elevation-3)",
        "elevation-4": "var(--ag-shadow-elevation-4)",
        "elevation-5": "var(--ag-shadow-elevation-5)",
        "2xs": "0 1px 0 0 rgb(0 0 0 / 0.05)",
        xs: "var(--ag-shadow-elevation-1)",
        sm: "var(--ag-shadow-elevation-2)",
        DEFAULT: "var(--ag-shadow-elevation-2)",
        md: "var(--ag-shadow-elevation-3)",
        lg: "var(--ag-shadow-elevation-4)",
        xl: "var(--ag-shadow-elevation-5)",
        "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        /** @deprecated v6 — all resolve to shadow-xs / none. Removed in v7. */
        "button-solid": "var(--ag-shadow-button-solid)",
        "button-solid-hover": "var(--ag-shadow-button-solid-hover)",
        "button-solid-active": "var(--ag-shadow-button-solid-active)",
        "button-outline": "var(--ag-shadow-button-outline)",
        "button-outline-active": "var(--ag-shadow-button-outline-active)",
        "switch-thumb": "var(--ag-shadow-switch-thumb)",
      },
      ringWidth: { 3: "3px" },
      opacity: { disabled: "var(--ag-opacity-disabled)", scrim: "var(--ag-opacity-scrim)" },
      blur: { overlay: "var(--ag-blur-overlay)", glass: "var(--ag-blur-glass)" },
      backdropBlur: { overlay: "var(--ag-blur-overlay)", glass: "var(--ag-blur-glass)" },
      transitionDuration: {
        fast: "var(--ag-duration-fast)",
        base: "var(--ag-duration-base)",
        moderate: "var(--ag-duration-moderate)",
        slow: "var(--ag-duration-slow)",
      },
      transitionTimingFunction: {
        standard: "var(--ag-ease-standard)",
        emphasized: "var(--ag-ease-emphasized)",
        exit: "var(--ag-ease-exit)",
      },
      zIndex: {
        sticky: "var(--ag-z-sticky)",
        header: "var(--ag-z-header)",
        drawer: "var(--ag-z-drawer)",
        overlay: "var(--ag-z-overlay)",
        modal: "var(--ag-z-modal)",
        popover: "var(--ag-z-popover)",
        toast: "var(--ag-z-toast)",
        tooltip: "var(--ag-z-tooltip)",
      },
      spacing: {
        sidebar: "var(--ag-size-sidebar)",
        header: "var(--ag-size-header)",
        /* density-aware (switch with data-density="compact") */
        row: "var(--ag-row-height)",
        control: "var(--ag-control-height)",
        "cell-x": "var(--ag-cell-x)",
        "cell-y": "var(--ag-cell-y)",
        dense: "var(--ag-dense-gap)",
        card: "var(--ag-card-pad)",
        "dense-icon": "var(--ag-dense-icon)",
      },
      maxWidth: {
        content: "var(--ag-grid-max-width-content)",
        wide: "var(--ag-grid-max-width-wide)",
        prose: "var(--ag-grid-max-width-prose)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "collapsible-down": { from: { height: "0" }, to: { height: "var(--radix-collapsible-content-height)" } },
        "collapsible-up": { from: { height: "var(--radix-collapsible-content-height)" }, to: { height: "0" } },
        "fade-in-up": { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "none" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "caret-blink": { "0%,70%,100%": { opacity: "1" }, "20%,50%": { opacity: "0" } },
        "indeterminate": { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(250%)" } },
      },
      animation: {
        "collapsible-down": "collapsible-down 160ms var(--ag-ease-standard)",
        "collapsible-up": "collapsible-up 160ms var(--ag-ease-standard)",
        "accordion-down": "accordion-down 200ms ease-out",
        "accordion-up": "accordion-up 200ms ease-out",
        "fade-in-up": "fade-in-up 600ms cubic-bezier(.21,1.02,.73,1) forwards",
        shimmer: "shimmer 1.6s infinite",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        indeterminate: "indeterminate 1.2s var(--ag-ease-standard) infinite",
      },
    },
  },
  plugins: [animate, agerePlugin],
} satisfies Config;
