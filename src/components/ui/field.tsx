"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Label } from "./label";
import { Separator } from "./separator";

/**
 * Field — shadcn/ui's composable form-field primitives (FieldSet · FieldLegend · FieldGroup · Field · FieldLabel ·
 * FieldContent · FieldTitle · FieldDescription · FieldError · FieldSeparator).
 *
 * Copy-paste compatible: explicit `id` / `htmlFor` / `aria-describedby` still work exactly like shadcn.
 * Agere addition: inside <Field>, wrap the control in <FieldControl> and the label, description and error are wired
 * for you (id, htmlFor, aria-describedby, aria-invalid) — shadcn leaves that to every call site.
 * Prefer FormField for simple stacked fields; use Field for choice cards, horizontal settings rows and fieldsets.
 *
 * Choice cards (a FieldLabel wrapping a Field with a Radix RadioGroupItem / Checkbox): those controls are <button>s, and a
 * wrapping <label> doesn't name a button reliably across screen readers (axe: button-name). Give the control
 * aria-labelledby → the FieldTitle's id. See Components → Field.
 */
type Ctx = { id: string; invalid: boolean; descId: string; errId: string; hasDesc: boolean; hasErr: boolean; setDesc: (v: boolean) => void; setErr: (v: boolean) => void };
const FieldContext = React.createContext<Ctx | null>(null);
export const useField = () => React.useContext(FieldContext);

export function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn("flex min-w-0 flex-col gap-6 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3", className)}
      {...props}
    />
  );
}

export function FieldLegend({ className, variant = "legend", ...props }: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend data-slot="field-legend" data-variant={variant} className={cn("mb-3 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base", className)} {...props} />
  );
}

export function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field-group" className={cn("group/field-group flex w-full flex-col gap-7 [&>[data-slot=field-group]]:gap-4", className)} {...props} />;
}

export const fieldVariants = cva("group/field flex w-full gap-3 data-[invalid=true]:text-destructive", {
  variants: {
    orientation: {
      vertical: "flex-col [&>*]:w-full [&>.sr-only]:w-auto",
      horizontal: "flex-row items-center [&>[data-slot=field-label]]:flex-auto has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
      responsive: "flex-col [&>*]:w-full [&>.sr-only]:w-auto md:flex-row md:items-center md:[&>*]:w-auto md:[&>[data-slot=field-label]]:flex-auto md:has-[>[data-slot=field-content]]:items-start",
    },
  },
  defaultVariants: { orientation: "vertical" },
});

export interface FieldProps extends React.ComponentProps<"div">, VariantProps<typeof fieldVariants> {
  /** Marks the field invalid (red label, aria-invalid on the FieldControl). shadcn API: data-invalid. */
  invalid?: boolean;
  "data-invalid"?: boolean;
  "data-disabled"?: boolean;
}

export function Field({ className, orientation = "vertical", invalid, id: idProp, ...props }: FieldProps) {
  const auto = React.useId();
  const id = idProp ?? `field-${auto.replace(/:/g, "")}`;
  const isInvalid = invalid ?? props["data-invalid"] ?? false;
  const [hasDesc, setDesc] = React.useState(false);
  const [hasErr, setErr] = React.useState(false);
  return (
    <FieldContext.Provider value={{ id, invalid: !!isInvalid, descId: `${id}-description`, errId: `${id}-error`, hasDesc, hasErr, setDesc, setErr }}>
      <div role="group" data-slot="field" data-orientation={orientation} data-invalid={isInvalid || undefined} className={cn(fieldVariants({ orientation }), className)} {...props} />
    </FieldContext.Provider>
  );
}

/** Agere: wires the single control inside a Field (input, textarea, select trigger, checkbox, switch, combobox…). */
export const FieldControl = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ id: _ignoredId, "aria-describedby": describedByProp, "aria-invalid": invalidProp, ...props }, ref) => {
    const ctx = useField();
    if (!ctx) return <Slot ref={ref} id={_ignoredId} aria-describedby={describedByProp} aria-invalid={invalidProp} {...props} />;
    // Merge — never overwrite — the caller's describedby with the field's description + error ids, and keep the
    // control's id equal to the one FieldLabel's htmlFor points at (pass `id` on <Field>, not on the control).
    const describedBy = [describedByProp, ctx.hasDesc ? ctx.descId : null, ctx.hasErr ? ctx.errId : null].filter(Boolean).join(" ") || undefined;
    // data-field-control, NOT data-slot: the child's own data-slot (checkbox, switch, input-group-control…) drives its
    // styling and the forced-colors rules in globals.css, so it must survive.
    return <Slot ref={ref} {...props} id={ctx.id} aria-describedby={describedBy} aria-invalid={invalidProp ?? (ctx.invalid || undefined)} data-field-control="" />;
  }
);
FieldControl.displayName = "FieldControl";

export function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field-content" className={cn("group/field-content flex flex-1 flex-col gap-1.5 leading-snug", className)} {...props} />;
}

export function FieldLabel({ className, htmlFor, ...props }: React.ComponentProps<typeof Label>) {
  const ctx = useField();
  return (
    <Label
      data-slot="field-label"
      htmlFor={htmlFor ?? ctx?.id}
      className={cn(
        "group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50",
        "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border has-[>[data-slot=field]]:border-border [&>[data-slot=field]]:p-4",
        "has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 dark:has-[[data-state=checked]]:bg-primary/10",
        className
      )}
      {...props}
    />
  );
}

export function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field-label" className={cn("flex w-fit items-center gap-2 text-sm font-medium leading-snug group-data-[disabled=true]/field:opacity-50", className)} {...props} />;
}

export function FieldDescription({ className, id, ...props }: React.ComponentProps<"p">) {
  const ctx = useField();
  React.useLayoutEffect(() => { ctx?.setDesc(true); return () => ctx?.setDesc(false); }, [ctx?.setDesc]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <p
      id={id ?? ctx?.descId}
      data-slot="field-description"
      className={cn("text-sm font-normal leading-normal text-muted-foreground [&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4", className)}
      {...props}
    />
  );
}

export function FieldSeparator({ children, className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="field-separator" data-content={!!children} className={cn("relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2", className)} {...props}>
      <Separator className="absolute inset-0 top-1/2" />
      {children && <span className="relative mx-auto block w-fit bg-background px-2 text-muted-foreground" data-slot="field-separator-content">{children}</span>}
    </div>
  );
}

export function FieldError({ className, children, errors, id, ...props }: React.ComponentProps<"div"> & { errors?: Array<{ message?: string } | undefined> }) {
  const ctx = useField();
  const content = React.useMemo(() => {
    if (children) return children;
    const uniq = [...new Map((errors ?? []).filter(Boolean).map((e) => [e!.message, e])).values()].filter((e) => e?.message);
    if (!uniq.length) return null;
    if (uniq.length === 1) return uniq[0]!.message;
    return <ul className="ml-4 flex list-disc flex-col gap-1">{uniq.map((e, i) => <li key={i}>{e!.message}</li>)}</ul>;
  }, [children, errors]);
  const has = !!content;
  React.useLayoutEffect(() => { ctx?.setErr(has); return () => ctx?.setErr(false); }, [has, ctx?.setErr]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!content) return null;
  return <div role="alert" id={id ?? ctx?.errId} data-slot="field-error" className={cn("text-sm font-normal text-destructive", className)} {...props}>{content}</div>;
}
