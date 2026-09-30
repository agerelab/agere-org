"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioCard, RadioGroup } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { LOCALES, translator, type Locale } from "@/i18n";
import type { Theme } from "@/modules/account/profile";
import { TIMEZONES } from "@/lib/timezones";
import { setLanguageAction, setThemeAction, setTimezoneAction } from "../actions";

const FOLLOW_ORG = "__org";

/** Applies a theme choice to the page at once ("Ikuti sistem" reads the OS). */
function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.themePref = theme;
}

export function PreferencesForm({ locale, theme, timezone }: { locale: Locale; theme: Theme; timezone: string | null }) {
  const t = translator(locale);
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const saved = (ok: boolean) => (ok ? toast.success(t("settings.saved")) : toast.error(t("settings.saveFailed")));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle as="h2" id="theme-title">{t("settings.theme")}</CardTitle>
          <CardDescription>{t("settings.themeHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            aria-labelledby="theme-title"
            defaultValue={theme}
            className="grid gap-3 sm:grid-cols-3"
            onValueChange={(v) =>
              start(async () => {
                applyTheme(v as Theme);
                saved((await setThemeAction(v as Theme)).ok);
              })
            }
          >
            <RadioCard value="light" title={t("settings.theme.light")} description={t("settings.theme.lightHint")} />
            <RadioCard value="dark" title={t("settings.theme.dark")} description={t("settings.theme.darkHint")} />
            <RadioCard value="system" title={t("settings.theme.system")} description={t("settings.theme.systemHint")} />
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">{t("org.timezone")}</CardTitle>
          <CardDescription>{t("settings.timezoneHint")}</CardDescription>
        </CardHeader>
        <CardContent className="max-w-md">
          <Select
            defaultValue={timezone ?? FOLLOW_ORG}
            disabled={pending}
            onValueChange={(v) =>
              start(async () => {
                saved((await setTimezoneAction(v === FOLLOW_ORG ? null : v)).ok);
                router.refresh();
              })
            }
          >
            <SelectTrigger aria-label={t("org.timezone")}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={FOLLOW_ORG}>{t("settings.followOrg")}</SelectItem>
              {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">{t("language.label")}</CardTitle>
          <CardDescription>{t("settings.languageHint")}</CardDescription>
        </CardHeader>
        <CardContent className="max-w-md">
          <Select
            defaultValue={locale}
            disabled={pending}
            onValueChange={(v) =>
              start(async () => {
                const r = await setLanguageAction(v as Locale);
                if (r.ok) toast.success(translator(v as Locale)("settings.saved"));
                router.refresh();
              })
            }
          >
            <SelectTrigger aria-label={t("language.label")}><SelectValue /></SelectTrigger>
            <SelectContent>
              {LOCALES.map((l) => (
                <SelectItem key={l} value={l} lang={l}>{translator(l)(`language.${l}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </>
  );
}
