"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

/**
 * Confirmation for destructive / irreversible actions (role="alertdialog").
 * Initial focus lands on Cancel (the safe choice). Clicking the overlay does NOT dismiss.
 */
export interface ConfirmDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "destructive";
  loading?: boolean;
  onConfirm: () => unknown;
}

export function ConfirmDialog({
  open, onOpenChange, trigger, title, description, confirmLabel, cancelLabel = "Cancel", tone = "destructive", loading, onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <AlertDialogPrimitive.Trigger asChild>{trigger}</AlertDialogPrimitive.Trigger>}
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-overlay bg-overlay/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <AlertDialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-modal grid w-[calc(100vw-2rem)] gap-4 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg sm:max-w-lg",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          )}
        >
          <div className="flex gap-4">
            {tone === "destructive" && (
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-5" />
              </span>
            )}
            <div className="grid gap-2 text-left">
              <AlertDialogPrimitive.Title className="text-lg font-semibold leading-tight text-foreground">{title}</AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description className="text-sm text-muted-foreground">{description}</AlertDialogPrimitive.Description>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogPrimitive.Cancel className={buttonVariants({ variant: "outline" })}>{cancelLabel}</AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action
              className={buttonVariants({ variant: tone === "destructive" ? "destructive" : "default" })}
              aria-busy={loading || undefined}
              disabled={loading}
              onClick={(e) => {
                const r = onConfirm();
                if (r instanceof Promise) e.preventDefault();
              }}
            >
              {confirmLabel}
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
