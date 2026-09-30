"use client";

import * as React from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

/**
 * Button — shadcn/ui v4 anatomy: rounded-md (8px), shadow-xs, 3px translucent focus ring.
 * Variant + size names are shadcn's, so blocks from ui.shadcn.com / shadcnstudio.com paste in unchanged.
 * Heights: sm 32 · md/default 36 · lg 40 (= Input) · xs 24 for dense workspace UI.
 *
 * v6 breaking: `secondary` is now the filled gray button (shadcn). The v4/v5 bordered button is `outline`.
 * `destructive` is now solid; the bordered red button is `destructive-outline`. Run `npm run codemod:v6`.
 * Deprecated aliases (removed in v7): primary → default · minimal → ghost · destructive-solid → destructive · accent → outline.
 */
const solidDefault = "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90";
const ghost = "text-foreground hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50";
const outline =
  "border border-border bg-background text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/10 dark:hover:bg-input/20";
const destructive =
  "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:[--ring:var(--ag-error-solid)]";

export const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap",
    "rounded-md text-sm font-medium",
    "transition-[background-color,border-color,color,box-shadow,opacity] duration-base ease-standard",
    "outline-none focus-ring focus-visible:border-ring",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "aria-[invalid=true]:border-destructive",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default: solidDefault,
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        outline,
        ghost,
        destructive,
        "destructive-outline":
          "border border-border bg-background text-error-on-surface shadow-xs hover:border-error-border hover:bg-error-bg hover:text-error-fg dark:bg-input/10",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
        /** @deprecated v6 — use `default` */
        primary: solidDefault,
        /** @deprecated v6 — use `ghost` */
        minimal: ghost,
        /** @deprecated v6 — use `destructive` */
        "destructive-solid": destructive,
        /** @deprecated use `outline` + a brand-accent icon */
        accent: outline,
      },
      size: {
        xs: "h-6 gap-1 rounded-md px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 has-[>[data-slot=leading-icon]]:pl-2.5 has-[>[data-slot=trailing-icon]]:pr-2.5",
        md: "h-9 px-4 py-2 has-[>[data-slot=leading-icon]]:pl-3 has-[>[data-slot=trailing-icon]]:pr-3",
        default: "h-9 px-4 py-2 has-[>[data-slot=leading-icon]]:pl-3 has-[>[data-slot=trailing-icon]]:pr-3",
        lg: "h-10 px-6 has-[>[data-slot=leading-icon]]:pl-4 has-[>[data-slot=trailing-icon]]:pr-4",
        "icon-xs": "size-6 p-0 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 p-0",
        icon: "size-9 p-0",
        "icon-lg": "size-10 p-0",
      },
      shape: { default: "", pill: "rounded-full" },
      fullWidth: { true: "w-full", false: "" },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: { variant: "default", size: "md", shape: "default", fullWidth: false },
  }
);

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as the child element (e.g. `<a>` or a router Link), merging props and classes. */
  asChild?: boolean;
  /** Shows a spinner in place of the leading icon, sets `aria-busy`, and blocks clicks. */
  loading?: boolean;
  /** Decorative icon before the label (Lucide element). Mirrors in RTL. */
  leadingIcon?: React.ReactNode;
  /** Decorative icon after the label — chevrons, external-link, arrows. */
  trailingIcon?: React.ReactNode;
  /** @deprecated alias of `leadingIcon` (v4) */
  startIcon?: React.ReactNode;
  /** @deprecated alias of `trailingIcon` (v4) */
  endIcon?: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/* ButtonGroup context — the group can set size/variant for its buttons */
/* ------------------------------------------------------------------ */
interface ButtonGroupContextValue {
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
}
const ButtonGroupContext = React.createContext<ButtonGroupContextValue | null>(null);

const VARIANT_ALIAS: Record<string, string> = { primary: "default", minimal: "ghost", "destructive-solid": "destructive", accent: "outline" };
function normalizeVariant(v: ButtonProps["variant"]): string {
  const name = v ?? "default";
  return VARIANT_ALIAS[name] ?? name;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className, variant: variantProp, size: sizeProp, shape, fullWidth, asChild = false, loading = false, disabled,
      leadingIcon, trailingIcon, startIcon, endIcon, children, type, onClick, ...props
    },
    ref
  ) => {
    const group = React.useContext(ButtonGroupContext);
    const variant = variantProp ?? group?.variant;
    const size = sizeProp ?? group?.size;
    const Comp = asChild ? Slot : "button";
    const lead = loading ? <Spinner size="xs" label={null} /> : (leadingIcon ?? startIcon);
    const trail = trailingIcon ?? endIcon;
    return (
      <Comp
        ref={ref}
        data-slot="button"
        data-variant={normalizeVariant(variant)}
        className={cn(buttonVariants({ variant, size, shape, fullWidth }), loading && "cursor-wait", className)}
        disabled={asChild ? undefined : disabled}
        aria-disabled={asChild && disabled ? true : undefined}
        aria-busy={loading || undefined}
        type={asChild ? undefined : (type ?? "button")}
        onClick={loading ? (e: React.MouseEvent<HTMLButtonElement>) => e.preventDefault() : onClick}
        {...props}
      >
        {lead && <span aria-hidden data-slot="leading-icon" className="inline-flex">{lead}</span>}
        <Slottable>{children}</Slottable>
        {trail && <span aria-hidden data-slot="trailing-icon" className="inline-flex">{trail}</span>}
      </Comp>
    );
  }
);
Button.displayName = "Button";

