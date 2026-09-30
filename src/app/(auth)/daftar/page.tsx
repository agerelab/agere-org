import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslator } from "@/i18n/server";
import { currentSession } from "@/modules/identity/web";
import { AuthFrame } from "../auth-frame";
import { SignUpForm } from "../forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslator())("auth.signUp.title") };
}

export default async function SignUp({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  if (await currentSession()) redirect("/");
  const locale = await getLocale();
  const t = await getTranslator();
  return (
    <AuthFrame locale={locale} title={t("auth.signUp.title")}>
      <SignUpForm locale={locale} email={(await searchParams).email} />
    </AuthFrame>
  );
}
