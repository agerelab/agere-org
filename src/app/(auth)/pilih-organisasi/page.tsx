import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { getLocale, getTranslator } from "@/i18n/server";
import { requireVerifiedUser } from "@/modules/identity/web";
import { listMyOrganizations } from "@/modules/org/service";
import { AuthFrame } from "../auth-frame";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslator())("org.pick.title") };
}

/** "Pilih organisasi" (PRD-02 §6.2 step 4). */
export default async function PickOrganization() {
  const { user } = await requireVerifiedUser();
  const [orgs, locale, t] = await Promise.all([listMyOrganizations(user.id), getLocale(), getTranslator()]);
  const row = "flex items-center gap-3 rounded-lg border border-default px-3 py-2.5 text-sm hover:bg-subtle focus-ring";
  return (
    <AuthFrame locale={locale} title={t("org.pick.title")} description={t("org.pick.lead")}>
      <ul className="grid gap-2">
        {orgs.map((o) => (
          <li key={o.id}>
            <Link href={`/${o.slug}`} className={row}>
              <Avatar name={o.name} size="md" shape="square" />
              <span className="grid flex-1 gap-0.5">
                <span className="font-medium text-emphasis">{o.name}</span>
                <span className="text-xs text-subtle">agere.id/{o.slug}</span>
              </span>
              <ChevronRight aria-hidden className="size-4 text-subtle" />
            </Link>
          </li>
        ))}
        <li>
          <Link href="/buat-organisasi" className={`${row} text-subtle`}>
            <Plus aria-hidden className="size-4" />
            {t("org.create.title")}
          </Link>
        </li>
      </ul>
    </AuthFrame>
  );
}
