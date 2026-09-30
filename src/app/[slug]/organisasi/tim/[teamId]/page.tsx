import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLocale } from "@/i18n/server";
import { can } from "@/modules/authz/matrix";
import { listMembers } from "@/modules/people/members";
import { getTeam } from "@/modules/people/teams";
import { requireOrg } from "../../../shell";
import { TeamScreen } from "./team-screen";

type Props = { params: Promise<{ slug: string; teamId: string }> };
const UUID = /^[0-9a-f-]{36}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, teamId } = await params;
  const page = await requireOrg(slug);
  const team = UUID.test(teamId) ? await getTeam(page.ctx, teamId) : null;
  return { title: team ? `${team.name} · ${page.org.name} · agere/org` : "agere/org" };
}

export default async function TeamPage({ params }: Props) {
  const { slug, teamId } = await params;
  const page = await requireOrg(slug);
  const team = UUID.test(teamId) ? await getTeam(page.ctx, teamId) : null;
  if (!team) notFound();
  const [members, locale] = await Promise.all([listMembers(page.ctx), getLocale()]);
  return (
    <TeamScreen
      slug={slug}
      locale={locale}
      team={team}
      members={members.filter((m) => m.status === "active").map((m) => ({ userId: m.userId, name: m.name, email: m.email }))}
      manage={can(page.ctx.role, "teams.manage")}
    />
  );
}
