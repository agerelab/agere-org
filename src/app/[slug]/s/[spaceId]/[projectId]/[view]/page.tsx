import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getDb } from "@/db/client";
import { getLocale, getTranslator } from "@/i18n/server";
import { todayIn } from "@/lib/dates";
import { checkProject } from "@/modules/space/access";
import { projectBoard } from "@/modules/space/queries";
import * as repo from "@/modules/space/repository";
import { NoSpaceAccess } from "@/ui/space/space-empty";
import { requireOrg } from "../../../../shell";
import { ProjectScreen } from "./project-screen";

type Props = {
  params: Promise<{ slug: string; spaceId: string; projectId: string; view: string }>;
  searchParams: Promise<{ papan?: string; task?: string }>;
};
const VIEWS = ["daftar", "papan"];
const UUID = /^[0-9a-f-]{36}$/;

async function load(slug: string, projectId: string) {
  const page = await requireOrg(slug);
  const project = UUID.test(projectId) ? await repo.project(getDb(), page.ctx.organizationId, projectId) : undefined;
  const decision = project ? await checkProject(page.ctx, "view", project) : null;
  return { page, project, decision };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, projectId } = await params;
  const { page, project, decision } = await load(slug, projectId);
  return { title: project && decision?.allow ? `${project.name} · ${page.org.name} · agere/org` : "agere/org" };
}

/** Project page (PRD-06 §6.7): header, Daftar/Papan tabs, board selector, the task modal (?task=). */
export default async function ProjectPage({ params, searchParams }: Props) {
  const { slug, spaceId, projectId, view } = await params;
  const { papan, task } = await searchParams;
  if (!VIEWS.includes(view)) notFound();
  const { page, project, decision } = await load(slug, projectId);
  const t = await getTranslator();
  if (!project || !decision) notFound();
  if (!decision.allow) {
    if (decision.reason === "NO_APP_ACCESS" || decision.reason === "APP_DISABLED") return <NoSpaceAccess slug={slug} t={t} />;
    notFound();
  }
  if (project.spaceId !== spaceId) redirect(`/${slug}/s/${project.spaceId}/${projectId}/${view}`);
  const [data, space, locale] = await Promise.all([projectBoard(page.ctx, projectId, papan, decision.level), repo.space(getDb(), page.ctx.organizationId, spaceId), getLocale()]);
  return (
    <ProjectScreen
      key={`${data.board.id}`}
      slug={slug}
      locale={locale}
      view={view as "daftar" | "papan"}
      spaceName={space?.name ?? ""}
      data={data}
      override={decision.override}
      today={todayIn(page.org.timezone)}
      openTask={task && UUID.test(task) ? task : null}
    />
  );
}
