"use client";

// Onboarding in three steps (PRD-02 v1.2 §8.1, D30): Organisasi → Titik mulai → Undang tim, then
// Selesai. Split screen: the form on the left; on ≥ 960 px a dark preview reads back what will be
// created (aria-hidden — the form is the source of truth). Back keeps every value; nothing is created
// before the last step.
import * as React from "react";
import Link from "next/link";
import { Check, CircleCheck, FolderKanban, Layers } from "lucide-react";
import { Logo } from "@/brand";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormControl, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioCard, RadioGroup } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { LOCALES, translator, type Locale, type MessageKey } from "@/i18n";
import { slugify } from "@/modules/org/slug";
import { PRESET_CONTENT, PRESETS, type Preset } from "@/modules/space/preset-content";
import { initials } from "@/ui/space/icons";
import { LanguageSwitcher } from "../../language-switcher";
import { checkOrgStepAction, checkSlugAction, finishOnboardingAction, type OrgFieldErrors } from "../org-actions";

/** Indonesian zones first; the server accepts any IANA name. */
export const TIMEZONES = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "Asia/Singapore", "Asia/Kuala_Lumpur", "Asia/Bangkok", "Asia/Manila", "Asia/Tokyo", "Australia/Sydney", "Europe/London", "America/New_York", "UTC"];
const STEPS: MessageKey[] = ["onboarding.step.org", "onboarding.step.preset", "onboarding.step.invite"];

type Done = { slug: string; name: string; invited: string[] };

