"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isLocale, type MessageKey } from "@/i18n";
import { dispatchAfterResponse } from "@/modules/events";
import { requireVerifiedUser } from "@/modules/identity/web";
import { createOrganization, isTimezone, slugAvailable, suggestSlug } from "@/modules/org/service";

export type OrgFormState = { error?: MessageKey; errorArg?: string; fields?: Partial<Record<"name" | "slug" | "timezone", { key: MessageKey; arg?: string }>>; values?: Record<string, string> };

/** Onboarding step 1 (PRD-02 §8.1): all errors shown together. Steps 2–3 arrive with Space and People. */
export async function createOrganizationAction(_: OrgFormState, form: FormData): Promise<OrgFormState> {
  const { user } = await requireVerifiedUser();
  const values = {
    name: String(form.get("name") ?? "").trim(),
    slug: String(form.get("slug") ?? "").trim().toLowerCase(),
    timezone: String(form.get("timezone") ?? ""),
    locale: String(form.get("locale") ?? "en"),
  };
  const fields: OrgFormState["fields"] = {};
  if (!z.string().min(2).max(60).safeParse(values.name).success) fields.name = { key: "org.error.name" };
  if (!isTimezone(values.timezone)) fields.timezone = { key: "org.error.timezone" };
  if (!values.slug) fields.slug = { key: "auth.error.required" };
  if (Object.keys(fields).length) return { fields, values };

  const r = await createOrganization(user.id, { name: values.name, slug: values.slug, timezone: values.timezone, defaultLocale: isLocale(values.locale) ? values.locale : "en" });
  if (!r.ok) {
    if (r.code === "LIMIT") return { error: "org.error.limit", values };
    if (r.code === "SLUG_TAKEN") return { fields: { slug: { key: "org.error.slugTaken", arg: r.suggestion } }, values };
    return { fields: { slug: { key: r.code === "SLUG_RESERVED" ? "org.error.slugReserved" : "org.error.slugInvalid" } }, values };
  }
  dispatchAfterResponse(r.eventIds);
  redirect(`/${r.org.slug}/desk/kotak-masuk`);
}

/** Live help under the address field: "Alamat tersedia", or taken with a free alternative. */
export async function checkSlugAction(slug: string): Promise<{ available: boolean; suggestion?: string }> {
  await requireVerifiedUser();
  if (await slugAvailable(slug)) return { available: true };
  return { available: false, suggestion: await suggestSlug(slug) };
}
