/**
 * Хүрэлцэх эргэх холбоо (haptics).
 *
 * Vibration API-г дэмждэггүй төхөөрөмж дээр чимээгүй унтарна. Хөдөлгөөн
 * багасгах тохиргоо асаалттай хэрэглэгчид чичиргээ ч авахгүй.
 */

export type HapticPattern = "tap" | "pop" | "unlock" | "celebrate";

/** Утга бүр `navigator.vibrate` хүлээн авдаг миллисекундын хэв маяг. */
const patterns: Record<HapticPattern, number | number[]> = {
  /** Товч дарах, дүр сонгох зэрэг энгийн хүрэлт. */
  tap: 12,
  /** Бэлэг нээх, лаа унтраах — арай мэдрэгдэхүйц. */
  pop: [18, 26, 30],
  /** Түгжээ тайлагдаж мэндчилгээ нээгдэх мөч. */
  unlock: [24, 40, 24, 40, 60],
  /** Confetti дэлбэрэх баярын мөч. */
  celebrate: [14, 22, 14, 22, 14, 60],
};

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function haptic(pattern: HapticPattern) {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  if (prefersReducedMotion()) return;
  try {
    navigator.vibrate(patterns[pattern]);
  } catch {
    // Зарим browser хэрэглэгчийн үйлдэлгүйгээр дуудахад алдаа шиднэ.
  }
}
