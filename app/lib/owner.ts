/**
 * Энэ төхөөрөмжөөс үүсгэсэн мэндчилгээнүүдийн эзэмшигчийн бүртгэл.
 * Dashboard болон илгээгчийн урьдчилсан үзлэг хоёулаа үүнийг уншина.
 */

export type OwnerEntry = {
  id: string;
  token: string;
  slug: string;
  recipientName: string;
};

const ownerKey = "mend-owner-tokens-v2";

export function readOwnerEntries(): OwnerEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(ownerKey) || "[]",
    );
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is OwnerEntry =>
        typeof item?.token === "string" && typeof item?.slug === "string",
    );
  } catch {
    return [];
  }
}

const maxOwnerEntries = 20;

/** Шинэ мэндчилгээг бүртгэж, ижил slug-тай хуучин бичлэгийг сольно. */
export function rememberOwnerEntry(entry: OwnerEntry) {
  if (typeof window === "undefined") return;
  const rest = readOwnerEntries().filter((item) => item.slug !== entry.slug);
  const next = [entry, ...rest].slice(0, maxOwnerEntries);
  try {
    window.localStorage.setItem(ownerKey, JSON.stringify(next));
  } catch {
    // Хувийн горимд бичих эрхгүй байж болно.
  }
}

/** Тухайн мэндчилгээг энэ төхөөрөмжөөс үүсгэсэн эсэх. */
export function ownsGreeting(slug: string) {
  return readOwnerEntries().some((entry) => entry.slug === slug);
}
