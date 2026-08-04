"use client";

/* eslint-disable @next/next/no-img-element */

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  ExternalLink,
  Gift,
  Heart,
  ImagePlus,
  Landmark,
  LoaderCircle,
  Mail,
  MessageCircle,
  Mic,
  Music2,
  PartyPopper,
  Pause,
  Play,
  QrCode,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  Wind,
} from "lucide-react";
import {
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createDefaultDraft,
  type DashboardGreeting,
  type GreetingDraft,
  type PreviewScene,
  type PublicGreeting,
  type RecipientGender,
  type ReactionType,
  getTemplate,
  isDraftReady,
  parseYoutubeId,
  sanitizePlainText,
  templates,
} from "./lib/greeting";
import { StoryShareButton } from "./StoryShareButton";

type OwnerEntry = {
  id: string;
  token: string;
  slug: string;
  recipientName: string;
};

type BolzooAudioOptions = {
  videoId: string;
  volume?: number;
  hostElId?: string;
  buttonEl?: HTMLElement | null;
  iconEl?: HTMLElement | null;
  textEl?: HTMLElement | null;
  onFail?: () => void;
  deferPlayerCreation?: boolean;
};

type BolzooAudioController = {
  setVideoId(id: string): void;
  setMuted(muted: boolean): void;
  start(): void;
  isReady(): boolean;
  hasFailed(): boolean;
  destroy(): void;
};

declare global {
  interface Window {
    BolzooAudio?: {
      init(opts: BolzooAudioOptions): BolzooAudioController;
    };
  }
}

type RecipientScreen =
  | "envelope"
  | "cake"
  | "cover"
  | "gifts"
  | "memories"
  | "letter"
  | "music"
  | "finale";

const draftKey = "mend-create-draft-v2";
const draftTokenKey = "mend-draft-token-v1";
const ownerKey = "mend-owner-tokens-v2";
const fallbackPhotos = [
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=900&q=80",
];

type MascotVariant =
  | "intro"
  | "pout"
  | "celebrate"
  | "camera"
  | "letter"
  | "music"
  | "cake";

const mascotSources: Record<
  RecipientGender,
  Record<MascotVariant, string>
> = {
  female: {
    intro: "/assets/mend-fawn.png",
    pout: "/assets/mend-fawn-pout.png",
    celebrate: "/assets/mend-fawn-celebrate.png",
    camera: "/assets/mend-fawn-camera.png",
    letter: "/assets/mend-fawn-letter.png",
    music: "/assets/mend-fawn-music.png",
    cake: "/assets/mend-fawn-cake.png",
  },
  male: {
    intro: "/assets/mend-tiger.png",
    pout: "/assets/mend-tiger-pout.png",
    celebrate: "/assets/mend-tiger-celebrate.png",
    camera: "/assets/mend-tiger-camera.png",
    letter: "/assets/mend-tiger-letter.png",
    music: "/assets/mend-tiger-music.png",
    cake: "/assets/mend-tiger-cake.png",
  },
};

const templateMascotVariants: Record<
  GreetingDraft["template"],
  MascotVariant
> = {
  cute: "cake",
  elegant: "letter",
  party: "celebrate",
  collage: "camera",
  dreamy: "music",
  retro: "intro",
  minimal: "pout",
  boho: "music",
};

function mascotSource(
  gender: RecipientGender | undefined,
  variant: MascotVariant,
) {
  return mascotSources[gender === "male" ? "male" : "female"][variant];
}

function Mascot({
  variant,
  gender = "female",
  className = "",
}: {
  variant: MascotVariant;
  gender?: RecipientGender;
  className?: string;
}) {
  return (
    <img
      className={`mascot ${className}`}
      src={mascotSource(gender, variant)}
      alt=""
      draggable={false}
    />
  );
}

