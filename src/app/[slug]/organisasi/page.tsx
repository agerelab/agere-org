import { redirect } from "next/navigation";
import { manageHome } from "@/ui/shell/nav";
import { requireShell } from "../shell";

export default async function Organisasi({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shell = await requireShell(slug);
  redirect(`/${slug}/${manageHome(shell.user.role)}`);
}
