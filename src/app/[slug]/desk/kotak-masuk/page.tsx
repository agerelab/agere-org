import { getLocale, getTranslator } from "@/i18n/server";
import { todayIn } from "@/lib/dates";
import { inbox } from "@/modules/notifications";
import type { InboxTab } from "@/modules/notifications/types";
import { pageTitle, requireOrg } from "../../shell";
import { InboxScreen } from "./inbox-screen";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ tab?: string; n?: string }> };

export const generateMetadata = ({ params }: Props) => pageTitle(params, "nav.inbox");

const TABS: InboxTab[] = ["all", "unread", "forMe"];
const WELCOME_DAYS = 14;
const isNew = (createdAt: Date) => Date.now() - createdAt.getTime() < WELCOME_DAYS * 86_400_000;

/** Desk › Kotak masuk (PRD-10 §7): tabs, day groups, read and archive; the landing page (D20). */
export default async function InboxPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { tab: rawTab, n } = await searchParams;
  const tab = TABS.includes(rawTab as InboxTab) ? (rawTab as InboxTab) : "all";
  const limit = Math.min(Math.max(Number(n) || 50, 50), 500);
  const page = await requireOrg(slug);
  const [data, locale, t] = await Promise.all([inbox(page.ctx, tab, limit), getLocale(), getTranslator()]);
  // PRD-02 US-1: whoever just created the organization lands here with the "Selamat datang" card.
  const welcome = page.org.createdBy === page.ctx.userId && isNew(page.org.createdAt);
  return (
    <InboxScreen
      slug={slug}
      locale={locale}
      title={t("nav.inbox")}
      tab={tab}
      limit={limit}
      data={data}
      timezone={page.org.timezone}
      today={todayIn(page.org.timezone)}
      welcome={welcome ? { orgId: page.org.id, orgName: page.org.name } : null}
    />
  );
}
