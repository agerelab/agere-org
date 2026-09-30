"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Label } from "./label";

/* ================================================================== */
/* FormField — wires label / hint / error to the control automatically */
/* ================================================================== */
interface FieldCtx {
  id: string;
  hintId: string;
  errorId: string;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}
const FieldContext = React.createContext<FieldCtx | null>(null);

export function useFormField() {
  const ctx = React.useContext(FieldContext);
  if (!ctx) throw new Error("useFormField must be used inside <FormField>.");
  return ctx;
}

export interface FormFieldProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  label: React.ReactNode;
  /** Persistent helper text. Stays visible when an error appears (never replaced by it). */
  hint?: React.ReactNode;
  /** Error message — sets aria-invalid and aria-describedby on the control. */
  error?: string;
  required?: boolean;
  optional?: boolean | string;
  disabled?: boolean;
  /** Visually hide the label (still announced). Only for self-evident fields like search. */
  hideLabel?: boolean;
  /** "stack" (default) or "inline" (label left, control right — settings rows). */
  layout?: "stack" | "inline";
  id?: string;
  /** Wrap the control in <FormControl> so it receives id / aria-* automatically. */
  children: React.ReactNode;
}

export function FormField({
  label, hint, error, required, optional, disabled, hideLabel, layout = "stack", id: idProp, className, children, ...props
}: FormFieldProps) {
  const auto = React.useId();
  const id = idProp ?? `f-${auto.replace(/:/g, "")}`;
  const ctx: FieldCtx = { id, hintId: `${id}-hint`, errorId: `${id}-error`, hint, error, required, disabled };
  return (
    <FieldContext.Provider value={ctx}>
      <div
        className={cn(layout === "inline" ? "grid items-start gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:gap-6" : "grid content-start gap-2", className)}
        {...props}
      >
        {/* hideLabel: the wrapper leaves the grid flow too, so the control lines up with its neighbours */}
        <div className={cn("grid gap-1", layout === "inline" && "sm:pt-2", hideLabel && "sr-only")}>
          <Label htmlFor={id} required={required} optional={optional} >
            {label}
          </Label>
          {layout === "inline" && hint && <FormHint />}
        </div>
        <div className="grid content-start gap-1.5">
          {children}
          {layout === "stack" && hint && <FormHint />}
          {error && <FormError />}
        </div>
      </div>
    </FieldContext.Provider>
  );
}

/** Injects id, aria-describedby, aria-invalid, aria-required, disabled into its single child. */
export const FormControl = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>((props, ref) => {
  const { id, hintId, errorId, hint, error, required, disabled } = useFormField();
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <Slot
      ref={ref}
      id={id}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      aria-required={required || undefined}
      {...(disabled ? { disabled: true } : {})}
      {...props}
    />
  );
});
FormControl.displayName = "FormControl";

function FormHint() {
  const { hintId, hint } = useFormField();
  return <p id={hintId} className="text-sm text-muted-foreground">{hint}</p>;
}

function FormError() {
  const { errorId, error } = useFormField();
  return (
    <p id={errorId} className="flex items-start gap-1 text-sm text-destructive">
      <AlertCircle aria-hidden className="mt-px size-3.5 shrink-0" />
      {error}
    </p>
  );
}

/* ================================================================== */
/* Layout helpers                                                      */
/* ================================================================== */

/** cal.com settings section: title + description on the left (lg), fields on the right. */
export function FormSection({
  title, description, children, className, aside = true,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Two-column layout on lg screens. */
  aside?: boolean;
}) {
  const id = React.useId();
  return (
    <section aria-labelledby={id} className={cn("grid gap-6 py-8 first:pt-0", aside && "lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-10", className)}>
      <div className="grid content-start gap-1">
        <h2 id={id} className="text-base font-semibold leading-none tracking-tight text-foreground">{title}</h2>
        {description && <p className="text-sm text-subtle">{description}</p>}
      </div>
      <div className="grid gap-5">{children}</div>
    </section>
  );
}

/** Groups related fields in a row on ≥sm (first + last name). */
export function FormRow({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-5 sm:grid-cols-2", className)} {...props} />;
}

/** Footer actions: secondary left of primary, right-aligned; sticky option for long forms. */
export function FormActions({ className, sticky, ...props }: React.HTMLAttributes<HTMLDivElement> & { sticky?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-subtle pt-4 sm:flex-row sm:items-center sm:justify-end",
        sticky && "sticky bottom-0 -mx-4 bg-default/90 px-4 pb-4 backdrop-blur-glass sm:-mx-6 sm:px-6",
        className
      )}
      {...props}
    />
  );
}

/** Error summary shown at the top on submit — links focus each invalid field (WCAG 3.3.1). */
export function FormErrorSummary({ errors, title = "Please fix the following:" }: { errors: { fieldId: string; message: string }[]; title?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { if (errors.length) ref.current?.focus(); }, [errors.length]);
  if (!errors.length) return null;
  return (
    <div ref={ref} tabIndex={-1} role="alert" className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-destructive outline-none focus-ring">
      <p className="font-semibold">{title}</p>
      <ul className="mt-1 list-disc pl-5">
        {errors.map((e) => (
          <li key={e.fieldId}>
            <a href={`#${e.fieldId}`} className="underline underline-offset-2" onClick={(ev) => { ev.preventDefault(); document.getElementById(e.fieldId)?.focus(); }}>
              {e.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