export function Onboarding({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugEdited, setSlugEdited] = React.useState(false);
  const [timezone, setTimezone] = React.useState("Asia/Jakarta");
  const [orgLocale, setOrgLocale] = React.useState<Locale>(locale);
  const [preset, setPreset] = React.useState<Preset>("empty");
  const [emails, setEmails] = React.useState("");
  const [role, setRole] = React.useState<"member" | "admin">("member");
  const [fields, setFields] = React.useState<OrgFieldErrors>({});
  const [error, setError] = React.useState<{ key: MessageKey; args?: string[] } | null>(null);
  const [check, setCheck] = React.useState<{ slug: string; available: boolean; suggestion?: string } | null>(null);
  const [done, setDone] = React.useState<Done | null>(null);
  const [pending, start] = React.useTransition();
  const heading = React.useRef<HTMLHeadingElement>(null);
  const shownSlug = slugEdited ? slug : slugify(name);
  const pt = translator(orgLocale); // seeded names follow the organization's language (PRD-02 v1.2.1)

  // Live "Alamat tersedia" help, debounced.
  React.useEffect(() => {
    if (step !== 0 || shownSlug.length < 3) return;
    let live = true;
    const timer = window.setTimeout(() => checkSlugAction(shownSlug).then((r) => live && setCheck({ slug: shownSlug, ...r })), 350);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [shownSlug, step]);

  React.useEffect(() => heading.current?.focus(), [step, done]);

  const values = { name, slug: shownSlug, timezone, locale: orgLocale };
  const err = (k: keyof OrgFieldErrors) => (fields[k] ? t(fields[k]!.key, fields[k]!.arg ?? "") : undefined);
  const live = !fields.slug && check?.slug === shownSlug ? check : null;
  const slugHelp = live ? (live.available ? t("org.slugAvailable") : t("org.error.slugTaken", live.suggestion ?? "")) : t("org.slugHint");

  const next = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (step === 0)
      return start(async () => {
        const r = await checkOrgStepAction(values);
        if (!r.ok) return setFields(r.fields);
        setFields({});
        setStep(1);
      });
    if (step === 1) return setStep(2);
  };

  const finish = (withInvites: boolean) =>
    start(async () => {
      setError(null);
      const r = await finishOnboardingAction({ ...values, preset, emails: withInvites ? emails : "", role });
      if (r.ok) return setDone(r);
      if (r.step === 1) {
        setFields(r.fields ?? {});
        if (r.error) setError({ key: r.error });
        return setStep(0);
      }
      setError({ key: r.error, args: r.args });
    });

  const title: MessageKey = done ? "onboarding.done.title" : step === 0 ? "org.create.title" : step === 1 ? "onboarding.preset.title" : "onboarding.invite.title";
  const invitedList = emails.split(/[,\n;]/).map((x) => x.trim()).filter(Boolean);

  return (
    <div className="grid min-h-dvh bg-muted lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col">
        <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center gap-6 px-4 py-12">
          <Logo height={28} />
          {!done && (
            <ol aria-label={t("onboarding.stepOf", String(step + 1), String(STEPS.length))} className="flex items-center gap-2 text-xs">
              {STEPS.map((k, i) => (
                <li key={k} aria-current={i === step ? "step" : undefined} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-6 place-items-center rounded-full border text-[11px] font-medium",
                      i < step ? "border-primary bg-primary text-primary-foreground" : i === step ? "border-primary text-emphasis" : "border-default text-subtle",
                    )}
                  >
                    {i < step ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={cn("font-medium", i === step ? "text-emphasis" : "text-subtle", i !== step && "max-sm:sr-only")}>
                    {t(k)}
                    <span className="sr-only"> — {t(i < step ? "onboarding.stepDone" : i === step ? "onboarding.stepCurrent" : "onboarding.stepNext")}</span>
                  </span>
                  {i < STEPS.length - 1 && <span aria-hidden className="h-px w-4 bg-border" />}
                </li>
              ))}
            </ol>
          )}
          <div className="grid gap-2">
            <h1 ref={heading} tabIndex={-1} className="type-heading-xl text-emphasis outline-none">
              {done ? t(title, done.name) : t(title)}
            </h1>
            {!done && <p className="text-sm text-subtle">{t(step === 0 ? "org.create.lead" : step === 1 ? "onboarding.preset.lead" : "onboarding.invite.lead")}</p>}
          </div>

          {error && <Alert variant="error">{t(error.key, ...(error.args ?? []))}</Alert>}

          {done ? (
            <div className="grid gap-5">
              <ul className="grid gap-2 text-sm">
                <li className="flex items-center gap-2"><CircleCheck aria-hidden className="size-4 text-success-on-surface" />{t("onboarding.done.org", done.name)}</li>
                <li className="flex items-center gap-2"><CircleCheck aria-hidden className="size-4 text-success-on-surface" />{t("onboarding.done.space", pt(PRESET_CONTENT[preset].space), String(PRESET_CONTENT[preset].projects.length))}</li>
                <li className="flex items-center gap-2">
                  <CircleCheck aria-hidden className="size-4 text-success-on-surface" />
                  {done.invited.length ? t("onboarding.done.invited", String(done.invited.length)) : t("onboarding.done.inviteLater")}
                </li>
              </ul>
              <Button asChild size="lg" className="w-full">
                <Link href={`/${done.slug}/desk/kotak-masuk`}>{t("onboarding.done.open")}</Link>
              </Button>
            </div>
          ) : step === 0 ? (
            <form onSubmit={next} className="grid gap-4" noValidate>
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
                <Select value={timezone} onValueChange={setTimezone}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label={t("org.language")} hint={t("org.languageHint")}>
                <Select value={orgLocale} onValueChange={(v) => setOrgLocale(v as Locale)}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LOCALES.map((l) => <SelectItem key={l} value={l}>{translator(l)(`language.${l}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <Button type="submit" size="lg" className="w-full" loading={pending}>{t("onboarding.next")}</Button>
            </form>
          ) : step === 1 ? (
            <form onSubmit={next} className="grid gap-4">
              <RadioGroup value={preset} onValueChange={(v) => setPreset(v as Preset)} aria-label={t("onboarding.preset.title")} className="grid gap-3">
                {PRESETS.map((p) => (
                  <RadioCard
                    key={p}
                    value={p}
                    title={t(`onboarding.preset.${p}` as MessageKey)}
                    description={`${pt(PRESET_CONTENT[p].space)}: ${PRESET_CONTENT[p].projects.map((k) => pt(k)).join(", ")}`}
                  />
                ))}
              </RadioGroup>
              <div className="flex gap-2">
                <Button type="button" size="lg" variant="outline" onClick={() => setStep(0)}>{t("onboarding.back")}</Button>
                <Button type="submit" size="lg" className="flex-1">{t("onboarding.next")}</Button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                finish(true);
              }}
              className="grid gap-4"
            >
              <FormField label={t("invite.emails")} hint={t("invite.emailsHint")}>
                <FormControl>
                  <Textarea rows={4} value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="rina@perusahaan.co.id" />
                </FormControl>
              </FormField>
              <FormField label={t("invite.role")}>
                <Select value={role} onValueChange={(v) => setRole(v as "member" | "admin")}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="member">{t("role.member")}</SelectItem>
                    <SelectItem value="admin">{t("role.admin")}</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <div className="grid gap-2">
                <Button type="submit" size="lg" className="w-full" loading={pending} disabled={!emails.trim()}>{t("onboarding.invite.send")}</Button>
                <div className="flex gap-2">
                  <Button type="button" size="lg" variant="ghost" disabled={pending} onClick={() => setStep(1)}>{t("onboarding.back")}</Button>
                  <Button type="button" size="lg" variant="outline" className="flex-1" disabled={pending} onClick={() => finish(false)}>{t("onboarding.invite.skip")}</Button>
                </div>
              </div>
            </form>
          )}
        </main>
        <footer className="mx-auto flex w-full max-w-[400px] justify-center px-4 py-6">
          <LanguageSwitcher locale={locale} />
        </footer>
      </div>

      <aside aria-hidden className="hidden bg-[hsl(240_6%_10%)] p-10 text-white lg:flex lg:flex-col lg:justify-center">
        <p className="mb-6 text-sm text-white/60">{t("onboarding.preview")}</p>
        <div className="grid max-w-md gap-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-white text-sm font-semibold text-black">{initials(name.trim() || "?")}</span>
            <span className="grid">
              <span className="font-semibold">{name.trim() || t("org.name")}</span>
              <span className="text-sm text-white/60">agere.id/{shownSlug || "…"}</span>
            </span>
          </div>
          <div className="grid gap-2 text-sm">
            <span className="flex items-center gap-2 font-medium"><Layers className="size-4" />{pt(PRESET_CONTENT[preset].space)}</span>
            {PRESET_CONTENT[preset].projects.map((k) => (
              <span key={k} className="flex items-center gap-2 pl-6 text-white/80"><FolderKanban className="size-4" />{pt(k)}</span>
            ))}
          </div>
          {invitedList.length > 0 && (
            <div className="grid gap-1 text-sm">
              <span className="text-white/60">{t("onboarding.preview.invites")}</span>
              {invitedList.slice(0, 6).map((x) => <span key={x} className="truncate">{x}</span>)}
              {invitedList.length > 6 && <span className="text-white/60">+{invitedList.length - 6}</span>}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
