import { Construction } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageHeaderContent, PageHeaderDescription, PageHeaderTitle } from "@/components/ui/page-header";

/** Content frame (UI-01 "Ritme ruang"): padding 32/40/56, max width 1320 (reading pages 960), blocks 24 apart. */
export function PageFrame({ title, description, width = "content", children }: { title: string; description?: string; width?: "content" | "read"; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-6 px-4 pb-14 pt-8 md:px-10 ${width === "read" ? "max-w-[960px]" : "max-w-[1320px]"}`}>
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>{title}</PageHeaderTitle>
          {description && <PageHeaderDescription>{description}</PageHeaderDescription>}
        </PageHeaderContent>
      </PageHeader>
      {children}
    </div>
  );
}

/** Stand-in body for screens that later slices build. */
export function ScreenPlaceholder({ title, body }: { title: string; body: string }) {
  return <EmptyState icon={<Construction />} title={title} description={body} />;
}
