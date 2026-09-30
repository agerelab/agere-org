// Next.js calls register() once per server instance, before any request (TECH-01 §3): event consumers
// must be registered before the first publish, or their delivery rows would not be written.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("@/modules/registry");
}
