"use client";

/* eslint-disable @next/next/no-img-element */

import { CheckCircle2 } from "lucide-react";
import { mascotSource } from "./Mascot";
import { mascotOptions, type MascotCharacter } from "./lib/greeting";
import { haptic } from "./lib/haptics";

/**
 * Мэндчилгээг дагалдах дүрийг сонгоно. Сонголтууд `mascotOptions`-оос
 * ирдэг тул шинэ дүр нэмэхэд энэ компонентыг өөрчлөх шаардлагагүй.
 */
export function MascotPicker({
  value,
  onChange,
}: {
  value: MascotCharacter;
  onChange: (next: MascotCharacter) => void;
}) {
  return (
    <div className="mascot-picker" role="group" aria-label="Дүр сонгох">
      {mascotOptions.map((option) => {
        const selected = value === option.id;
        return (
          <button
            type="button"
            key={option.id}
            className={selected ? "selected" : ""}
            aria-pressed={selected}
            onClick={() => {
              haptic("tap");
              onChange(option.id);
            }}
          >
            <img src={mascotSource(option.id, "intro")} alt="" />
            <span>
              <strong>{option.name}</strong>
              <small>{option.description}</small>
            </span>
            {selected && <CheckCircle2 size={19} />}
          </button>
        );
      })}
    </div>
  );
}
