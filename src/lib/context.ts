// RequestContext (TECH-01 P3): built before any data access and passed first to every repository.
// The identity module (PRD-01) does not exist yet. Until it does, a fixed user (DEV_* env) is used
// locally with DEV_AUTH=1; otherwise every request is unauthenticated. Replace the default
// resolver when PRD-01 lands.
import { randomUUID } from "node:crypto";
import { AppError } from "@/contracts/result";

export type Role = "owner" | "admin" | "member";
export type RequestContext = { requestId: string; userId: string; organizationId: string; role: Role };

type Session = Omit<RequestContext, "requestId">;
type SessionResolver = (req: Request) => Promise<Session | null>;

const ROLES: readonly Role[] = ["owner", "admin", "member"];

const defaultResolver: SessionResolver = async () => {
  if (process.env.DEV_AUTH !== "1" || process.env.NODE_ENV === "production") return null;
  const organizationId = process.env.DEV_ORGANIZATION_ID;
  const userId = process.env.DEV_USER_ID;
  if (!organizationId || !userId) return null;
  const role = ROLES.find((r) => r === process.env.DEV_ROLE) ?? "owner";
  return { organizationId, userId, role };
};

let resolveSession: SessionResolver = defaultResolver;

/** The identity module (or tests) plug in the real session lookup here. */
export function setSessionResolver(fn: SessionResolver) {
  resolveSession = fn;
}

export function resetSessionResolver() {
  resolveSession = defaultResolver;
}

export async function getRequestContext(req: Request): Promise<RequestContext> {
  const s = await resolveSession(req);
  if (!s) throw new AppError("NOT_MEMBER", "Sign in to continue");
  return { ...s, requestId: req.headers.get("x-request-id") ?? randomUUID() };
}
