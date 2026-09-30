/**
 * Dev-only warnings (v6.4). Silent in production builds.
 * Works under Vite (`import.meta.env.DEV`), Next.js / webpack (`process.env.NODE_ENV`) and Vitest.
 */
const isDev = (() => {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  if (proc?.env?.NODE_ENV) return proc.env.NODE_ENV !== "production";
  return Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
})();

const seen = new Set<string>();

/** Logs each distinct message once per session, prefixed with [agere-ds]. */
export function devWarn(message: string): void {
  if (!isDev || seen.has(message)) return;
  seen.add(message);
  console.warn(`[agere-ds] ${message}`);
}
