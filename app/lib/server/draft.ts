import {
  type GreetingDraft,
  type TemplateId,
  parseYoutubeId,
  sanitizePlainText,
  templates,
} from "../greeting";

const templateIds = new Set(templates.map((template) => template.id));

function isMediaUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value, "https://mend.local");
    return (
      url.origin === "https://mend.local" &&
      url.pathname === "/api/media" &&
      (url.searchParams.get("key") ?? "").startsWith("greetings/")
    );
  } catch {
    return false;
  }
}

function isAllowedMusicUrl(value: string) {
  if (!value) return true;
  if (parseYoutubeId(value)) return true;
  return isMediaUrl(value);
}

export function cleanDraft(value: GreetingDraft): GreetingDraft {
  return {
    currentStep: 3,
    recipientName: sanitizePlainText(value.recipientName ?? "", 40).trim(),
    recipientGender: value.recipientGender === "male" ? "male" : "female",
    senderName: sanitizePlainText(value.senderName ?? "", 40).trim(),
    template: (templateIds.has(value.template) ? value.template : "cute") as TemplateId,
    headline: sanitizePlainText(value.headline ?? "", 90).trim(),
    message: sanitizePlainText(value.message ?? "", 1500).trim(),
    surpriseMessage: sanitizePlainText(value.surpriseMessage ?? "", 500).trim(),
    musicUrl: String(value.musicUrl ?? "").slice(0, 500),
    musicName: sanitizePlainText(value.musicName ?? "", 100).trim(),
    photos: Array.isArray(value.photos)
      ? value.photos
          .filter((photo): photo is string => typeof photo === "string")
          .slice(0, 30)
      : [],
    birthdayDate: String(value.birthdayDate ?? "").slice(0, 10),
  };
}

export function validateDraft(draft: GreetingDraft) {
  if (!draft.recipientName || !draft.senderName || !draft.message) {
    return "Нэр болон мэндчилгээ дутуу байна.";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.birthdayDate)) {
    return "Төрсөн өдрийн огноо буруу байна.";
  }
  if (!draft.photos.length || draft.photos.some((photo) => !isMediaUrl(photo))) {
    return "Зургаа бүрэн байршуулсны дараа линкээ идэвхжүүлнэ үү.";
  }
  if (!isAllowedMusicUrl(draft.musicUrl)) {
    return "Дууны файл буруу байна.";
  }
  return "";
}

export function cleanEmail(value: string) {
  return sanitizePlainText(value, 160).trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}
