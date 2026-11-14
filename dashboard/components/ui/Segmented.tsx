"use client";

import { useRef } from "react";

/** macOS segmented control. Radio semantics with arrow-key movement. */
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[]; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (dir: number) => {
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + dir + options.length) % options.length];
    onChange(next.value);
    requestAnimationFrame(() => ref.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus());
  };
  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={label}
      className="seg"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); move(1); }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      }}
    >
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} tabIndex={o.value === value ? 0 : -1} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count != null && <span className="ml-1.5 text-[11px] text-ink3 tabular-nums">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