/* ------------------------------------------------------------------ */
/* IconButton — label is REQUIRED (type-enforced a11y)                 */
/* ------------------------------------------------------------------ */
export interface IconButtonProps extends Omit<ButtonProps, "children" | "startIcon" | "endIcon" | "leadingIcon" | "trailingIcon" | "size"> {
  /** Accessible name. Also shown as a tooltip unless `tooltip={false}`. */
  label: string;
  icon: React.ReactNode;
  size?: "xs" | "sm" | "md" | "lg";
  tooltip?: boolean;
  tooltipSide?: "top" | "right" | "bottom" | "left";
}

const ICON_SIZE = { xs: "icon-xs", sm: "icon-sm", md: "icon", lg: "icon-lg" } as const;

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, icon, size = "md", variant = "ghost", tooltip = true, tooltipSide = "top", ...props }, ref) => {
    const button = (
      <Button ref={ref} variant={variant} size={ICON_SIZE[size]} aria-label={label} {...props}>
        <span aria-hidden className="inline-flex">{icon}</span>
      </Button>
    );
    if (!tooltip) return button;
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side={tooltipSide}>{label}</TooltipContent>
      </Tooltip>
    );
  }
);
IconButton.displayName = "IconButton";

/* ------------------------------------------------------------------ */
/* ButtonGroup                                                         */
/* ------------------------------------------------------------------ */
export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Required: names the group for screen readers ("Text alignment", "Save options"). */
  "aria-label": string;
  orientation?: "horizontal" | "vertical";
  /**
   * `true` (default): buttons share borders and only the outer corners are rounded — segmented look.
   * `false`: separate buttons with an 8px gap (toolbars, dialog footers).
   */
  attached?: boolean;
  /** Applied to every child Button that doesn't set its own. */
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  /** Stretch to the container; children share the width equally. */
  fullWidth?: boolean;
}

/**
 * Groups related actions. role="group" + aria-label; each child stays its own tab stop.
 * Use for: split buttons (Save + ▾), segmented actions (Day / Week / Month when they trigger actions),
 * pagination-like controls. For a single-choice *state* use SegmentedControl instead.
 */
export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ orientation = "horizontal", attached = true, size, variant, fullWidth, className, children, ...props }, ref) => {
    const horizontal = orientation === "horizontal";
    return (
      <ButtonGroupContext.Provider value={{ size, variant }}>
        <div
          ref={ref}
          role="group"
          data-slot="button-group"
          data-orientation={orientation}
          data-attached={attached || undefined}
          className={cn(
            "inline-flex",
            horizontal ? "flex-row items-stretch" : "flex-col items-stretch",
            fullWidth && (horizontal ? "flex w-full [&>*]:flex-1" : "flex w-full"),
            attached
              ? [
                  "isolate [&>*]:rounded-none [&>*:hover]:z-[1] [&>*:focus-visible]:z-10",
                  horizontal
                    ? "[&>*:first-child]:rounded-l-md [&>*:last-child]:rounded-r-md [&>*:not(:first-child)]:-ml-px"
                    : "[&>*:first-child]:rounded-t-md [&>*:last-child]:rounded-b-md [&>*:not(:first-child)]:-mt-px",
                  /* solid fills need a visible divider between neighbours */
                  horizontal
                    ? "[&>[data-variant=default]:not(:first-child)]:border-l [&>[data-variant=default]:not(:first-child)]:border-l-[hsl(var(--ag-brand-fg)/0.25)] [&>[data-variant=destructive]:not(:first-child)]:border-l [&>[data-variant=destructive]:not(:first-child)]:border-l-[hsl(var(--ag-error-on-solid)/0.3)]"
                    : "[&>[data-variant=default]:not(:first-child)]:border-t [&>[data-variant=default]:not(:first-child)]:border-t-[hsl(var(--ag-brand-fg)/0.25)]",
                  "[&>[data-variant=outline]:not(:first-child)]:shadow-none",
                ]
              : horizontal ? "flex-wrap gap-2" : "gap-2",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </ButtonGroupContext.Provider>
    );
  }
);
ButtonGroup.displayName = "ButtonGroup";
