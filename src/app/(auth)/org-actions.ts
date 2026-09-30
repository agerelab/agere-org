"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isLocale, type MessageKey } from "@/i18n";
import { dispatchAfterResponse } from "@/modules/events";
import { appUrl, requireVerifiedUser } from "@/modules/identity/web";
import { createOrganization, isTimezone, slugAvailable, suggestSlug } from "@/modules/org/service";
import { slugProblem } from "@/modules/org/slug";
import { acceptInvitation, acceptInvitationById, invite, parseEmails } from "@/modules/people/invitations";
import { PRESETS, type Preset } from "@/modules/space/preset-content";
import { seedPreset } from "@/modules/space/presets";

export type OrgValues = { name: string; slug: string; timezone: string; locale: string };
export type OrgFieldErrors = Partial<Record<"name" | "slug" | "timezone", { key: MessageKey; arg?: string }>>;

function checkFields(values: OrgValues): OrgFieldErrors {
  const fields: OrgFieldErrors = {};
  if (!z.string().min(2).max(60).safeParse(values.name.trim()).success) fields.name = { key: "org.error.name" };
  if (!isTimezone(values.timezone)) fields.timezone = { key: "org.error.timezone" };
  if (!values.slug) fields.slug = { key: "auth.error.required" };
  else {
    const problem = slugProblem(values.slug);
    if (problem) fields.slug = { key: problem === "reserved" ? "org.error.slugReserved" : "org.error.slugInvalid" };
  }
  return fields;
}

/** Onboarding step 1 (PRD-02 §8.1) before moving on: all errors together; nothing is created yet. */
export async function checkOrgStepAction(values: OrgValues): Promise<{ ok: true } | { ok: false; fields: OrgFieldErrors }> {
  await requireVerifiedUser();
  const fields = checkFields(values);
  if (!fields.slug && !(await slugAvailable(values.slug))) fields.slug = { key: "org.error.slugTaken", arg: await suggestSlug(values.slug) };
  return Object.keys(fields).length ? { ok: false, fields } : { ok: true };
}

export type FinishInput = OrgValues & { preset: Preset; emails: string; role: "member" | "admin" };
export type FinishResult =
  | { ok: true; slug: string; name: string; invited: string[] }
  | { ok: false; step: 1; fields?: OrgFieldErrors; error?: MessageKey }
  | { ok: false; step: 3; error: MessageKey; args?: string[] };

/**
 * "Kirim dan selesai" / "Lewati untuk sekarang" (§8.1, US-1b, US-1c): the organization and its Titik
 * mulai are created in one transaction; invitations follow PRD-03 validation and are checked first,
 * so a bad email creates nothing. Closing the tab before this step creates nothing.
 */
export async function finishOnboardingAction(input: FinishInput): Promise<FinishResult> {
  const { user } = await requireVerifiedUser();
  const fields = checkFields(input);
  if (Object.keys(fields).length) return { ok: false, step: 1, fields };
  const preset = PRESETS.includes(input.preset) ? input.preset : "empty";
  const { valid, invalid } = parseEmails(input.emails);
  if (invalid.length) return { ok: false, step: 3, error: "invite.badEmail", args: [invalid.join(", ")] };
  if (valid.length > 20) return { ok: false, step: 3, error: "invite.tooMany" };
  const locale = isLocale(input.locale) ? input.locale : "en";
  const r = await createOrganization(user.id, { name: input.name.trim(), slug: input.slug, timezone: input.timezone, defaultLocale: locale }, undefined, (tx, ctx) => seedPreset(tx, ctx, preset, locale));
  if (!r.ok) {
    if (r.code === "LIMIT") return { ok: false, step: 1, error: "org.error.limit" };
    if (r.code === "SLUG_TAKEN") return { ok: false, step: 1, fields: { slug: { key: "org.error.slugTaken", arg: r.suggestion } } };
    return { ok: false, step: 1, fields: { slug: { key: r.code === "SLUG_RESERVED" ? "org.error.slugReserved" : "org.error.slugInvalid" } } };
  }
  dispatchAfterResponse(r.eventIds);
  let invited: string[] = [];
  if (valid.length) {
    const ctx = { requestId: "onboarding", organizationId: r.org.id, userId: user.id, role: "owner" as const };
    try {
      const sent = await invite(ctx, { emails: valid, role: input.role === "admin" ? "admin" : "member" }, { name: user.name, orgName: r.org.name, appUrl: await appUrl(), locale });
      if (sent.ok) {
        dispatchAfterResponse(sent.eventIds);
        invited = sent.outcomes.filter((o) => o.result === "invited").map((o) => o.email);
      }
    } catch (e) {
      // The organization exists; invitations can be sent again from Anggota.
      console.error("[onboarding] invite", e);
    }
  }
  return { ok: true, slug: r.org.slug, name: r.org.name, invited };
}

/** Live help under the address field: "Alamat tersedia", or taken with a free alternative. */
export async function checkSlugAction(slug: string): Promise<{ available: boolean; suggestion?: string }> {
  await requireVerifiedUser();
  if (await slugAvailable(slug)) return { available: true };
  return { available: false, suggestion: await suggestSlug(slug) };
}

/** Accept from the invitation link (PRD-03 US-2). */
export async function acceptInvitationAction(token: string): Promise<{ error: MessageKey } | void> {
  const { user } = await requireVerifiedUser();
  const r = await acceptInvitation(user, token);
  if (!r.ok) return { error: r.code === "MISMATCH" ? "invitation.mismatch" : "invitation.invalid" };
  dispatchAfterResponse(r.eventIds);
  redirect(`/${r.slug}`);
}

/** Accept a pending invitation listed in the organization picker. */
export async function acceptInvitationByIdAction(organizationId: string, id: string): Promise<{ error: MessageKey } | void> {
  const { user } = await requireVerifiedUser();
  const r = await acceptInvitationById(user, organizationId, id);
  if (!r.ok) return { error: "invitation.invalid" };
  dispatchAfterResponse(r.eventIds);
  redirect(`/${r.slug}`);
}
