import type { Metadata } from "next";
import { getLocale, getTranslator } from "@/i18n/server";
import { requireVerifiedUser } from "@/modules/identity/web";
import { deletionBlockers } from "@/modules/account/deletion";
import { AccountScreen } from "./account-screen";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getTranslator())("settings.nav.account")} · agere/org` };
}

/** Akun & data (PRD-12 §5.4, PRD-13 §6.3): download my data, delete the account when no organization is left. */
export default async function AccountPage() {
  const { user } = await requireVerifiedUser();
  return <AccountScreen locale={await getLocale()} blockers={await deletionBlockers(user.id)} />;
}
