"use client";

import * as React from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormField } from "@/components/ui/form";
import { Input, PasswordInput } from "@/components/ui/input";
import { translator, type Locale } from "@/i18n";
import {
  forgotPasswordAction,
  resendVerificationAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
  type FormState,
} from "./actions";

type T = ReturnType<typeof translator>;

function Submit({ t, label, pending }: { t: T; label: string; pending: boolean }) {
  return (
    <Button type="submit" className="w-full" disabled={pending} aria-disabled={pending}>
      {pending ? t("auth.processing") : label}
    </Button>
  );
}

/** Focuses the first invalid field after a failed submit (PRD-01 §8.3). */
function useFocusFirstError(state: FormState, ref: React.RefObject<HTMLFormElement | null>) {
  React.useEffect(() => {
    if (state.fields) ref.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [state, ref]);
}

function EmailField({ t, state, autoFocus }: { t: T; state: FormState; autoFocus?: boolean }) {
  const err = state.fields?.email;
  return (
    <FormField label={t("auth.email")} error={err ? t(err) : undefined} required>
      <FormControl>
        <Input name="email" type="email" autoComplete="email" defaultValue={state.values?.email} autoFocus={autoFocus} />
      </FormControl>
    </FormField>
  );
}

function PasswordField({ t, state, label, hint, autoComplete }: { t: T; state: FormState; label: string; hint?: string; autoComplete: string }) {
  const err = state.fields?.password;
  return (
    <FormField label={label} hint={hint} error={err ? t(err) : undefined} required>
      <FormControl>
        <PasswordInput name="password" autoComplete={autoComplete} showLabel={t("auth.showPassword")} hideLabel={t("auth.hidePassword")} />
      </FormControl>
    </FormField>
  );
}

export function SignInForm({ locale, redirectTo, expired }: { locale: Locale; redirectTo?: string; expired?: boolean }) {
  const t = translator(locale);
  const [state, action, pending] = React.useActionState(signInAction, {});
  const ref = React.useRef<HTMLFormElement>(null);
  useFocusFirstError(state, ref);
  return (
    <form ref={ref} action={action} className="grid gap-4" noValidate>
      {state.error ? <Alert variant="error">{t(state.error)}</Alert> : expired && <Alert variant="attention">{t("auth.error.expired")}</Alert>}
      <input type="hidden" name="redirect_to" value={redirectTo ?? ""} />
      <EmailField t={t} state={state} autoFocus />
      <PasswordField t={t} state={state} label={t("auth.password")} autoComplete="current-password" />
      <Link href="/lupa-kata-sandi" className="justify-self-start text-sm font-medium underline-offset-4 hover:underline focus-ring rounded-sm">
        {t("auth.forgot")}
      </Link>
      <Submit t={t} label={t("auth.signIn.submit")} pending={pending} />
      <p className="text-center text-sm text-subtle">
        {t("auth.noAccount")}{" "}
        <Link href="/daftar" className="font-medium text-emphasis underline-offset-4 hover:underline focus-ring rounded-sm">
          {t("auth.signUpLink")}
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm({ locale, email }: { locale: Locale; email?: string }) {
  const t = translator(locale);
  const [state, action, pending] = React.useActionState(signUpAction, email ? { values: { email } } : {});
  const ref = React.useRef<HTMLFormElement>(null);
  useFocusFirstError(state, ref);
  const nameErr = state.fields?.name;
  const consentErr = state.fields?.consent;
  return (
    <form ref={ref} action={action} className="grid gap-4" noValidate>
      <FormField label={t("auth.name")} error={nameErr ? t(nameErr) : undefined} required>
        <FormControl>
          <Input name="name" autoComplete="name" defaultValue={state.values?.name} autoFocus />
        </FormControl>
      </FormField>
      <EmailField t={t} state={state} />
      <PasswordField t={t} state={state} label={t("auth.password")} hint={t("auth.passwordHint")} autoComplete="new-password" />
      <div className="grid gap-1.5">
        <label className="flex items-start gap-2 text-sm">
          <Checkbox name="consent" aria-invalid={consentErr ? true : undefined} aria-describedby={consentErr ? "consent-error" : undefined} className="mt-0.5" />
          <span>{t("auth.consent")}</span>
        </label>
        {consentErr && (
          <p id="consent-error" className="text-sm text-error-on-surface">
            {t(consentErr)}
          </p>
        )}
      </div>
      <Submit t={t} label={t("auth.signUp.submit")} pending={pending} />
      <p className="text-center text-sm text-subtle">
        {t("auth.haveAccount")}{" "}
        <Link href="/masuk" className="font-medium text-emphasis underline-offset-4 hover:underline focus-ring rounded-sm">
          {t("auth.signInLink")}
        </Link>
      </p>
    </form>
  );
}

export function ResendForm({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = React.useActionState(resendVerificationAction, {});
  return (
    <form action={action} className="grid gap-3">
      {state.done && <Alert variant="success">{t("auth.checkEmail.resent")}</Alert>}
      <Button type="submit" variant="outline" className="w-full" disabled={pending}>
        {pending ? t("auth.processing") : t("auth.checkEmail.resend")}
      </Button>
    </form>
  );
}

export function ForgotForm({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = React.useActionState(forgotPasswordAction, {});
  const ref = React.useRef<HTMLFormElement>(null);
  useFocusFirstError(state, ref);
  return (
    <form ref={ref} action={action} className="grid gap-4" noValidate>
      {state.done && <Alert variant="success">{t("auth.forgot.sent")}</Alert>}
      <EmailField t={t} state={state} autoFocus />
      <Submit t={t} label={t("auth.forgot.submit")} pending={pending} />
      <BackToSignIn t={t} />
    </form>
  );
}

export function ResetForm({ locale, token }: { locale: Locale; token: string }) {
  const t = translator(locale);
  const [state, action, pending] = React.useActionState(resetPasswordAction, {});
  const ref = React.useRef<HTMLFormElement>(null);
  useFocusFirstError(state, ref);
  return (
    <form ref={ref} action={action} className="grid gap-4" noValidate>
      {state.error && (
        <Alert variant="error" actions={<Link href="/lupa-kata-sandi" className="text-sm font-medium underline">{t("auth.forgot.submit")}</Link>}>
          {t(state.error)}
        </Alert>
      )}
      <input type="hidden" name="token" value={token} />
      <PasswordField t={t} state={state} label={t("auth.reset.newPassword")} hint={t("auth.passwordHint")} autoComplete="new-password" />
      <Submit t={t} label={t("auth.reset.submit")} pending={pending} />
      <BackToSignIn t={t} />
    </form>
  );
}

function BackToSignIn({ t }: { t: T }) {
  return (
    <Link href="/masuk" className="justify-self-center text-sm font-medium text-subtle underline-offset-4 hover:text-emphasis hover:underline focus-ring rounded-sm">
      {t("auth.backToSignIn")}
    </Link>
  );
}
