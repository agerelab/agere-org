"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

/** Returns page numbers with "…" gaps: [1, "…", 4, 5, 6, "…", 20] */
export function getPageRange(page: number, pageCount: number, siblings = 1): (number | "gap")[] {
  const total = siblings * 2 + 5;
  if (pageCount <= total) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const left = Math.max(page - siblings, 1);
  const right = Math.min(page + siblings, pageCount);
  const showLeftGap = left > 3;
  const showRightGap = right < pageCount - 2;
  if (!showLeftGap) return [...Array.from({ length: 3 + siblings * 2 }, (_, i) => i + 1), "gap", pageCount];
  if (!showRightGap) return [1, "gap", ...Array.from({ length: 3 + siblings * 2 }, (_, i) => pageCount - (3 + siblings * 2) + i + 1)];
  return [1, "gap", ...Array.from({ length: right - left + 1 }, (_, i) => left + i), "gap", pageCount];
}

export interface PaginationProps extends Omit<React.HTMLAttributes<HTMLElement>, "onChange"> {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  siblings?: number;
  label?: string;
  previousLabel?: string;
  nextLabel?: string;
  /** "numbered" (default) or "simple" (prev/next + "Page 2 of 9"). */
  variant?: "numbered" | "simple";
}

/** nav[aria-label=Pagination]; current page has aria-current="page". */
export function Pagination({
  page, pageCount, onPageChange, siblings = 1, label = "Pagination", previousLabel = "Previous page", nextLabel = "Next page",
  variant = "numbered", className, ...props
}: PaginationProps) {
  const range = getPageRange(page, pageCount, siblings);
  return (
    <nav aria-label={label} className={cn("flex items-center gap-1", className)} {...props}>
      <Button variant="outline" size="icon-sm" aria-label={previousLabel} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft aria-hidden />
      </Button>
      {variant === "simple" ? (
        <span className="px-2 text-sm text-subtle tabular-nums" aria-live="polite">
          Page <span className="font-medium text-emphasis">{page}</span> of {pageCount}
        </span>
      ) : (
        <ul className="flex items-center gap-1">
          {range.map((p, i) =>
            p === "gap" ? (
              <li key={`gap-${i}`} aria-hidden className="w-7 text-center text-sm text-muted">…</li>
            ) : (
              <li key={p}>
                <Button
                  variant={p === page ? "secondary" : "minimal"}
                  size="icon-sm"
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? "page" : undefined}
                  onClick={() => onPageChange(p)}
                  className={cn("tabular-nums", p === page && "text-emphasis")}
                >
                  <span className="text-sm">{p}</span>
                </Button>
              </li>
            )
          )}
        </ul>
      )}
      <Button variant="outline" size="icon-sm" aria-label={nextLabel} disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
        <ChevronRight aria-hidden />
      </Button>
    </nav>
  );
}

/** Table footer: "1–10 of 97" + rows-per-page select. */
export function PaginationSummary({
  page, pageSize, total, onPageSizeChange, pageSizeOptions = [10, 25, 50, 100], rowsLabel = "Rows per page", className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  rowsLabel?: string;
  className?: string;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const id = React.useId();
  return (
    <div className={cn("flex items-center gap-4 text-sm text-subtle", className)}>
      {onPageSizeChange && (
        <div className="flex items-center gap-2">
          <span id={id} className="hidden sm:inline">{rowsLabel}</span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger size="md" className="w-[76px]" aria-labelledby={id}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <span className="tabular-nums" aria-live="polite">
        <span className="font-medium text-emphasis">{from}–{to}</span> of {total}
      </span>
    </div>
  );
}
