"use client";

// Ringkasan (PRD-06 §6.7): facts first (open, overdue, due in 7 days, unassigned — top-level tasks,
// §6.13), then "Tentang proyek" with the manual status next to them (§6.8).
import { AvatarGroup } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Locale, translator } from "@/i18n";
import { formatDateShort } from "@/i18n/format";
import type { ProjectHeader, ProjectKpis } from "@/modules/space/queries";
import { StatusChip } from "./project-status";

type T = ReturnType<typeof translator>;

export function ProjectSummary({ t, locale, description, header, kpis, onStatus, onShare }: { t: T; locale: Locale; description: string; header: ProjectHeader; kpis: ProjectKpis; onStatus?: () => void; onShare: () => void }) {
  const tiles: { label: string; value: number; hint: string; tone?: "error" }[] = [
    { label: t("summary.open"), value: kpis.open, hint: t("summary.topLevel", String(kpis.open)) },
    { label: t("summary.overdue"), value: kpis.overdue, hint: kpis.overdue ? t("summary.overdueHint") : t("summary.none"), tone: kpis.overdue ? "error" : undefined },
    { label: t("summary.dueSoon"), value: kpis.dueSoon, hint: t("summary.dueSoonHint") },
    { label: t("summary.unassigned"), value: kpis.unassigned, hint: t("summary.unassignedHint") },
  ];
  const access = t(header.access === "restricted" ? "space.restricted" : header.access === "everyone" ? "space.everyone" : "project.followsSpace");
  return (
    <div className="grid gap-6">
      <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]" aria-label={t("summary.kpis")}>
        {tiles.map((x) => (
          <li key={x.label} className="grid gap-1 rounded-xl border border-default bg-card p-4">
            <span className="text-sm text-subtle">{x.label}</span>
            <span className={cn("text-2xl font-semibold tabular-nums text-emphasis", x.tone === "error" && "text-error-on-surface")}>{x.value}</span>
            <span className="text-xs text-subtle">{x.hint}</span>
          </li>
        ))}
      </ul>
      <section aria-labelledby="about" className="grid gap-4 rounded-xl border border-default bg-card p-5">
        <h2 id="about" className="text-base font-semibold text-emphasis">{t("summary.about")}</h2>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[160px_1fr]">
          <dt className="text-subtle">{t("space.description")}</dt>
          <dd className="whitespace-pre-line text-default">{description || t("project.noDescription")}</dd>
          <dt className="text-subtle">{t("summary.status")}</dt>
          <dd className="grid justify-items-start gap-1">
            <StatusChip t={t} locale={locale} status={header.status} targetDate={header.targetDate} onClick={onStatus} />
            {header.statusNote && <p className="text-default">{header.statusNote}</p>}
            {header.statusUpdatedAt && (
              <p className="text-xs text-subtle">{t("summary.statusUpdated", formatDateShort(locale, new Date(header.statusUpdatedAt)), header.statusUpdatedBy ?? "—")}</p>
            )}
          </dd>
          <dt className="text-subtle">{t("status.owner")}</dt>
          <dd className="text-default">{header.owner?.name ?? "—"}</dd>
          <dt className="text-subtle">{t("summary.access")}</dt>
          <dd className="text-default">{access}</dd>
          <dt className="text-subtle">{t("summary.members")}</dt>
          <dd>
            <button type="button" onClick={onShare} className="inline-flex items-center gap-2 rounded-md text-default hover:underline focus-ring">
              <AvatarGroup aria-hidden people={header.people} max={5} size="xs" />
              {t("share.peopleCount", String(header.people.length))}
            </button>
          </dd>
          <dt className="text-subtle">{t("summary.progress")}</dt>
          <dd className="text-default">{t("project.progress", String(kpis.done), String(kpis.total))}</dd>
        </dl>
      </section>
    </div>
  );
}
