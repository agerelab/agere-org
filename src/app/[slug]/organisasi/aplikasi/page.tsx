import { getLocale, getTranslator } from "@/i18n/server";
import { can } from "@/modules/authz/matrix";
import { appsOverview } from "@/modules/authz/service";
import { AdminOnly } from "@/ui/kelola/admin-only";
import { pageTitle, requireOrg } from "../../shell";
import { AppsScreen } from "./apps-screen";

type Props = { params: Promise<{ slug: string }> };

export const generateMetadata = ({ params }: Props) => pageTitle(params, "nav.apps");

/** Organisasi › Aplikasi (PRD-04 §8.1 item 2): enable switch and who has access, per app. */
export default async function AppsPage({ params }: Props) {
  const { slug } = await params;
  const page = await requireOrg(slug);
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  if (!can(page.ctx.role, "apps.manage")) return <AdminOnly slug={slug} t={t} title={t("nav.apps")} />;
  return <AppsScreen slug={slug} locale={locale} title={t("nav.apps")} apps={await appsOverview(page.ctx)} />;
}
