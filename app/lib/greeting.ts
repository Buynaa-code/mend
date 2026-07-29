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
  memoryPhotos: string[];
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
    id: "sunny-scrapbook",
    name: "Sunny scrapbook",
    eyebrow: "Шар + lavender",
    description: "Анааштай, дурсамж дүүрэн хөөрхөн scrapbook.",
    image: "/assets/mend-giraffe.png",
    accent: "#8069bd",
    background: "#fff4ad",
    text: "#47385f",
    tags: {
      ageGroups: ["Хүүхэд", "Өсвөр нас", "Залуу", "Насанд хүрэгч"],
      relationships: ["Найз", "Хамгийн сайн найз", "Хос", "Дүү"],
      professions: [],
      moods: ["Хөөрхөн", "Хөгжилтэй", "Сэтгэл хөдөлгөм"],
    },
    priority: 5,
    storyCount: 7,
    animated: true,
  },
  {
    id: "berry-scrapbook",
    name: "Berry scrapbook",
    eyebrow: "Ягаан + mint",
    description: "Зөөлөн ягаан өнгөтэй дулаан захианы хувилбар.",
    image: "/assets/mend-giraffe.png",
    accent: "#d75f82",
    background: "#ffe6ee",
    text: "#603449",
    tags: {
      ageGroups: ["Залуу", "Насанд хүрэгч"],
      relationships: ["Хос", "Ээж", "Эгч"],
      professions: [],
      moods: ["Сэтгэл хөдөлгөм", "Хөөрхөн"],
    },
    priority: 4,
    storyCount: 7,
    animated: true,
  },
  {
    id: "sky-scrapbook",
    name: "Sky scrapbook",
    eyebrow: "Цэнхэр + шар",
    description: "Хөгжилтэй, тод өнгийн найзын мэндчилгээ.",
    image: "/assets/mend-giraffe.png",
    accent: "#4f78b8",
    background: "#e7f3ff",
    text: "#334766",
    tags: {
      ageGroups: ["Хүүхэд", "Өсвөр нас", "Залуу"],
      relationships: ["Найз", "Ах, эгч", "Дүү"],
      professions: [],
      moods: ["Хөгжилтэй", "Gen Z"],
    },
    priority: 3,
    storyCount: 7,
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
    templateId: "sunny-scrapbook",
    recipientName: "",
    recipientAge: "",
    birthDate: "",
    senderName: "",
    senderVisibility: "START",
    headline: "",
    greetingText: "",
    secretMessage: "",
    primaryPhoto: "",
    memoryPhotos: [],
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
