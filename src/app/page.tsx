import { cookies } from "next/headers";
import { resolveLocale, translator } from "@/i18n";

export default async function Home() {
  const t = translator(resolveLocale((await cookies()).get("agere-lang")?.value));
  return (
    <main className="placeholder">
      <p className="eyebrow">{t("app.name")}</p>
      <h1>{t("home.title")}</h1>
      <p>{t("home.body")}</p>
      <p className="muted">{t("app.tagline")}</p>
    </main>
  );
}
