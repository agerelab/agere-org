import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslator } from "@/i18n/server";
import { orgLinksFor, ORG_LINKS } from "@/ui/shell/nav";
import { PageFrame, ScreenPlaceholder } from "@/ui/shell/page-frame";
import { pageTitle, requireOrg } from "../../shell";

type Props = { params: Promise<{ slug: string; section: string }> };

const linkOf = (section: string) => ORG_LINKS.find((l) => l.path === `organisasi/${section}`);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const link = linkOf((await params).section);
  return link ? pageTitle(params, link.key) : { title: "agere/org" };
}

/** Kelola › Organisasi pages. Owner/Admin-only pages are a 404 for members (PRD-04, never reveal). */
export default async function OrgSection({ params }: Props) {
  const { slug, section } = await params;
  const [page, t] = await Promise.all([requireOrg(slug), getTranslator()]);
  const link = orgLinksFor(page.ctx.role).find((l) => l.path === `organisasi/${section}`);
  if (!link) notFound();
  return (
    <PageFrame title={t(link.key)}>
      <ScreenPlaceholder title={t("placeholder.title")} body={t("placeholder.body")} />
    </PageFrame>
  );
}
