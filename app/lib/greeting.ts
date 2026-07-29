export type TemplateId = "cute" | "elegant" | "party" | "collage";
export type ReactionType = "heart" | "party" | "surprised";

export interface GreetingContent {
  recipientName: string;
  senderName: string;
  template: TemplateId;
  headline: string;
  message: string;
  surpriseMessage: string;
  musicUrl: string;
  musicName: string;
  photos: string[];
  birthdayDate: string;
}

export interface GreetingDraft extends GreetingContent {
  currentStep: number;
}

export interface PublicGreeting extends GreetingContent {
  publicSlug: string;
  createdAt: string;
}

export interface GuestbookEntry {
  id: string;
  name: string;
  message: string;
  createdAt: string;
}

export interface DashboardGreeting extends PublicGreeting {
  id: string;
  openedAt: string | null;
  viewCount: number;
  reactions: Record<ReactionType, number>;
  guestbook: GuestbookEntry[];
}

export interface GreetingTemplate {
  id: TemplateId;
  name: string;
  description: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  mascot: string;
}

export const templates: GreetingTemplate[] = [
  {
    id: "cute",
    name: "Cute",
    description: "Шар судал, lavender чимэглэлтэй хөөрхөн загвар",
    accent: "#8069bd",
    background: "#fff4ad",
    surface: "#fffdf4",
    text: "#493c62",
    mascot: "/assets/mend-giraffe.png",
  },
  {
    id: "elegant",
    name: "Elegant",
    description: "Зөөлөн ягаан, цэвэрхэн захианы мэдрэмж",
    accent: "#b95376",
    background: "#ffe6ee",
    surface: "#fffafc",
    text: "#603449",
    mascot: "/assets/mend-giraffe-letter.png",
  },
  {
    id: "party",
    name: "Party",
    description: "Mint, coral өнгөтэй баярын эрч хүчтэй загвар",
    accent: "#e45f57",
    background: "#dff6e9",
    surface: "#fbfffd",
    text: "#315b52",
    mascot: "/assets/mend-giraffe-celebrate.png",
  },
  {
    id: "collage",
    name: "Photo collage",
    description: "Зургуудыг гол болгосон scrapbook collage",
    accent: "#4f78b8",
    background: "#e7f3ff",
    surface: "#fbfdff",
    text: "#334766",
    mascot: "/assets/mend-giraffe-camera.png",
  },
];

export function createDefaultDraft(): GreetingDraft {
  return {
    currentStep: 0,
    recipientName: "",
    senderName: "",
    template: "cute",
    headline: "",
    message: "",
    surpriseMessage: "",
    musicUrl: "",
    musicName: "",
    photos: [],
    birthdayDate: "",
  };
}

export function sanitizePlainText(value: string, maxLength: number) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .slice(0, maxLength);
}

export function isDraftReady(draft: GreetingDraft) {
  return Boolean(
    draft.recipientName.trim() &&
      draft.senderName.trim() &&
      draft.birthdayDate &&
      draft.template &&
      draft.message.trim() &&
      draft.photos.length,
  );
}

export function getTemplate(id: TemplateId) {
  return templates.find((template) => template.id === id) ?? templates[0];
}
