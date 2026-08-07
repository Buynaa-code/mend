"use client";

import { useEffect, useRef, useState } from "react";
import { birthdayUnlockTime } from "./lib/date";

const unitsOf = (distance: number) =>
  [
    ["өдөр", Math.floor(distance / 86_400_000)],
    ["цаг", Math.floor((distance / 3_600_000) % 24)],
    ["мин", Math.floor((distance / 60_000) % 60)],
    ["сек", Math.floor((distance / 1000) % 60)],
  ] as const;

/**
 * Төрсөн өдрийн 00:00 хүртэлх тоолуур. `onComplete` өгсөн бол тоолуур
 * тэглэх мөчид яг нэг удаа дуудагдана.
 */
export function Countdown({
  birthdayDate,
  onComplete,
}: {
  birthdayDate: string;
  onComplete?: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const completedRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const target = birthdayUnlockTime(birthdayDate) ?? 0;
  const distance = Math.max(0, target - now);

  useEffect(() => {
    if (distance > 0 || completedRef.current || !onComplete) return;
    completedRef.current = true;
    onComplete();
  }, [distance, onComplete]);

  return (
    <div className="countdown-grid">
      {unitsOf(distance).map(([label, value]) => (
        <div key={label}>
          <strong>{String(value).padStart(2, "0")}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
