"use client";

import { useId } from "react";

interface ToggleProps {
  name: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
  /** Optional: Callback wenn sich der Wert ändert (für conditional Sub-Settings). */
  onCheckedChange?: (checked: boolean) => void;
}

export function Toggle({
  name,
  label,
  description,
  defaultChecked = false,
  onCheckedChange,
}: ToggleProps) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span className="flex-1">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-ink-muted">{description}</span>
        )}
      </span>
      <span className="relative inline-flex shrink-0">
        <input
          id={id}
          name={name}
          type="checkbox"
          defaultChecked={defaultChecked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-[26px] w-[44px] rounded-full bg-bg-elevated transition-colors peer-checked:bg-brand-gradient peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40" />
        <span className="pointer-events-none absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-[18px]" />
      </span>
    </label>
  );
}
