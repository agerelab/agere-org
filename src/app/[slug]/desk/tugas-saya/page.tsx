import { getTranslator } from "@/i18n/server";
import { PageFrame, ScreenPlaceholder } from "@/ui/shell/page-frame";
import { pageTitle, requireOrg } from "../../shell";

type Props = { params: Promise<{ slug: string }> };

export const generateMetadata = ({ params }: Props) => pageTitle(params, "nav.myTasks");

export default async function Page({ params }: Props) {
  const [, t] = await Promise.all([requireOrg((await params).slug), getTranslator()]);
  return (
    <PageFrame title={t("nav.myTasks")} width="content">
      <ScreenPlaceholder title={t("placeholder.title")} body={t("placeholder.body")} />
    </PageFrame>
  );
}
