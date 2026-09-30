import "server-only";
import type { Metadata } from "next";
import { getTranslator } from "@/i18n/server";
import type { MessageKey } from "@/i18n";
import { requireOrg } from "@/modules/org/web";

export { requireOrg };

/** document.title = "{page} · {organization} · agere/org" (UI-01 "Shell & aksesibilitas"). */
export async function pageTitle(params: Promise<{ slug: string }>, key: MessageKey): Promise<Metadata> {
  const { slug } = await params;
  const [page, t] = await Promise.all([requireOrg(slug), getTranslator()]);
  return { title: `${t(key)} · ${page.org.name} · agere/org` };
}
