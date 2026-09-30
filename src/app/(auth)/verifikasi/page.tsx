import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getLocale, getTranslator } from "@/i18n/server";
import { verifyEmail } from "@/modules/identity/service";
import { currentSession } from "@/modules/identity/web";
import { AuthFrame } from "../auth-frame";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslator())("auth.verify.okTitle") };
}

/**
 * Opening the link verifies the email (US-2). If a mail scanner already used the link, the signed-in
 * user whose email is verified still sees success instead of a dead link.
 */
export default async function Verify({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const result = token ? await verifyEmail(token) : { ok: false as const };
  const session = await currentSession();
  const ok = result.ok || !!session?.user.emailVerifiedAt;
  const locale = await getLocale();
  const t = await getTranslator();
  return (
    <AuthFrame locale={locale} title={t(ok ? "auth.verify.okTitle" : "auth.checkEmail.title")} description={t(ok ? "auth.verify.okBody" : "auth.linkInvalid")}>
      <Button asChild className="w-full">
        <Link href={ok ? "/" : session ? "/cek-email" : "/masuk"}>{t(ok ? "auth.continue" : "auth.backToSignIn")}</Link>
      </Button>
    </AuthFrame>
  );
}
