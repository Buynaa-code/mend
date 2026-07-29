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
  Gift,
  Heart,
  ImagePlus,
  Mail,
  MessageCircle,
  Music2,
  PartyPopper,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
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
  type PublicGreeting,
  type ReactionType,
  getTemplate,
  isDraftReady,
  sanitizePlainText,
  templates,
} from "./lib/greeting";

type OwnerEntry = {
  id: string;
  token: string;
  slug: string;
  recipientName: string;
};

type RecipientScreen =
  | "envelope"
  | "countdown"
  | "cover"
  | "gifts"
  | "memories"
  | "letter"
  | "music"
  | "finale";

const draftKey = "mend-create-draft-v2";
const ownerKey = "mend-owner-tokens-v2";
const fallbackPhotos = [
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=900&q=80",
];

const mascotSources = {
  intro: "/assets/mend-giraffe.png",
  pout: "/assets/mend-giraffe-pout.png",
  celebrate: "/assets/mend-giraffe-celebrate.png",
  camera: "/assets/mend-giraffe-camera.png",
  letter: "/assets/mend-giraffe-letter.png",
  music: "/assets/mend-giraffe-music.png",
  cake: "/assets/mend-giraffe-cake.png",
} as const;

function Mascot({
  variant,
  className = "",
}: {
  variant: keyof typeof mascotSources;
  className?: string;
}) {
  return (
    <img
      className={`mascot ${className}`}
      src={mascotSources[variant]}
      alt=""
      draggable={false}
    />
  );
}

