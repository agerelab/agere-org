import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/brand";
import { FAKE_ORG, fakeBackendEnabled } from "@/contracts/fakes/shell";
import { getLocale } from "@/i18n/server";
import { translator } from "@/i18n";
import { LanguageSwitcher } from "./language-switcher";

export default async function Home() {
  const locale = await getLocale();
  const t = translator(locale);
  return (
    <div className="flex min-h-dvh flex-col bg-default">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-4 py-24">
        <Logo height={28} />
        <h1 className="type-heading-xl text-emphasis">{t("home.title")}</h1>
        <p className="text-subtle">{t("home.body")}</p>
        {fakeBackendEnabled() ? (
          <Button asChild className="self-start">
            <Link href={`/${FAKE_ORG.slug}`}>{t("home.open", FAKE_ORG.name)}</Link>
          </Button>
        ) : (
          <p className="text-sm text-subtle">{t("home.fakeOff")}</p>
        )}
      </main>
      <footer className="mx-auto flex w-full max-w-xl items-center justify-between px-4 py-6 text-sm text-subtle">
        <span>{t("app.tagline")}</span>
        <LanguageSwitcher locale={locale} />
      </footer>
    </div>
  );
}
