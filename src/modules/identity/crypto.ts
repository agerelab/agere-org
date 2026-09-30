// Password hashing and opaque tokens (PRD-01 §6.2, §11). scrypt is memory-hard and ships with Node,
// so it works the same on Vercel and on Windows without native builds.
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

const scrypt = (password: string, salt: Buffer, keylen: number, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) => scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))));

const PARAMS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEYLEN = 64;

/** "scrypt$N$r$p$salt$hash" (base64url), so parameters can be raised later without breaking old hashes. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, KEYLEN, PARAMS);
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const key = await scrypt(password.normalize("NFKC"), Buffer.from(salt, "base64url"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: PARAMS.maxmem,
  });
  return timingSafeEqual(key, expected);
}

/** A hash that never matches, checked when the email is unknown so timing does not reveal accounts. */
export const DUMMY_HASH = "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$" + "A".repeat(86);

/** 256-bit random token for cookies and email links. */
export const randomToken = () => randomBytes(32).toString("base64url");

/** What the database stores for a token: a leak of the table yields nothing usable. */
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("base64url");

/** Hashed IP for rate limits and logs (PRD-13: no raw IPs). */
export const ipHash = (ip: string | null | undefined) => (ip ? createHash("sha256").update(`ip:${ip}`).digest("base64url").slice(0, 32) : null);

/** r***@maju.co.id (PRD-01 §11). */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}***@${domain ?? ""}`;
}
