import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getLocale, getTranslator } from "@/i18n/server";
import { maskEmail } from "@/modules/identity/crypto";
import { currentSession } from "@/modules/identity/web";
import { signOutAction } from "../actions";
import { AuthFrame } from "../auth-frame";
import { ResendForm } from "../forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslator())("auth.checkEmail.title") };
}

/** Partial state of PRD-01 §8.2: signed in, email not verified yet — no organization until verified (US-2). */
export default async function CheckEmail({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const session = await currentSession();
  if (session?.user.emailVerifiedAt) redirect("/");
  const locale = await getLocale();
  const t = await getTranslator();
  const to = session ? maskEmail(session.user.email) : ((await searchParams).to ?? "");
  return (
    <AuthFrame locale={locale} title={t("auth.checkEmail.title")} description={t("auth.checkEmail.body", to)}>
      {session ? (
        <>
          <ResendForm locale={locale} />
          <form action={signOutAction} className="justify-self-center">
            <Button type="submit" variant="link">{t("auth.signOut")}</Button>
          </form>
        </>
      ) : (
        <Button asChild variant="outline" className="w-full">
          <Link href="/masuk">{t("auth.backToSignIn")}</Link>
        </Button>
      )}
    </AuthFrame>
  );
}
