"use client";

/* eslint-disable @next/next/no-img-element */

import {
  Archive,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Copy,
  Download,
  Eye,
  FileText,
  Gift,
  Heart,
  ImagePlus,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Music2,
  PartyPopper,
  Pause,
  Play,
  QrCode,
  RefreshCw,
  Search,
  Send,
  Settings2,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
  WandSparkles,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createDefaultDraft,
  getDisplayStatus,
  type GreetingDraft,
  isDraftReady,
  sanitizePlainText,
  scoreTemplate,
  templates,
} from "./lib/greeting";

type Role = "creator" | "recipient" | "admin";
type SaveState = "idle" | "saving" | "saved" | "local";

const ageGroups = ["Хүүхэд", "Өсвөр нас", "Залуу", "Насанд хүрэгч", "Ахмад"];
const relationships = [
  "Найз",
  "Хамгийн сайн найз",
  "Хос",
  "Ээж",
  "Аав",
  "Ах, эгч",
  "Дүү",
  "Хамаатан",
  "Хамтран ажиллагч",
  "Дарга",
  "Багш",
  "Үйлчлүүлэгч",
];
const professions = [
  "Эмч",
  "Сувилагч",
  "Цэрэг",
  "Багш",
  "Дизайнер",
  "Программист",
  "Маркетер",
  "Хуульч",
  "Тамирчин",
  "Оюутан",
  "Бусад",
];
const moods = [
  "Хөөрхөн",
  "Хөгжилтэй",
  "Сэтгэл хөдөлгөм",
  "Хүндэтгэсэн",
  "Luxury",
  "Minimal",
  "Gen Z",
  "Retro",
];
const reactions = ["❤️", "🥹", "🎉", "😂", "✨"];
const readyReplies = [
  "Маш гоё мэндчилгээ байна, баярлалаа!",
  "Үнэхээр сэтгэл хөдөллөө.",
  "Миний өдрийг гоё болголоо!",
];
const stepNames = [
  "Хүлээн авагч",
  "Загвар",
  "Хувийн мэдээлэл",
  "Захиа ба эффект",
  "Урьдчилан харах",
  "Идэвхжүүлэх",
];
const defaultPhoto =
  "https://images.unsplash.com/photo-1464349153735-7db50ed83c84?auto=format&fit=crop&w=1200&q=86";

