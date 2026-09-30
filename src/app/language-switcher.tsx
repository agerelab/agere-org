"use client";

import { useRouter } from "next/navigation";
import { LOCALES, translator, type Locale } from "@/i18n";
import { setLanguageAction } from "@/app/pengaturan/actions";

/** Footer switcher on signed-out pages (UI-01 "Bahasa & format"). Language names in their own language. */
export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();
  const t = translator(locale);
  // Saved in a cookie, and for a signed-in person as their preference too (D45).
  const pick = async (l: Locale) => {
    await setLanguageAction(l);
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
