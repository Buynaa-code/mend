"use client";

import { Eye, Lock, Sparkles } from "lucide-react";
import { Countdown } from "./Countdown";
import { Mascot } from "./Mascot";
import { formatMongolianDate } from "./lib/date";
import type { PublicGreeting } from "./lib/greeting";
import { haptic } from "./lib/haptics";

type LockedGreetingInfo = Pick<
  PublicGreeting,
  "recipientName" | "senderName" | "mascot" | "birthdayDate"
>;

/**
 * Төрсөн өдөр болтол мэндчилгээг түгжиж, 00:00 цагт өөрөө нээгдэнэ.
 * Илгээгч өөрөө (энэ төхөөрөмжөөс үүсгэсэн бол) урьдчилж үзэж болно.
 */
export function LockedGreeting({
  greeting,
  canPreview,
  onPreview,
  onUnlock,
}: {
  greeting: LockedGreetingInfo;
  canPreview: boolean;
  onPreview: () => void;
  onUnlock: () => void;
}) {
  return (
    <div className="locked-scene">
      <div className="locked-seal" aria-hidden="true">
        <Lock size={26} />
      </div>

      <Mascot character={greeting.mascot} variant="intro" />

      <small>{greeting.senderName}-ээс</small>
      <h1>{greeting.recipientName}, чамд мэндчилгээ хүлээж байна</h1>
      <p className="locked-note">
        <Sparkles size={15} /> Төрсөн өдрийн шөнө дунд буюу{" "}
        {formatMongolianDate(greeting.birthdayDate)}-ны 00:00 цагт өөрөө
        нээгдэнэ.
      </p>

      <Countdown birthdayDate={greeting.birthdayDate} onComplete={onUnlock} />

      {canPreview && (
        <button
          type="button"
          className="locked-preview"
          onClick={() => {
            haptic("tap");
            onPreview();
          }}
        >
          <Eye size={16} /> Илгээгч — урьдчилж үзэх
        </button>
      )}
    </div>
  );
}
