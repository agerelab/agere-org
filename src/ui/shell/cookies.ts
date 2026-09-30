// Per-browser UI preferences until user_preferences exist (PRD-12). Read on the server so the first
// paint is already right (no flash).
export const COOKIE = { lang: "agere-lang", theme: "agere-theme", panel: "agere-panel" } as const;

export function setPreferenceCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
}
