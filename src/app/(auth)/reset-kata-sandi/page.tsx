import type { Metadata } from "next";
import { getLocale, getTranslator } from "@/i18n/server";
import { AuthFrame } from "../auth-frame";
import { ResetForm } from "../forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslator())("auth.reset.title") };
}

export default async function Reset({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslator();
  return (
    <AuthFrame locale={locale} title={t("auth.reset.title")}>
      <ResetForm locale={locale} token={token} />
    </AuthFrame>
  );
}
