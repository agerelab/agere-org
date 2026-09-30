import { redirect } from "next/navigation";

/** Desk is the landing screen (D20); Desk opens Kotak masuk (C-21). */
export default async function OrgHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/${slug}/desk/kotak-masuk`);
}
