// RequestContext (TECH-01 P3): built before any data access and passed first to every repository.
// Organization pages get it from requireOrg() (src/modules/org/web.ts): session → slug → membership.
export type Role = "owner" | "admin" | "member";
export type RequestContext = { requestId: string; userId: string; organizationId: string; role: Role };
