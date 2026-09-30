"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";

import { cn, getInitials } from "@/lib/utils";

const avatarVariants = cva("relative inline-flex shrink-0 select-none overflow-hidden bg-muted", {
  variants: {
    size: { xs: "size-5 text-[9px]", sm: "size-6 text-2xs", md: "size-8 text-xs", lg: "size-10 text-sm", xl: "size-14 text-base" },
    shape: { circle: "rounded-full", square: "rounded-md" },
  },
  defaultVariants: { size: "sm", shape: "circle" },
});

export interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>, VariantProps<typeof avatarVariants> {
  name: string;
  src?: string;
  initials?: string;
  /** Presence dot. Meaning is duplicated in the accessible name. */
  status?: "online" | "away" | "busy" | "offline";
}

const STATUS = { online: "bg-success-solid", away: "bg-attention-solid", busy: "bg-error-solid", offline: "bg-muted-foreground" } as const;

/** Image + initials fallback. `name` is always the accessible name. */
export const Avatar = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Root>, AvatarProps>(
  ({ className, size, shape, name, src, initials, status, ...props }, ref) => (
    <span className="relative inline-flex">
      <AvatarPrimitive.Root
        ref={ref}
        role="img"
        aria-label={status ? `${name} (${status})` : name}
        className={cn(avatarVariants({ size, shape }), className)}
        title={name}
        {...props}
      >
        {src && <AvatarPrimitive.Image src={src} alt="" className="size-full object-cover" />}
        <AvatarPrimitive.Fallback aria-hidden className="flex size-full items-center justify-center font-medium text-muted-foreground">
          {initials ?? getInitials(name)}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
      {status && (
        <span
          aria-hidden
          className={cn("absolute bottom-0 right-0 size-2 rounded-full ring-2 ring-background", STATUS[status])}
        />
      )}
    </span>
  )
);
Avatar.displayName = "Avatar";

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  people: { id: string; name: string; src?: string; initials?: string }[];
  max?: number;
  size?: AvatarProps["size"];
}

/** Overlapping stack with "+N" overflow. The group has one accessible summary. */
export function AvatarGroup({ people, max = 4, size = "sm", className, ...props }: AvatarGroupProps) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div
      role="group"
      aria-label={`${people.length} people: ${people.map((p) => p.name).join(", ")}`}
      className={cn("flex items-center -space-x-1.5", className)}
      {...props}
    >
      {shown.map((p) => (
        <Avatar key={p.id} name={p.name} src={p.src} initials={p.initials} size={size} className="ring-2 ring-background" aria-hidden />
      ))}
      {rest > 0 && (
        <span aria-hidden className={cn(avatarVariants({ size }), "items-center justify-center font-medium text-muted-foreground ring-2 ring-background")}>
          +{rest}
        </span>
      )}
    </div>
  );
}
