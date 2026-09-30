import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getTranslator } from "@/i18n/server";
import { open } from "@/modules/notifications";
import { PageFrame } from "@/ui/shell/page-frame";
import { pageTitle, requireOrg } from "../../../../shell";

type Props = { params: Promise<{ slug: string; id: string }> };

export const generateMetadata = ({ params }: Props) => pageTitle(params, "nav.inbox");

const UUID = /^[0-9a-f-]{36}$/;

/**
 * Opening a notification (PRD-10 §6 deep links): marks it read, then goes to its target. A target that
 * is gone or no longer visible shows the missing-item state, never an error page.
 */
export default async function OpenNotification({ params }: Props) {
  const { slug, id } = await params;
  if (!UUID.test(id)) notFound();
  const page = await requireOrg(slug);
  const target = await open(page.ctx, id);
  if (target === "NOT_FOUND") notFound();
  if (target) redirect(target);
  const t = await getTranslator();
  return (
    <PageFrame title={t("nav.inbox")} width="read">
      <EmptyState
        icon={<SearchX />}
        headingLevel="h2"
        title={t("inbox.missingTitle")}
        description={t("inbox.missingBody")}
        actions={
          <Button asChild variant="outline">
            <Link href={`/${slug}/desk/kotak-masuk`}>{t("inbox.back")}</Link>
          </Button>
        }
      />
    </PageFrame>
  );
}
