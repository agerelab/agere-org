"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface StepperStep {
  id: string;
  label: string;
  description?: string;
}

export interface StepperProps extends React.HTMLAttributes<HTMLOListElement> {
  steps: StepperStep[];
  /** 0-based index of the current step. */
  current: number;
  orientation?: "horizontal" | "vertical";
  /**
   * `numbered`: labelled steps with check marks (checkout, setup wizards).
   * `bars`: cal.com onboarding — "Step 2 of 4" + segmented bar.
   */
  variant?: "numbered" | "bars";
  /** Allow jumping back to completed steps. */
  onStepClick?: (index: number) => void;
}

/** ol > li with aria-current="step". Completed/upcoming state is in the accessible name, not color alone. */
export function Stepper({ steps, current, orientation = "horizontal", variant = "numbered", onStepClick, className, ...props }: StepperProps) {
  if (variant === "bars") {
    return (
      <div className={cn("grid gap-2", className)}>
        <p className="text-sm text-subtle">
          Step <span className="font-medium text-emphasis">{current + 1}</span> of {steps.length}
          <span className="sr-only">: {steps[current]?.label}</span>
        </p>
        <ol className="flex gap-1.5" {...props}>
          {steps.map((s, i) => (
            <li key={s.id} aria-current={i === current ? "step" : undefined} className="flex-1">
              <span className="sr-only">{s.label} — {i < current ? "completed" : i === current ? "current" : "not started"}</span>
              <span aria-hidden className={cn("block h-1 rounded-full transition-colors duration-slow", i <= current ? "bg-primary" : "bg-muted")} />
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const vertical = orientation === "vertical";
  return (
    <ol className={cn("flex", vertical ? "flex-col gap-0" : "items-start gap-2", className)} {...props}>
      {steps.map((s, i) => {
        const state = i < current ? "complete" : i === current ? "current" : "upcoming";
        const clickable = onStepClick && state === "complete";
        const Marker = (
          <span
            aria-hidden
            className={cn(
              "grid size-7 shrink-0 place-items-center rounded-full border text-xs font-medium tabular-nums transition-colors duration-base",
              state === "complete" && "border-primary bg-primary text-primary-foreground",
              state === "current" && "border-primary bg-background text-foreground shadow-[0_0_0_3px_hsl(var(--ring)/0.35)]",
              state === "upcoming" && "border-border bg-background text-muted-foreground"
            )}
          >
            {state === "complete" ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
          </span>
        );
        const text = (
          <span className="grid min-w-0 gap-0.5 text-left">
            <span className={cn("text-sm font-medium", state === "upcoming" ? "text-subtle" : "text-emphasis")}>{s.label}</span>
            {s.description && <span className="text-xs text-subtle">{s.description}</span>}
            <span className="sr-only">{state === "complete" ? "(completed)" : state === "current" ? "(current step)" : "(not started)"}</span>
          </span>
        );
        const inner = (
          <span className={cn("flex items-start gap-3", !vertical && "flex-col items-start gap-2 lg:flex-row lg:items-center")}>
            {Marker}
            {text}
          </span>
        );
        return (
          <li
            key={s.id}
            aria-current={state === "current" ? "step" : undefined}
            className={cn("relative flex-1", vertical && "pb-6 last:pb-0")}
          >
            {vertical && i < steps.length - 1 && (
              <span aria-hidden className={cn("absolute left-3.5 top-8 h-[calc(100%-2.25rem)] w-px", i < current ? "bg-primary" : "bg-muted")} />
            )}
            {!vertical && i < steps.length - 1 && (
              <span aria-hidden className={cn("absolute left-9 right-2 top-3.5 hidden h-px sm:block lg:hidden", i < current ? "bg-primary" : "bg-muted")} />
            )}
            {clickable ? (
              <button type="button" onClick={() => onStepClick(i)} className="rounded-lg focus-ring">
                {inner}
              </button>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ol>
  );
}