function IconButton({
  label,
  children,
  className = "",
  ...props
}: {
  label: string;
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`icon-button ${className}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}

export function AppShell({
  current,
  children,
}: {
  current: "create" | "dashboard" | "greeting";
  children: ReactNode;
}) {
  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="site-brand" href="/create">
          mend.
          <small>birthday card</small>
        </a>
        {current !== "greeting" && (
          <nav aria-label="Үндсэн цэс">
            <a className={current === "create" ? "active" : ""} href="/create">
              <Sparkles size={17} /> Үүсгэх
            </a>
            <a
              className={current === "dashboard" ? "active" : ""}
              href="/dashboard"
            >
              <Eye size={17} /> Dashboard
            </a>
          </nav>
        )}
      </header>
      {children}
    </div>
  );
}

function themeStyle(templateId: GreetingDraft["template"]): CSSProperties {
  const template = getTemplate(templateId);
  return {
    "--card-accent": template.accent,
    "--card-bg": template.background,
    "--card-surface": template.surface,
    "--card-text": template.text,
  } as CSSProperties;
}

export function CardPreview({
  draft,
  compact = false,
  scene = "cover",
}: {
  draft: GreetingDraft | PublicGreeting;
  compact?: boolean;
  scene?: PreviewScene;
}) {
  const photos = draft.photos.length ? draft.photos : fallbackPhotos;
  const isCollage = draft.template === "collage";
  const template = getTemplate(draft.template);
  const wrapperClass = `card-preview template-${draft.template} scene-${scene} ${compact ? "compact" : ""}`;

  return (
    <div className={wrapperClass} style={themeStyle(draft.template)}>
      <div className="preview-atmosphere" aria-hidden="true">
        <span className="preview-orbit" />
        <span className="preview-shape shape-a" />
        <span className="preview-shape shape-b" />
        <span className="preview-shape shape-c" />
      </div>
      <span className="preview-edition" aria-hidden="true">
        mend / {template.name}
      </span>
      <span className="paper-star star-a">★</span>
      <span className="paper-star star-b">★</span>

      {scene === "cover" && (
        <>
          <div className={`preview-photos ${isCollage ? "collage" : ""}`}>
            {photos.slice(0, isCollage ? 4 : 1).map((photo, index) => (
              <img src={photo} alt="" key={`${photo}-${index}`} />
            ))}
          </div>
          <div className="preview-copy">
            <small>Чамд зориулсан</small>
            <h2>
              {draft.headline ||
                (draft.recipientName
                  ? `Төрсөн өдрийн мэнд, ${draft.recipientName}!`
                  : "Төрсөн өдрийн мэнд!")}
            </h2>
            <p>
              {draft.senderName
                ? `${draft.senderName}-ээс`
                : "Чиний дотны хүнээс"}
            </p>
          </div>
          <Mascot
            gender={draft.recipientGender}
            variant={draft.template === "party" ? "celebrate" : "cake"}
          />
        </>
      )}

      {scene === "countdown" && (
        <div className="preview-scene-body">
          <small>Төрсөн өдөр хүртэл</small>
          <h2>
            {draft.recipientName
              ? `${draft.recipientName}-ийн өдөр`
              : "Уулзах өдөр"}
          </h2>
          {draft.birthdayDate ? (
            <Countdown birthdayDate={draft.birthdayDate} />
          ) : (
            <p className="preview-hollow">Огноо хараахан оруулаагүй</p>
          )}
          <Mascot gender={draft.recipientGender} variant="celebrate" />
        </div>
      )}

      {scene === "letter" && (
        <div className="preview-scene-body letter">
          <small>Захидал</small>
          <h2>
            {draft.senderName
              ? `${draft.senderName}-с ${draft.recipientName || "чамдаа"}`
              : "Захидал"}
          </h2>
          {draft.message ? (
            <p className="preview-letter">{draft.message}</p>
          ) : (
            <p className="preview-hollow">Мэндчилгээ хараахан бичээгүй</p>
          )}
          <Mascot gender={draft.recipientGender} variant="letter" />
        </div>
      )}

      {scene === "music" && (
        <div className="preview-scene-body">
          <small>Аялгуу</small>
          <h2>{draft.musicName || "Дуу"}</h2>
          {draft.musicUrl ? (
            <p className="preview-music-source">
              <Music2 size={14} />
              {parseYoutubeId(draft.musicUrl) ? "YouTube-ээс" : "Файл"}
            </p>
          ) : (
            <p className="preview-hollow">Дуу оруулаагүй — чимээгүй хувилбар</p>
          )}
          <Mascot gender={draft.recipientGender} variant="music" />
        </div>
      )}

      {scene === "finale" && (
        <div className="preview-scene-body">
          <small>Төгсгөл</small>
          <h2>
            {draft.surpriseMessage ||
              "Хүлээж байсан бүх сайхан зүйл чинь энэ жил чамайг олоосой."}
          </h2>
          <Mascot gender={draft.recipientGender} variant="celebrate" />
        </div>
      )}
    </div>
  );
}

type YoutubeSearchItem = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
};

const ytCacheKey = "mend:youtube_search_cache:v1";
const ytCacheTtlMs = 24 * 60 * 60 * 1000;
const ytCacheMax = 30;

type YtCacheEntry = { at: number; items: YoutubeSearchItem[] };
type YtCache = Record<string, YtCacheEntry>;

function readYoutubeCache(): YtCache {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(ytCacheKey) || "{}") as YtCache;
  } catch {
    return {};
  }
}

function getCachedYoutube(query: string): YoutubeSearchItem[] | null {
  const cache = readYoutubeCache();
  const hit = cache[query.toLowerCase()];
  if (!hit || Date.now() - hit.at > ytCacheTtlMs) return null;
  return hit.items || null;
}

function setCachedYoutube(query: string, items: YoutubeSearchItem[]) {
  if (typeof window === "undefined") return;
  const cache = readYoutubeCache();
  cache[query.toLowerCase()] = { at: Date.now(), items };
  const keys = Object.keys(cache).sort((a, b) => cache[b].at - cache[a].at);
  for (const key of keys.slice(ytCacheMax)) delete cache[key];
  try {
    window.localStorage.setItem(ytCacheKey, JSON.stringify(cache));
  } catch {
    /* localStorage бүрхэж болохгүй бол чимээгүй */
  }
}

function daysUntilBirthday(dateString: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return null;
  const target = new Date(`${dateString}T00:00:00`).getTime();
  if (!Number.isFinite(target)) return null;
  const now = new Date();
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  return Math.round((target - todayMidnight) / 86_400_000);
}

const monWeekdays = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function formatMongolianDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${y} · ${m} сарын ${d}`;
}

function DatePicker({
  value,
  onChange,
  placeholder = "Огноо сонгох",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split("-").map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date();
  });
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function togglePopover() {
    setOpen((current) => {
      const next = !current;
      if (next && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m] = value.split("-").map(Number);
        setViewMonth(new Date(y, m - 1, 1));
      }
      return next;
    });
  }

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = (firstOfMonth.getDay() + 6) % 7;

  const cells: Array<{ day: number; iso: string } | null> = [];
  for (let index = 0; index < startWeekday; index += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, iso: isoDate(year, month, day) });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const todayIso = isoDate(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const displayText = value ? formatMongolianDate(value) : placeholder;

  return (
    <div className="date-picker" ref={wrapperRef}>
      <button
        type="button"
        className={`date-picker-trigger ${value ? "has-value" : ""}`}
        onClick={togglePopover}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarDays size={19} />
        <span>{displayText}</span>
      </button>
      {open && (
        <div className="date-picker-popover" role="dialog" aria-modal="false">
          <header>
            <button
              type="button"
              aria-label="Өмнөх сар"
              onClick={() => setViewMonth(new Date(year, month - 1, 1))}
            >
              <ArrowLeft size={15} />
            </button>
            <div className="date-picker-title">
              <strong>{month + 1} сар</strong>
              <select
                aria-label="Он"
                value={year}
                onChange={(event) =>
                  setViewMonth(new Date(Number(event.target.value), month, 1))
                }
              >
                {(() => {
                  const options: number[] = [];
                  const start = today.getFullYear() - 100;
                  const end = today.getFullYear() + 5;
                  for (let y = end; y >= start; y -= 1) options.push(y);
                  return options.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ));
                })()}
              </select>
            </div>
            <button
              type="button"
              aria-label="Дараах сар"
              onClick={() => setViewMonth(new Date(year, month + 1, 1))}
            >
              <ArrowRight size={15} />
            </button>
          </header>
          <div className="date-picker-weekdays">
            {monWeekdays.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="date-picker-grid">
            {cells.map((cell, index) => {
              if (!cell) return <span key={`empty-${index}`} />;
              const isSelected = cell.iso === value;
              const isToday = cell.iso === todayIso;
              return (
                <button
                  type="button"
                  key={cell.iso}
                  className={[
                    isSelected ? "selected" : "",
                    isToday ? "today" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    onChange(cell.iso);
                    setOpen(false);
                  }}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
          <footer>
            <button
              type="button"
              onClick={() => {
                setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                onChange(todayIso);
                setOpen(false);
              }}
            >
              Өнөөдөр
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                Арилгах
              </button>
            )}
          </footer>
        </div>
      )}
    </div>
  );
}

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const IMAGE_TARGET_BYTES = 2 * 1024 * 1024;
const IMAGE_MAX_DIMENSION = 1800;
const IMAGE_SOURCE_HARD_CAP = 40 * 1024 * 1024;
const MAX_PHOTOS = 30;

async function safeJson<T>(response: Response): Promise<{
  data: T | null;
  text: string;
}> {
  const text = await response.text();
  try {
    return { data: text ? (JSON.parse(text) as T) : null, text };
  } catch {
    return { data: null, text };
  }
}

async function compressImage(file: File): Promise<File> {
  if (typeof document === "undefined") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  try {
    const scale = Math.min(
      1,
      IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const qualities = [0.85, 0.75, 0.65, 0.55];
    for (const quality of qualities) {
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (!blob) continue;
      if (blob.size <= IMAGE_TARGET_BYTES || quality === qualities.at(-1)) {
        return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
      }
    }
    return file;
  } finally {
    bitmap.close();
  }
}

async function uploadFile(file: File) {
  const isImage = file.type.startsWith("image/");
  if (isImage && file.size > IMAGE_SOURCE_HARD_CAP) {
    throw new Error("Зураг хэт том байна (40MB+). Багасгаад оруулна уу.");
  }
  if (!isImage && file.size > MAX_AUDIO_BYTES) {
    throw new Error(
      "Дуу 15MB-аас ихгүй байх ёстой. Илүү том дуу бол YouTube линк ашиглана уу.",
    );
  }
  const payload = isImage ? await compressImage(file) : file;
  const form = new FormData();
  form.append("file", payload);
  const response = await fetch("/api/media", { method: "POST", body: form });
  const { data, text } = await safeJson<{
    url?: string;
    name?: string;
    error?: string;
  }>(response);
  if (!response.ok || !data?.url) {
    const fallback =
      response.status === 413
        ? "Файл хэт том байна. Өөр зураг сонгоно уу."
        : text.slice(0, 200) || "Файл байршуулж чадсангүй.";
    throw new Error(data?.error || fallback);
  }
  return { url: data.url, name: data.name || file.name };
}

export function CreateGreetingApp() {
  const [draft, setDraft] = useState<GreetingDraft>(() => createDefaultDraft());
  const [hydrated, setHydrated] = useState(false);
  const [uploading, setUploading] = useState<"images" | "music" | "">("");
  const [error, setError] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [youtubeInput, setYoutubeInput] = useState("");
  const [youtubeName, setYoutubeName] = useState("");
  const [ytQuery, setYtQuery] = useState("");
  const [ytResults, setYtResults] = useState<YoutubeSearchItem[]>([]);
  const [ytSearching, setYtSearching] = useState(false);
  const [ytSearchError, setYtSearchError] = useState("");
  const [musicTab, setMusicTab] = useState<"youtube" | "file" | "link">(
    "youtube",
  );
  const [previewScene, setPreviewScene] = useState<PreviewScene>("cover");
  const [saveEmail, setSaveEmail] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  const musicRef = useRef<HTMLInputElement>(null);
  const step = Math.max(0, Math.min(3, draft.currentStep));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      let resumePlan: {
        id: string;
        token: string;
        email: string;
      } | null = null;
      try {
        const params = new URLSearchParams(window.location.search);
        const resumeId = params.get("resume") || "";
        const resumeToken = params.get("token") || "";
        const resumeEmail = params.get("e") || "";
        if (resumeId && resumeToken && resumeEmail) {
          resumePlan = {
            id: resumeId,
            token: resumeToken,
            email: resumeEmail,
          };
        }
      } catch {
        /* URL parse алдаа — үл хамаарна */
      }

      if (resumePlan) {
        void (async () => {
          try {
            const response = await fetch("/api/draft/load", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(resumePlan),
            });
            const data = (await response.json()) as {
              draft?: Partial<GreetingDraft>;
              error?: string;
            };
            if (!response.ok || !data.draft) {
              throw new Error(data.error || "Ноорог олдсонгүй.");
            }
            const merged: GreetingDraft = {
              ...createDefaultDraft(),
              ...data.draft,
            };
            setDraft(merged);
            setSaveEmail(resumePlan!.email);
            window.localStorage.setItem(draftKey, JSON.stringify(merged));
            window.localStorage.setItem(
              draftTokenKey,
              JSON.stringify({
                id: resumePlan!.id,
                token: resumePlan!.token,
                email: resumePlan!.email,
              }),
            );
            setSaveNotice("Ноорогоо сэргээлээ.");
          } catch (caught) {
            setError(
              caught instanceof Error
                ? caught.message
                : "Ноорог уншиж чадсангүй.",
            );
          } finally {
            setHydrated(true);
            const url = new URL(window.location.href);
            url.searchParams.delete("resume");
            url.searchParams.delete("token");
            url.searchParams.delete("e");
            window.history.replaceState({}, "", url.toString());
          }
        })();
        return;
      }

      const saved = window.localStorage.getItem(draftKey);
      let next: GreetingDraft = createDefaultDraft();
      if (saved) {
        try {
          next = { ...createDefaultDraft(), ...JSON.parse(saved) };
        } catch {
          window.localStorage.removeItem(draftKey);
        }
      }
      try {
        const params = new URLSearchParams(window.location.search);
        const urlTemplate = params.get("template");
        const validIds = new Set(templates.map((template) => template.id));
        if (urlTemplate && validIds.has(urlTemplate as GreetingDraft["template"])) {
          next = {
            ...next,
            template: urlTemplate as GreetingDraft["template"],
            currentStep: Math.max(next.currentStep, 1),
          };
          const url = new URL(window.location.href);
          url.searchParams.delete("template");
          window.history.replaceState({}, "", url.toString());
        }
      } catch {
        /* URL parse алдаа — үл хамаарна */
      }
      setDraft(next);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function saveProgress() {
    const trimmed = saveEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setError("Email формат буруу байна.");
      return;
    }
    setError("");
    setSavingDraft(true);
    setSaveNotice("");
    try {
      const storedRaw = window.localStorage.getItem(draftTokenKey);
      let existing: { id: string; token: string; email: string } | null = null;
      if (storedRaw) {
        try {
          const parsed = JSON.parse(storedRaw);
          if (
            parsed &&
            typeof parsed.id === "string" &&
            typeof parsed.token === "string" &&
            parsed.email === trimmed
          ) {
            existing = parsed;
          }
        } catch {
          /* ignore corrupt token */
        }
      }
      const saveResponse = await fetch("/api/draft/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: existing?.id,
          token: existing?.token,
          email: trimmed,
          draft,
        }),
      });
      const saveResult = (await saveResponse.json()) as {
        id?: string;
        token?: string;
        error?: string;
      };
      if (!saveResponse.ok || !saveResult.id || !saveResult.token) {
        throw new Error(saveResult.error || "Хадгалж чадсангүй.");
      }
      window.localStorage.setItem(
        draftTokenKey,
        JSON.stringify({
          id: saveResult.id,
          token: saveResult.token,
          email: trimmed,
        }),
      );
      const resumeResponse = await fetch("/api/draft/resume", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!resumeResponse.ok) {
        const resumeResult = (await resumeResponse.json()) as {
          error?: string;
        };
        throw new Error(resumeResult.error || "Линк илгээж чадсангүй.");
      }
      setSaveNotice(
        "Хадгалагдлаа. Үргэлжлүүлэх линкийг таны email рүү илгээв.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Алдаа гарлаа.");
    } finally {
      setSavingDraft(false);
    }
  }

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(draftKey, JSON.stringify(draft));
    }
  }, [draft, hydrated]);

  function update(patch: Partial<GreetingDraft>) {
    setError("");
    setDraft((current) => ({ ...current, ...patch }));
  }

  function setStep(next: number) {
    update({ currentStep: Math.max(0, Math.min(3, next)) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handlePhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(
      0,
      MAX_PHOTOS - draft.photos.length,
    );
    event.target.value = "";
    if (!files.length) return;
    setUploading("images");
    setError("");
    try {
      const uploaded = await Promise.all(files.map(uploadFile));
      update({ photos: [...draft.photos, ...uploaded.map((item) => item.url)] });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Зураг оруулж чадсангүй.");
    } finally {
      setUploading("");
    }
  }

  async function handleMusic(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading("music");
    setError("");
    try {
      const uploaded = await uploadFile(file);
      update({ musicUrl: uploaded.url, musicName: uploaded.name });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Дуу оруулж чадсангүй.");
    } finally {
      setUploading("");
    }
  }

  function handleYoutubeAdd() {
    const id = parseYoutubeId(youtubeInput);
    if (!id) {
      setError("YouTube линк буруу байна. Жишээ: https://youtu.be/dQw4w9WgXcQ");
      return;
    }
    const name = sanitizePlainText(youtubeName, 100).trim() || "YouTube аялгуу";
    update({
      musicUrl: `https://www.youtube.com/watch?v=${id}`,
      musicName: name,
    });
    setYoutubeInput("");
    setYoutubeName("");
  }

  function handleMusicClear() {
    update({ musicUrl: "", musicName: "" });
    setYoutubeInput("");
    setYoutubeName("");
    setYtResults([]);
    setYtQuery("");
    setYtSearchError("");
    setMusicTab("youtube");
  }

  async function runYoutubeSearch() {
    const query = ytQuery.trim();
    if (query.length < 2) {
      setYtSearchError("Хайх үг хамгийн багадаа 2 тэмдэгт.");
      return;
    }
    setYtSearchError("");
    const cached = getCachedYoutube(query);
    if (cached) {
      setYtResults(cached);
      return;
    }
    setYtSearching(true);
    try {
      const response = await fetch(
        `/api/youtube-search?q=${encodeURIComponent(query)}`,
      );
      const data = (await response.json()) as {
        items?: YoutubeSearchItem[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "YouTube хайлт амжилтгүй.");
      }
      const items = data.items || [];
      setCachedYoutube(query, items);
      setYtResults(items);
      if (!items.length) {
        setYtSearchError("Илэрц олдсонгүй. Өөр үг оролдоно уу.");
      }
    } catch (caught) {
      setYtSearchError(
        caught instanceof Error ? caught.message : "Хайлт амжилтгүй.",
      );
      setYtResults([]);
    } finally {
      setYtSearching(false);
    }
  }

  function selectYoutubeResult(item: YoutubeSearchItem) {
    update({
      musicUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
      musicName: sanitizePlainText(item.title, 100),
    });
    setYtResults([]);
    setYtQuery("");
    setYtSearchError("");
  }

  async function startCheckout() {
    if (!isDraftReady(draft)) {
      setError("Нэр, огноо, мэндчилгээ, дор хаяж нэг зургаа бүрэн оруулна уу.");
      return;
    }
    setCheckingOut(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft }),
      });
      const result = (await response.json()) as {
        paymentId?: string;
        orderId?: string;
        clientSecret?: string;
        error?: string;
      };
      if (
        !response.ok ||
        !result.paymentId ||
        !result.orderId ||
        !result.clientSecret
      ) {
        throw new Error(result.error || "Төлбөрийн нэхэмжлэх үүсгэж чадсангүй.");
      }

      window.localStorage.setItem(
        `mend-payment-v1:${result.paymentId}`,
        JSON.stringify({
          clientSecret: result.clientSecret,
          orderId: result.orderId,
        }),
      );
      window.location.assign(
        `/pay?payment=${encodeURIComponent(result.paymentId)}`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Алдаа гарлаа.");
    } finally {
      setCheckingOut(false);
    }
  }

  const stepReady = [
    Boolean(draft.template),
    Boolean(draft.recipientName && draft.senderName && draft.birthdayDate),
    Boolean(draft.message && draft.photos.length),
    isDraftReady(draft),
  ][step];

  const activeTemplate = getTemplate(draft.template);

  return (
    <AppShell current="create">
      <main
        className={`creator-layout template-${draft.template}`}
        style={themeStyle(draft.template)}
      >
        <aside className="creator-steps">
          <div className="step-mascot">
            <img
              className="mascot"
              src={mascotSource(
                draft.recipientGender,
                templateMascotVariants[activeTemplate.id],
              )}
              alt=""
              draggable={false}
            />
            <div>
              <strong>{draft.recipientName || "Шинэ мэндчилгээ"}</strong>
              <span>
                {activeTemplate.name} · {step + 1} / 4
              </span>
            </div>
          </div>
          {["Загвар", "Хэнд", "Агуулга", "Preview"].map((label, index) => (
            <button
              type="button"
              className={index === step ? "active" : index < step ? "done" : ""}
              onClick={() => setStep(index)}
              key={label}
            >
              <span>{index < step ? <Check size={15} /> : index + 1}</span>
              {label}
            </button>
          ))}
          <small>Ноорог энэ төхөөрөмж дээр автоматаар хадгалагдана.</small>
        </aside>

        <section className="creator-workspace">
          <header className="workspace-title">
            <span>mend creator · {String(step + 1).padStart(2, "0")}</span>
            <h1>
              {
                [
                  "Загвараа сонго",
                  "Хэнд зориулж байна?",
                  "Дурсамжаа нэм",
                  "Шалгаж, линкээ идэвхжүүл",
                ][step]
              }
            </h1>
          </header>

          {step === 0 && (
            <div className="template-grid">
              {templates.map((template, index) => (
                <button
                  type="button"
                  className={draft.template === template.id ? "selected" : ""}
                  onClick={() => update({ template: template.id })}
                  key={template.id}
                >
                  <span
                    className={`template-swatch template-${template.id}`}
                    style={{
                      background: template.background,
                      color: template.accent,
                    }}
                  >
                    <span className="swatch-index" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="swatch-art" aria-hidden="true">
                      <b />
                      <b />
                      <b />
                    </span>
                    <img
                      src={mascotSource(
                        draft.recipientGender,
                        templateMascotVariants[template.id],
                      )}
                      alt=""
                    />
                    <i style={{ background: template.accent }} />
                    <span className="swatch-name" aria-hidden="true">
                      {template.name}
                    </span>
                  </span>
                  <strong>{template.name}</strong>
                  <small>{template.description}</small>
                  {draft.template === template.id && <CheckCircle2 size={20} />}
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="form-stack">
              <section className="form-section">
                <header className="form-section-title">
                  <strong>Хэн хэнд</strong>
                  <small>Хүлээн авагч болон илгээгчийн нэр — цээрлэдэг товчлол хэрэглэсэн ч болно.</small>
                </header>
                <div className="field-grid">
                  <label>
                    <span>
                      Хүлээн авагчийн нэр
                      <em>{draft.recipientName.length} / 40</em>
                    </span>
                    <input
                      value={draft.recipientName}
                      maxLength={40}
                      onChange={(event) =>
                        update({
                          recipientName: sanitizePlainText(event.target.value, 40),
                        })
                      }
                      placeholder="Жишээ нь: Ану"
                    />
                  </label>
                  <label>
                    <span>
                      Илгээгчийн нэр
                      <em>{draft.senderName.length} / 40</em>
                    </span>
                    <input
                      value={draft.senderName}
                      maxLength={40}
                      onChange={(event) =>
                        update({
                          senderName: sanitizePlainText(event.target.value, 40),
                        })
                      }
                      placeholder="Таны нэр"
                    />
                  </label>
                </div>
              </section>

              <section className="form-section">
                <header className="form-section-title">
                  <strong>Маскот</strong>
                  <small>Хүлээн авагчид тохирох дүр автоматаар сонгогдоно.</small>
                </header>
                <div className="gender-picker" role="group" aria-label="Хүлээн авагчийн хүйс">
                  <button
                    type="button"
                    className={draft.recipientGender === "female" ? "selected" : ""}
                    aria-pressed={draft.recipientGender === "female"}
                    onClick={() => update({ recipientGender: "female" })}
                  >
                    <img src={mascotSource("female", "intro")} alt="" />
                    <span>
                      <strong>Эмэгтэй</strong>
                      <small>Буга mascot</small>
                    </span>
                    {draft.recipientGender === "female" && <CheckCircle2 size={19} />}
                  </button>
                  <button
                    type="button"
                    className={draft.recipientGender === "male" ? "selected" : ""}
                    aria-pressed={draft.recipientGender === "male"}
                    onClick={() => update({ recipientGender: "male" })}
                  >
                    <img src={mascotSource("male", "intro")} alt="" />
                    <span>
                      <strong>Эрэгтэй</strong>
                      <small>Бамбар mascot</small>
                    </span>
                    {draft.recipientGender === "male" && <CheckCircle2 size={19} />}
                  </button>
                </div>
              </section>

              <section className="form-section">
                <header className="form-section-title">
                  <strong>Огноо</strong>
                  <small>Хүлээн авагчид countdown болж харагдана.</small>
                </header>
                <div className="field-block">
                  <span className="field-label">Төрсөн өдөр</span>
                  <DatePicker
                    value={draft.birthdayDate}
                    onChange={(value) => update({ birthdayDate: value })}
                  />
                  {(() => {
                    const days = daysUntilBirthday(draft.birthdayDate);
                    if (days === null) return null;
                    if (days > 0)
                      return (
                        <small className="days-hint upcoming">
                          <Sparkles size={13} /> {days} өдрийн дараа
                        </small>
                      );
                    if (days === 0)
                      return (
                        <small className="days-hint today">
                          <PartyPopper size={13} /> Өнөөдөр!
                        </small>
                      );
                    return (
                      <small className="days-hint past">
                        {Math.abs(days)} өдрийн өмнөх огноо
                      </small>
                    );
                  })()}
                </div>
              </section>

              <section className="form-section">
                <header className="form-section-title">
                  <strong>Cover гарчиг</strong>
                  <small>Хүлээн авагчийн cover дээр том үсгээр гарна.</small>
                </header>
                <label>
                  <span>
                    Гарчиг
                    <em>{draft.headline.length} / 90</em>
                  </span>
                  <input
                    value={draft.headline}
                    maxLength={90}
                    onChange={(event) =>
                      update({
                        headline: sanitizePlainText(event.target.value, 90),
                      })
                    }
                    placeholder={`Төрсөн өдрийн мэнд, ${
                      draft.recipientName || "Ану"
                    }!`}
                  />
                </label>
              </section>
            </div>
          )}

          {step === 2 && (
            <div className="form-stack">
              <section className="upload-panel">
                <header>
                  <div>
                    <strong>Дурсамжийн албом</strong>
                    <small>
                      {draft.photos.length} / {MAX_PHOTOS} зураг · эхний зураг cover
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={() => photoRef.current?.click()}
                    disabled={
                      uploading === "images" || draft.photos.length >= MAX_PHOTOS
                    }
                  >
                    <ImagePlus size={17} />
                    {uploading === "images" ? "Оруулж байна..." : "Зураг нэмэх"}
                  </button>
                </header>
                <input
                  ref={photoRef}
                  className="visually-hidden"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handlePhotos}
                />
                {draft.photos.length ? (
                  <div className="photo-editor">
                    {draft.photos.map((photo, index) => (
                      <div key={photo}>
                        <img src={photo} alt={`Дурсамж ${index + 1}`} />
                        {index === 0 && (
                          <span className="photo-cover-badge">
                            <Sparkles size={11} /> Cover
                          </span>
                        )}
                        {index > 0 && (
                          <IconButton
                            label="Cover болгох"
                            className="photo-promote"
                            onClick={() => {
                              const next = [...draft.photos];
                              const [moved] = next.splice(index, 1);
                              next.unshift(moved);
                              update({ photos: next });
                            }}
                          >
                            <ArrowLeft size={14} />
                          </IconButton>
                        )}
                        <IconButton
                          label="Зураг устгах"
                          onClick={() =>
                            update({
                              photos: draft.photos.filter(
                                (_, photoIndex) => photoIndex !== index,
                              ),
                            })
                          }
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="empty-upload"
                    onClick={() => photoRef.current?.click()}
                  >
                    <Camera size={27} />
                    <strong>Зургаа энд нэмээрэй</strong>
                    <span>Эхний зураг cover дээр гарна</span>
                  </button>
                )}
              </section>

              <section className="form-section">
                <header className="form-section-title">
                  <strong>Мэндчилгээ</strong>
                  <small>Хүлээн авагч захианы хуудсанд уншина.</small>
                </header>
                <label>
                  <span>
                    Урт мэндчилгээ
                    <em
                      className={
                        draft.message.length > 1200
                          ? draft.message.length >= 1500
                            ? "count-limit"
                            : "count-warn"
                          : ""
                      }
                    >
                      {draft.message.length} / 1500
                    </em>
                  </span>
                  <textarea
                    rows={7}
                    value={draft.message}
                    maxLength={1500}
                    onChange={(event) =>
                      update({
                        message: sanitizePlainText(event.target.value, 1500),
                      })
                    }
                    placeholder="Сэтгэлийн үг, дурсамж, ерөөлөө бичээрэй..."
                  />
                </label>

                <label>
                  <span>
                    Surprise төгсгөлийн үг
                    <em>{draft.surpriseMessage.length} / 500</em>
                  </span>
                  <textarea
                    rows={3}
                    value={draft.surpriseMessage}
                    maxLength={500}
                    onChange={(event) =>
                      update({
                        surpriseMessage: sanitizePlainText(
                          event.target.value,
                          500,
                        ),
                      })
                    }
                    placeholder="Энэ жил чамайг хамгийн сайхан зүйлс олоосой."
                  />
                </label>
              </section>

              <section className="form-section">
                <header className="form-section-title">
                  <strong>Дуу</strong>
                  <small>Хүлээн авагч music бэлгийг нээхэд тоглоно. Сонголтоор.</small>
                </header>

                <input
                  ref={musicRef}
                  className="visually-hidden"
                  type="file"
                  accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav"
                  onChange={handleMusic}
                />

                {draft.musicUrl ? (
                  <div className="music-selected">
                    <div className="music-selected-icon">
                      <Volume2 size={22} />
                    </div>
                    <div className="music-selected-meta">
                      <strong>
                        {draft.musicName || "Төрсөн өдрийн дуу"}
                      </strong>
                      <small>
                        {parseYoutubeId(draft.musicUrl)
                          ? "YouTube-ээс тоглох болно"
                          : "Файл — recipient play дарж сонсоно"}
                      </small>
                    </div>
                    <IconButton
                      label="Дуу устгах"
                      onClick={handleMusicClear}
                    >
                      <Trash2 size={17} />
                    </IconButton>
                  </div>
                ) : (
                  <div className="music-panel">
                    <div className="music-tabs" role="tablist">
                      {(
                        [
                          ["youtube", "YouTube хайх"],
                          ["file", "Файл оруулах"],
                          ["link", "Линкээ хуулах"],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          type="button"
                          key={id}
                          role="tab"
                          aria-selected={musicTab === id}
                          className={musicTab === id ? "active" : ""}
                          onClick={() => setMusicTab(id)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {musicTab === "youtube" && (
                      <div className="music-tab-body">
                        <div className="music-youtube-search">
                          <input
                            type="search"
                            value={ytQuery}
                            maxLength={120}
                            onChange={(event) => {
                              setYtSearchError("");
                              setYtQuery(event.target.value.slice(0, 120));
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void runYoutubeSearch();
                              }
                            }}
                            placeholder="Жишээ: happy birthday jazz"
                          />
                          <button
                            type="button"
                            onClick={() => void runYoutubeSearch()}
                            disabled={
                              ytSearching || ytQuery.trim().length < 2
                            }
                          >
                            <Music2 size={16} />
                            {ytSearching ? "Хайж байна..." : "Хайх"}
                          </button>
                        </div>
                        {ytSearchError && (
                          <p className="music-youtube-error">{ytSearchError}</p>
                        )}
                        {ytResults.length > 0 && (
                          <ul className="music-youtube-results">
                            {ytResults.map((item) => (
                              <li key={item.videoId}>
                                <button
                                  type="button"
                                  onClick={() => selectYoutubeResult(item)}
                                >
                                  {item.thumbnail ? (
                                    <img src={item.thumbnail} alt="" />
                                  ) : (
                                    <span className="thumb-fallback">
                                      <Music2 size={18} />
                                    </span>
                                  )}
                                  <span className="music-youtube-meta">
                                    <strong>{item.title}</strong>
                                    <small>{item.channelTitle}</small>
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {musicTab === "file" && (
                      <div className="music-tab-body music-file-body">
                        <p>MP3, M4A, OGG, WAV · 15MB хүртэл.</p>
                        <button
                          type="button"
                          className="music-tab-primary"
                          onClick={() => musicRef.current?.click()}
                          disabled={uploading === "music"}
                        >
                          <Upload size={17} />
                          {uploading === "music"
                            ? "Оруулж байна..."
                            : "Файлаа сонгох"}
                        </button>
                      </div>
                    )}

                    {musicTab === "link" && (
                      <div className="music-tab-body music-youtube-manual">
                        <input
                          type="url"
                          inputMode="url"
                          value={youtubeInput}
                          maxLength={500}
                          onChange={(event) => {
                            setError("");
                            setYoutubeInput(event.target.value.slice(0, 500));
                          }}
                          placeholder="https://youtu.be/..."
                        />
                        <input
                          type="text"
                          value={youtubeName}
                          maxLength={100}
                          onChange={(event) =>
                            setYoutubeName(
                              sanitizePlainText(event.target.value, 100),
                            )
                          }
                          placeholder="Дууны нэр (сонголтоор)"
                        />
                        <button
                          type="button"
                          onClick={handleYoutubeAdd}
                          disabled={!youtubeInput.trim()}
                        >
                          <Music2 size={16} /> Оруулах
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}

          {step === 3 && (() => {
            const checks: Array<{
              ok: boolean;
              label: string;
              hint: string;
              fixStep: number;
            }> = [
              {
                ok: Boolean(draft.template),
                label: "Загвар сонгосон",
                hint: `${getTemplate(draft.template).name} загвар`,
                fixStep: 0,
              },
              {
                ok: Boolean(
                  draft.recipientName &&
                    draft.senderName &&
                    draft.birthdayDate,
                ),
                label: "Нэр + огноо оруулсан",
                hint:
                  draft.recipientName && draft.senderName && draft.birthdayDate
                    ? `${draft.recipientName}-д ${draft.senderName}-ээс`
                    : "Хэн, хэнд, хэзээ дутуу",
                fixStep: 1,
              },
              {
                ok: draft.photos.length > 0,
                label: "Зураг нэмсэн",
                hint: draft.photos.length
                  ? `${draft.photos.length} зураг · эхнийх нь cover`
                  : "Хамгийн багадаа 1 зураг хэрэгтэй",
                fixStep: 2,
              },
              {
                ok: draft.message.trim().length > 0,
                label: "Мэндчилгээ бичсэн",
                hint: draft.message.trim().length
                  ? `${draft.message.length} үсэг`
                  : "Урт мэндчилгээ хараахан хоосон",
                fixStep: 2,
              },
            ];
            const daysLeft = daysUntilBirthday(draft.birthdayDate);
            const ytId = parseYoutubeId(draft.musicUrl);
            const musicBadge = !draft.musicUrl
              ? "Чимээгүй"
              : ytId
              ? `YouTube · ${draft.musicName || "аялгуу"}`
              : `Файл · ${draft.musicName || "аялгуу"}`;

            const scenes: Array<{ id: PreviewScene; label: string }> = [
              { id: "cover", label: "Cover" },
              { id: "countdown", label: "Countdown" },
              { id: "letter", label: "Захидал" },
              { id: "music", label: "Дуу" },
              { id: "finale", label: "Төгсгөл" },
            ];

            return (
              <div className="publish-stage">
                <div className="publish-preview">
                  <div className="publish-scene-tabs" role="tablist">
                    {scenes.map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        role="tab"
                        aria-selected={previewScene === s.id}
                        className={previewScene === s.id ? "active" : ""}
                        onClick={() => setPreviewScene(s.id)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <CardPreview draft={draft} scene={previewScene} />
                  <small className="publish-preview-note">
                    Хүлээн авагч 6 scene-с бүрдсэн бүрэн туршлагыг үзнэ. Энд бүхэлдэх агуулгыг харуулж байна.
                  </small>
                </div>

                <div className="publish-side">
                  {(() => {
                    const missing = checks.filter((c) => !c.ok);
                    if (missing.length === 0) return null;
                    return (
                      <section className="publish-missing">
                        <div className="publish-missing-head">
                          <ShieldCheck size={16} />
                          <strong>Төлбөр хийхээс өмнө нөх</strong>
                        </div>
                        <ul>
                          {missing.map((m) => (
                            <li key={m.label}>
                              <span>{m.label}</span>
                              <button
                                type="button"
                                onClick={() => setStep(m.fixStep)}
                              >
                                Засах
                              </button>
                            </li>
                          ))}
                        </ul>
                      </section>
                    );
                  })()}

                  <section className="publish-invoice">
                    <header>
                      <div>
                        <small>Merchant</small>
                        <strong>mend.</strong>
                      </div>
                      <div className="publish-invoice-provider">
                        <ShieldCheck size={12} />
                        Powered by QPay
                      </div>
                    </header>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 12px",
                        borderRadius: 10,
                        background:
                          "linear-gradient(135deg,#ffe4a3,#ffc978)",
                        color: "#5a3d0f",
                        fontSize: 12,
                        fontWeight: 800,
                        marginBottom: 4,
                      }}
                    >
                      🎉 Эхний 50 хэрэглэгчид · нээлтийн урамшуулал
                    </div>

                    <div className="publish-invoice-line">
                      <div>
                        <strong>Нэг удаагийн мэндчилгээний линк</strong>
                        <small>
                          {draft.recipientName
                            ? `${draft.recipientName}-д зориулсан`
                            : "Хүлээн авагч тодорхойгүй"}
                          {draft.birthdayDate
                            ? ` · ${formatMongolianDate(draft.birthdayDate)}`
                            : ""}
                        </small>
                      </div>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "baseline",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            color: "#a89fb8",
                            textDecoration: "line-through",
                            fontWeight: 600,
                            fontSize: "0.85em",
                          }}
                        >
                          8,500₮
                        </span>
                        5,500₮
                      </span>
                    </div>

                    <div className="publish-invoice-total">
                      <span>Нийт төлөх</span>
                      <strong>
                        <span
                          style={{
                            color: "#a89fb8",
                            textDecoration: "line-through",
                            fontWeight: 600,
                            fontSize: "0.75em",
                            marginRight: 8,
                          }}
                        >
                          8,500₮
                        </span>
                        5,500₮ MNT
                      </strong>
                    </div>

                    <div className="publish-invoice-banks">
                      <small>Дараагийн алхамд QR + банкны деplink</small>
                      <div>
                        <span>
                          <Landmark size={12} /> Хаан
                        </span>
                        <span>
                          <Landmark size={12} /> ХХБ
                        </span>
                        <span>
                          <Landmark size={12} /> Голомт
                        </span>
                        <span>
                          <QrCode size={12} /> QPay
                        </span>
                        <span>+ бусад</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="publish-invoice-pay"
                      disabled={
                        !isDraftReady(draft) ||
                        checkingOut ||
                        Boolean(uploading)
                      }
                      onClick={startCheckout}
                    >
                      {checkingOut ? (
                        <>
                          <LoaderCircle size={17} className="spin" />
                          Нэхэмжлэх үүсгэж байна...
                        </>
                      ) : (
                        <>
                          <QrCode size={17} />
                          5,500₮ төлөх
                        </>
                      )}
                    </button>

                    <small className="publish-invoice-note">
                      <ShieldCheck size={11} />
                      Encrypted checkout · Загварлах, preview үнэгүй
                    </small>
                  </section>

                  <section className="publish-summary">
                    <strong>Нийтлэх агуулга</strong>
                    <dl>
                      <div>
                        <dt>Хэн</dt>
                        <dd>
                          {draft.recipientName || (
                            <em>дутуу</em>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Илгээгч</dt>
                        <dd>{draft.senderName || <em>дутуу</em>}</dd>
                      </div>
                      <div>
                        <dt>Огноо</dt>
                        <dd>
                          {draft.birthdayDate ? (
                            <>
                              {formatMongolianDate(draft.birthdayDate)}
                              {daysLeft !== null && (
                                <small>
                                  {daysLeft > 0
                                    ? ` · ${daysLeft} өдрийн дараа`
                                    : daysLeft === 0
                                    ? " · өнөөдөр"
                                    : ` · ${Math.abs(daysLeft)} өдрийн өмнө`}
                                </small>
                              )}
                            </>
                          ) : (
                            <em>дутуу</em>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Загвар</dt>
                        <dd>{getTemplate(draft.template).name}</dd>
                      </div>
                      <div>
                        <dt>Зураг</dt>
                        <dd>
                          {draft.photos.length ? (
                            `${draft.photos.length} зураг`
                          ) : (
                            <em>дутуу</em>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Мэндчилгээ</dt>
                        <dd>
                          {draft.message.trim() ? (
                            `${draft.message.length} үсэг`
                          ) : (
                            <em>дутуу</em>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Дуу</dt>
                        <dd>{musicBadge}</dd>
                      </div>
                    </dl>
                  </section>

                  <section className="publish-save">
                    <strong>Дараа үргэлжлүүлэх үү?</strong>
                    <p>
                      Email оруулбал ноорогоо server-т хадгалж, үргэлжлүүлэх
                      линкийг таны email рүү илгээнэ. Аль ч төхөөрөмжөөс буцаж
                      орох боломжтой.
                    </p>
                    <label className="publish-save-field">
                      <span>Email</span>
                      <input
                        type="email"
                        value={saveEmail}
                        onChange={(event) => setSaveEmail(event.target.value)}
                        placeholder="you@example.com"
                        disabled={savingDraft}
                      />
                    </label>
                    <button
                      type="button"
                      className="publish-save-button"
                      onClick={() => void saveProgress()}
                      disabled={savingDraft || !saveEmail.trim()}
                    >
                      {savingDraft ? (
                        <>
                          <LoaderCircle size={15} className="spin" />
                          Хадгалж байна...
                        </>
                      ) : (
                        <>
                          <Mail size={15} /> Хадгалж, линк илгээх
                        </>
                      )}
                    </button>
                    {saveNotice && (
                      <small className="publish-save-notice">
                        {saveNotice}
                      </small>
                    )}
                  </section>

                </div>
              </div>
            );
          })()}

          {error && <p className="form-error">{error}</p>}
          <footer className="creator-footer">
            <button
              type="button"
              className="secondary-button"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft size={17} /> Буцах
            </button>
            {step < 3 && (
              <button
                type="button"
                className="primary-button"
                disabled={!stepReady || Boolean(uploading)}
                onClick={() => setStep(step + 1)}
              >
                Үргэлжлүүлэх <ArrowRight size={17} />
              </button>
            )}
          </footer>
        </section>

        <aside className="creator-preview">
          <span>LIVE PREVIEW</span>
          <CardPreview draft={draft} compact />
        </aside>
      </main>
    </AppShell>
  );
}

function Countdown({ birthdayDate }: { birthdayDate: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const target = new Date(`${birthdayDate}T00:00:00`).getTime();
  const distance = Math.max(0, target - now);
  const units = [
    ["өдөр", Math.floor(distance / 86_400_000)],
    ["цаг", Math.floor((distance / 3_600_000) % 24)],
    ["мин", Math.floor((distance / 60_000) % 60)],
    ["сек", Math.floor((distance / 1000) % 60)],
  ] as const;

  return (
    <div className="countdown-grid">
      {units.map(([label, value]) => (
        <div key={label}>
          <strong>{String(value).padStart(2, "0")}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

type CakeBlowStatus =
  | "idle"
  | "starting"
  | "listening"
  | "blown"
  | "unavailable";

function BirthdayCakeExperience({
  recipientName,
  onComplete,
}: {
  recipientName: string;
  onComplete: () => void;
}) {
  const [status, setStatus] = useState<CakeBlowStatus>("idle");
  const [blowLevel, setBlowLevel] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const completeTimerRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  function stopListening() {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") {
      void context.close();
    }
  }

  function blowOutCandles() {
    if (completedRef.current) return;
    completedRef.current = true;
    stopListening();
    setBlowLevel(1);
    setStatus("blown");
    completeTimerRef.current = window.setTimeout(onComplete, 2200);
  }

  useEffect(
    () => () => {
      stopListening();
      if (completeTimerRef.current !== null) {
        window.clearTimeout(completeTimerRef.current);
      }
    },
  );

  async function startListening() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      return;
    }

    setStatus("starting");
    try {
      const context = new AudioContext();
      audioContextRef.current = context;
      await context.resume();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: true,
          echoCancellation: false,
          noiseSuppression: false,
        },
      });
      streamRef.current = stream;
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.28;
      source.connect(analyser);
      if (context.state !== "running") {
        await context.resume();
      }

      setStatus("listening");

      const samples = new Uint8Array(analyser.fftSize);
      const frequencies = new Uint8Array(analyser.frequencyBinCount);
      const startedAt = performance.now();
      let baselineRms = 0.008;
      let baselineNoise = 0.018;
      let blowingSince = 0;
      let lastMeterUpdate = 0;

      const measure = (now: number) => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        let peak = 0;
        for (const sample of samples) {
          const normalized = (sample - 128) / 128;
          sum += normalized * normalized;
          peak = Math.max(peak, Math.abs(normalized));
        }
        const rms = Math.sqrt(sum / samples.length);

        analyser.getByteFrequencyData(frequencies);
        const binHz = context.sampleRate / analyser.fftSize;
        const firstNoiseBin = Math.max(1, Math.floor(900 / binHz));
        const lastNoiseBin = Math.min(
          frequencies.length,
          Math.ceil(8000 / binHz),
        );
        let noiseSum = 0;
        for (let index = firstNoiseBin; index < lastNoiseBin; index += 1) {
          noiseSum += frequencies[index];
        }
        const noiseLevel =
          noiseSum / Math.max(1, lastNoiseBin - firstNoiseBin) / 255;

        if (now - startedAt < 360) {
          baselineRms = Math.min(0.02, baselineRms * 0.88 + rms * 0.12);
          baselineNoise = Math.min(
            0.065,
            baselineNoise * 0.88 + noiseLevel * 0.12,
          );
        }

        const rmsThreshold = Math.max(
          0.012,
          Math.min(0.055, baselineRms * 1.55 + 0.004),
        );
        const noiseThreshold = Math.max(
          0.03,
          Math.min(0.16, baselineNoise * 1.45 + 0.01),
        );
        const intensity = Math.max(
          rms / rmsThreshold,
          noiseLevel / noiseThreshold,
          peak / 0.12,
        );
        if (now - lastMeterUpdate > 48) {
          setBlowLevel(Math.min(1, intensity));
          lastMeterUpdate = now;
        }

        if (now - startedAt > 360 && intensity >= 1) {
          blowingSince ||= now;
        } else if (intensity < 0.72) {
          blowingSince = 0;
        }

        if (blowingSince && now - blowingSince >= 180) {
          blowOutCandles();
          return;
        }
        animationFrameRef.current = window.requestAnimationFrame(measure);
      };
      animationFrameRef.current = window.requestAnimationFrame(measure);
    } catch {
      stopListening();
      setStatus("unavailable");
    }
  }

  const isBlown = status === "blown";

  return (
    <div
      className={`cake-scene ${isBlown ? "is-blown" : ""} ${status === "listening" ? "is-listening" : ""}`}
      style={{ "--blow-level": blowLevel } as CSSProperties}
    >
      <small>{isBlown ? "Хүсэл чинь биелэх болтугай" : "Нэг хүсэл бодоорой"}</small>
      <h1>
        {isBlown
          ? `Төрсөн өдрийн мэнд, ${recipientName}!`
          : `${recipientName}, лаагаа үлээгээрэй`}
      </h1>

      <div className="birthday-cake">
        <div className="cake-confetti" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, index) => (
            <i key={index} />
          ))}
        </div>
        <div className="cake-art" aria-hidden="true">
          <span className="cake-candles">
            {Array.from({ length: 5 }).map((_, index) => (
              <i className={`cake-candle candle-${index + 1}`} key={index}>
                <b className="candle-flame" />
                <b className="candle-smoke" />
              </i>
            ))}
          </span>
          <span className="cake-frosting">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="cake-layer cake-layer-top" />
          <span className="cake-layer cake-layer-bottom" />
          <span className="cake-plate" />
        </div>
        <button
          type="button"
          className="cake-tap-target"
          disabled={isBlown}
          onClick={blowOutCandles}
        >
          <span className="visually-hidden">Лааг дарж унтраах</span>
        </button>
      </div>

      <div className="cake-instructions" aria-live="polite">
        {status === "idle" && (
          <>
            <p>Микрофоноо асаагаад бялуу руугаа зөөлөн үлээгээрэй.</p>
            <button type="button" className="primary-button" onClick={startListening}>
              <Mic size={18} /> Микрофон асаах
            </button>
          </>
        )}
        {status === "starting" && (
          <p className="cake-listening-copy"><Mic size={18} /> Микрофон нээж байна...</p>
        )}
        {status === "listening" && (
          <>
            <p className="cake-listening-copy"><Wind size={19} /> Микрофон ажиллаж байна · одоо үлээгээрэй</p>
            <div className="blow-meter" aria-label="Үлээлтийн хүч">
              <span style={{ width: `${Math.max(5, blowLevel * 100)}%` }} />
            </div>
          </>
        )}
        {status === "unavailable" && (
          <p>Микрофон ашиглах боломжгүй байна. Бялуун дээр дарж лаагаа унтраагаарай.</p>
        )}
        {isBlown && (
          <p className="cake-wish-copy"><Sparkles size={19} /> Мэндчилгээг нээж байна...</p>
        )}
      </div>

      {!isBlown && (
        <button type="button" className="cake-fallback" onClick={blowOutCandles}>
          Эсвэл энд дарж лаагаа унтраах
        </button>
      )}
    </div>
  );
}

type InAppBrowserPlatform = "android" | "ios" | "other";

function createAndroidBrowserIntent(urlString: string) {
  try {
    const url = new URL(urlString);
    const scheme = url.protocol.replace(":", "");
    const target = `${url.host}${url.pathname}${url.search}${url.hash}`;
    return `intent://${target}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url.toString())};end`;
  } catch {
    return urlString;
  }
}

function ExternalBrowserGate({
  platform,
  url,
  appName,
  onContinue,
}: {
  platform: InAppBrowserPlatform;
  url: string;
  appName: string;
  onContinue: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const androidIntent = createAndroidBrowserIntent(url);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Энэ линкийг хуулна уу", url);
    }
  }

  return (
    <main className="browser-handoff">
      <div className="browser-handoff-glow" aria-hidden="true" />
      <section className="browser-handoff-card">
        <span className="browser-handoff-brand">mend.</span>
        <div className="browser-handoff-icon" aria-hidden="true">
          <ExternalLink size={31} />
        </div>
        <small>{appName} browser танигдлаа</small>
        <h1>Утасныхаа browser-оор нээгээрэй</h1>
        <p>
          Лаагаа үлээхэд микрофон хэрэгтэй. {appName}-ийн доторх browser
          микрофоныг бүрэн дэмжихгүй байж болох тул Chrome эсвэл Safari-д
          нээгээд үргэлжлүүлээрэй.
        </p>

        {platform === "android" ? (
          <div className="browser-handoff-actions">
            <a className="primary-button" href={androidIntent}>
              <ExternalLink size={18} /> Chrome-оор нээх
            </a>
            <button type="button" className="secondary-button" onClick={copyLink}>
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? "Линк хуулагдлаа" : "Линк хуулах"}
            </button>
          </div>
        ) : (
          <>
            <ol className="browser-handoff-steps">
              <li><span>1</span><strong>Баруун дээд булангийн ••• цэсийг дарна</strong></li>
              <li><span>2</span><strong>“Open in Safari” эсвэл “Open in browser” сонгоно</strong></li>
            </ol>
            <button type="button" className="primary-button" onClick={copyLink}>
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? "Линк хуулагдлаа" : "Линк хуулах"}
            </button>
          </>
        )}

        <button type="button" className="browser-handoff-continue" onClick={onContinue}>
          Энд үргэлжлүүлэх
        </button>
      </section>
    </main>
  );
}

export function GreetingExperience({ slug }: { slug: string }) {
  const [greeting, setGreeting] = useState<PublicGreeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [screen, setScreen] = useState<RecipientScreen>("envelope");
  const [openedGifts, setOpenedGifts] = useState<string[]>([]);
  const [playing, setPlaying] = useState(false);
  const [reaction, setReaction] = useState<ReactionType | "">("");
  const [guestName, setGuestName] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [guestSent, setGuestSent] = useState(false);
  const [ytFailed, setYtFailed] = useState(false);
  const [browserHandoff, setBrowserHandoff] = useState<{
    platform: InAppBrowserPlatform;
    url: string;
    appName: string;
  } | null>(null);
  const [handoffDismissed, setHandoffDismissed] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const soundButtonRef = useRef<HTMLButtonElement>(null);
  const soundIconRef = useRef<HTMLSpanElement>(null);
  const soundTextRef = useRef<HTMLSpanElement>(null);
  const bolzooRef = useRef<BolzooAudioController | null>(null);
  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return "server";
    const key = `mend-session-${slug}`;
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const value = crypto.randomUUID();
    window.localStorage.setItem(key, value);
    return value;
  }, [slug]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forcedPlatform = params.get("inapp");
    const userAgent = navigator.userAgent || "";
    const isMetaInApp =
      /FBAN|FBAV|FB_IAB|Instagram|Messenger|Orca-Android/i.test(userAgent);
    if (!isMetaInApp && !["android", "ios", "other"].includes(forcedPlatform || "")) {
      return;
    }
    const platform: InAppBrowserPlatform =
      forcedPlatform === "android" || /Android/i.test(userAgent)
        ? "android"
        : forcedPlatform === "ios" || /iPhone|iPad|iPod/i.test(userAgent)
          ? "ios"
          : "other";
    const appName = /Instagram/i.test(userAgent)
      ? "Instagram"
      : /Messenger|Orca-Android/i.test(userAgent)
        ? "Messenger"
        : "Messenger / Instagram";
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("inapp");
    setBrowserHandoff({ platform, url: cleanUrl.toString(), appName });
  }, []);

  useEffect(() => {
    fetch(`/api/greetings?slug=${encodeURIComponent(slug)}`)
      .then(async (response) => {
        const result = (await response.json()) as {
          greeting?: PublicGreeting;
          error?: string;
        };
        if (!response.ok || !result.greeting) {
          throw new Error(result.error || "Мэндчилгээ олдсонгүй.");
        }
        setGreeting(result.greeting);
      })
      .catch((caught) =>
        setLoadError(caught instanceof Error ? caught.message : "Алдаа гарлаа."),
      )
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.querySelector('script[data-bolzoo-audio="1"]')) return;
    const script = document.createElement("script");
    script.src = "/assets/bolzoo-audio.js";
    script.async = true;
    script.setAttribute("data-bolzoo-audio", "1");
    document.head.appendChild(script);
  }, []);

  const ytVideoId = greeting ? parseYoutubeId(greeting.musicUrl) : null;

  useEffect(() => {
    if (!ytVideoId) return;
    let cancelled = false;
    const tryInit = () => {
      if (cancelled) return;
      if (bolzooRef.current) return;
      if (!window.BolzooAudio) {
        window.setTimeout(tryInit, 120);
        return;
      }
      bolzooRef.current = window.BolzooAudio.init({
        videoId: ytVideoId,
        volume: 55,
        hostElId: "mend-yt-host",
        buttonEl: soundButtonRef.current,
        iconEl: soundIconRef.current,
        textEl: soundTextRef.current,
        onFail: () => setYtFailed(true),
      });
    };
    tryInit();
    return () => {
      cancelled = true;
      const controller = bolzooRef.current;
      bolzooRef.current = null;
      if (controller) controller.destroy();
    };
  }, [ytVideoId]);

  async function sendAction(
    action: "open" | "react" | "guestbook",
    extra: Record<string, string> = {},
  ) {
    await fetch("/api/greetings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, action, sessionId, ...extra }),
    });
  }

  function openGift(name: "memories" | "letter" | "music") {
    setOpenedGifts((current) =>
      current.includes(name) ? current : [...current, name],
    );
    setScreen(name);
  }

  async function react(type: ReactionType) {
    setReaction(type);
    await sendAction("react", { reactionType: type });
  }

  async function submitGuestbook() {
    if (!guestMessage.trim()) return;
    await sendAction("guestbook", {
      name: guestName,
      message: guestMessage,
    });
    setGuestMessage("");
    setGuestSent(true);
  }

  if (browserHandoff && !handoffDismissed) {
    return (
      <ExternalBrowserGate
        {...browserHandoff}
        onContinue={() => setHandoffDismissed(true)}
      />
    );
  }

  if (loading) {
    return (
      <main className="recipient-state">
        <Mascot variant="intro" />
        <p>Мэндчилгээг бэлдэж байна...</p>
      </main>
    );
  }

  if (!greeting || loadError) {
    return (
      <main className="recipient-state">
        <Mascot variant="pout" />
        <h1>{loadError || "Мэндчилгээ олдсонгүй."}</h1>
        <a href="/create">Шинэ мэндчилгээ үүсгэх</a>
      </main>
    );
  }

  const template = getTemplate(greeting.template);
  const progress: Record<RecipientScreen, number> = {
    envelope: 0,
    cake: 1,
    cover: 2,
    gifts: 3,
    memories: 4,
    letter: 4,
    music: 4,
    finale: 5,
  };

  return (
    <main
      className={`recipient-experience template-${greeting.template}`}
      style={themeStyle(greeting.template)}
    >
      <header className="recipient-toolbar">
        <button
          type="button"
          className="recipient-brand"
          onClick={() => {
            setScreen("envelope");
            setOpenedGifts([]);
            setPlaying(false);
          }}
        >
          mend.
        </button>
        <div className="story-progress">
          {Array.from({ length: 6 }).map((_, index) => (
            <span
              className={index <= progress[screen] ? "active" : ""}
              key={index}
            />
          ))}
        </div>
        <IconButton
          label="Дахин эхлэх"
          onClick={() => {
            setScreen("envelope");
            setOpenedGifts([]);
            setPlaying(false);
          }}
        >
          <RotateCcw size={18} />
        </IconButton>
      </header>

      <div className="recipient-atmosphere" aria-hidden="true">
        <span className="recipient-orbit" />
        <span className="recipient-shape shape-a" />
        <span className="recipient-shape shape-b" />
        <span className="recipient-shape shape-c" />
      </div>

      <div
        id="mend-yt-host"
        className="mend-yt-host"
        aria-hidden="true"
      />
      {ytVideoId && !ytFailed && (
        <div className="sound-dock">
          <button
            ref={soundButtonRef}
            type="button"
            className="sound"
            aria-pressed="false"
          >
            <span ref={soundIconRef} className="sound-icon" aria-hidden="true">
              🎵
            </span>
            <span ref={soundTextRef} className="sound-copy">
              дуу асаах
            </span>
          </button>
        </div>
      )}

      <section className={`recipient-screen screen-${screen}`}>
        {screen === "envelope" && (
          <div className="envelope-scene">
            <p>{greeting.recipientName}-д</p>
            <div className="envelope">
              <span className="envelope-flap" />
              <Mail size={47} />
              <i>♥</i>
            </div>
            <Mascot gender={greeting.recipientGender} variant="intro" />
            <h1>Чамд нэг онцгой мэндчилгээ ирлээ</h1>
            <button
              type="button"
              className="primary-button"
            onClick={() => {
                setScreen("cake");
                void sendAction("open");
              }}
            >
              <Sparkles size={18} /> Дугтуй нээх
            </button>
          </div>
        )}

        {screen === "cake" && (
          <BirthdayCakeExperience
            recipientName={greeting.recipientName}
            onComplete={() => setScreen("cover")}
          />
        )}

        {screen === "cover" && (
          <div className="cover-scene">
            <div className="cover-photo">
              <img
                src={greeting.photos[0]}
                alt={greeting.recipientName}
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
              <Camera size={21} />
            </div>
            <div className="cover-copy">
              <small>Чамд зориулсан</small>
              <h1>{greeting.headline}</h1>
              <p>{greeting.senderName}-ээс</p>
              <button
                type="button"
                className="primary-button"
                onClick={() => setScreen("gifts")}
              >
                Бэлгүүдийг нээх <Gift size={18} />
              </button>
            </div>
            <Mascot gender={greeting.recipientGender} variant="cake" />
          </div>
        )}

        {screen === "gifts" && (
          <div className="gift-scene">
            <small>Нэг нэгээр нь нээгээрэй</small>
            <h1>Чамд зориулсан 3 surprise</h1>
            <div className="gift-grid">
              <button type="button" onClick={() => openGift("memories")}>
                <Mascot gender={greeting.recipientGender} variant="camera" />
                <strong>Дурсамж</strong>
                {openedGifts.includes("memories") && <CheckCircle2 />}
              </button>
              <button type="button" onClick={() => openGift("letter")}>
                <Mascot gender={greeting.recipientGender} variant="letter" />
                <strong>Захиа</strong>
                {openedGifts.includes("letter") && <CheckCircle2 />}
              </button>
              <button type="button" onClick={() => openGift("music")}>
                <Mascot gender={greeting.recipientGender} variant="music" />
                <strong>Аялгуу</strong>
                {openedGifts.includes("music") && <CheckCircle2 />}
              </button>
            </div>
            <button
              type="button"
              className="primary-button"
              disabled={openedGifts.length < 3}
              onClick={() => setScreen("finale")}
            >
              <PartyPopper size={18} /> Төгсгөлийг нээх
            </button>
          </div>
        )}

        {screen === "memories" && (
          <div className="memories-scene">
            <header>
              <Mascot gender={greeting.recipientGender} variant="camera" />
              <div>
                <small>moments of us</small>
                <h1>Бидний дурсамж</h1>
              </div>
            </header>
            <div className="memory-grid">
              {greeting.photos.map((photo, index) => (
                <img
                  src={photo}
                  alt={`Дурсамж ${index + 1}`}
                  loading={index < 4 ? "eager" : "lazy"}
                  decoding="async"
                  key={`${photo}-${index}`}
                />
              ))}
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setScreen("gifts")}
            >
              <ArrowLeft size={17} /> Бэлгүүд рүү
            </button>
          </div>
        )}

        {screen === "letter" && (
          <div className="letter-scene">
            <header>
              <Mascot gender={greeting.recipientGender} variant="letter" />
              <div>
                <small>{greeting.senderName}-ээс</small>
                <h1>{greeting.recipientName}-д</h1>
              </div>
            </header>
            <article>
              <p>{greeting.message}</p>
              <strong>— {greeting.senderName}</strong>
            </article>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setScreen("gifts")}
            >
              <ArrowLeft size={17} /> Бэлгүүд рүү
            </button>
          </div>
        )}

        {screen === "music" && (
          <div className="music-scene">
            <Mascot gender={greeting.recipientGender} variant="music" />
            <small>Чамд зориулсан аялгуу</small>
            <h1>{greeting.musicName || "Энэ мөчийн аялгуу"}</h1>
            {greeting.musicUrl ? (
              ytVideoId ? (
                ytFailed ? (
                  <div className="no-music">
                    <VolumeX size={25} />
                    <span>
                      YouTube-с холбогдож чадсангүй. Дараа дахин үзнэ үү.
                    </span>
                  </div>
                ) : (
                  <p className="music-dock-hint">
                    Баруун дээд буланд байгаа 🎵 товчийг дарж дуу асаагаарай.
                  </p>
                )
              ) : (
                <>
                  <audio
                    ref={audioRef}
                    src={greeting.musicUrl}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onEnded={() => setPlaying(false)}
                  />
                  <button
                    type="button"
                    className="music-play"
                    onClick={() => {
                      if (!audioRef.current) return;
                      if (playing) audioRef.current.pause();
                      else void audioRef.current.play();
                    }}
                  >
                    {playing ? <Pause size={28} /> : <Play size={28} />}
                  </button>
                  <p>{playing ? "Аялгуу тоглож байна" : "Play дарж сонсоорой"}</p>
                </>
              )
            ) : (
              <div className="no-music">
                <VolumeX size={25} />
                <span>Энэ мэндчилгээ чимээгүй хувилбартай</span>
              </div>
            )}
            <button
              type="button"
              className="secondary-button"
              onClick={() => setScreen("gifts")}
            >
              <ArrowLeft size={17} /> Бэлгүүд рүү
            </button>
          </div>
        )}

        {screen === "finale" && (
          <div className="finale-scene">
            <Mascot gender={greeting.recipientGender} variant="celebrate" />
            <small>Төрсөн өдрийн мэнд</small>
            <h1>
              {greeting.surpriseMessage ||
                "Хүлээж байсан бүх сайхан зүйл чинь энэ жил чамайг олоосой."}
            </h1>
            <div className="reaction-row">
              <button
                type="button"
                className={reaction === "heart" ? "selected" : ""}
                onClick={() => void react("heart")}
              >
                💖 <span>Хөөрхөн байлаа</span>
              </button>
              <button
                type="button"
                className={reaction === "party" ? "selected" : ""}
                onClick={() => void react("party")}
              >
                🎉 <span>Surprise болсон</span>
              </button>
              <button
                type="button"
                className={reaction === "surprised" ? "selected" : ""}
                onClick={() => void react("surprised")}
              >
                🥹 <span>Сэтгэл хөдөллөө</span>
              </button>
            </div>
            <div className="finale-story-share">
              <StoryShareButton
                slug={slug}
                greeting={greeting}
                label="Энэ мэндчилгээг Story-д хийх"
              />
              <small>9:16 зураг + бүтэн мэндчилгээний линк</small>
            </div>
            <section className="guestbook-form">
              <header>
                <MessageCircle size={20} />
                <strong>Мэндчилгээ үлдээх</strong>
              </header>
              <input
                value={guestName}
                maxLength={40}
                onChange={(event) =>
                  setGuestName(sanitizePlainText(event.target.value, 40))
                }
                placeholder="Таны нэр (заавал биш)"
              />
              <div>
                <textarea
                  value={guestMessage}
                  maxLength={400}
                  rows={3}
                  onChange={(event) => {
                    setGuestSent(false);
                    setGuestMessage(
                      sanitizePlainText(event.target.value, 400),
                    );
                  }}
                  placeholder="Төрсөн өдрийн мэндчилгээ..."
                />
                <IconButton
                  label="Мэндчилгээ илгээх"
                  disabled={!guestMessage.trim()}
                  onClick={() => void submitGuestbook()}
                >
                  <Send size={19} />
                </IconButton>
              </div>
              {guestSent && <small>Мэндчилгээ илгээгдлээ. Баярлалаа!</small>}
            </section>
          </div>
        )}
      </section>
      <span className="recipient-theme-name">{template.name}</span>
    </main>
  );
}

function readOwnerEntries(): OwnerEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(ownerKey) || "[]");
    return Array.isArray(value)
      ? value.filter(
          (item): item is OwnerEntry =>
            typeof item?.token === "string" && typeof item?.slug === "string",
        )
      : [];
  } catch {
    return [];
  }
}

export function DashboardApp() {
  const [greetings, setGreetings] = useState<DashboardGreeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");
    const owners = readOwnerEntries();
    if (!owners.length) {
      setGreetings([]);
      setLoading(false);
      return;
    }

    const results = await Promise.all(
      owners.map(async (owner) => {
        const response = await fetch("/api/greetings?dashboard=1", {
          headers: { authorization: `Bearer ${owner.token}` },
        });
        if (!response.ok) return null;
        const result = (await response.json()) as {
          greeting?: DashboardGreeting;
        };
        return result.greeting ?? null;
      }),
    );
    setGreetings(
      results
        .filter((item): item is DashboardGreeting => Boolean(item))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard().catch(() => {
        setError("Dashboard мэдээллийг уншиж чадсангүй.");
        setLoading(false);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const totals = greetings.reduce(
    (sum, greeting) => ({
      views: sum.views + greeting.viewCount,
      reactions:
        sum.reactions +
        greeting.reactions.heart +
        greeting.reactions.party +
        greeting.reactions.surprised,
      messages: sum.messages + greeting.guestbook.length,
    }),
    { views: 0, reactions: 0, messages: 0 },
  );

  return (
    <AppShell current="dashboard">
      <main className="dashboard-page">
        <header className="dashboard-heading">
          <div>
            <small>OWNER DASHBOARD</small>
            <h1>Таны мэндчилгээнүүд</h1>
            <p>Нээгдсэн эсэх, reaction болон guestbook мэндчилгээг энд харна.</p>
          </div>
          <button type="button" onClick={() => void loadDashboard()}>
            <RefreshCw size={17} /> Шинэчлэх
          </button>
        </header>

        <section className="dashboard-stats">
          <div>
            <Gift size={21} />
            <span>
              <strong>{greetings.length}</strong>
              <small>Үүсгэсэн</small>
            </span>
          </div>
          <div>
            <Eye size={21} />
            <span>
              <strong>{totals.views}</strong>
              <small>Нээлт</small>
            </span>
          </div>
          <div>
            <Heart size={21} />
            <span>
              <strong>{totals.reactions}</strong>
              <small>Reaction</small>
            </span>
          </div>
          <div>
            <MessageCircle size={21} />
            <span>
              <strong>{totals.messages}</strong>
              <small>Мэндчилгээ</small>
            </span>
          </div>
        </section>

        {loading ? (
          <section className="dashboard-empty">
            <Mascot variant="camera" />
            <p>Dashboard-ийг шинэчилж байна...</p>
          </section>
        ) : greetings.length ? (
          <section className="dashboard-list">
            {greetings.map((greeting) => (
              <article key={greeting.id}>
                <header>
                  <img src={greeting.photos[0]} alt="" />
                  <div>
                    <small>{getTemplate(greeting.template).name}</small>
                    <h2>{greeting.recipientName}</h2>
                    <span>
                      {greeting.openedAt ? (
                        <>
                          <CheckCircle2 size={15} /> Нээгдсэн · {greeting.viewCount} удаа
                        </>
                      ) : (
                        <>
                          <Eye size={15} /> Хараахан нээгээгүй
                        </>
                      )}
                    </span>
                  </div>
                  <a href={`/g/${greeting.publicSlug}`}>
                    <Eye size={17} /> Нээх
                  </a>
                </header>
                <div className="reaction-summary">
                  <span>💖 {greeting.reactions.heart}</span>
                  <span>🎉 {greeting.reactions.party}</span>
                  <span>🥹 {greeting.reactions.surprised}</span>
                  <div className="dashboard-share-actions">
                    <button
                      type="button"
                      onClick={() =>
                        navigator.clipboard?.writeText(
                          `${window.location.origin}/g/${greeting.publicSlug}`,
                        )
                      }
                    >
                      <Copy size={15} /> Линк хуулах
                    </button>
                    <StoryShareButton
                      slug={greeting.publicSlug}
                      greeting={greeting}
                      label="Story-д хийх"
                    />
                  </div>
                </div>
                <section className="guestbook-list">
                  <h3>Guestbook</h3>
                  {greeting.guestbook.length ? (
                    greeting.guestbook.map((entry) => (
                      <div key={entry.id}>
                        <span>{entry.name.slice(0, 1).toUpperCase()}</span>
                        <p>
                          <strong>{entry.name}</strong>
                          {entry.message}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="no-response">Одоогоор мэндчилгээ ирээгүй байна.</p>
                  )}
                </section>
              </article>
            ))}
          </section>
        ) : (
          <section className="dashboard-empty">
            <Mascot variant="letter" />
            <h2>Мэндчилгээ хараахан алга</h2>
            <p>Энэ төхөөрөмжөөс үүсгэсэн мэндчилгээ энд автоматаар гарна.</p>
            <a href="/create">Эхний мэндчилгээг үүсгэх</a>
          </section>
        )}
        {error && <p className="form-error">{error}</p>}
      </main>
    </AppShell>
  );
}

export default CreateGreetingApp;
