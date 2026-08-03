export type TemplateId =
  | "cute"
  | "elegant"
  | "party"
  | "collage"
  | "dreamy"
  | "retro"
  | "minimal"
  | "boho";
export type ReactionType = "heart" | "party" | "surprised";
export type RecipientGender = "female" | "male";

export type TemplateMood = "playful" | "romantic" | "festive" | "editorial" | "cozy";
export type PhotoFrame = "polaroid" | "collage" | "arch" | "square" | "circle";
export type PatternStyle = "confetti" | "stripes" | "dots" | "hearts" | "waves" | "grid" | "none";
export type FontHint = "sans" | "serif" | "hand" | "display";

export type PreviewScene =
  | "cover"
  | "countdown"
  | "letter"
  | "music"
  | "finale";

export interface GreetingContent {
  recipientName: string;
  recipientGender: RecipientGender;
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
  mood: TemplateMood;
  tagline: string;
  photoFrame: PhotoFrame;
  pattern: PatternStyle;
  fontHint: FontHint;
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
    mascot: "/assets/mend-fawn-cake.png",
    mood: "playful",
    tagline: "Хөөрхөн, эрчтэй, бяцхан баярын мэдрэмж",
    photoFrame: "polaroid",
    pattern: "confetti",
    fontHint: "sans",
  },
  {
    id: "elegant",
    name: "Elegant",
    description: "Зөөлөн ягаан, цэвэрхэн захианы мэдрэмж",
    accent: "#b95376",
    background: "#ffe6ee",
    surface: "#fffafc",
    text: "#603449",
    mascot: "/assets/mend-fawn-letter.png",
    mood: "romantic",
    tagline: "Ойрын хүнд бичиж буй захианы уур амьсгал",
    photoFrame: "arch",
    pattern: "hearts",
    fontHint: "serif",
  },
  {
    id: "party",
    name: "Party",
    description: "Mint, coral өнгөтэй баярын эрч хүчтэй загвар",
    accent: "#e45f57",
    background: "#dff6e9",
    surface: "#fbfffd",
    text: "#315b52",
    mascot: "/assets/mend-fawn-celebrate.png",
    mood: "festive",
    tagline: "Confetti, шар пянз, өндөр эрчтэй тэмдэглэлт",
    photoFrame: "circle",
    pattern: "confetti",
    fontHint: "display",
  },
  {
    id: "collage",
    name: "Photo collage",
    description: "Зургуудыг гол болгосон scrapbook collage",
    accent: "#4f78b8",
    background: "#e7f3ff",
    surface: "#fbfdff",
    text: "#334766",
    mascot: "/assets/mend-fawn-camera.png",
    mood: "editorial",
    tagline: "Дөрвөн зурган scrapbook · олон дурсамжийг нэг дор",
    photoFrame: "collage",
    pattern: "grid",
    fontHint: "sans",
  },
  {
    id: "dreamy",
    name: "Dreamy",
    description: "Пастель өнгөт gradient, зөөлөн, мөрөөдөл шиг",
    accent: "#7a5cc6",
    background: "#f0e6ff",
    surface: "#fbf7ff",
    text: "#3b2a6a",
    mascot: "/assets/mend-fawn-music.png",
    mood: "romantic",
    tagline: "Aurora gradient, тод одтой мөрөөдмөөр загвар",
    photoFrame: "arch",
    pattern: "waves",
    fontHint: "serif",
  },
  {
    id: "retro",
    name: "Retro",
    description: "70-аад оны cream, хүрэн, warm judy тон",
    accent: "#c5623a",
    background: "#f6e7cf",
    surface: "#fffaf1",
    text: "#5c3a20",
    mascot: "/assets/mend-fawn.png",
    mood: "cozy",
    tagline: "Vintage stripes, mustard accent, cozy retro наадам",
    photoFrame: "square",
    pattern: "stripes",
    fontHint: "display",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Цагаан, монохром, нэг accent өнгөтэй editorial",
    accent: "#1a1a1a",
    background: "#f5f4f0",
    surface: "#ffffff",
    text: "#1a1a1a",
    mascot: "/assets/mend-fawn-pout.png",
    mood: "editorial",
    tagline: "Цэвэр typography, editorial layout, чимээгүй элегант",
    photoFrame: "square",
    pattern: "none",
    fontHint: "sans",
  },
  {
    id: "boho",
    name: "Boho",
    description: "Terracotta, sage, arch хэлбэрт бэлэг",
    accent: "#a2593a",
    background: "#f2e4d3",
    surface: "#fdf7ef",
    text: "#4a2f22",
    mascot: "/assets/mend-fawn-music.png",
    mood: "cozy",
    tagline: "Sun arch, шороон өнгө, дулаан organic мэдрэмж",
    photoFrame: "arch",
    pattern: "dots",
    fontHint: "hand",
  },
];

export function createDefaultDraft(): GreetingDraft {
  return {
    currentStep: 0,
    recipientName: "",
    recipientGender: "female",
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

const samplePhotos = [
  "https://images.unsplash.com/photo-1543807535-eceef0bc6599?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1502635385003-ee1e6a1a742d?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=900&q=80",
];

const sampleMessage =
  "Одоо ч мартагдашгүй инээмсэглэлээ хайрлаж явдаг чамдаа, шинэ настай мэнд хүргэе. Хамгийн онцгой мөчүүд чинь бидний хамгийн үнэ цэнэтэй эрдэнэс байлаа.";

export function buildSampleDraft(templateId: TemplateId): GreetingDraft {
  const template = getTemplate(templateId);
  const inMonth = new Date();
  inMonth.setDate(inMonth.getDate() + 14);
  const birthdayDate = inMonth.toISOString().slice(0, 10);
  return {
    currentStep: 3,
    recipientName: "Ану",
    recipientGender: "female",
    senderName: "Батаа",
    template: template.id,
    headline: `Төрсөн өдрийн мэнд, Ану!`,
    message: sampleMessage,
    surpriseMessage:
      "Хүлээж байсан бүх сайхан зүйл чинь энэ жил чамайг олоосой.",
    musicUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    musicName: "Happy birthday · sample",
    photos: samplePhotos,
    birthdayDate,
  };
}

export function sanitizePlainText(value: string, maxLength: number) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .slice(0, maxLength);
}

const youtubeHosts = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
]);

export function parseYoutubeId(value: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  if (!youtubeHosts.has(host)) return null;
  let id = "";
  if (host === "youtu.be") {
    id = url.pathname.slice(1).split("/")[0] ?? "";
  } else if (url.pathname === "/watch") {
    id = url.searchParams.get("v") ?? "";
  } else if (url.pathname.startsWith("/embed/") || url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/live/")) {
    id = url.pathname.split("/")[2] ?? "";
  }
  return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
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
