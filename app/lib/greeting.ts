export type GreetingStatus =
  | "DRAFT"
  | "READY_TO_PAY"
  | "READY_TO_PUBLISH"
  | "PUBLISHED"
  | "EXPIRED"
  | "ARCHIVED"
  | "BLOCKED";

export type PaymentStatus =
  | "UNPAID"
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED"
  | "REFUNDED";

export type EngagementStatus =
  | "NOT_OPENED"
  | "OPENED"
  | "REACTED"
  | "REPLIED";

export type ModerationStatus =
  | "NORMAL"
  | "REPORTED"
  | "UNDER_REVIEW"
  | "BLOCKED"
  | "RESTORED";

export type SenderVisibility = "START" | "END" | "ANONYMOUS";

export const demoAccessCode = "MEND-TEST01";

export interface GreetingDraft {
  id: string;
  guestId: string;
  currentStep: number;
  ageGroup: string;
  relationship: string;
  profession: string;
  mood: string;
  tags: string[];
  templateId: string;
  recipientName: string;
  recipientAge: string;
  birthDate: string;
  senderName: string;
  senderVisibility: SenderVisibility;
  headline: string;
  greetingText: string;
  secretMessage: string;
  primaryPhoto: string;
  musicId: string;
  effectId: string;
  allowReply: boolean;
  allowShare: boolean;
  allowDownload: boolean;
  requirePin: boolean;
  pin: string;
  expiresInDays: number;
  greetingStatus: GreetingStatus;
  paymentStatus: PaymentStatus;
  accessCode: string;
  accessCodeApplied: boolean;
  engagementStatus: EngagementStatus;
  moderationStatus: ModerationStatus;
  slug: string;
  reaction: string;
  reply: string;
  createdAt: string;
  updatedAt: string;
}

export interface GreetingTemplate {
  id: string;
  name: string;
  eyebrow: string;
  description: string;
  image: string;
  accent: string;
  background: string;
  text: string;
  tags: {
    ageGroups: string[];
    relationships: string[];
    professions: string[];
    moods: string[];
  };
  priority: number;
  storyCount: number;
  animated: boolean;
}

export const templates: GreetingTemplate[] = [
  {
    id: "bold-bloom",
    name: "Bold bloom",
    eyebrow: "Тод, баяр хөөртэй",
    description: "Найз, залуу үеийн эрч хүчтэй мэндчилгээнд.",
    image:
      "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1000&q=84",
    accent: "#ef5b45",
    background: "#f9d44a",
    text: "#1f2b25",
    tags: {
      ageGroups: ["Залуу", "Өсвөр нас"],
      relationships: ["Найз", "Хамгийн сайн найз", "Хос"],
      professions: ["Дизайнер", "Маркетер", "Оюутан"],
      moods: ["Хөгжилтэй", "Gen Z", "Хөөрхөн"],
    },
    priority: 5,
    storyCount: 6,
    animated: true,
  },
  {
    id: "soft-letter",
    name: "Soft letter",
    eyebrow: "Дулаан, дурсамжтай",
    description: "Сэтгэлээсээ бичсэн захиа, дурсамжийн зурагт.",
    image:
      "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1000&q=84",
    accent: "#1f8f72",
    background: "#f2eee8",
    text: "#17241f",
    tags: {
      ageGroups: ["Насанд хүрэгч", "Ахмад", "Залуу"],
      relationships: ["Ээж", "Аав", "Ах, эгч", "Хамаатан"],
      professions: ["Багш", "Эмч", "Сувилагч"],
      moods: ["Сэтгэл хөдөлгөм", "Хүндэтгэсэн", "Minimal"],
    },
    priority: 4,
    storyCount: 7,
    animated: false,
  },
  {
    id: "night-spark",
    name: "Night spark",
    eyebrow: "Тансаг, онцгой",
    description: "Дарга, хамтрагч, хүндэт хүнд зориулсан сонголт.",
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=84",
    accent: "#f4c343",
    background: "#18231f",
    text: "#ffffff",
    tags: {
      ageGroups: ["Насанд хүрэгч", "Залуу"],
      relationships: ["Дарга", "Хамтран ажиллагч", "Үйлчлүүлэгч"],
      professions: ["Хуульч", "Программист", "Маркетер"],
      moods: ["Luxury", "Хүндэтгэсэн", "Minimal"],
    },
    priority: 3,
    storyCount: 5,
    animated: true,
  },
  {
    id: "retro-pop",
    name: "Retro pop",
    eyebrow: "Өнгөлөг, хөгжилтэй",
    description: "Инээд, хөдөлгөөн, гэнэтийн бэлгээр дүүрэн.",
    image:
      "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1000&q=84",
    accent: "#d94768",
    background: "#5ac8c2",
    text: "#17241f",
    tags: {
      ageGroups: ["Өсвөр нас", "Залуу", "Насанд хүрэгч"],
      relationships: ["Найз", "Дүү", "Хос"],
      professions: ["Дизайнер", "Тамирчин", "Оюутан"],
      moods: ["Retro", "Хөгжилтэй", "Gen Z"],
    },
    priority: 2,
    storyCount: 6,
    animated: true,
  },
];

