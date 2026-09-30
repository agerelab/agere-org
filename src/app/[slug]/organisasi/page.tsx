import { redirect } from "next/navigation";
import { manageHome } from "@/ui/shell/nav";
import { requireOrg } from "../shell";

export default async function Organisasi({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await requireOrg(slug);
  redirect(`/${slug}/${manageHome(page.ctx.role)}`);
}
