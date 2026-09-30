import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { translator } from "@/i18n";
import { PageFrame } from "@/ui/shell/page-frame";

/** ADMIN_ONLY denied state (PRD-04 §8.3) for Kelola pages that need Owner/Admin. */
export function AdminOnly({ slug, t, title }: { slug: string; t: ReturnType<typeof translator>; title: string }) {
  return (
    <PageFrame title={title}>
      <EmptyState
        icon={<ShieldAlert />}
        title={t("denied.adminOnly.title")}
        description={t("denied.adminOnly.body")}
        actions={
          <Button asChild variant="outline">
            <Link href={`/${slug}`}>{t("denied.home")}</Link>
          </Button>
        }
      />
    </PageFrame>
  );
}
