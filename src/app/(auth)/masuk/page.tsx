import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslator } from "@/i18n/server";
import { currentSession } from "@/modules/identity/web";
import { safeRedirect } from "@/modules/identity/redirect";
import { AuthFrame } from "../auth-frame";
import { SignInForm } from "../forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getTranslator())("auth.signIn.title")}` };
}

type Props = { searchParams: Promise<{ redirect_to?: string; expired?: string }> };

/** Empty state of PRD-01 §8.2: no session → the sign-in screen; a valid session skips it (Ideal). */
export default async function SignIn({ searchParams }: Props) {
  const { redirect_to, expired } = await searchParams;
  const session = await currentSession();
  if (session) redirect(session.user.emailVerifiedAt ? safeRedirect(redirect_to) : "/cek-email");
  const locale = await getLocale();
  const t = await getTranslator();
  return (
    <AuthFrame locale={locale} title={t("auth.signIn.title")}>
      <SignInForm locale={locale} redirectTo={redirect_to} expired={expired === "1"} />
    </AuthFrame>
  );
}
