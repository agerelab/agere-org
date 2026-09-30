import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLocale, getTranslator } from "@/i18n/server";
import { todayIn } from "@/lib/dates";
import { spaceTree } from "@/modules/space/queries";
import { NoSpaceAccess, RememberSpace } from "@/ui/space/space-empty";
import { requireOrg } from "../../shell";
import { SpaceScreen } from "./space-screen";

type Props = { params: Promise<{ slug: string; spaceId: string }> };

async function load(slug: string, spaceId: string) {
  const page = await requireOrg(slug);
  const tree = await spaceTree(page.ctx, todayIn(page.org.timezone));
  return { page, tree, space: tree === "NO_APP_ACCESS" ? undefined : tree.find((s) => s.id === spaceId) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, spaceId } = await params;
  const { page, space } = await load(slug, spaceId);
  return { title: space ? `${space.name} · ${page.org.name} · agere/org` : "agere/org" };
}

/** Space page (PRD-06 §6.6): header, access line, project cards. */
export default async function SpacePage({ params }: Props) {
  const { slug, spaceId } = await params;
  const { page, tree, space } = await load(slug, spaceId);
  const t = await getTranslator();
  if (tree === "NO_APP_ACCESS") return <NoSpaceAccess slug={slug} t={t} />;
  if (!space) notFound();
  return (
    <>
      <RememberSpace orgId={page.org.id} spaceId={space.id} />
      <SpaceScreen slug={slug} locale={await getLocale()} space={space} />
    </>
  );
}