export const createDefaultDraft = (): GreetingDraft => {
  const now = new Date().toISOString();
  const suffix = Math.random().toString(36).slice(2, 9);

  return {
    id: `g_${suffix}`,
    guestId: `guest_${suffix}`,
    currentStep: 0,
    ageGroup: "",
    relationship: "",
    profession: "",
    mood: "",
    tags: [],
    templateId: "",
    recipientName: "",
    recipientAge: "",
    birthDate: "",
    senderName: "",
    senderVisibility: "START",
    headline: "",
    greetingText: "",
    secretMessage: "",
    primaryPhoto: "",
    musicId: "sunny-days",
    effectId: "confetti",
    allowReply: true,
    allowShare: true,
    allowDownload: false,
    requirePin: false,
    pin: "",
    expiresInDays: 30,
    greetingStatus: "DRAFT",
    paymentStatus: "UNPAID",
    accessCode: "",
    accessCodeApplied: false,
    engagementStatus: "NOT_OPENED",
    moderationStatus: "NORMAL",
    slug: "",
    reaction: "",
    reply: "",
    createdAt: now,
    updatedAt: now,
  };
};

export function scoreTemplate(
  template: GreetingTemplate,
  draft: GreetingDraft,
) {
  let score = template.priority;
  if (template.tags.professions.includes(draft.profession)) score += 40;
  if (template.tags.moods.includes(draft.mood)) score += 30;
  if (template.tags.ageGroups.includes(draft.ageGroup)) score += 15;
  if (template.tags.relationships.includes(draft.relationship)) score += 10;
  return score;
}

export function getDisplayStatus(draft: GreetingDraft) {
  if (
    draft.moderationStatus === "BLOCKED" ||
    draft.greetingStatus === "BLOCKED"
  ) {
    return { label: "Хаагдсан", tone: "danger" };
  }
  if (
    draft.moderationStatus === "REPORTED" ||
    draft.moderationStatus === "UNDER_REVIEW"
  ) {
    return { label: "Шалгаж байна", tone: "warning" };
  }
  if (draft.greetingStatus === "EXPIRED") {
    return { label: "Хугацаа дууссан", tone: "muted" };
  }
  if (draft.engagementStatus === "REPLIED") {
    return { label: "Хариу ирсэн", tone: "success" };
  }
  if (
    draft.engagementStatus === "OPENED" ||
    draft.engagementStatus === "REACTED"
  ) {
    return { label: "Нээгдсэн", tone: "info" };
  }
  if (draft.greetingStatus === "PUBLISHED") {
    return { label: "Идэвхтэй", tone: "success" };
  }
  if (draft.greetingStatus === "READY_TO_PUBLISH") {
    return { label: "Нийтлэхэд бэлэн", tone: "info" };
  }
  if (draft.paymentStatus === "PENDING") {
    return { label: "Төлбөр хүлээгдэж байна", tone: "warning" };
  }
  if (draft.greetingStatus === "READY_TO_PAY") {
    return { label: "Төлбөр хийхэд бэлэн", tone: "warning" };
  }
  return { label: "Ноорог", tone: "muted" };
}

export function isDraftReady(draft: GreetingDraft) {
  return Boolean(
    draft.ageGroup &&
      draft.relationship &&
      draft.mood &&
      draft.templateId &&
      draft.recipientName.trim() &&
      draft.senderName.trim() &&
      draft.greetingText.trim() &&
      draft.primaryPhoto,
  );
}

export function sanitizePlainText(value: string, maxLength: number) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .slice(0, maxLength);
}
