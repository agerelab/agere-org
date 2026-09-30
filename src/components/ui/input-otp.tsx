"use client";

import * as React from "react";
import { OTPInput, OTPInputContext, REGEXP_ONLY_CHARS, REGEXP_ONLY_DIGITS, REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import { Minus } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * InputOTP — shadcn/ui one-time-code field on input-otp. ONE real <input> behind the slots, so paste,
 * SMS autofill (autocomplete="one-time-code"), password managers and screen readers work natively.
 * Always pair with a visible label and say how many characters are expected.
 */
export const InputOTP = React.forwardRef<React.ElementRef<typeof OTPInput>, React.ComponentPropsWithoutRef<typeof OTPInput> & { containerClassName?: string }>(
  ({ className, containerClassName, autoComplete = "one-time-code", inputMode, pattern, ...props }, ref) => (
    <OTPInput
      ref={ref}
      data-slot="input-otp"
      autoComplete={autoComplete}
      inputMode={inputMode ?? (pattern === REGEXP_ONLY_DIGITS || !pattern ? "numeric" : "text")}
      pattern={pattern}
      containerClassName={cn("flex items-center gap-2 has-[:disabled]:opacity-50", containerClassName)}
      className={cn("disabled:cursor-not-allowed", className)}
      {...(props as React.ComponentPropsWithoutRef<typeof OTPInput>)}
    />
  )
);
InputOTP.displayName = "InputOTP";

export function InputOTPGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="input-otp-group" className={cn("flex items-center", className)} {...props} />;
}

export function InputOTPSlot({ index, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { index: number }) {
  const ctx = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = ctx?.slots[index] ?? {};
  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive || undefined}
      className={cn(
        "relative flex size-9 items-center justify-center border-y border-r border-input text-sm shadow-xs outline-none transition-all first:rounded-l-md first:border-l dark:bg-input/10",
        "data-[active]:z-10 data-[active]:border-ring data-[active]:shadow-[0_0_0_3px_hsl(var(--ring)/var(--ring-alpha,0.5))]",
        "aria-[invalid=true]:border-destructive",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground" />
        </div>
      )}
    </div>
  );
}

export function InputOTPSeparator(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="input-otp-separator" role="separator" {...props}>
      <Minus className="size-4 text-muted-foreground" aria-hidden />
    </div>
  );
}

export { REGEXP_ONLY_DIGITS, REGEXP_ONLY_CHARS, REGEXP_ONLY_DIGITS_AND_CHARS };
