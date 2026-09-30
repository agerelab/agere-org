import type { Metadata } from "next";
import { getLocale, getTranslator } from "@/i18n/server";
import { requireVerifiedUser } from "@/modules/identity/web";
import { Onboarding } from "./onboarding";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslator())("org.create.title") };
}

/** Onboarding (PRD-02 v1.2 §8.1, D30): Organisasi → Titik mulai → Undang tim. A verified email is required (§6.3). */
export default async function CreateOrganization() {
  await requireVerifiedUser();
  return <Onboarding locale={await getLocale()} />;
}
