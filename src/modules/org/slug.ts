// Organization address rules (PRD-02 §6.1): 3–40 of [a-z0-9-], no leading/trailing "-", globally
// unique, reserved words blocked, immutable after creation.
export const RESERVED_SLUGS = new Set([
  "masuk", "daftar", "keluar", "api", "admin", "settings", "pengaturan", "cek-email", "verifikasi",
  "lupa-kata-sandi", "reset-kata-sandi", "buat-organisasi", "pilih-organisasi", "onboarding", "app",
  "www", "help", "support", "bantuan", "panduan", "status", "docs", "blog", "_next", "static", "assets",
  "agere", "org", "login", "logout", "signup", "auth", "billing", "invite", "undangan",
]);

export type SlugProblem = "invalid" | "reserved";

export function slugProblem(slug: string): SlugProblem | null {
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/.test(slug)) return "invalid";
  if (RESERVED_SLUGS.has(slug)) return "reserved";
  return null;
}

/** "PT Maju Jaya!" → "pt-maju-jaya", generated from the name until the user edits it. */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}
