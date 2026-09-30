"use client";

// Space panel (PRD-06 §6.5): search · Favorit · "Semua space" tree (space → projects). "+" creates a
// space. v2.1.2: no "Semua proyek" row.
import * as React from "react";
import Link from "next/link";
import { Plus, Search, Star } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { translator } from "@/i18n";
import { assetUrl, initials, SpaceIcon } from "./icons";
import { SpaceDialog } from "./space-dialog";

export type PanelSpace = { id: string; name: string; iconKey: string; iconAssetId: string | null; projects: { id: string; name: string; favorite: boolean }[] };
type T = ReturnType<typeof translator>;

const row = "flex h-8 items-center gap-2 rounded-md px-2 text-sm text-default hover:bg-emphasis focus-ring aria-[current=page]:bg-emphasis aria-[current=page]:font-medium aria-[current=page]:text-emphasis";
const tile = (name: string) => <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded bg-subtle text-[10px] font-semibold">{initials(name)}</span>;

export function SpacePanel({ t, base, path, spaces, orgId }: { t: T; base: string; path: string; spaces: PanelSpace[] | null; orgId: string }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [, spaceId, projectId] = path.split("/");
  const slug = base.slice(1);
  const q = query.trim().toLowerCase();
  const tree = (spaces ?? [])
    .map((s) => ({ ...s, projects: s.projects.filter((p) => !q || p.name.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)) }))
    .filter((s) => !q || s.name.toLowerCase().includes(q) || s.projects.length > 0);
  const favorites = (spaces ?? []).flatMap((s) => s.projects.filter((p) => p.favorite).map((p) => ({ ...p, spaceId: s.id })));

  return (
    <nav aria-label={t("nav.spaceNav")}>
      {spaces && spaces.length > 0 && (
        <div className="mt-3 px-1">
          <Input type="search" aria-label={t("panel.search")} placeholder={t("panel.search")} leadingIcon={<Search />} value={query} onChange={(e) => setQuery(e.target.value)} className="h-8" />
        </div>
      )}
      {favorites.length > 0 && !q && (
        <>
          <p className="mb-1 mt-4 px-2 text-xs font-medium text-subtle">{t("panel.favorites")}</p>
          <ul className="grid gap-0.5">
            {favorites.map((p) => (
              <li key={p.id}>
                <Link href={`${base}/s/${p.spaceId}/${p.id}`} aria-current={projectId === p.id ? "page" : undefined} className={row}>
                  <Star aria-hidden className="size-4 shrink-0 fill-current text-attention-on-surface" />
                  <span className="truncate">{p.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="mb-1 mt-4 flex items-center justify-between px-2">
        <p className="text-xs font-medium text-subtle">{t("nav.allSpaces")}</p>
        {spaces && <IconButton size="xs" label={t("space.newSpace")} icon={<Plus />} onClick={() => setOpen(true)} tooltipSide="right" />}
      </div>
      {!spaces ? (
        <p className="mx-2 rounded-md border border-default bg-default px-3 py-2.5 text-xs text-subtle">{t("space.noAccess.title")}</p>
      ) : spaces.length === 0 ? (
        <p className="mx-2 rounded-md border border-default bg-default px-3 py-2.5 text-xs text-subtle">{t("nav.noSpaces")}</p>
      ) : tree.length === 0 ? (
        <p className="px-2 text-xs text-subtle">{t("panel.noMatch")}</p>
      ) : (
        <ul className="grid gap-0.5">
          {tree.map((s) => (
            <li key={s.id}>
              <Link href={`${base}/s/${s.id}`} aria-current={spaceId === s.id && !projectId ? "page" : undefined} className={row}>
                <SpaceIcon iconKey={s.iconKey} src={assetUrl(orgId, s.iconAssetId)} className="size-4 shrink-0 text-subtle" />
                <span className="truncate">{s.name}</span>
              </Link>
              {s.projects.length > 0 && (
                <ul className="grid gap-0.5">
                  {s.projects.map((p) => (
                    <li key={p.id}>
                      <Link href={`${base}/s/${s.id}/${p.id}`} aria-current={projectId === p.id ? "page" : undefined} className={cn(row, "pl-7")}>
                        {tile(p.name)}
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
      {open && <SpaceDialog t={t} slug={slug} orgId={orgId} open={open} onOpenChange={setOpen} />}
    </nav>
  );
}
