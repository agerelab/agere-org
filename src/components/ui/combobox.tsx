"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "./badge";
import { Button } from "./button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

/**
 * Combobox — shadcn pattern (Popover + Command) as a component: searchable single or multi select.
 * Trigger is role="combobox" with aria-expanded / aria-controls; the list filters as you type and
 * ↑/↓ + Enter pick an option. Use Select when there are fewer than ~8 options and no search is needed.
 */
export interface ComboboxOption {
  value: string;
  label: string;
  /** Extra search terms (synonyms, codes). */
  keywords?: string[];
  disabled?: boolean;
  icon?: React.ReactNode;
  group?: string;
}

interface CommonProps {
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  id?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-describedby"?: string;
}

export interface ComboboxProps extends CommonProps {
  multiple?: false;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}
export interface ComboboxMultipleProps extends CommonProps {
  multiple: true;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Chips shown in the trigger before "+N". Default 2. */
  maxShown?: number;
}

function groupBy(options: ComboboxOption[]) {
  const map = new Map<string, ComboboxOption[]>();
  for (const o of options) map.set(o.group ?? "", [...(map.get(o.group ?? "") ?? []), o]);
  return [...map.entries()];
}

export function Combobox(props: ComboboxProps | ComboboxMultipleProps) {
  const { options, placeholder = "Select…", searchPlaceholder = "Search…", emptyText = "No results.", disabled, className, contentClassName, id, ...aria } = props;
  const listId = React.useId();
  const [open, setOpen] = React.useState(false);
  const multiple = props.multiple === true;
  const [inner, setInner] = React.useState<string | string[] | undefined>(props.defaultValue);
  const value = props.value ?? inner;
  const selected = multiple ? ((value as string[] | undefined) ?? []) : value ? [value as string] : [];
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;

  const commit = (next: string | string[]) => {
    setInner(next);
    if (multiple) (props as ComboboxMultipleProps).onValueChange?.(next as string[]);
    else (props as ComboboxProps).onValueChange?.(next as string);
  };
  const toggle = (v: string) => {
    if (multiple) commit(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
    else { commit(v === value ? "" : v); setOpen(false); }
  };

  const maxShown = multiple ? ((props as ComboboxMultipleProps).maxShown ?? 2) : 0;
  const summary = selected.length ? selected.map(labelOf).join(", ") : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-haspopup="listbox"
          disabled={disabled}
          aria-label={aria["aria-label"] ? `${aria["aria-label"]}${summary ? `: ${summary}` : ""}` : undefined}
          aria-invalid={aria["aria-invalid"]}
          aria-describedby={aria["aria-describedby"]}
          data-empty={!selected.length || undefined}
          className={cn("h-auto min-h-9 w-full justify-between gap-2 px-3 py-1.5 font-normal data-[empty]:text-muted-foreground", className)}
        >
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-left">
            {!selected.length && <span className="truncate">{placeholder}</span>}
            {!multiple && selected[0] && <span className="truncate">{labelOf(selected[0])}</span>}
            {multiple && selected.slice(0, maxShown).map((v) => (
              <Badge key={v} variant="secondary" className="gap-1 pr-1">
                {labelOf(v)}
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`Remove ${labelOf(v)}`}
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); toggle(v); }}
                  className="inline-flex rounded-sm opacity-60 hover:opacity-100"
                >
                  <X className="size-3" aria-hidden />
                </span>
              </Badge>
            ))}
            {multiple && selected.length > maxShown && <Badge variant="outline">+{selected.length - maxShown}</Badge>}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[--radix-popover-trigger-width] min-w-[12rem] p-0", contentClassName)} align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList id={listId} aria-multiselectable={multiple || undefined}>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {groupBy(options).map(([group, items]) => (
              <CommandGroup key={group || "_"} heading={group || undefined}>
                {items.map((o) => {
                  const isOn = selected.includes(o.value);
                  return (
                    <CommandItem key={o.value} value={o.value} keywords={[o.label, ...(o.keywords ?? [])]} disabled={o.disabled} onSelect={() => toggle(o.value)} data-checked={isOn || undefined}>
                      {multiple ? (
                        <span aria-hidden className={cn("grid size-4 place-items-center rounded-xs border border-input", isOn && "border-primary bg-primary text-primary-foreground")}>
                          {isOn && <Check className="size-3 !text-primary-foreground" />}
                        </span>
                      ) : null}
                      {o.icon}
                      <span className="truncate">{o.label}{isOn && <span className="sr-only">, selected</span>}</span>
                      {!multiple && <Check aria-hidden className={cn("ml-auto", isOn ? "opacity-100" : "opacity-0")} />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
