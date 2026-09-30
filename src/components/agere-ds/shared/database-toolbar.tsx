"use client";

import * as React from "react";
import { ArrowUpDown, Filter, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface DatabaseToolbarActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  searchValue?: string;
  onSearchChange?: (query: string) => void;
  searchLabel?: string;
  onFilterClick?: () => void;
  onSortClick?: () => void;
}

/** Search · Filter · Sort cluster shared by every database view. */
export const DatabaseToolbarActions = React.forwardRef<HTMLDivElement, DatabaseToolbarActionsProps>(
  ({ searchValue, onSearchChange, searchLabel = "Search", onFilterClick, onSortClick, className, children, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center gap-2", className)} {...props}>
      {onSearchChange && (
        <div className="hidden w-44 sm:block">
          <Input
            size="md"
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search"
            aria-label={searchLabel}
            leadingIcon={<Search />}
          />
        </div>
      )}
      {onFilterClick && (
        <Button variant="outline" onClick={onFilterClick} aria-label="Filter">
          <Filter aria-hidden />
          <span className="hidden md:inline">Filter</span>
        </Button>
      )}
      {onSortClick && (
        <Button variant="outline" onClick={onSortClick} aria-label="Sort">
          <ArrowUpDown aria-hidden />
          <span className="hidden md:inline">Sort</span>
        </Button>
      )}
      {children}
    </div>
  )
);
DatabaseToolbarActions.displayName = "DatabaseToolbarActions";
