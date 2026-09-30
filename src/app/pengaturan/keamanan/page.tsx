import type { Metadata } from "next";
import { getLocale, getTranslator } from "@/i18n/server";
import { requireVerifiedUser } from "@/modules/identity/web";
import { devices, securityActivity } from "@/modules/account/security";
import { SecurityScreen } from "./security-screen";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getTranslator())("settings.nav.security")} · agere/org` };
}

/** Keamanan (PRD-12 §4, PRD-01): password, devices, sign out everywhere, security activity. */
export default async function SecurityPage() {
  const s = await requireVerifiedUser();
  const [list, activity, locale] = await Promise.all([devices(s.user.id, s.sessionId), securityActivity(s.user.id), getLocale()]);
  return <SecurityScreen locale={locale} devices={list} activity={activity} />;
}
