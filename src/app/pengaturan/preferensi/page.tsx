import type { Metadata } from "next";
import { getLocale, getTranslator } from "@/i18n/server";
import { requireVerifiedUser } from "@/modules/identity/web";
import { PreferencesForm } from "./preferences-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getTranslator())("settings.nav.preferences")} · agere/org` };
}

/** Preferensi (PRD-12 §4, §5.2–5.3): theme, timezone, language. */
export default async function PreferencesPage() {
  const { user } = await requireVerifiedUser();
  return <PreferencesForm locale={await getLocale()} theme={user.theme} timezone={user.timezone} />;
}
