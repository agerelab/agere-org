"use client";

import * as React from "react";
import Link from "next/link";
import { Layers, Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { translator, type Locale } from "@/i18n";
import { PageFrame } from "@/ui/shell/page-frame";
import { SpaceDialog } from "./space-dialog";

/** "Belum ada space" (PRD-06 D46) with "Space baru". */
export function NoSpaces({ slug, orgId, locale }: { slug: string; orgId: string; locale: Locale }) {
  const t = translator(locale);
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <EmptyState
        icon={<Layers />}
        headingLevel="h2"
        title={t("space.emptyTitle")}
        description={t("space.emptyAny")}
        actions={<Button onClick={() => setOpen(true)}><Plus aria-hidden />{t("space.newSpace")}</Button>}
      />
      {open && <SpaceDialog t={t} slug={slug} orgId={orgId} open={open} onOpenChange={setOpen} />}
    </>
  );
}

/** NO_APP_ACCESS / APP_DISABLED state (PRD-04 §8.3). */
export function NoSpaceAccess({ slug, t }: { slug: string; t: ReturnType<typeof translator> }) {
  return (
    <PageFrame title={t("nav.space")}>
      <EmptyState
        icon={<Lock />}
        headingLevel="h2"
        title={t("space.noAccess.title")}
        description={t("space.noAccess.body")}
        actions={<Button asChild variant="outline"><Link href={`/${slug}`}>{t("denied.home")}</Link></Button>}
      />
    </PageFrame>
  );
}

/** Remembers the last visited space for the Space rail item (D46). */
export function RememberSpace({ orgId, spaceId }: { orgId: string; spaceId: string }) {
  React.useEffect(() => {
    document.cookie = `agere-space-${orgId}=${spaceId}; path=/; max-age=31536000; samesite=lax`;
  }, [orgId, spaceId]);
  return null;
}
