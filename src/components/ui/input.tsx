"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Eye, EyeOff, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Shared field recipe (Input, Textarea, Select trigger) — shadcn/ui v4 anatomy.
 * md = 36px (DEFAULT, shadcn h-9; 16px text on mobile → no iOS focus zoom, 14px from md breakpoint)
 * lg = 40px (auth, onboarding, settings forms).
 * Border = `border-input` → Agere `border.control` (≥3:1, WCAG 1.4.11). Focus = border-ring + 3px ring.
 * `aria-invalid` switches to the destructive treatment — no extra prop needed.
 */
export const fieldVariants = cva(
  [
    "flex w-full min-w-0 rounded-md border border-input bg-transparent text-foreground shadow-xs dark:bg-input/10",
    "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
    "transition-[color,border-color,box-shadow] duration-base ease-standard",
    "outline-none focus-ring focus-visible:border-ring",
    "aria-[invalid=true]:border-destructive aria-[invalid=true]:[--ring:var(--ag-error-solid)]",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    "read-only:bg-muted/50",
    "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
  ],
  {
    variants: {
      size: {
        md: "h-9 px-3 py-1 text-base md:text-sm",
        lg: "h-10 px-3 text-base md:text-sm",
      },
    },
    defaultVariants: { size: "md" },
  }
);

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">, VariantProps<typeof fieldVariants> {
  /** Decorative leading icon. */
  leadingIcon?: React.ReactNode;
  /** Interactive or decorative trailing slot (e.g. clear button, unit). */
  trailing?: React.ReactNode;
  /** Text addon rendered inside the field frame, cal.com style: "cal.com/" + input. */
  addonStart?: React.ReactNode;
  addonEnd?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size: sizeProp, type = "text", leadingIcon, trailing, addonStart, addonEnd, ...props }, ref) => {
    const size = sizeProp ?? "md";
    const hasAddon = addonStart || addonEnd;
    const input = (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          fieldVariants({ size }),
          leadingIcon && "pl-9",
          trailing && "pr-9",
          hasAddon && "h-full rounded-none border-0 bg-transparent shadow-none focus-visible:shadow-none dark:bg-transparent",
          className
        )}
        {...props}
      />
    );

    const core =
      leadingIcon || trailing ? (
        <div className="relative flex w-full min-w-0 items-center">
          {leadingIcon && (
            <span aria-hidden className={cn("pointer-events-none absolute left-3 inline-flex text-muted-foreground [&_svg]:size-4")}>
              {leadingIcon}
            </span>
          )}
          {input}
          {trailing && <span className={cn("absolute inline-flex items-center", "right-1.5")}>{trailing}</span>}
        </div>
      ) : (
        input
      );

    if (!hasAddon) return core;
    return (
      <div
        className={cn(
          "flex w-full min-w-0 items-stretch overflow-hidden rounded-md border border-input bg-transparent shadow-xs dark:bg-input/10",
          size === "lg" ? "h-10" : "h-9",
          "transition-[border-color,box-shadow]",
          "focus-within:border-ring focus-within:shadow-[0_0_0_3px_hsl(var(--ring)/var(--ring-alpha,0.5))]",
          "has-[input[aria-invalid=true]]:border-destructive"
        )}
      >
        {addonStart && <span className="flex items-center border-r border-input bg-muted px-3 text-sm text-muted-foreground">{addonStart}</span>}
        {core}
        {addonEnd && <span className="flex items-center border-l border-input bg-muted px-3 text-sm text-muted-foreground">{addonEnd}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";

/* ------------------------------------------------------------------ */
/* PasswordInput — visibility toggle with aria-pressed                 */
/* ------------------------------------------------------------------ */
export interface PasswordInputProps extends Omit<InputProps, "type" | "trailing"> {
  showLabel?: string;
  hideLabel?: string;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showLabel = "Show password", hideLabel = "Hide password", id, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    const autoId = React.useId();
    const inputId = id ?? autoId;
    return (
      <Input
        ref={ref}
        id={inputId}
        type={visible ? "text" : "password"}
        autoComplete={props.autoComplete ?? "current-password"}
        trailing={
          <button
            type="button"
            aria-label={visible ? hideLabel : showLabel}
            aria-pressed={visible}
            aria-controls={inputId}
            onClick={() => setVisible((v) => !v)}
            className="inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-ring [&_svg]:size-4"
          >
            {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </button>
        }
        {...props}
      />
    );
  }
);
PasswordInput.displayName = "PasswordInput";

/* ------------------------------------------------------------------ */
/* SearchInput — type=search, clear button, optional shortcut hint     */
/* ------------------------------------------------------------------ */
export interface SearchInputProps extends Omit<InputProps, "type" | "leadingIcon" | "trailing"> {
  onClear?: () => void;
  clearLabel?: string;
  /** Visual shortcut hint, e.g. "/" or "⌘K". Hidden once the field has a value. */
  shortcut?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onClear, clearLabel = "Clear search", shortcut, value, className, ...props }, ref) => {
    const hasValue = value !== undefined && value !== "";
    return (
      <Input
        ref={ref}
        type="search"
        value={value}
        leadingIcon={<Search />}
        className={cn("[&::-webkit-search-cancel-button]:hidden", className)}
        trailing={
          hasValue && onClear ? (
            <button
              type="button"
              aria-label={clearLabel}
              onClick={onClear}
              className="inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-ring [&_svg]:size-3.5"
            >
              <X aria-hidden />
            </button>
          ) : shortcut ? (
            <kbd aria-hidden className="pointer-events-none mr-1 inline-flex h-5 items-center rounded-sm bg-muted px-1.5 font-sans text-xs font-medium text-muted-foreground">
              {shortcut}
            </kbd>
          ) : undefined
        }
        {...props}
      />
    );
  }
);
SearchInput.displayName = "SearchInput";