function IconButton({
  label,
  children,
  ...props
}: {
  label: string;
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="icon-button" aria-label={label} title={label} {...props}>
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

function CardPreview({
  draft,
  compact = false,
}: {
  draft: GreetingDraft | PublicGreeting;
  compact?: boolean;
}) {
  const photos = draft.photos.length ? draft.photos : fallbackPhotos;
  const isCollage = draft.template === "collage";
  return (
    <div
      className={`card-preview template-${draft.template} ${compact ? "compact" : ""}`}
      style={themeStyle(draft.template)}
    >
      <span className="paper-star star-a">★</span>
      <span className="paper-star star-b">★</span>
      <div className={`preview-photos ${isCollage ? "collage" : ""}`}>
        {photos.slice(0, isCollage ? 4 : 1).map((photo, index) => (
          <img src={photo} alt="" key={`${photo}-${index}`} />
        ))}
      </div>
      <div className="preview-copy">
        <small>happy birthday</small>
        <h2>
          {draft.headline ||
            `Төрсөн өдрийн мэнд, ${draft.recipientName || "чамдаа"}!`}
        </h2>
        <p>{draft.senderName ? `${draft.senderName}-ээс` : "Чиний дотны хүнээс"}</p>
      </div>
      <Mascot variant={draft.template === "party" ? "celebrate" : "cake"} />
    </div>
  );
}

async function uploadFile(file: File) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/media", { method: "POST", body: form });
  const result = (await response.json()) as {
    url?: string;
    name?: string;
    error?: string;
  };
  if (!response.ok || !result.url) {
    throw new Error(result.error || "Файл байршуулж чадсангүй.");
  }
  return { url: result.url, name: result.name || file.name };
}

export function CreateGreetingApp() {
  const [draft, setDraft] = useState<GreetingDraft>(() => createDefaultDraft());
  const [hydrated, setHydrated] = useState(false);
  const [uploading, setUploading] = useState<"images" | "music" | "">("");
  const [error, setError] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  const musicRef = useRef<HTMLInputElement>(null);
  const step = Math.max(0, Math.min(3, draft.currentStep));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(draftKey);
      if (saved) {
        try {
          setDraft({ ...createDefaultDraft(), ...JSON.parse(saved) });
        } catch {
          window.localStorage.removeItem(draftKey);
        }
      }
      setOwnerEmail(window.localStorage.getItem("mend-owner-email-v1") || "");
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

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
      6 - draft.photos.length,
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

  async function startCheckout() {
    if (!isDraftReady(draft)) {
      setError("Нэр, огноо, мэндчилгээ, дор хаяж нэг зургаа бүрэн оруулна уу.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(ownerEmail.trim())) {
      setError("Захиалга сэргээх боломжтой зөв email оруулна уу.");
      return;
    }
    setCheckingOut(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft, email: ownerEmail.trim() }),
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

      window.localStorage.setItem("mend-owner-email-v1", ownerEmail.trim());
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

  return (
    <AppShell current="create">
      <main className="creator-layout">
        <aside className="creator-steps">
          <div className="step-mascot">
            <Mascot
              variant={
                (["intro", "letter", "camera", "celebrate"] as const)[step]
              }
            />
            <div>
              <strong>{draft.recipientName || "Шинэ мэндчилгээ"}</strong>
              <span>{step + 1} / 4 алхам</span>
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
              {templates.map((template) => (
                <button
                  type="button"
                  className={draft.template === template.id ? "selected" : ""}
                  onClick={() => update({ template: template.id })}
                  key={template.id}
                >
                  <span
                    className="template-swatch"
                    style={{
                      background: template.background,
                      color: template.accent,
                    }}
                  >
                    <img src={template.mascot} alt="" />
                    <i style={{ background: template.accent }} />
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
              <div className="field-grid">
                <label>
                  <span>Хүлээн авагчийн нэр</span>
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
                  <span>Илгээгчийн нэр</span>
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
              <label>
                <span>Төрсөн өдөр</span>
                <div className="input-with-icon">
                  <CalendarDays size={19} />
                  <input
                    type="date"
                    value={draft.birthdayDate}
                    onChange={(event) => update({ birthdayDate: event.target.value })}
                  />
                </div>
                <small>Хүлээн авагчид countdown болж харагдана.</small>
              </label>
              <label>
                <span>Cover гарчиг</span>
                <input
                  value={draft.headline}
                  maxLength={90}
                  onChange={(event) =>
                    update({ headline: sanitizePlainText(event.target.value, 90) })
                  }
                  placeholder={`Төрсөн өдрийн мэнд, ${draft.recipientName || "Ану"}!`}
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="form-stack">
              <section className="upload-panel">
                <header>
                  <div>
                    <strong>Дурсамжийн зураг</strong>
                    <small>{draft.photos.length} / 6</small>
                  </div>
                  <button
                    type="button"
                    onClick={() => photoRef.current?.click()}
                    disabled={uploading === "images" || draft.photos.length >= 6}
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

              <label>
                <span>Урт мэндчилгээ</span>
                <textarea
                  rows={7}
                  value={draft.message}
                  maxLength={1500}
                  onChange={(event) =>
                    update({ message: sanitizePlainText(event.target.value, 1500) })
                  }
                  placeholder="Сэтгэлийн үг, дурсамж, ерөөлөө бичээрэй..."
                />
                <small>{draft.message.length} / 1500</small>
              </label>

              <label>
                <span>Surprise төгсгөлийн үг</span>
                <textarea
                  rows={3}
                  value={draft.surpriseMessage}
                  maxLength={500}
                  onChange={(event) =>
                    update({
                      surpriseMessage: sanitizePlainText(event.target.value, 500),
                    })
                  }
                  placeholder="Энэ жил чамайг хамгийн сайхан зүйлс олоосой."
                />
              </label>

              <section className="music-upload">
                <div className="music-icon">
                  {draft.musicUrl ? <Volume2 size={22} /> : <Music2 size={22} />}
                </div>
                <div>
                  <strong>{draft.musicName || "Төрсөн өдрийн дуу"}</strong>
                  <small>
                    {draft.musicUrl
                      ? "Recipient play дарж сонсоно"
                      : "MP3, M4A, OGG эсвэл WAV · 15MB хүртэл"}
                  </small>
                </div>
                <input
                  ref={musicRef}
                  className="visually-hidden"
                  type="file"
                  accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav"
                  onChange={handleMusic}
                />
                {draft.musicUrl ? (
                  <IconButton
                    label="Дуу устгах"
                    onClick={() => update({ musicUrl: "", musicName: "" })}
                  >
                    <Trash2 size={17} />
                  </IconButton>
                ) : (
                  <button
                    type="button"
                    onClick={() => musicRef.current?.click()}
                    disabled={uploading === "music"}
                  >
                    <Upload size={17} />
                    {uploading === "music" ? "Оруулж байна..." : "Дуу нэмэх"}
                  </button>
                )}
              </section>
            </div>
          )}

          {step === 3 && (
            <div className="publish-stage">
              <CardPreview draft={draft} />
              <section className="publish-checklist">
                <strong>Бэлэн эсэх</strong>
                <span className={draft.template ? "ready" : ""}>
                  <Check size={16} /> 4 загвараас сонгосон
                </span>
                <span
                  className={
                    draft.recipientName && draft.senderName && draft.birthdayDate
                      ? "ready"
                      : ""
                  }
                >
                  <Check size={16} /> Нэр, төрсөн өдөр оруулсан
                </span>
                <span className={draft.photos.length ? "ready" : ""}>
                  <Check size={16} /> Зураг нэмсэн
                </span>
                <span className={draft.message ? "ready" : ""}>
                  <Check size={16} /> Мэндчилгээ бичсэн
                </span>
                <label className="checkout-email">
                  <span>Захиалга сэргээх email</span>
                  <input
                    type="email"
                    value={ownerEmail}
                    maxLength={160}
                    autoComplete="email"
                    onChange={(event) => {
                      setError("");
                      setOwnerEmail(event.target.value.slice(0, 160));
                    }}
                    placeholder="you@example.com"
                  />
                </label>
                <div className="checkout-offer">
                  <span>Нийтлэх эрх</span>
                  <strong>6,900₮</strong>
                  <small>1 төлбөр = 1 нийтлэгдсэн мэндчилгээний линк</small>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  disabled={
                    !isDraftReady(draft) ||
                    checkingOut ||
                    Boolean(uploading)
                  }
                  onClick={startCheckout}
                >
                  <Sparkles size={18} />
                  {checkingOut
                    ? "Нэхэмжлэх үүсгэж байна..."
                    : "Линкээ идэвхжүүлэх · 6,900₮"}
                </button>
                <small className="free-preview-note">
                  Загварлах, файл нэмэх, preview харах нь үнэгүй.
                </small>
              </section>
            </div>
          )}

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
  const audioRef = useRef<HTMLAudioElement>(null);
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
    countdown: 1,
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

      <section className={`recipient-screen screen-${screen}`}>
        {screen === "envelope" && (
          <div className="envelope-scene">
            <p>{greeting.recipientName}-д</p>
            <div className="envelope">
              <span className="envelope-flap" />
              <Mail size={47} />
              <i>♥</i>
            </div>
            <Mascot variant="intro" />
            <h1>Чамд нэг онцгой мэндчилгээ ирлээ</h1>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setScreen("countdown");
                void sendAction("open");
              }}
            >
              <Sparkles size={18} /> Дугтуй нээх
            </button>
          </div>
        )}

        {screen === "countdown" && (
          <div className="countdown-scene">
            <small>Төрсөн өдөр хүртэл</small>
            <h1>{greeting.recipientName}-ийн өдөр</h1>
            <Countdown birthdayDate={greeting.birthdayDate} />
            <Mascot variant="celebrate" />
            <button
              type="button"
              className="primary-button"
              onClick={() => setScreen("cover")}
            >
              Мэндчилгээг үзэх <ArrowRight size={18} />
            </button>
          </div>
        )}

        {screen === "cover" && (
          <div className="cover-scene">
            <div className="cover-photo">
              <img src={greeting.photos[0]} alt={greeting.recipientName} />
              <Camera size={21} />
            </div>
            <div className="cover-copy">
              <small>happy birthday</small>
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
            <Mascot variant="cake" />
          </div>
        )}

        {screen === "gifts" && (
          <div className="gift-scene">
            <small>Нэг нэгээр нь нээгээрэй</small>
            <h1>Чамд зориулсан 3 surprise</h1>
            <div className="gift-grid">
              <button type="button" onClick={() => openGift("memories")}>
                <Mascot variant="camera" />
                <strong>Дурсамж</strong>
                {openedGifts.includes("memories") && <CheckCircle2 />}
              </button>
              <button type="button" onClick={() => openGift("letter")}>
                <Mascot variant="letter" />
                <strong>Захиа</strong>
                {openedGifts.includes("letter") && <CheckCircle2 />}
              </button>
              <button type="button" onClick={() => openGift("music")}>
                <Mascot variant="music" />
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
              <Mascot variant="camera" />
              <div>
                <small>moments of us</small>
                <h1>Бидний дурсамж</h1>
              </div>
            </header>
            <div className="memory-grid">
              {greeting.photos.map((photo, index) => (
                <img src={photo} alt={`Дурсамж ${index + 1}`} key={photo} />
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
              <Mascot variant="letter" />
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
            <Mascot variant="music" />
            <small>Чамд зориулсан аялгуу</small>
            <h1>{greeting.musicName || "Энэ мөчийн аялгуу"}</h1>
            {greeting.musicUrl ? (
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
            <Mascot variant="celebrate" />
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
