// PRD-02 Organization — acceptance criteria (§9) for creation, URL context and landing.
import { beforeEach, describe, expect, it } from "vitest";
import { auditLog, memberships, organizations, users } from "@/db/schema";
import type { Db } from "@/db/client";
import { uuidv7 } from "@/lib/ids";
import { createOrganization, landingPath, MAX_CREATED_PER_USER, resolveOrg } from "@/modules/org/service";
import { slugify, slugProblem } from "@/modules/org/slug";
import { eq } from "drizzle-orm";
import { freshDb } from "../helpers/db";

let db: Db;
const input = { name: "Maju Jaya", slug: "maju-jaya", timezone: "Asia/Jakarta", defaultLocale: "id" as const };

async function user(name: string) {
  const id = uuidv7();
  await db.insert(users).values({ id, email: `${name}@test.id`, name, emailVerifiedAt: new Date() });
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row;
}

beforeEach(async () => {
  ({ db } = await freshDb());
});

describe("US-1 — Create", () => {
  it("makes the creator Owner, remembers it for landing and audits org.organization.created", async () => {
    const rina = await user("rina");
    const r = await createOrganization(rina.id, input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(await db.select().from(memberships)).toMatchObject([{ organizationId: r.org.id, userId: rina.id, role: "owner", status: "active" }]);
    expect(await db.select().from(auditLog)).toMatchObject([{ organizationId: r.org.id, action: "org.organization.created", actorId: rina.id }]);
    const [after] = await db.select().from(users).where(eq(users.id, rina.id));
    expect(await landingPath(after)).toBe("/maju-jaya");
  });

  it("blocks a taken slug with an alternative suggestion", async () => {
    const rina = await user("rina");
    await createOrganization(rina.id, input);
    await createOrganization(rina.id, { ...input, slug: "maju-jaya-2" });
    expect(await createOrganization(rina.id, input)).toEqual({ ok: false, code: "SLUG_TAKEN", suggestion: "maju-jaya-3" });
  });

  it("enforces the slug rules and the 5-per-user limit (§6.1, §10)", async () => {
    const rina = await user("rina");
    expect(await createOrganization(rina.id, { ...input, slug: "-bad" })).toMatchObject({ code: "SLUG_INVALID" });
    expect(await createOrganization(rina.id, { ...input, slug: "masuk" })).toMatchObject({ code: "SLUG_RESERVED" });
    for (let i = 0; i < MAX_CREATED_PER_USER; i++) expect((await createOrganization(rina.id, { ...input, slug: `org-${i}` })).ok).toBe(true);
    expect(await createOrganization(rina.id, { ...input, slug: "org-6" })).toEqual({ ok: false, code: "LIMIT" });
  });

  it("generates the address from the name", () => {
    expect(slugify("PT Maju Jaya!")).toBe("pt-maju-jaya");
    expect(slugify("Kopi  Kita — Bandung")).toBe("kopi-kita-bandung");
    expect(slugProblem("ab")).toBe("invalid");
    expect(slugProblem("maju-jaya")).toBeNull();
  });
});

describe("US-2 — Context is explicit", () => {
  it("resolves only organizations the user belongs to; others are 404 and disclose nothing", async () => {
    const rina = await user("rina");
    const dewi = await user("dewi");
    const a = await createOrganization(rina.id, input);
    await createOrganization(dewi.id, { ...input, name: "Kopi Kita", slug: "kopi-kita" });
    expect(await resolveOrg("maju-jaya", rina.id)).toMatchObject({ ok: true, role: "owner", org: { id: a.ok ? a.org.id : "" } });
    expect(await resolveOrg("kopi-kita", rina.id)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(await resolveOrg("does-not-exist", rina.id)).toEqual({ ok: false, code: "NOT_FOUND" });
  });

  it("refuses suspended memberships and hides suspended or deleting organizations (§6.4)", async () => {
    const rina = await user("rina");
    const dewi = await user("dewi");
    const r = await createOrganization(rina.id, input);
    if (!r.ok) throw new Error();
    await db.insert(memberships).values({ organizationId: r.org.id, userId: dewi.id, role: "member", status: "suspended" });
    expect(await resolveOrg("maju-jaya", dewi.id)).toEqual({ ok: false, code: "NOT_FOUND" });
    await db.update(memberships).set({ status: "active" }).where(eq(memberships.userId, dewi.id));
    await db.update(organizations).set({ status: "pending_deletion" });
    expect(await resolveOrg("maju-jaya", dewi.id)).toEqual({ ok: false, code: "PENDING_DELETION" });
    expect((await resolveOrg("maju-jaya", rina.id)).ok).toBe(true);
    await db.update(organizations).set({ status: "suspended" });
    expect(await resolveOrg("maju-jaya", rina.id)).toEqual({ ok: false, code: "SUSPENDED" });
  });
});

describe("Landing after sign-in (§6.2)", () => {
  it("goes to onboarding with no organization, the picker with several, the last one when known", async () => {
    const rina = await user("rina");
    expect(await landingPath({ id: rina.id, lastOrganizationId: null })).toBe("/buat-organisasi");
    const a = await createOrganization(rina.id, input);
    await createOrganization(rina.id, { ...input, name: "Sinar Abadi", slug: "sinar-abadi" });
    expect(await landingPath({ id: rina.id, lastOrganizationId: null })).toBe("/pilih-organisasi");
    expect(await landingPath({ id: rina.id, lastOrganizationId: a.ok ? a.org.id : null })).toBe("/maju-jaya");
  });
});
