// Error envelope shared by every Server Action and Route Handler (TECH-01 §5.3).
export type ErrorCode =
  | "VALIDATION"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "NO_APP_ACCESS"
  | "APP_DISABLED"
  | "NOT_MEMBER"
  | "VERSION_CONFLICT"
  | "RATE_LIMITED"
  | "REAUTH_REQUIRED"
  | "UNAVAILABLE";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string; fields?: Record<string, string>; retryable: boolean };

/** HTTP status a Route Handler returns for each code (TECH-01 §5.3 table). */
export const HTTP_STATUS: Record<ErrorCode, number> = {
  VALIDATION: 422,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  NO_APP_ACCESS: 403,
  APP_DISABLED: 403,
  NOT_MEMBER: 404,
  VERSION_CONFLICT: 409,
  RATE_LIMITED: 429,
  REAUTH_REQUIRED: 401,
  UNAVAILABLE: 503,
};

const RETRYABLE: ReadonlySet<ErrorCode> = new Set(["RATE_LIMITED", "UNAVAILABLE", "REAUTH_REQUIRED"]);

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });

export function fail(code: ErrorCode, message: string, fields?: Record<string, string>): ActionResult<never> {
  return { ok: false, code, message, retryable: RETRYABLE.has(code), ...(fields ? { fields } : {}) };
}

/** Thrown inside services; withContext()/handlers turn it into an ActionResult. */
export class AppError extends Error {
  constructor(public code: ErrorCode, message?: string, public fields?: Record<string, string>) {
    super(message ?? code);
  }
}
