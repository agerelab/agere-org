import { Layers } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { getTranslator } from "@/i18n/server";
import { isAdmin } from "@/ui/shell/nav";
import { PageFrame } from "@/ui/shell/page-frame";
import { pageTitle, requireOrg } from "../shell";

type Props = { params: Promise<{ slug: string }> };

export const generateMetadata = ({ params }: Props) => pageTitle(params, "nav.space");

/** Space opens the last visited space (D46); an organization without spaces shows this empty state. */
export default async function SpaceHome({ params }: Props) {
  const [page, t] = await Promise.all([requireOrg((await params).slug), getTranslator()]);
  return (
    <PageFrame title={t("nav.space")}>
      <EmptyState
        icon={<Layers />}
        headingLevel="h2"
        title={t("space.emptyTitle")}
        description={t(isAdmin(page.ctx.role) ? "space.emptyAdmin" : "space.emptyMember")}
      />
    </PageFrame>
  );
}
