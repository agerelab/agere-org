import type { Metadata } from "next";
import { getLocale, getTranslator } from "@/i18n/server";
import { AuthFrame } from "../auth-frame";
import { ForgotForm } from "../forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslator())("auth.forgot.title") };
}

export default async function Forgot() {
  const locale = await getLocale();
  const t = await getTranslator();
  return (
    <AuthFrame locale={locale} title={t("auth.forgot.title")} description={t("auth.forgot.body")}>
      <ForgotForm locale={locale} />
    </AuthFrame>
  );
}
