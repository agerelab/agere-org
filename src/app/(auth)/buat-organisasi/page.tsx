import type { Metadata } from "next";
import { getLocale, getTranslator } from "@/i18n/server";
import { requireVerifiedUser } from "@/modules/identity/web";
import { AuthFrame } from "../auth-frame";
import { CreateOrgForm } from "./create-org-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslator())("org.create.title") };
}

/** Empty state of PRD-02 §8 and onboarding step 1 (§8.1). A verified email is required (§6.3). */
export default async function CreateOrganization() {
  await requireVerifiedUser();
  const locale = await getLocale();
  const t = await getTranslator();
  return (
    <AuthFrame locale={locale} title={t("org.create.title")} description={t("org.create.lead")}>
      <CreateOrgForm locale={locale} />
    </AuthFrame>
  );
}
