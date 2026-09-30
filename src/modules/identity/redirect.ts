// Redirect allowlist (PRD-01 §6.7): a relative path, or an absolute URL on an allowed origin.
// Anything else falls back to "/" and is logged.
export function safeRedirect(value: string | null | undefined, allowedOrigins: string[] = []): string {
  if (!value) return "/";
  if (value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")) return value;
  try {
    const url = new URL(value);
    if (allowedOrigins.includes(url.origin)) return url.toString();
  } catch {}
  console.warn(`[identity] rejected redirect_to ${JSON.stringify(value).slice(0, 200)}`);
  return "/";
}
