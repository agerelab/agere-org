import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getLocale, getTranslator } from "@/i18n/server";
import { currentSession } from "@/modules/identity/web";
import { lookupInvitation } from "@/modules/people/invitations";
import { AuthFrame } from "../auth-frame";
import { AcceptInvitation } from "./accept";

export const metadata: Metadata = { title: "agere/org" };

/**
 * Invitation link (PRD-03 §6.2, US-2). Signed out: sign in, or sign up with the invited email
 * pre-filled. Signed in with the invited, verified email: accept. Otherwise the mismatch message.
 */
export default async function Invitation({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const [inv, session, locale, t] = await Promise.all([token ? lookupInvitation(token) : null, currentSession(), getLocale(), getTranslator()]);
  const here = `/undangan?token=${encodeURIComponent(token)}`;
  if (!inv || inv.state !== "pending")
    return (
      <AuthFrame locale={locale} title={t("org.unavailable.title")} description={t("invitation.invalid")}>
        <Button asChild variant="outline" className="w-full"><Link href="/">{t("denied.home")}</Link></Button>
      </AuthFrame>
    );
  const title = t("invitation.title", inv.orgName);
  const role = t(`role.${inv.role}`);
  if (!session)
    return (
      <AuthFrame locale={locale} title={title} description={t("invitation.body", role)}>
        <Button asChild className="w-full"><Link href={`/masuk?redirect_to=${encodeURIComponent(here)}`}>{t("invitation.signIn")}</Link></Button>
        <Button asChild variant="outline" className="w-full"><Link href={`/daftar?email=${encodeURIComponent(inv.email)}`}>{t("invitation.signUp")}</Link></Button>
      </AuthFrame>
    );
  if (session.user.email.toLowerCase() !== inv.email)
    return (
      <AuthFrame locale={locale} title={title} description={t("invitation.mismatch", inv.maskedEmail)}>
        <Button asChild variant="outline" className="w-full"><Link href="/">{t("denied.home")}</Link></Button>
      </AuthFrame>
    );
  return (
    <AuthFrame locale={locale} title={title} description={t("invitation.body", role)}>
      <AcceptInvitation locale={locale} token={token} />
    </AuthFrame>
  );
}
