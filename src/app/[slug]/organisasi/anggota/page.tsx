import { getLocale, getTranslator } from "@/i18n/server";
import { can } from "@/modules/authz/matrix";
import { listInvitations } from "@/modules/people/invitations";
import { listMembers } from "@/modules/people/members";
import { listTeams } from "@/modules/people/teams";
import { pageTitle, requireOrg } from "../../shell";
import { MembersScreen } from "./members-screen";

type Props = { params: Promise<{ slug: string }> };

export const generateMetadata = ({ params }: Props) => pageTitle(params, "nav.members");

/** Organisasi › Anggota (PRD-03 §5, §8). Everyone may view; managing needs Owner/Admin. */
export default async function MembersPage({ params }: Props) {
  const { slug } = await params;
  const page = await requireOrg(slug);
  const manage = can(page.ctx.role, "members.manage");
  const [members, invites, teams, locale, t] = await Promise.all([
    listMembers(page.ctx),
    manage ? listInvitations(page.ctx) : Promise.resolve([]),
    listTeams(page.ctx),
    getLocale(),
    getTranslator(),
  ]);
  return (
    <MembersScreen
      slug={slug}
      locale={locale}
      title={t("nav.members")}
      lead={t("people.lead", page.org.name)}
      orgName={page.org.name}
      me={{ userId: page.ctx.userId, role: page.ctx.role }}
      members={members.map((m) => ({ ...m, joinedAt: m.joinedAt.toISOString(), lastActiveAt: m.lastActiveAt?.toISOString() ?? null }))}
      invitations={invites.map((i) => ({ ...i, expiresAt: i.expiresAt.toISOString() }))}
      teams={teams}
    />
  );
}
