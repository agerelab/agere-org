import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadShell } from "@/contracts/fakes/shell";
import { getTranslator } from "@/i18n/server";
import type { MessageKey } from "@/i18n";

/** Org + viewer for /{slug}; an organization the viewer is not in is a 404, never a 403 (PRD-02). */
export const requireShell = cache(async (slug: string) => {
  const shell = await loadShell(slug);
  if (!shell) notFound();
  return shell;
});

/** document.title = "{page} · {organization} · agere/org" (UI-01 "Shell & aksesibilitas"). */
export async function pageTitle(params: Promise<{ slug: string }>, key: MessageKey): Promise<Metadata> {
  const { slug } = await params;
  const [shell, t] = await Promise.all([loadShell(slug), getTranslator()]);
  return { title: shell ? `${t(key)} · ${shell.org.name} · agere/org` : "agere/org" };
}
