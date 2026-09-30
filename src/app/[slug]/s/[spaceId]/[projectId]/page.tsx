import { ProjectLanding } from "@/ui/space/project-landing";

type Props = { params: Promise<{ slug: string; spaceId: string; projectId: string }> };

/** Project landing (PRD-06 §6.7): the last view opened on this device, else Papan. */
export default async function ProjectHome({ params }: Props) {
  const { slug, spaceId, projectId } = await params;
  return <ProjectLanding base={`/${slug}/s/${spaceId}/${projectId}`} projectId={projectId} />;
}
