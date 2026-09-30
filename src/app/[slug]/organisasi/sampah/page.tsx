import { getLocale, getTranslator } from "@/i18n/server";
import { trashList } from "@/modules/space/trash";
import { pageTitle, requireOrg } from "../../shell";
import { TrashScreen } from "./trash-screen";

type Props = { params: Promise<{ slug: string }> };

export const generateMetadata = ({ params }: Props) => pageTitle(params, "nav.trash");

/** Organisasi › Sampah (PRD-13, PRD-06 US-7/US-15): what the viewer can manage, restorable for 30 days. */
export default async function TrashPage({ params }: Props) {
  const { slug } = await params;
  const page = await requireOrg(slug);
  const [items, locale, t] = await Promise.all([trashList(page.ctx), getLocale(), getTranslator()]);
  return <TrashScreen slug={slug} locale={locale} title={t("nav.trash")} items={items} timezone={page.tz} />;
}
