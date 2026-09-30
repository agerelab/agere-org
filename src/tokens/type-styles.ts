/** Composite type style names (tokens/semantic/typography.json). Shared by the Tailwind preset and docs. */
export const TYPE_STYLES = [
  "display-2xl", "display-xl", "display-lg", "display-md",
  "heading-xl", "heading-lg", "heading-md", "heading-sm",
  "body-lg", "body-md", "body-sm",
  "label-md", "label-sm", "caption", "overline", "code",
] as const;
export type TypeStyle = (typeof TYPE_STYLES)[number];
