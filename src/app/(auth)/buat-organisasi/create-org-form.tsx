"use client";

import * as React from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormControl, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LOCALES, translator, type Locale } from "@/i18n";
import { slugify } from "@/modules/org/slug";
import { checkSlugAction, createOrganizationAction, type OrgFormState } from "../org-actions";

/** Indonesian zones first; the server accepts any IANA name. */
export const TIMEZONES = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "Asia/Singapore", "Asia/Kuala_Lumpur", "Asia/Bangkok", "Asia/Manila", "Asia/Tokyo", "Australia/Sydney", "Europe/London", "America/New_York", "UTC"];

export function CreateOrgForm({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = React.useActionState<OrgFormState, FormData>(createOrganizationAction, {});
  const [name, setName] = React.useState(state.values?.name ?? "");
  const [slug, setSlug] = React.useState(state.values?.slug ?? "");
  const [slugEdited, setSlugEdited] = React.useState(false);
  const [check, setCheck] = React.useState<{ slug: string; available: boolean; suggestion?: string } | null>(null);
  const ref = React.useRef<HTMLFormElement>(null);
  const shownSlug = slugEdited ? slug : slugify(name);

  React.useEffect(() => {
    if (state.fields) ref.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [state]);

  // Live "Alamat tersedia" help (PRD-02 §8.1), debounced.
  React.useEffect(() => {
    if (shownSlug.length < 3) return;
    let live = true;
    const timer = window.setTimeout(() => checkSlugAction(shownSlug).then((r) => live && setCheck({ slug: shownSlug, ...r })), 350);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [shownSlug]);

  const err = (k: "name" | "slug" | "timezone") => {
    const e = state.fields?.[k];
    return e ? t(e.key, e.arg ?? "") : undefined;
  };
  // A server error under the field already says what is wrong; the live result only helps while typing.
  const live = !state.fields?.slug && check?.slug === shownSlug ? check : null;
  const slugHelp = live ? (live.available ? t("org.slugAvailable") : t("org.error.slugTaken", live.suggestion ?? "")) : t("org.slugHint");

  return (
    <form ref={ref} action={action} className="grid gap-4" noValidate>
      {state.error && <Alert variant="error">{t(state.error)}</Alert>}
      <FormField label={t("org.name")} error={err("name")} required>
        <FormControl>
          <Input name="name" value={name} maxLength={60} autoFocus onChange={(e) => setName(e.target.value)} />
        </FormControl>
      </FormField>
      <FormField label={t("org.slug")} hint={slugHelp} error={err("slug")} required>
        <FormControl>
          <Input
            name="slug"
            value={shownSlug}
            maxLength={40}
            addonStart="agere.id/"
            autoCapitalize="none"
            spellCheck={false}
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(e.target.value.toLowerCase());
            }}
          />
        </FormControl>
      </FormField>
      <FormField label={t("org.timezone")} error={err("timezone")} required>
        <Select name="timezone" defaultValue={state.values?.timezone || "Asia/Jakarta"}>
          <FormControl>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label={t("org.language")} hint={t("org.languageHint")}>
        <Select name="locale" defaultValue={state.values?.locale || locale}>
          <FormControl>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {LOCALES.map((l) => (
              <SelectItem key={l} value={l}>
                {translator(l)(`language.${l}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? t("auth.processing") : t("org.create.submit")}
      </Button>
    </form>
  );
}
