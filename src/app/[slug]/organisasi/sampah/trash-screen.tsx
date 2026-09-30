"use client";

import * as React from "react";
import { CheckSquare, FolderKanban, Layers, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { translator, type Locale, type MessageKey } from "@/i18n";
import { formatDateMedium } from "@/i18n/format";
import type { TrashItem } from "@/modules/space/trash";
import { PageFrame } from "@/ui/shell/page-frame";
import { restoreAction } from "../../s/actions";

const ICON = { space: Layers, project: FolderKanban, task: CheckSquare };

export function TrashScreen({ slug, locale, title, items, timezone }: { slug: string; locale: Locale; title: string; items: TrashItem[]; timezone: string }) {
  const t = translator(locale);
  const [pending, start] = React.useTransition();
  const [busy, setBusy] = React.useState<string | null>(null);

  const restore = (item: TrashItem) =>
    start(async () => {
      setBusy(item.id);
      const r = await restoreAction(slug, item.kind, item.id);
      setBusy(null);
      if (!r.ok) return void toast.error(t(r.error));
      // QA AD10: the toast names the item.
      toast.success(t("trash.restored", item.name));
    });

  return (
    <PageFrame title={title} description={t("trash.lead")}>
      {items.length === 0 ? (
        <EmptyState icon={<Trash2 />} headingLevel="h2" title={t("trash.emptyTitle")} description={t("trash.emptyBody")} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("people.col.name")}</TableHead>
              <TableHead className="max-md:hidden">{t("trash.col.where")}</TableHead>
              <TableHead className="max-md:hidden">{t("trash.col.deleted")}</TableHead>
              <TableHead>{t("trash.col.purge")}</TableHead>
              <TableHead className="w-28"><span className="sr-only">{t("trash.restore")}</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const Icon = ICON[item.kind];
              return (
                <TableRow key={`${item.kind}:${item.id}`}>
                  <TableCell>
                    <span className="flex items-center gap-3">
                      <Icon aria-hidden className="size-4 shrink-0 text-subtle" />
                      <span className="grid min-w-0">
                        <span className="truncate font-medium text-emphasis">{item.name}</span>
                        <span className="text-xs text-subtle">{t(`trash.kind.${item.kind}` as MessageKey)}</span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="text-subtle max-md:hidden">{item.where || "—"}</TableCell>
                  <TableCell className="text-subtle max-md:hidden">{t("trash.deletedBy", formatDateMedium(locale, new Date(item.deletedAt), timezone), item.deletedBy)}</TableCell>
                  <TableCell className="text-subtle">{formatDateMedium(locale, new Date(item.purgeAt), timezone)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" loading={pending && busy === item.id} disabled={pending} onClick={() => restore(item)} aria-label={t("trash.restoreItem", item.name)}>
                      {t("trash.restore")}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </PageFrame>
  );
}
