"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Store — imperative API: toast.success("Saved")                      */
/* ------------------------------------------------------------------ */
export type ToastVariant = "neutral" | "success" | "error" | "attention" | "info";
export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** ms. Default 5000; errors 8000. Infinity = sticky. Minimum honored: 4000 (WCAG 2.2.1). */
  duration?: number;
  action?: { label: string; onClick: () => void; altText?: string };
}
interface ToastRecord extends ToastOptions { id: string; open: boolean }

type Listener = (t: ToastRecord[]) => void;
let state: ToastRecord[] = [];
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l(state));
let seq = 0;

function push(opts: ToastOptions) {
  const id = `t${++seq}`;
  state = [...state.slice(-2), { ...opts, id, open: true }]; // keep ≤3 visible
  emit();
  return id;
}
function dismiss(id: string) {
  state = state.map((t) => (t.id === id ? { ...t, open: false } : t));
  emit();
  setTimeout(() => { state = state.filter((t) => t.id !== id); emit(); }, 300);
}

export const toast = Object.assign((opts: ToastOptions | string) => push(typeof opts === "string" ? { title: opts } : opts), {
  success: (title: string, o?: Omit<ToastOptions, "title" | "variant">) => push({ ...o, title, variant: "success" }),
  error: (title: string, o?: Omit<ToastOptions, "title" | "variant">) => push({ ...o, title, variant: "error" }),
  info: (title: string, o?: Omit<ToastOptions, "title" | "variant">) => push({ ...o, title, variant: "info" }),
  warning: (title: string, o?: Omit<ToastOptions, "title" | "variant">) => push({ ...o, title, variant: "attention" }),
  dismiss,
});

export function useToasts() {
  const [list, setList] = React.useState(state);
  React.useEffect(() => { listeners.add(setList); return () => void listeners.delete(setList); }, []);
  return list;
}

/* ------------------------------------------------------------------ */
/* View — cal.com: inverted pill at bottom-center                      */
/* ------------------------------------------------------------------ */
const ICON: Record<ToastVariant, React.ElementType | null> = {
  neutral: null, success: CheckCircle2, error: AlertCircle, attention: AlertTriangle, info: Info,
};
const ICON_TONE: Record<ToastVariant, string> = {
  neutral: "", success: "text-success", error: "text-error", attention: "text-attention", info: "text-info",
};

/**
 * Mount once near the root. Radix renders an F8-reachable region ("Notifications (F8)"),
 * pauses timers on hover/focus, and announces with role=status (errors: foreground/assertive).
 */
export type ToasterPosition = "bottom-center" | "bottom-left" | "bottom-right";
const VIEWPORT_POSITION: Record<ToasterPosition, string> = {
  "bottom-center": "left-1/2 -translate-x-1/2",
  "bottom-left": "left-0",
  "bottom-right": "right-0",
};

export interface ToasterProps {
  label?: string;
  /** v6.4. Default bottom-center (unchanged). Use bottom-left on pages with a SaveBar or dialog footers on the right. */
  position?: ToasterPosition;
  /** v6.4. Extra distance from the bottom edge in px, e.g. the height of a sticky SaveBar. */
  offset?: number;
}

export function Toaster({ label = "Notifications ({hotkey})", position = "bottom-center", offset = 0 }: ToasterProps) {
  const toasts = useToasts();
  return (
    <ToastPrimitive.Provider swipeDirection="down" label={label}>
      {toasts.map((t) => {
        const variant = t.variant ?? "neutral";
        const Icon = ICON[variant];
        const duration = t.duration === Infinity ? 1e9 : Math.max(4000, t.duration ?? (variant === "error" ? 8000 : 5000));
        return (
          <ToastPrimitive.Root
            key={t.id}
            open={t.open}
            duration={duration}
            type={variant === "error" ? "foreground" : "background"}
            onOpenChange={(o) => !o && dismiss(t.id)}
            className={cn(
              "group pointer-events-auto relative flex w-full items-start gap-3 rounded-lg border border-border bg-popover p-4 pr-10 text-popover-foreground shadow-lg",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-2",
              "data-[swipe=move]:translate-y-[var(--radix-toast-swipe-move-y)] data-[swipe=end]:animate-out"
            )}
          >
            {Icon && <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", ICON_TONE[variant])} />}
            <div className="grid min-w-0 flex-1 gap-0.5">
              <ToastPrimitive.Title className="text-sm font-medium leading-5">{t.title}</ToastPrimitive.Title>
              {t.description && <ToastPrimitive.Description className="text-sm leading-5 text-muted-foreground">{t.description}</ToastPrimitive.Description>}
            </div>
            {t.action && (
              <ToastPrimitive.Action
                altText={t.action.altText ?? t.action.label}
                onClick={t.action.onClick}
                className="inline-flex h-6 shrink-0 items-center rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-ring"
              >
                {t.action.label}
              </ToastPrimitive.Action>
            )}
            <ToastPrimitive.Close aria-label="Dismiss notification" className="absolute right-2 top-2 inline-flex size-6 items-center justify-center rounded-md opacity-70 hover:opacity-100 focus-ring [&_svg]:size-4">
              <X aria-hidden />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        );
      })}
      <ToastPrimitive.Viewport data-position={position} style={offset ? { bottom: offset } : undefined} className={cn("fixed bottom-0 z-toast flex w-full max-w-[420px] flex-col gap-2 p-4 outline-none", VIEWPORT_POSITION[position])} />
    </ToastPrimitive.Provider>
  );
}
