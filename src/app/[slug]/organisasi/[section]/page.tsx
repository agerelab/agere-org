import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslator } from "@/i18n/server";
import { ORG_LINKS } from "@/ui/shell/nav";
import { isAdminRole } from "@/modules/authz/matrix";
import { AdminOnly } from "@/ui/kelola/admin-only";
import { PageFrame, ScreenPlaceholder } from "@/ui/shell/page-frame";
import { pageTitle, requireOrg } from "../../shell";

type Props = { params: Promise<{ slug: string; section: string }> };

const linkOf = (section: string) => ORG_LINKS.find((l) => l.path === `organisasi/${section}`);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const link = linkOf((await params).section);
  return link ? pageTitle(params, link.key) : { title: "agere/org" };
}

/** Kelola › Organisasi pages not built yet. Owner/Admin-only pages show the ADMIN_ONLY state to members (PRD-04 §8.3). */
export default async function OrgSection({ params }: Props) {
  const { slug, section } = await params;
  const [page, t] = await Promise.all([requireOrg(slug), getTranslator()]);
  const link = linkOf(section);
  if (!link) notFound();
  if (link.adminOnly && !isAdminRole(page.ctx.role)) return <AdminOnly slug={slug} t={t} title={t(link.key)} />;
  return (
    <PageFrame title={t(link.key)}>
      <ScreenPlaceholder title={t("placeholder.title")} body={t("placeholder.body")} />
    </PageFrame>
  );
}
