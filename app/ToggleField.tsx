"use client";

import type { ReactNode } from "react";
import { haptic } from "./lib/haptics";

/**
 * Тайлбартай асаах/унтраах сэлгүүр. `role="switch"` тул дэлгэц уншигч
 * төлөвийг зөв уншина.
 */
export function ToggleField({
  checked,
  onChange,
  label,
  description,
  icon,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className={`toggle-field${checked ? " is-on" : ""}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className="toggle-switch"
        onClick={() => {
          haptic("tap");
          onChange(!checked);
        }}
      >
        <span className="toggle-track" aria-hidden="true">
          <span className="toggle-thumb" />
        </span>
        <span className="toggle-copy">
          <strong>
            {icon}
            {label}
          </strong>
          {description && <small>{description}</small>}
        </span>
      </button>
    </div>
  );
}
