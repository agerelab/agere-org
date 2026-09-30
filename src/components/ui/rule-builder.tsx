"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * RuleBuilder (v6.4) — "When · Where · If · Then" automation rules, with a sentence preview that always reads
 * the rule back in plain language. Each row is a labelled group, so its controls are announced with the row name.
 *
 *   <RuleBuilder preview={<RuleBuilderPreview>When a request arrives in <b>Design</b>, run <b>/triage</b>.</RuleBuilderPreview>}>
 *     <RuleBuilderRow label="When"><Select … /></RuleBuilderRow>
 *     <RuleBuilderRow label="If" optional><Select … /></RuleBuilderRow>
 *   </RuleBuilder>
 */
export function RuleBuilder({ preview, className, children, ...props }: React.ComponentProps<"div"> & { preview?: React.ReactNode }) {
  return (
    <div data-slot="rule-builder" className={cn("grid gap-4", className)} {...props}>
      {preview}
      <div data-slot="rule-builder-rows" className="grid gap-3">{children}</div>
    </div>
  );
}

export function RuleBuilderPreview({ icon, className, children, ...props }: React.ComponentProps<"div"> & { icon?: React.ReactNode }) {
  return (
    <div
      role="status"
      data-slot="rule-builder-preview"
      className={cn("flex items-start gap-3 rounded-lg border border-border bg-muted p-4 text-sm leading-6 text-foreground [&_b]:font-semibold [&_strong]:font-semibold", className)}
      {...props}
    >
      {icon && <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-md bg-background text-foreground [&_svg]:size-4">{icon}</span>}
      <p className="min-w-0">{children}</p>
    </div>
  );
}

export interface RuleBuilderRowProps extends Omit<React.ComponentProps<"div">, "children"> {
  label: string;
  optional?: boolean;
  /** Visible suffix for optional rows. */
  optionalLabel?: string;
  children: React.ReactNode;
}

export function RuleBuilderRow({ label, optional = false, optionalLabel = "optional", className, children, ...props }: RuleBuilderRowProps) {
  const id = React.useId();
  return (
    <div role="group" aria-labelledby={id} data-slot="rule-builder-row" className={cn("grid gap-2 md:grid-cols-[6rem_minmax(0,1fr)] md:items-center md:gap-4", className)} {...props}>
      <span id={id} className="text-sm font-medium text-muted-foreground">
        {label}
        {optional && " "}
        {/* The space is a sibling text node: accessible-name computation trims text inside inline elements. */}
        {optional && <span className="font-normal">({optionalLabel})</span>}
      </span>
      <div data-slot="rule-builder-controls" className="grid min-w-0 gap-2 sm:grid-flow-col sm:auto-cols-fr">{children}</div>
    </div>
  );
}
