import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale, getTranslator } from "@/i18n/server";
import { todayIn } from "@/lib/dates";
import { spaceTree } from "@/modules/space/queries";
import { PageFrame } from "@/ui/shell/page-frame";
import { NoSpaceAccess, NoSpaces } from "@/ui/space/space-empty";
import { pageTitle, requireOrg } from "../shell";

type Props = { params: Promise<{ slug: string }> };

export const generateMetadata = ({ params }: Props) => pageTitle(params, "nav.space");

/** Space opens the last visited space (D46), else the first one; with none, the empty state. */
export default async function SpaceHome({ params }: Props) {
  const { slug } = await params;
  const page = await requireOrg(slug);
  const [tree, locale, t] = await Promise.all([spaceTree(page.ctx, todayIn(page.org.timezone)), getLocale(), getTranslator()]);
  if (tree === "NO_APP_ACCESS") return <NoSpaceAccess slug={slug} t={t} />;
  const last = (await cookies()).get(`agere-space-${page.org.id}`)?.value;
  const target = tree.find((s) => s.id === last) ?? tree[0];
  if (target) redirect(`/${slug}/s/${target.id}`);
  return (
    <PageFrame title={t("nav.space")}>
      <NoSpaces slug={slug} locale={locale} />
    </PageFrame>
  );
}
