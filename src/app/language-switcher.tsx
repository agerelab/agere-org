"use client";

import { useRouter } from "next/navigation";
import { LOCALES, translator, type Locale } from "@/i18n";
import { COOKIE, setPreferenceCookie } from "@/ui/shell/cookies";

/** Footer switcher on signed-out pages (UI-01 "Bahasa & format"). Language names in their own language. */
export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();
  const t = translator(locale);
  const pick = (l: Locale) => {
    setPreferenceCookie(COOKIE.lang, l);
    router.refresh();
  };
  return (
    <nav aria-label={t("language.label")} className="flex gap-3 text-sm">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-current={l === locale ? "true" : undefined}
          onClick={() => pick(l)}
          className="rounded-sm text-subtle hover:text-emphasis focus-ring aria-[current=true]:font-medium aria-[current=true]:text-emphasis"
        >
          {translator(l)(`language.${l}`)}
        </button>
      ))}
    </nav>
  );
}
