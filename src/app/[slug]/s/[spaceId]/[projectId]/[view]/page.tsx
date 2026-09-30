import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getDb } from "@/db/client";
import { getLocale, getTranslator } from "@/i18n/server";
import { todayIn } from "@/lib/dates";
import { checkProject } from "@/modules/space/access";
import { projectBoard, projectHeader, projectKpis, projectMembers } from "@/modules/space/queries";
import * as repo from "@/modules/space/repository";
import { NoSpaceAccess } from "@/ui/space/space-empty";
import { requireOrg } from "../../../../shell";
import { ProjectScreen, type ProjectView } from "./project-screen";

type Props = {
  params: Promise<{ slug: string; spaceId: string; projectId: string; view: string }>;
  searchParams: Promise<{ papan?: string; task?: string }>;
};
const VIEWS: ProjectView[] = ["daftar", "papan", "ringkasan", "anggota"];
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

/** Project page (PRD-06 §6.7): header, Daftar · Papan · Ringkasan · Anggota, board selector, the task modal (?task=). */
export default async function ProjectPage({ params, searchParams }: Props) {
  const { slug, spaceId, projectId, view } = await params;
  const { papan, task } = await searchParams;
  if (!VIEWS.includes(view as ProjectView)) notFound();
  const { page, project, decision } = await load(slug, projectId);
  const t = await getTranslator();
  if (!project || !decision) notFound();
  if (!decision.allow) {
    if (decision.reason === "NO_APP_ACCESS" || decision.reason === "APP_DISABLED") return <NoSpaceAccess slug={slug} t={t} />;
    notFound();
  }
  if (project.spaceId !== spaceId) redirect(`/${slug}/s/${project.spaceId}/${projectId}/${view}`);
  const today = todayIn(page.org.timezone);
  const [data, space, locale, header, kpis, members] = await Promise.all([
    projectBoard(page.ctx, projectId, papan, decision.level),
    repo.space(getDb(), page.ctx.organizationId, spaceId),
    getLocale(),
    projectHeader(page.ctx, project),
    view === "ringkasan" ? projectKpis(page.ctx, projectId, today) : undefined,
    view === "anggota" ? projectMembers(page.ctx, project, today, page.org.timezone) : undefined,
  ]);
  return (
    <ProjectScreen
      key={`${data.board.id}`}
      slug={slug}
      orgName={page.org.name}
      locale={locale}
      view={view as ProjectView}
      spaceName={space?.name ?? ""}
      data={data}
      header={header}
      description={project.description}
      kpis={kpis}
      members={members}
      override={decision.override}
      today={today}
      openTask={task && UUID.test(task) ? task : null}
    />
  );
}
