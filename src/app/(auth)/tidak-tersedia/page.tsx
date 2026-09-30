import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getLocale, getTranslator } from "@/i18n/server";
import { AuthFrame } from "../auth-frame";

/** Partial state of PRD-02 §8: the organization is suspended or scheduled for deletion (§6.4). */
export default async function Unavailable({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  return (
    <AuthFrame
      locale={locale}
      title={t("org.unavailable.title")}
      description={t(status === "suspended" ? "org.unavailable.suspended" : "org.unavailable.pendingDeletion")}
    >
      <Button asChild variant="outline" className="w-full">
        <Link href="/pilih-organisasi">{t("org.unavailable.back")}</Link>
      </Button>
    </AuthFrame>
  );
}
