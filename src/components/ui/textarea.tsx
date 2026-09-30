"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { fieldVariants } from "./input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Grow with content up to `maxRows`. */
  autoResize?: boolean;
  maxRows?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoResize = false, maxRows = 12, onInput, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    const resize = React.useCallback(() => {
      const el = innerRef.current;
      if (!el || !autoResize) return;
      el.style.height = "auto";
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
      el.style.height = `${Math.min(el.scrollHeight, lineHeight * maxRows)}px`;
    }, [autoResize, maxRows]);

    React.useLayoutEffect(resize, [resize, props.value]);

    return (
      <textarea
        ref={innerRef}
        className={cn(fieldVariants(), "h-auto min-h-16 py-2", autoResize && "resize-none", className)}
        onInput={(e) => {
          resize();
          onInput?.(e);
        }}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
