/** Огнооны туслах функцүүд — бүгд `YYYY-MM-DD` хэлбэртэй ажиллана. */

const isoPattern = /^\d{4}-\d{2}-\d{2}$/;

export const mongolianWeekdays = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];

export function isoDate(year: number, monthIndex: number, day: number) {
  const month = String(monthIndex + 1).padStart(2, "0");
  return `${year}-${month}-${String(day).padStart(2, "0")}`;
}

export function formatMongolianDate(iso: string): string {
  if (!isoPattern.test(iso)) return "";
  const [year, month, day] = iso.split("-").map(Number);
  return `${year} · ${month} сарын ${day}`;
}

/** Өнөөдрөөс хэдэн өдрийн дараа вэ. Сөрөг утга нь өнгөрсөн огноо. */
export function daysUntilBirthday(iso: string): number | null {
  if (!isoPattern.test(iso)) return null;
  const target = new Date(`${iso}T00:00:00`).getTime();
  if (!Number.isFinite(target)) return null;
  const now = new Date();
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  return Math.round((target - todayMidnight) / 86_400_000);
}

/** Төрсөн өдрийн 00:00 (хүлээн авагчийн цагийн бүсээр). */
export function birthdayUnlockTime(iso: string): number | null {
  if (!isoPattern.test(iso)) return null;
  const time = new Date(`${iso}T00:00:00`).getTime();
  return Number.isNaN(time) ? null : time;
}

/** Төрсөн өдөр хараахан болоогүй бол мэндчилгээ түгжээтэй байна. */
export function isBeforeBirthday(iso: string, now = Date.now()) {
  const unlockAt = birthdayUnlockTime(iso);
  return unlockAt !== null && now < unlockAt;
}
