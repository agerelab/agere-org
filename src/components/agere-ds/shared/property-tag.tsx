"use client";

import * as React from "react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { STATUS_BADGE_VARIANT, type AgerePropertyTag } from "@/lib/agere-tokens";

export interface PropertyTagProps extends Omit<BadgeProps, "variant"> {
  tag: AgerePropertyTag;
}

/** Database property tag — tone is always paired with a text label, never color alone. */
export const PropertyTag = React.forwardRef<HTMLSpanElement, PropertyTagProps>(({ tag, ...props }, ref) => (
  <Badge ref={ref} variant={STATUS_BADGE_VARIANT[tag.status]} {...props}>
    {tag.label}
  </Badge>
));
PropertyTag.displayName = "PropertyTag";
