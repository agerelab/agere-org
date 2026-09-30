import { getLocale, getTranslator } from "@/i18n/server";
import { can } from "@/modules/authz/matrix";
import { listTeams } from "@/modules/people/teams";
import { pageTitle, requireOrg } from "../../shell";
import { TeamsScreen } from "./teams-screen";

type Props = { params: Promise<{ slug: string }> };

export const generateMetadata = ({ params }: Props) => pageTitle(params, "nav.teams");

/** Organisasi › Tim (PRD-03 §6.4). Everyone may view; Owner/Admin manage. */
export default async function TeamsPage({ params }: Props) {
  const { slug } = await params;
  const page = await requireOrg(slug);
  const [teams, locale, t] = await Promise.all([listTeams(page.ctx), getLocale(), getTranslator()]);
  return <TeamsScreen slug={slug} locale={locale} title={t("nav.teams")} teams={teams} manage={can(page.ctx.role, "teams.manage")} />;
}
