"use client";

import { cn } from "cn";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ChoiceOption = { value: string; label: string };

/**
 * Themed drop-in for a native <select>: same `name` / `defaultValue` form behaviour (a hidden input carries the
 * value), but the open list matches the app's theme instead of the operating system's.
 */
export function Choice({ options, name, defaultValue, value, onValueChange, required, disabled, className, "aria-label": ariaLabel, size = "default", placeholder }: {
  options: ChoiceOption[];
  name?: string;
  defaultValue?: string;
  value?: string | null; // null = nothing selected (shows the placeholder)
  onValueChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  size?: "sm" | "default";
  placeholder?: string;
}) {
  return (
    <Select<string> items={options} name={name} defaultValue={defaultValue} value={value} required={required} disabled={disabled}
      onValueChange={(v) => { if (v != null) onValueChange?.(v); }}>
      <SelectTrigger size={size} aria-label={ariaLabel} className={cn(size === "default" && "h-9", "w-full min-w-0 bg-background", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
