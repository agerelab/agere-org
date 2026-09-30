import type { Metadata } from "next";
import { getLocale, getTranslator } from "@/i18n/server";
import { requireVerifiedUser } from "@/modules/identity/web";
import { avatarSrc } from "@/modules/account/profile";
import { ProfileForm } from "./profile-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getTranslator())("settings.nav.profile")} · agere/org` };
}

/** Profil (PRD-12 §4): name, Jabatan, avatar. */
export default async function ProfilePage() {
  const { user } = await requireVerifiedUser();
  return <ProfileForm locale={await getLocale()} user={{ id: user.id, name: user.name, email: user.email, title: user.title ?? "", avatar: avatarSrc(user.id, user.avatarUpdatedAt) ?? null }} />;
}
