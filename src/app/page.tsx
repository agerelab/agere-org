import { redirect } from "next/navigation";
import { currentSession } from "@/modules/identity/web";
import { landingPath } from "@/modules/org/service";

/** Landing (PRD-01 §8.1, PRD-02 §6.2): sign-in, verification, then the organization to work in. */
export default async function Home() {
  const session = await currentSession();
  if (!session) redirect("/masuk");
  if (!session.user.emailVerifiedAt) redirect("/cek-email");
  redirect(await landingPath(session.user));
}
