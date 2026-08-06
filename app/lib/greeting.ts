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
  | "photos"
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
    name: "Candy Pop",
    description: "Bubblegum ягаан, butter шар өнгөт stickerbook",
    accent: "#ff4f8b",
    background: "#fff2a8",
    surface: "#fffdf6",
    text: "#43245d",
    mascot: "/assets/mend-fawn-cake.png",
    mood: "playful",
    tagline: "Sticker, gingham, амттан шиг өнгөлөг баяр",
    photoFrame: "polaroid",
    pattern: "confetti",
    fontHint: "sans",
  },
  {
    id: "elegant",
    name: "Midnight Rose",
    description: "Plum шөнө, champagne алттай luxury захиа",
    accent: "#d5aa68",
    background: "#24142d",
    surface: "#fff8ef",
    text: "#fff3df",
    mascot: "/assets/mend-fawn-letter.png",
    mood: "romantic",
    tagline: "Сарны гэрэл, алтлаг хүрээ, cinematic романтик",
    photoFrame: "arch",
    pattern: "hearts",
    fontHint: "serif",
  },
  {
    id: "party",
    name: "Electric Party",
    description: "Cobalt, acid lime, coral өнгөт pop-art party",
    accent: "#ff5a4f",
    background: "#3154e8",
    surface: "#f7ff72",
    text: "#ffffff",
    mascot: "/assets/mend-fawn-celebrate.png",
    mood: "festive",
    tagline: "Pop-art burst, confetti, тайзны өндөр эрч хүч",
    photoFrame: "circle",
    pattern: "confetti",
    fontHint: "display",
  },
  {
    id: "collage",
    name: "Memory Zine",
    description: "Tape, marker, зураг хосолсон indie scrapbook",
    accent: "#ff5c35",
    background: "#dcecff",
    surface: "#fffef8",
    text: "#172a55",
    mascot: "/assets/mend-fawn-camera.png",
    mood: "editorial",
    tagline: "Cut-and-paste zine · дурсамж бүр өөрийн хуудастай",
    photoFrame: "collage",
    pattern: "grid",
    fontHint: "sans",
  },
  {
    id: "dreamy",
    name: "Cosmic Dream",
    description: "Aurora гэрэл, ододтой ethereal сансрын ертөнц",
    accent: "#b8ffea",
    background: "#17143e",
    surface: "#30255c",
    text: "#f7f2ff",
    mascot: "/assets/mend-fawn-music.png",
    mood: "romantic",
    tagline: "Aurora glow, шилэн карт, хөвөх оддын шөнө",
    photoFrame: "arch",
    pattern: "waves",
    fontHint: "serif",
  },
  {
    id: "retro",
    name: "Groovy 70s",
    description: "Mango, olive, cocoa өнгөт disco-era nostalgia",
    accent: "#e84b2c",
    background: "#f3bd45",
    surface: "#fff4d3",
    text: "#4b2b16",
    mascot: "/assets/mend-fawn.png",
    mood: "cozy",
    tagline: "Sunset waves, vinyl хэмнэл, дулаахан 70s vibe",
    photoFrame: "square",
    pattern: "stripes",
    fontHint: "display",
  },
  {
    id: "minimal",
    name: "Modern Muse",
    description: "Swiss grid, oversized type, vermilion accent",
    accent: "#ff3d20",
    background: "#f2f0e9",
    surface: "#ffffff",
    text: "#111111",
    mascot: "/assets/mend-fawn-pout.png",
    mood: "editorial",
    tagline: "Bold typography, gallery layout, цэвэр editorial",
    photoFrame: "square",
    pattern: "none",
    fontHint: "sans",
  },
  {
    id: "boho",
    name: "Desert Bloom",
    description: "Terracotta, sage, sunset arch бүхий organic дизайн",
    accent: "#b64f33",
    background: "#efd9bd",
    surface: "#fff7e9",
    text: "#3f3527",
    mascot: "/assets/mend-fawn-music.png",
    mood: "cozy",
    tagline: "Desert sunset, гар зурсан хэлбэр, зөөлөн organic мэдрэмж",
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
