"use client";

// Space panel (PRD-06 §6.5): "Semua space" tree — space → projects. "+" creates a space.
import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { translator } from "@/i18n";
import { initials, SpaceIcon } from "./icons";
import { SpaceDialog } from "./space-dialog";

export type PanelSpace = { id: string; name: string; iconKey: string; projects: { id: string; name: string }[] };
type T = ReturnType<typeof translator>;

const row = "flex h-8 items-center gap-2 rounded-md px-2 text-sm text-default hover:bg-emphasis focus-ring aria-[current=page]:bg-emphasis aria-[current=page]:font-medium aria-[current=page]:text-emphasis";

export function SpacePanel({ t, base, path, spaces }: { t: T; base: string; path: string; spaces: PanelSpace[] | null }) {
  const [open, setOpen] = React.useState(false);
  const [, spaceId, projectId] = path.split("/");
  const slug = base.slice(1);
  return (
    <nav aria-label={t("nav.spaceNav")}>
      <div className="mb-1 mt-4 flex items-center justify-between px-2">
        <p className="text-xs font-medium text-subtle">{t("nav.allSpaces")}</p>
        {spaces && <IconButton size="xs" label={t("space.newSpace")} icon={<Plus />} onClick={() => setOpen(true)} tooltipSide="right" />}
      </div>
      {!spaces ? (
        <p className="mx-2 rounded-md border border-default bg-default px-3 py-2.5 text-xs text-subtle">{t("space.noAccess.title")}</p>
      ) : spaces.length === 0 ? (
        <p className="mx-2 rounded-md border border-default bg-default px-3 py-2.5 text-xs text-subtle">{t("nav.noSpaces")}</p>
      ) : (
        <ul className="grid gap-0.5">
          {spaces.map((s) => (
            <li key={s.id}>
              <Link href={`${base}/s/${s.id}`} aria-current={spaceId === s.id && !projectId ? "page" : undefined} className={row}>
                <SpaceIcon iconKey={s.iconKey} className="size-4 text-subtle" />
                <span className="truncate">{s.name}</span>
              </Link>
              {s.projects.length > 0 && (
                <ul className="grid gap-0.5">
                  {s.projects.map((p) => (
                    <li key={p.id}>
                      <Link href={`${base}/s/${s.id}/${p.id}`} aria-current={projectId === p.id ? "page" : undefined} className={cn(row, "pl-7")}>
                        <span aria-hidden className="grid size-5 place-items-center rounded bg-subtle text-[10px] font-semibold">{initials(p.name)}</span>
                        <span className="truncate">{p.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
      {open && <SpaceDialog t={t} slug={slug} open={open} onOpenChange={setOpen} />}
    </nav>
  );
}
