import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Logo } from "@/brand";
import { Badge } from "@/components/ui/badge";
import { getLocale, getTranslator } from "@/i18n/server";
import { requireVerifiedUser } from "@/modules/identity/web";
import { listMyOrganizations } from "@/modules/org/service";
import { SettingsNav } from "./settings-nav";

/**
 * Pengaturan (PRD-12 §5.1): personal only, outside any organization. Every page says so ("Pribadi");
 * nothing here links to organization controls.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireVerifiedUser();
  const [t, locale, orgs] = await Promise.all([getTranslator(), getLocale(), listMyOrganizations(user.id)]);
  const back = orgs.find((o) => o.id === user.lastOrganizationId) ?? orgs[0];
  return (
    <div className="min-h-dvh bg-muted">
      <header className="flex h-14 items-center gap-4 border-b border-default bg-default px-4 md:px-8">
        <Logo height={24} />
        <Link href={back ? `/${back.slug}` : "/"} className="inline-flex items-center gap-1 rounded-sm text-sm text-subtle hover:text-emphasis focus-ring">
          <ChevronLeft aria-hidden className="size-4" />
          {back ? t("settings.backTo", back.name) : t("settings.back")}
        </Link>
      </header>
      <div className="mx-auto grid max-w-[960px] gap-6 px-4 pb-16 pt-8 md:grid-cols-[200px_minmax(0,1fr)] md:px-8">
        <div className="grid content-start gap-3">
          <div className="grid gap-1">
            <h1 className="type-heading-lg text-emphasis">{t("settings.title")}</h1>
            <Badge variant="secondary" className="justify-self-start">{t("settings.personal")}</Badge>
          </div>
          <SettingsNav locale={locale} />
        </div>
        <main id="content" className="grid content-start gap-6">
          <p className="text-sm text-subtle">{t("settings.personalHint")}</p>
          {children}
        </main>
      </div>
    </div>
  );
}