function Button({
  children,
  icon,
  variant = "primary",
  className = "",
  ...props
}: {
  children: ReactNode;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {icon}
      <span>{children}</span>
    </button>
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

function StatusBadge({ draft }: { draft: GreetingDraft }) {
  const status = getDisplayStatus(draft);
  return <span className={`status-badge status-${status.tone}`}>{status.label}</span>;
}

function FieldLabel({
  children,
  optional,
}: {
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <div className="field-label">
      <span>{children}</span>
      {optional && <small>Заавал биш</small>}
    </div>
  );
}

function ChoiceGroup({
  label,
  value,
  options,
  onChange,
  optional,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  optional?: boolean;
}) {
  return (
    <section className="choice-section">
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <div className="choice-grid">
        {options.map((option) => (
          <button
            type="button"
            className={`choice-chip ${value === option ? "selected" : ""}`}
            onClick={() => onChange(option)}
            key={option}
          >
            {value === option && <Check size={15} />}
            {option}
          </button>
        ))}
      </div>
    </section>
  );
}

function ProgressHeader({
  step,
  title,
  eyebrow,
}: {
  step: number;
  title: string;
  eyebrow: string;
}) {
  return (
    <div className="section-heading">
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <div className="mobile-step-progress" aria-label={`Алхам ${step + 1} / 6`}>
        <span style={{ width: `${((step + 1) / 6) * 100}%` }} />
      </div>
    </div>
  );
}

function PhonePreview({
  draft,
  compact = false,
}: {
  draft: GreetingDraft;
  compact?: boolean;
}) {
  const template = templates.find((item) => item.id === draft.templateId) ?? templates[0];
  const sender =
    draft.senderVisibility === "ANONYMOUS"
      ? "Нууц илгээгч"
      : draft.senderName || "Таны дотны хүн";

  return (
    <div className={`phone-preview ${compact ? "phone-compact" : ""}`}>
      <div className="phone-top">
        <span>9:41</span>
        <div>
          <Volume2 size={13} />
          <span className="phone-battery" />
        </div>
      </div>
      <div
        className="phone-story"
        style={{ background: template.background, color: template.text }}
      >
        <div className="phone-progress">
          {[0, 1, 2, 3, 4].map((item) => (
            <span key={item} className={item === 0 ? "active" : ""} />
          ))}
        </div>
        <div className="phone-story-meta">
          <span>{sender}</span>
          <MoreHorizontal size={17} />
        </div>
        <div className="phone-photo-wrap" style={{ borderColor: template.accent }}>
          <img
            src={draft.primaryPhoto || template.image || defaultPhoto}
            alt={draft.recipientName || "Мэндчилгээний зураг"}
          />
          <span className="photo-sticker" style={{ background: template.accent }}>
            <Sparkles size={14} />
          </span>
        </div>
        <div className="phone-copy">
          <small>{template.eyebrow}</small>
          <h2>{draft.headline || `Төрсөн өдрийн мэнд, ${draft.recipientName || "Энхээ"}!`}</h2>
          <p>
            {draft.greetingText ||
              "Чиний инээмсэглэл энэ өдрийг улам гэрэлтэй болгодог. Аз жаргал дүүрэн байгаарай!"}
          </p>
        </div>
        <div className="phone-footer">
          <span>{draft.effectId === "none" ? "Эффектгүй" : "Эффект идэвхтэй"}</span>
          <Heart size={18} />
        </div>
      </div>
    </div>
  );
}

function CreatorApp({
  draft,
  setDraft,
  saveState,
  onRoleChange,
}: {
  draft: GreetingDraft;
  setDraft: React.Dispatch<React.SetStateAction<GreetingDraft>>;
  saveState: SaveState;
  onRoleChange: (role: Role) => void;
}) {
  const [uploadError, setUploadError] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [qrData, setQrData] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const step = draft.currentStep;
  const template = templates.find((item) => item.id === draft.templateId);
  const sortedTemplates = useMemo(
    () =>
      templates
        .map((item) => ({ ...item, score: scoreTemplate(item, draft) }))
        .sort((a, b) => b.score - a.score),
    [draft],
  );
  const ready = isDraftReady(draft);
  const shareUrl =
    typeof window !== "undefined" && draft.slug
      ? `${window.location.origin}/?role=recipient&slug=${draft.slug}`
      : "";

  useEffect(() => {
    if (!shareUrl) return;
    QRCode.toDataURL(shareUrl, {
      width: 220,
      margin: 1,
      color: { dark: "#17241f", light: "#ffffff" },
    }).then(setQrData);
  }, [shareUrl]);

  function update(patch: Partial<GreetingDraft>) {
    setDraft((current) => ({
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    }));
  }

  function goToStep(next: number) {
    update({ currentStep: Math.max(0, Math.min(5, next)) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function transition(
    action: "start-payment" | "confirm-demo-payment" | "publish",
  ) {
    const localPatch: Partial<GreetingDraft> =
      action === "start-payment"
        ? { greetingStatus: "READY_TO_PAY", paymentStatus: "PENDING" }
        : action === "confirm-demo-payment"
          ? { greetingStatus: "READY_TO_PUBLISH", paymentStatus: "SUCCESS" }
          : {
              greetingStatus: "PUBLISHED",
              engagementStatus: "NOT_OPENED",
              slug:
                draft.slug ||
                `${(draft.recipientName || "mend").toLowerCase().replace(/\s+/g, "-")}-${draft.id.slice(-5)}`,
            };
    update(localPatch);
    try {
      const response = await fetch("/api/greetings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: draft.id, action }),
      });
      if (response.ok) {
        const result = (await response.json()) as { greeting: GreetingDraft };
        setDraft(result.greeting);
      }
    } catch {
      // Local draft remains usable while the server is unavailable.
    }
  }

  async function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError("JPG, PNG эсвэл WEBP зураг оруулна уу.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError("Зургийн хэмжээ 8MB-аас ихгүй байна.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => update({ primaryPhoto: String(reader.result) });
    reader.readAsDataURL(file);

    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/media", { method: "POST", body: form });
      if (response.ok) {
        const result = (await response.json()) as { url: string };
        update({ primaryPhoto: result.url });
      }
    } catch {
      // The local preview is already available and will be synced later.
    }
  }

  function copyLink() {
    if (shareUrl) navigator.clipboard?.writeText(shareUrl);
  }

  const stepCanContinue = [
    Boolean(draft.ageGroup && draft.relationship && draft.mood),
    Boolean(draft.templateId),
    Boolean(draft.recipientName.trim() && draft.senderName.trim() && draft.primaryPhoto),
    Boolean(draft.greetingText.trim()),
    ready,
    true,
  ][step];

  return (
    <div className="creator-shell">
      <aside className="creator-sidebar">
        <div className="sidebar-title">
          <div className="sidebar-title-row">
            <span>Мэндчилгээ</span>
            <strong>{step + 1} / 6</strong>
          </div>
          <small>{draft.recipientName ? `${draft.recipientName}-д` : "Шинэ мэндчилгээ"}</small>
          <div className="sidebar-progress" aria-hidden="true">
            <span style={{ width: `${((step + 1) / 6) * 100}%` }} />
          </div>
        </div>
        <nav className="step-nav" aria-label="Мэндчилгээ үүсгэх алхам">
          {stepNames.map((name, index) => (
            <button
              type="button"
              key={name}
              onClick={() => goToStep(index)}
              className={`${index === step ? "active" : ""} ${index < step ? "done" : ""}`}
            >
              <span>{index < step ? <Check size={15} /> : index + 1}</span>
              <div>
                <strong>{name}</strong>
                <small>{index === step ? "Одоо ажиллаж байна" : index < step ? "Бэлэн" : "Хүлээгдэж байна"}</small>
              </div>
            </button>
          ))}
        </nav>
        <div className="sidebar-summary">
          <div>
            <StatusBadge draft={draft} />
            <span className={`save-dot save-${saveState}`} />
          </div>
          <p>
            {saveState === "saving"
              ? "Хадгалж байна..."
              : saveState === "local"
                ? "Төхөөрөмж дээр хадгалсан"
                : "Бүх өөрчлөлт хадгалагдсан"}
          </p>
        </div>
      </aside>

      <main className="creator-main">
        {step === 0 && (
          <>
            <ProgressHeader
              step={step}
              eyebrow="Алхам 1 · Тохирох загварын эхлэл"
              title="Хэнд зориулж байна?"
            />
            <div className="editor-layout">
              <div className="editor-column">
                <ChoiceGroup
                  label="Насны ангилал"
                  value={draft.ageGroup}
                  options={ageGroups}
                  onChange={(value) => update({ ageGroup: value })}
                />
                <ChoiceGroup
                  label="Та хоёрын харилцаа"
                  value={draft.relationship}
                  options={relationships}
                  onChange={(value) => update({ relationship: value })}
                />
                <ChoiceGroup
                  label="Мэргэжил"
                  optional
                  value={draft.profession}
                  options={professions}
                  onChange={(value) => update({ profession: value })}
                />
                <ChoiceGroup
                  label="Мэндчилгээний өнгө аяс"
                  value={draft.mood}
                  options={moods}
                  onChange={(value) => update({ mood: value })}
                />
              </div>
              <aside className="recommendation-note">
                <WandSparkles size={24} />
                <h3>Сонголт бүр илүү оновчтой болгоно</h3>
                <p>
                  Мэргэжил, өнгө аяс, нас, харилцааг нийлүүлж хамгийн тохирох
                  загваруудыг эрэмбэлнэ.
                </p>
                <div className="tag-preview">
                  {[draft.profession, draft.relationship, draft.mood, draft.ageGroup]
                    .filter(Boolean)
                    .map((item, index) => (
                      <span key={`${item}-${index}`}>{item}</span>
                    ))}
                </div>
              </aside>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <ProgressHeader
              step={step}
              eyebrow="Алхам 2 · Танд зориулан эрэмбэлсэн"
              title="Загвараа сонгоорой"
            />
            <div className="template-grid">
              {sortedTemplates.map((item, index) => (
                <article
                  className={`template-card ${draft.templateId === item.id ? "selected" : ""}`}
                  key={item.id}
                >
                  <button type="button" onClick={() => update({ templateId: item.id })}>
                    <div className="template-image">
                      <img src={item.image} alt="" />
                      {index === 0 && <span className="best-match">Хамгийн тохирох</span>}
                      {item.animated && (
                        <span className="animation-mark">
                          <Play size={13} fill="currentColor" /> Animation
                        </span>
                      )}
                    </div>
                    <div className="template-body">
                      <div>
                        <small>{item.eyebrow}</small>
                        <h2>{item.name}</h2>
                      </div>
                      <span className="story-count">{item.storyCount} story</span>
                      <p>{item.description}</p>
                      <div className="template-tags">
                        {item.tags.moods.slice(0, 2).map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                      <div className="template-select-row">
                        <span>{draft.templateId === item.id ? "Сонгогдсон" : "Сонгох"}</span>
                        {draft.templateId === item.id ? (
                          <CheckCircle2 size={20} />
                        ) : (
                          <ArrowRight size={19} />
                        )}
                      </div>
                    </div>
                  </button>
                </article>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <ProgressHeader
              step={step}
              eyebrow="Алхам 3 · Гол дүрээ тодруулъя"
              title="Мэндчилгээг хувийн болгох"
            />
            <div className="editor-layout personal-layout">
              <div className="editor-column form-stack">
                <div>
                  <FieldLabel>Үндсэн зураг</FieldLabel>
                  <input
                    ref={fileRef}
                    className="visually-hidden"
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={handleImage}
                  />
                  {draft.primaryPhoto ? (
                    <div className="photo-editor">
                      <img src={draft.primaryPhoto} alt="Оруулсан үндсэн зураг" />
                      <div>
                        <IconButton label="Зургийг солих" onClick={() => fileRef.current?.click()}>
                          <RefreshCw size={18} />
                        </IconButton>
                        <IconButton label="Зургийг арилгах" onClick={() => update({ primaryPhoto: "" })}>
                          <X size={18} />
                        </IconButton>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="upload-zone"
                      onClick={() => fileRef.current?.click()}
                    >
                      <span>
                        <ImagePlus size={25} />
                      </span>
                      <strong>Зураг оруулах</strong>
                      <small>JPG, PNG, WEBP · 8MB хүртэл</small>
                    </button>
                  )}
                  {uploadError && <p className="field-error">{uploadError}</p>}
                </div>
                <div className="two-fields">
                  <label>
                    <FieldLabel>Хүлээн авагчийн нэр</FieldLabel>
                    <input
                      value={draft.recipientName}
                      maxLength={40}
                      onChange={(event) =>
                        update({ recipientName: sanitizePlainText(event.target.value, 40) })
                      }
                      placeholder="Жишээ нь: Энхээ"
                    />
                  </label>
                  <label>
                    <FieldLabel optional>Нас</FieldLabel>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={draft.recipientAge}
                      onChange={(event) => update({ recipientAge: event.target.value })}
                      placeholder="27"
                    />
                  </label>
                </div>
                <label>
                  <FieldLabel>Илгээгчийн нэр</FieldLabel>
                  <input
                    value={draft.senderName}
                    maxLength={40}
                    onChange={(event) =>
                      update({ senderName: sanitizePlainText(event.target.value, 40) })
                    }
                    placeholder="Таны нэр"
                  />
                </label>
                <fieldset className="segmented-field">
                  <FieldLabel>Илгээгчийн нэр хэзээ харагдах вэ?</FieldLabel>
                  <div className="segmented-control">
                    {[
                      ["START", "Эхнээс"],
                      ["END", "Төгсгөлд"],
                      ["ANONYMOUS", "Нууц"],
                    ].map(([value, label]) => (
                      <button
                        type="button"
                        className={draft.senderVisibility === value ? "selected" : ""}
                        onClick={() =>
                          update({
                            senderVisibility: value as GreetingDraft["senderVisibility"],
                          })
                        }
                        key={value}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label>
                  <FieldLabel optional>Богино гарчиг</FieldLabel>
                  <input
                    value={draft.headline}
                    maxLength={80}
                    onChange={(event) =>
                      update({ headline: sanitizePlainText(event.target.value, 80) })
                    }
                    placeholder={`Төрсөн өдрийн мэнд, ${draft.recipientName || "Энхээ"}!`}
                  />
                </label>
              </div>
              <aside className="preview-aside">
                <span className="aside-label">Шууд preview</span>
                <PhonePreview draft={draft} compact />
              </aside>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <ProgressHeader
              step={step}
              eyebrow="Алхам 4 · Сэтгэлээсээ"
              title="Захиа, хөгжим, эффектоо сонгох"
            />
            <div className="editor-layout">
              <div className="editor-column form-stack">
                <label>
                  <FieldLabel>Мэндчилгээний текст</FieldLabel>
                  <textarea
                    rows={8}
                    maxLength={1000}
                    value={draft.greetingText}
                    onChange={(event) =>
                      update({ greetingText: sanitizePlainText(event.target.value, 1000) })
                    }
                    placeholder="Чамд хэлэх хамгийн гоё үгээ энд бичээрэй..."
                  />
                  <span className="character-count">{draft.greetingText.length} / 1000</span>
                </label>
                <div className="quick-copy">
                  <span>Бэлэн санаа</span>
                  <button
                    type="button"
                    onClick={() =>
                      update({
                        greetingText: `${draft.recipientName || "Чамдаа"} төрсөн өдрийн мэнд хүргэе! Инээмсэглэл, аз жаргал, шинэ дурсамжаар дүүрэн гайхалтай жил байг.`,
                      })
                    }
                  >
                    Дулаан мэндчилгээ
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      update({
                        greetingText: `Өнөөдөр бол чиний тайз! Хүслээ томоор бодож, бялуугаа харамгүй идээрэй. Төрсөн өдрийн мэнд!`,
                      })
                    }
                  >
                    Хөгжилтэй
                  </button>
                </div>
                <label>
                  <FieldLabel optional>Нууц захиа</FieldLabel>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={draft.secretMessage}
                    onChange={(event) =>
                      update({ secretMessage: sanitizePlainText(event.target.value, 500) })
                    }
                    placeholder="Story-ийн төгсгөлд нээгдэх нууц захиа..."
                  />
                </label>
                <div className="setting-block">
                  <FieldLabel>Хөгжим</FieldLabel>
                  <div className="music-options">
                    {[
                      ["sunny-days", "Sunny days", "02:24"],
                      ["warm-memory", "Warm memory", "01:58"],
                      ["none", "Хөгжимгүй", "—"],
                    ].map(([id, name, duration]) => (
                      <button
                        type="button"
                        key={id}
                        className={draft.musicId === id ? "selected" : ""}
                        onClick={() => update({ musicId: id })}
                      >
                        <span className="music-icon">
                          {id === "none" ? <VolumeX size={18} /> : <Music2 size={18} />}
                        </span>
                        <span>
                          <strong>{name}</strong>
                          <small>{duration}</small>
                        </span>
                        {draft.musicId === id && <CheckCircle2 size={18} />}
                      </button>
                    ))}
                  </div>
                </div>
                <ChoiceGroup
                  label="Эффект"
                  value={draft.effectId}
                  options={["confetti", "balloon", "sparkle", "hearts", "none"]}
                  onChange={(value) => update({ effectId: value })}
                />
              </div>
              <aside className="preview-aside">
                <span className="aside-label">Story preview</span>
                <PhonePreview draft={draft} compact />
              </aside>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <ProgressHeader
              step={step}
              eyebrow="Алхам 5 · Бүгдийг нэг дор"
              title="Recipient юу харахыг шалгаарай"
            />
            <div className="preview-stage">
              <PhonePreview draft={draft} />
              <aside className="readiness-panel">
                <div className="readiness-score">
                  <span>{ready ? "100%" : "72%"}</span>
                  <div>
                    <strong>{ready ? "Нийтлэхэд бэлэн" : "Хэдхэн зүйл дутуу байна"}</strong>
                    <small>Шалгах жагсаалт</small>
                  </div>
                </div>
                {[
                  ["Загвар сонгосон", Boolean(draft.templateId)],
                  ["Хүлээн авагчийн нэр", Boolean(draft.recipientName.trim())],
                  ["Үндсэн зураг", Boolean(draft.primaryPhoto)],
                  ["Мэндчилгээний текст", Boolean(draft.greetingText.trim())],
                  ["Илгээгчийн нэр", Boolean(draft.senderName.trim())],
                  ["Нууцлалын тохиргоо", true],
                ].map(([label, done]) => (
                  <div className={`check-row ${done ? "done" : ""}`} key={String(label)}>
                    {done ? <CheckCircle2 size={19} /> : <Clock3 size={19} />}
                    <span>{label}</span>
                    {!done && <button onClick={() => goToStep(label === "Загвар сонгосон" ? 1 : 2)}>Засах</button>}
                  </div>
                ))}
                <div className="privacy-summary">
                  <LockKeyhole size={18} />
                  <div>
                    <strong>Хувийн агуулга хамгаалагдсан</strong>
                    <span>Download анхнаасаа хаалттай.</span>
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <ProgressHeader
              step={step}
              eyebrow="Алхам 6 · Сүүлчийн алхам"
              title={draft.greetingStatus === "PUBLISHED" ? "Мэндчилгээ бэлэн боллоо" : "Идэвхжүүлээд хуваалцах"}
            />
            {draft.greetingStatus !== "PUBLISHED" ? (
              <div className="checkout-layout">
                <section className="checkout-main">
                  <div className="order-product">
                    <img src={template?.image || templates[0].image} alt="" />
                    <div>
                      <small>Дижитал story мэндчилгээ</small>
                      <h2>{template?.name || "Сонгосон загвар"}</h2>
                      <span>{draft.recipientName || "Хүлээн авагч"}-д</span>
                    </div>
                    <strong>9,900₮</strong>
                  </div>
                  <div className="privacy-settings">
                    <h3>Нууцлал ба зөвшөөрөл</h3>
                    {[
                      ["allowReply", "Хариу илгээх", "Recipient богино хариу илгээж болно"],
                      ["allowShare", "Хуваалцах", "Share sheet болон social cover ашиглана"],
                      ["allowDownload", "Зураг татах", "Хувийн media татах эрх олгоно"],
                      ["requirePin", "PIN хамгаалалт", "Link нээхэд 4 оронтой PIN асууна"],
                    ].map(([key, title, description]) => (
                      <label className="toggle-row" key={key}>
                        <span>
                          <strong>{title}</strong>
                          <small>{description}</small>
                        </span>
                        <input
                          type="checkbox"
                          checked={Boolean(draft[key as keyof GreetingDraft])}
                          onChange={(event) => update({ [key]: event.target.checked })}
                        />
                        <i />
                      </label>
                    ))}
                    {draft.requirePin && (
                      <label className="pin-field">
                        <FieldLabel>4 оронтой PIN</FieldLabel>
                        <input
                          inputMode="numeric"
                          maxLength={4}
                          value={draft.pin}
                          onChange={(event) =>
                            update({ pin: event.target.value.replace(/\D/g, "").slice(0, 4) })
                          }
                          placeholder="0000"
                        />
                      </label>
                    )}
                  </div>
                </section>
                <aside className="payment-panel">
                  <div className="price-row">
                    <span>Нэг удаагийн төлбөр</span>
                    <strong>9,900₮</strong>
                  </div>
                  <p>30 хоног идэвхтэй · Нууц link · Reaction ба reply</p>
                  {draft.paymentStatus === "UNPAID" && (
                    <Button
                      icon={<QrCode size={18} />}
                      disabled={!ready}
                      onClick={() => {
                        setShowPayment(true);
                        transition("start-payment");
                      }}
                    >
                      Идэвхжүүлэх
                    </Button>
                  )}
                  {draft.paymentStatus === "PENDING" && (
                    <Button
                      icon={<RefreshCw size={18} />}
                      onClick={() => setShowPayment(true)}
                    >
                      Төлбөр шалгах
                    </Button>
                  )}
                  {draft.paymentStatus === "SUCCESS" && (
                    <Button icon={<Send size={18} />} onClick={() => transition("publish")}>
                      Нийтлэх
                    </Button>
                  )}
                  {!ready && <small className="payment-warning">Preview checklist-ээ гүйцээнэ үү.</small>}
                  <div className="secure-note">
                    <ShieldCheck size={18} />
                    <span>Төлбөр ба draft тусдаа төлөвөөр хадгалагдана.</span>
                  </div>
                </aside>
              </div>
            ) : (
              <div className="published-layout">
                <section className="published-cover">
                  <img src={draft.primaryPhoto || template?.image || defaultPhoto} alt="" />
                  <div>
                    <span>Танд мэндчилгээ ирлээ</span>
                    <h2>{draft.recipientName}</h2>
                    <p>{draft.headline || "Төрсөн өдрийн мэнд!"}</p>
                  </div>
                </section>
                <section className="share-panel">
                  <span className="success-mark">
                    <Check size={27} />
                  </span>
                  <h2>Амжилттай нийтэллээ</h2>
                  <p>Link-ээ илгээхэд л онцгой мөч эхэлнэ.</p>
                  <div className="share-link">
                    <span>{shareUrl}</span>
                    <IconButton label="Линк хуулах" onClick={copyLink}>
                      <Copy size={18} />
                    </IconButton>
                  </div>
                  <div className="share-actions">
                    <Button icon={<Share2 size={18} />} onClick={copyLink}>
                      Link хуулах
                    </Button>
                    <Button
                      variant="secondary"
                      icon={<Eye size={18} />}
                      onClick={() => onRoleChange("recipient")}
                    >
                      Recipient view
                    </Button>
                  </div>
                  {qrData && <img className="qr-image" src={qrData} alt="Мэндчилгээний QR код" />}
                </section>
              </div>
            )}
          </>
        )}

        <div className="creator-actions">
          <Button
            variant="ghost"
            icon={<ArrowLeft size={18} />}
            disabled={step === 0}
            onClick={() => goToStep(step - 1)}
          >
            Буцах
          </Button>
          {step < 5 && (
            <Button
              icon={<ArrowRight size={18} />}
              disabled={!stepCanContinue}
              onClick={() => goToStep(step + 1)}
            >
              {step === 4 ? "Идэвхжүүлэх хэсэг" : "Үргэлжлүүлэх"}
            </Button>
          )}
        </div>
      </main>

      {showPayment && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowPayment(false)}>
          <div className="payment-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <IconButton label="Хаах" onClick={() => setShowPayment(false)}>
              <X size={19} />
            </IconButton>
            <span className="qpay-mark">Q</span>
            <h2>Demo төлбөр</h2>
            <p>Production QPay credential холбогдоогүй тул төлбөрийн callback-ийг туршилтаар баталгаажуулна.</p>
            <div className="fake-qr">
              <QrCode size={132} strokeWidth={1.2} />
            </div>
            <strong>9,900₮</strong>
            <Button
              icon={<CheckCircle2 size={18} />}
              onClick={async () => {
                await transition("confirm-demo-payment");
                setShowPayment(false);
              }}
            >
              Demo төлбөр баталгаажуулах
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function RecipientApp({
  draft,
  setDraft,
  onRoleChange,
}: {
  draft: GreetingDraft;
  setDraft: React.Dispatch<React.SetStateAction<GreetingDraft>>;
  onRoleChange: (role: Role) => void;
}) {
  const [opened, setOpened] = useState(false);
  const [story, setStory] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [secretOpen, setSecretOpen] = useState(false);
  const sessionId = useId();
  const template = templates.find((item) => item.id === draft.templateId) ?? templates[0];
  const storyTotal = draft.secretMessage ? 6 : 5;

  function localTransition(patch: Partial<GreetingDraft>) {
    setDraft((current) => ({ ...current, ...patch, updatedAt: new Date().toISOString() }));
  }

  async function transition(
    action: "open" | "react" | "reply",
    extra: Record<string, string> = {},
  ) {
    try {
      await fetch("/api/greetings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: draft.id,
          action,
          sessionId,
          ...extra,
        }),
      });
    } catch {
      // Recipient experience stays responsive during a temporary outage.
    }
  }

  if (draft.moderationStatus === "BLOCKED" || draft.greetingStatus === "BLOCKED") {
    return (
      <div className="recipient-error">
        <ShieldCheck size={35} />
        <h1>Энэ агуулгыг түр үзэх боломжгүй байна.</h1>
        <p>Мэндчилгээ хяналтын төлөвт байна.</p>
        <Button variant="secondary" onClick={() => onRoleChange("creator")}>
          Бүтээгчийн хэсэг
        </Button>
      </div>
    );
  }

  if (draft.greetingStatus !== "PUBLISHED") {
    return (
      <div className="recipient-error">
        <Gift size={38} />
        <h1>Мэндчилгээ хараахан бэлэн болоогүй байна.</h1>
        <p>Creator flow-оор төлбөрийн demo-г баталгаажуулж нийтлээрэй.</p>
        <Button icon={<ArrowLeft size={18} />} onClick={() => onRoleChange("creator")}>
          Үргэлжлүүлж засах
        </Button>
      </div>
    );
  }

  if (!opened) {
    return (
      <div className="gift-welcome" style={{ background: template.background, color: template.text }}>
        <div className="gift-noise" />
        <div className="welcome-controls">
          <span>mend.</span>
          <IconButton label={muted ? "Дуу асаах" : "Дуу хаах"} onClick={() => setMuted(!muted)}>
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </IconButton>
        </div>
        <div className="gift-content">
          <span className="gift-icon" style={{ background: template.accent }}>
            <Gift size={62} strokeWidth={1.4} />
          </span>
          <p>
            {draft.senderVisibility === "START"
              ? `${draft.senderName}-с`
              : draft.senderVisibility === "ANONYMOUS"
                ? "Нууц илгээгчээс"
                : "Таны нэг дотны хүнээс"}
          </p>
          <h1>Танд онцгой төрсөн өдрийн мэндчилгээ ирлээ</h1>
          <Button
            icon={<Sparkles size={19} />}
            onClick={() => {
              setOpened(true);
              localTransition({ engagementStatus: "OPENED" });
                    transition("open");
            }}
          >
            Бэлгээ нээх
          </Button>
          <small>{muted ? "Дуугүй нээгдэнэ" : "Хөгжимтэй нээгдэнэ"}</small>
        </div>
      </div>
    );
  }

  return (
    <div className="story-viewer" style={{ background: template.background, color: template.text }}>
      <div className="story-bars">
        {Array.from({ length: storyTotal }).map((_, index) => (
          <span key={index}>
            <i style={{ width: index < story ? "100%" : index === story ? "62%" : "0%" }} />
          </span>
        ))}
      </div>
      <div className="story-toolbar">
        <div>
          <span className="story-avatar" style={{ background: template.accent }}>
            <Gift size={16} />
          </span>
          <span>
            <strong>{draft.senderVisibility === "ANONYMOUS" ? "Нууц илгээгч" : draft.senderName}</strong>
            <small>төрсөн өдрийн мэндчилгээ</small>
          </span>
        </div>
        <div>
          <IconButton label={paused ? "Үргэлжлүүлэх" : "Түр зогсоох"} onClick={() => setPaused(!paused)}>
            {paused ? <Play size={20} /> : <Pause size={20} />}
          </IconButton>
          <IconButton label={muted ? "Дуу асаах" : "Дуу хаах"} onClick={() => setMuted(!muted)}>
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </IconButton>
          <IconButton label="Хаах" onClick={() => setOpened(false)}>
            <X size={21} />
          </IconButton>
        </div>
      </div>

      <button
        className="story-tap story-left"
        aria-label="Өмнөх story"
        onClick={() => setStory(Math.max(0, story - 1))}
      />
      <button
        className="story-tap story-right"
        aria-label="Дараагийн story"
        onClick={() => setStory(Math.min(storyTotal - 1, story + 1))}
      />

      <div className="story-content">
        {story === 0 && (
          <div className="story-intro">
            <span>{draft.recipientAge || "Өнөөдөр"}</span>
            <h1>{draft.headline || `Төрсөн өдрийн мэнд, ${draft.recipientName}!`}</h1>
            <PartyPopper size={39} style={{ color: template.accent }} />
          </div>
        )}
        {story === 1 && (
          <div className="story-photo">
            <img src={draft.primaryPhoto || template.image} alt={draft.recipientName} />
            <span style={{ background: template.accent }}>Энэ өдөр чинийх</span>
          </div>
        )}
        {story === 2 && (
          <div className="story-message">
            <MessageCircle size={32} style={{ color: template.accent }} />
            <blockquote>{draft.greetingText}</blockquote>
            {draft.senderVisibility !== "ANONYMOUS" && <span>— {draft.senderName}</span>}
          </div>
        )}
        {story === 3 && draft.secretMessage && (
          <button className={`secret-letter ${secretOpen ? "open" : ""}`} onClick={() => setSecretOpen(true)}>
            <span><FileText size={29} /></span>
            <h2>{secretOpen ? "Чамд л зориулсан захиа" : "Нууц захиа байна"}</h2>
            <p>{secretOpen ? draft.secretMessage : "Tap хийж нээгээрэй"}</p>
          </button>
        )}
        {story === (draft.secretMessage ? 4 : 3) && (
          <div className="reaction-story">
            <Heart size={34} style={{ color: template.accent }} />
            <h2>Ямар санагдав?</h2>
            <p>Илгээгчид сэтгэл хөдлөлөө хүргээрэй.</p>
            <div className="reaction-row">
              {reactions.map((emoji) => (
                <button
                  type="button"
                  className={draft.reaction === emoji ? "selected" : ""}
                  key={emoji}
                  onClick={() => {
                    localTransition({ reaction: emoji, engagementStatus: "REACTED" });
                    transition("react", { emoji });
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {draft.reaction && <small>Таны reaction илгээгдлээ</small>}
          </div>
        )}
        {story === storyTotal - 1 && (
          <div className="reply-story">
            <Send size={31} style={{ color: template.accent }} />
            <h2>Хариу илгээх</h2>
            {draft.allowReply ? (
              <>
                <div className="ready-replies">
                  {readyReplies.map((reply) => (
                    <button key={reply} onClick={() => setReplyText(reply)}>{reply}</button>
                  ))}
                </div>
                <div className="reply-compose">
                  <textarea
                    maxLength={500}
                    value={replyText}
                    onChange={(event) => setReplyText(sanitizePlainText(event.target.value, 500))}
                    placeholder="Богино хариу бичих..."
                  />
                  <Button
                    icon={<Send size={17} />}
                    disabled={!replyText.trim()}
                    onClick={() => {
                      localTransition({ reply: replyText, engagementStatus: "REPLIED" });
                      transition("reply", { message: replyText });
                      setReplyText("");
                    }}
                  >
                    Илгээх
                  </Button>
                </div>
                {draft.reply && <p className="reply-success">Хариу амжилттай илгээгдлээ.</p>}
              </>
            ) : (
              <p>Илгээгч хариу авах тохиргоог хаасан байна.</p>
            )}
          </div>
        )}
      </div>

      <div className="story-bottom">
        <button onClick={() => setStory(Math.max(0, story - 1))} disabled={story === 0}>
          <ArrowLeft size={20} />
        </button>
        <span>{story + 1} / {storyTotal}</span>
        <button onClick={() => setStory(Math.min(storyTotal - 1, story + 1))} disabled={story === storyTotal - 1}>
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}

function makeAdminRows(current: GreetingDraft) {
  const base = createDefaultDraft();
  return [
    current,
    {
      ...base,
      id: "g_10429",
      recipientName: "Номин",
      senderName: "Саруул",
      templateId: "soft-letter",
      greetingStatus: "PUBLISHED" as const,
      paymentStatus: "SUCCESS" as const,
      engagementStatus: "REPLIED" as const,
      moderationStatus: "NORMAL" as const,
      reaction: "🥹",
      reply: "Үнэхээр сэтгэл хөдөллөө, баярлалаа!",
      primaryPhoto: templates[1].image,
      updatedAt: "2026-07-28T08:12:00.000Z",
    },
    {
      ...base,
      id: "g_10418",
      recipientName: "Тэмүүлэн",
      senderName: "Мөнхөө",
      templateId: "night-spark",
      greetingStatus: "PUBLISHED" as const,
      paymentStatus: "SUCCESS" as const,
      engagementStatus: "OPENED" as const,
      moderationStatus: "REPORTED" as const,
      primaryPhoto: templates[2].image,
      updatedAt: "2026-07-27T12:42:00.000Z",
    },
    {
      ...base,
      id: "g_10392",
      recipientName: "Ану",
      senderName: "Билгүүн",
      templateId: "retro-pop",
      greetingStatus: "READY_TO_PAY" as const,
      paymentStatus: "PENDING" as const,
      engagementStatus: "NOT_OPENED" as const,
      moderationStatus: "NORMAL" as const,
      primaryPhoto: templates[3].image,
      updatedAt: "2026-07-26T06:30:00.000Z",
    },
  ];
}

function AdminApp({
  draft,
  setDraft,
}: {
  draft: GreetingDraft;
  setDraft: React.Dispatch<React.SetStateAction<GreetingDraft>>;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Бүгд");
  const [selectedId, setSelectedId] = useState(draft.id);
  const [privateVisible, setPrivateVisible] = useState(false);
  const rows = useMemo(() => makeAdminRows(draft), [draft]);
  const filtered = rows.filter((row) => {
    const display = getDisplayStatus(row).label;
    return (
      (filter === "Бүгд" || display === filter) &&
      `${row.id} ${row.recipientName} ${row.senderName}`.toLowerCase().includes(query.toLowerCase())
    );
  });
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0];

  async function moderate(status: "BLOCKED" | "RESTORED" | "UNDER_REVIEW") {
    if (selected.id === draft.id) {
      setDraft((current) => ({
        ...current,
        moderationStatus: status,
        greetingStatus:
          status === "BLOCKED"
            ? "BLOCKED"
            : status === "RESTORED" && current.greetingStatus === "BLOCKED"
              ? "PUBLISHED"
              : current.greetingStatus,
      }));
    }
    try {
      await fetch("/api/greetings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          action: "moderate",
          moderationStatus: status,
          reason: "Demo admin review",
        }),
      });
    } catch {
      // The local admin state still demonstrates the role flow.
    }
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-profile">
          <span>BA</span>
          <div><strong>Б. Ариунаа</strong><small>Super Admin</small></div>
          <ChevronDown size={17} />
        </div>
        <nav>
          <button className="active"><LayoutDashboard size={18} />Хяналтын самбар</button>
          <button><Gift size={18} />Мэндчилгээ <span>24</span></button>
          <button><CircleDollarSign size={18} />Төлбөр</button>
          <button><FileText size={18} />Загвар</button>
          <button><Users size={18} />Хэрэглэгч</button>
          <button><ShieldCheck size={18} />Report <span className="alert">3</span></button>
        </nav>
        <div className="admin-sidebar-bottom">
          <button><Settings2 size={18} />Тохиргоо</button>
          <small>mend. admin · v0.1</small>
        </div>
      </aside>
      <main className="admin-main">
        <div className="admin-heading">
          <div><p>2026 оны 7-р сарын 28</p><h1>Өдрийн мэнд, Ариунаа</h1></div>
          <div>
            <IconButton label="Мэдэгдэл"><Bell size={19} /><i /></IconButton>
            <Button icon={<Download size={17} />} variant="secondary">Тайлан татах</Button>
          </div>
        </div>

        <section className="kpi-grid">
          {[
            ["Өнөөдөр үүссэн", "48", "+12%", <Gift key="gift" />],
            ["Амжилттай төлбөр", "31", "306,900₮", <CircleDollarSign key="pay" />],
            ["Нийтэлсэн", "27", "87% conversion", <Send key="send" />],
            ["Reply авсан", "18", "66.7%", <MessageCircle key="reply" />],
          ].map(([label, value, note, icon]) => (
            <article className="kpi-item" key={String(label)}>
              <div><span>{icon}</span><small>{label}</small></div>
              <strong>{value}</strong>
              <p>{note}</p>
            </article>
          ))}
        </section>

        <section className="analytics-band">
          <div className="chart-header">
            <div><small>Сүүлийн 7 хоног</small><h2>Мэндчилгээний урсгал</h2></div>
            <div className="chart-legend"><span><i />Үүссэн</span><span><i />Нийтэлсэн</span></div>
          </div>
          <div className="bar-chart" aria-label="7 хоногийн мэндчилгээний график">
            {[48, 62, 51, 73, 66, 91, 78].map((height, index) => (
              <div key={index}>
                <span style={{ height: `${height}%` }}><i style={{ height: `${Math.max(30, height - 20)}%` }} /></span>
                <small>{["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"][index]}</small>
              </div>
            ))}
          </div>
          <div className="funnel-summary">
            <div><span>Эхлүүлсэн</span><strong>286</strong></div>
            <ChevronRight size={17} />
            <div><span>Төлсөн</span><strong>194</strong></div>
            <ChevronRight size={17} />
            <div><span>Нийтэлсэн</span><strong>168</strong></div>
            <ChevronRight size={17} />
            <div><span>Нээгдсэн</span><strong>139</strong></div>
          </div>
        </section>

        <section className="admin-list-section">
          <div className="list-heading">
            <div><h2>Сүүлийн мэндчилгээнүүд</h2><span>{filtered.length} үр дүн</span></div>
            <div className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ID, нэрээр хайх" /></div>
          </div>
          <div className="filter-tabs">
            {["Бүгд", "Ноорог", "Төлбөр хүлээгдэж байна", "Идэвхтэй", "Нээгдсэн", "Хариу ирсэн", "Шалгаж байна"].map((item) => (
              <button className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>{item}</button>
            ))}
          </div>
          <div className="greeting-table-wrap">
            <table className="greeting-table">
              <thead><tr><th>Мэндчилгээ</th><th>Бүтээгч</th><th>Төлбөр</th><th>Үндсэн төлөв</th><th>Engagement</th><th>Moderation</th><th /></tr></thead>
              <tbody>
                {filtered.map((row) => {
                  const rowTemplate = templates.find((item) => item.id === row.templateId) ?? templates[0];
                  return (
                    <tr key={row.id} className={selected.id === row.id ? "selected" : ""} onClick={() => setSelectedId(row.id)}>
                      <td><img src={row.primaryPhoto || rowTemplate.image} alt="" /><span><strong>{row.recipientName || "Нэргүй draft"}</strong><small>{row.id}</small></span></td>
                      <td><strong>{row.senderName || "Guest"}</strong><small>{new Date(row.updatedAt).toLocaleDateString("mn-MN")}</small></td>
                      <td><span className={`raw-status raw-${row.paymentStatus.toLowerCase()}`}>{row.paymentStatus}</span></td>
                      <td>{row.greetingStatus}</td>
                      <td>{row.engagementStatus}</td>
                      <td><span className={`moderation-dot moderation-${row.moderationStatus.toLowerCase()}`} />{row.moderationStatus}</td>
                      <td><IconButton label="Дэлгэрэнгүй"><ChevronRight size={18} /></IconButton></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <aside className="detail-panel">
        <div className="detail-panel-head">
          <div><small>Greeting detail</small><h2>{selected.id}</h2></div>
          <StatusBadge draft={selected} />
        </div>
        <div className={`private-preview ${privateVisible ? "revealed" : ""}`}>
          <img src={selected.primaryPhoto || templates[0].image} alt="" />
          {!privateVisible && <div><LockKeyhole size={21} /><span>Хувийн агуулга</span></div>}
        </div>
        <button className="private-access" onClick={() => setPrivateVisible(!privateVisible)}>
          <Eye size={17} />{privateVisible ? "Агуулгыг нуух" : "Шалтгаан бүртгэж харах"}
        </button>
        <div className="detail-tabs"><button className="active">Overview</button><button>Payment</button><button>Audit</button></div>
        <dl className="detail-list">
          <div><dt>Хүлээн авагч</dt><dd>{selected.recipientName || "Оруулаагүй"}</dd></div>
          <div><dt>Бүтээгч</dt><dd>{selected.senderName || "Guest"}</dd></div>
          <div><dt>Template</dt><dd>{templates.find((item) => item.id === selected.templateId)?.name || "Сонгоогүй"}</dd></div>
          <div><dt>Payment</dt><dd>{selected.paymentStatus}</dd></div>
          <div><dt>Engagement</dt><dd>{selected.engagementStatus}</dd></div>
          <div><dt>Reaction</dt><dd>{selected.reaction || "—"}</dd></div>
          <div><dt>Reply</dt><dd>{selected.reply || "—"}</dd></div>
        </dl>
        {selected.moderationStatus === "REPORTED" ? (
          <div className="report-box"><ShieldCheck size={19} /><div><strong>Report шалгах шаардлагатай</strong><span>Зөвшөөрөлгүй зураг ашигласан</span></div></div>
        ) : null}
        <div className="detail-actions">
          {selected.moderationStatus === "BLOCKED" ? (
            <Button variant="secondary" icon={<RefreshCw size={17} />} onClick={() => moderate("RESTORED")}>Restore</Button>
          ) : (
            <Button variant="danger" icon={<LockKeyhole size={17} />} onClick={() => moderate("BLOCKED")}>Түр block хийх</Button>
          )}
          <Button variant="ghost" icon={<Archive size={17} />}>Архивлах</Button>
        </div>
        <div className="audit-note">
          <ShieldCheck size={17} />
          <span>Admin үйлдэл бүр audit log-д хадгалагдана.</span>
        </div>
      </aside>
    </div>
  );
}

export default function BirthdayApp() {
  const [role, setRole] = useState<Role>("creator");
  const [draft, setDraft] = useState<GreetingDraft>(() => createDefaultDraft());
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const requestedRole = params.get("role");
      if (requestedRole === "recipient" || requestedRole === "admin") {
        setRole(requestedRole);
      }
      const saved = window.localStorage.getItem("mend-greeting-draft");
      if (saved) {
        try {
          setDraft(JSON.parse(saved) as GreetingDraft);
        } catch {
          window.localStorage.removeItem("mend-greeting-draft");
        }
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("mend-greeting-draft", JSON.stringify(draft));
    const savingTimer = window.setTimeout(() => setSaveState("saving"), 0);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/greetings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ draft }),
        });
        setSaveState(response.ok ? "saved" : "local");
      } catch {
        setSaveState("local");
      }
    }, 650);
    return () => {
      window.clearTimeout(savingTimer);
      window.clearTimeout(timer);
    };
  }, [draft, hydrated]);

  function changeRole(nextRole: Role) {
    setRole(nextRole);
    setMobileNav(false);
    const url = new URL(window.location.href);
    url.searchParams.set("role", nextRole);
    window.history.replaceState({}, "", url);
  }

  return (
    <div className={`app-root role-${role}`}>
      <header className="app-header">
        <button className="brand" onClick={() => changeRole("creator")} aria-label="Mend нүүр">
          <span>mend.</span>
          <small>Төрсөн өдрийн студи</small>
        </button>
        <nav className={mobileNav ? "open" : ""} aria-label="Дүрээр харах">
          <button className={role === "creator" ? "active" : ""} onClick={() => changeRole("creator")}><WandSparkles size={17} />Бүтээгч</button>
          <button className={role === "recipient" ? "active" : ""} onClick={() => changeRole("recipient")}><Gift size={17} />Хүлээн авагч</button>
          <button className={role === "admin" ? "active" : ""} onClick={() => changeRole("admin")}><BarChart3 size={17} />Админ</button>
        </nav>
        <div className="header-actions">
          {role === "creator" && <StatusBadge draft={draft} />}
          <IconButton label="Цэс" onClick={() => setMobileNav(!mobileNav)}>
            {mobileNav ? <X size={20} /> : <Menu size={20} />}
          </IconButton>
          <span className="user-avatar">{role === "admin" ? "BA" : "ИЗ"}</span>
        </div>
      </header>

      {role === "creator" && (
        <CreatorApp
          draft={draft}
          setDraft={setDraft}
          saveState={saveState}
          onRoleChange={changeRole}
        />
      )}
      {role === "recipient" && (
        <RecipientApp draft={draft} setDraft={setDraft} onRoleChange={changeRole} />
      )}
      {role === "admin" && <AdminApp draft={draft} setDraft={setDraft} />}
    </div>
  );
}
