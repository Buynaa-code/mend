"use client";

/* eslint-disable @next/next/no-img-element */

import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Camera,
  CassetteTape,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  Gift,
  Heart,
  ImagePlus,
  KeyRound,
  LockKeyhole,
  Mail,
  Menu,
  MessageCircle,
  Music2,
  PartyPopper,
  Pause,
  Play,
  QrCode,
  RefreshCw,
  RotateCcw,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Volume2,
  VolumeX,
  WandSparkles,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import {
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createDefaultDraft,
  demoAccessCode,
  getDisplayStatus,
  type GreetingDraft,
  isDraftReady,
  sanitizePlainText,
  templates,
} from "./lib/greeting";

type Role = "creator" | "recipient" | "admin";
type SaveState = "idle" | "saving" | "saved" | "local";
type RecipientScreen =
  | "intro"
  | "tease"
  | "ready"
  | "cover"
  | "gifts"
  | "memories"
  | "letter"
  | "music"
  | "finale";

const creatorSteps = [
  ["Хэнд", "Нэр ба эрх"],
  ["Дурсамж", "Зураг ба захиа"],
  ["Бэлэг", "Өнгө ба дуу"],
  ["Илгээх", "Шалгаж нийтлэх"],
] as const;

const ageGroups = ["Хүүхэд", "Өсвөр нас", "Залуу", "Насанд хүрэгч", "Ахмад"];
const relationships = ["Найз", "Хамгийн сайн найз", "Хос", "Ээж", "Аав", "Ах, эгч", "Дүү", "Хамт олон"];
const moods = ["Хөөрхөн", "Хөгжилтэй", "Сэтгэл хөдөлгөм", "Дулаахан"];
const musicOptions = [
  ["sunny-days", "Sunny day", "Хөнгөн, баяртай"],
  ["warm-memory", "Warm memory", "Зөөлөн, дурсамжтай"],
  ["none", "Хөгжимгүй", "Чимээгүй нээгдэнэ"],
] as const;

const fallbackMemories = [
  "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=900&q=82",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=82",
  "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=900&q=82",
  "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=900&q=82",
  "https://images.unsplash.com/photo-1464349153735-7db50ed83c84?auto=format&fit=crop&w=900&q=82",
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=82",
];

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
} & ButtonHTMLAttributes<HTMLButtonElement>) {
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
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="icon-button" aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}

type MascotVariant =
  | "intro"
  | "pout"
  | "celebrate"
  | "camera"
  | "letter"
  | "music"
  | "cake";

const mascotVariants: Record<MascotVariant, { src: string; alt: string }> = {
  intro: {
    src: "/assets/mend-giraffe.png",
    alt: "Цэцэг, захиа барьсан хөөрхөн анааш",
  },
  pout: {
    src: "/assets/mend-giraffe-pout.png",
    alt: "Гомдсон дүртэй хөөрхөн анааш",
  },
  celebrate: {
    src: "/assets/mend-giraffe-celebrate.png",
    alt: "Баярлан бүжиглэж буй хөөрхөн анааш",
  },
  camera: {
    src: "/assets/mend-giraffe-camera.png",
    alt: "Камер барьсан хөөрхөн анааш",
  },
  letter: {
    src: "/assets/mend-giraffe-letter.png",
    alt: "Захиа тэвэрсэн хөөрхөн анааш",
  },
  music: {
    src: "/assets/mend-giraffe-music.png",
    alt: "Хөгжим сонсон бүжиглэж буй хөөрхөн анааш",
  },
  cake: {
    src: "/assets/mend-giraffe-cake.png",
    alt: "Төрсөн өдрийн бялуу барьсан хөөрхөн анааш",
  },
};

const creatorMascotVariants: MascotVariant[] = [
  "intro",
  "camera",
  "music",
  "celebrate",
];

function Giraffe({
  variant = "intro",
  className = "",
}: {
  variant?: MascotVariant;
  className?: string;
}) {
  const mascot = mascotVariants[variant];

  return (
    <img
      className={`giraffe ${className}`}
      src={mascot.src}
      alt={mascot.alt}
      draggable={false}
    />
  );
}

function PaperDecor() {
  return (
    <>
      <span className="paper-corner paper-corner-one" />
      <span className="paper-corner paper-corner-two" />
      <span className="paper-star star-one">★</span>
      <span className="paper-star star-two">★</span>
      <span className="paper-star star-three">★</span>
      <span className="paper-star star-four">★</span>
      <span className="paper-star star-five">★</span>
    </>
  );
}

function StatusPill({ draft }: { draft: GreetingDraft }) {
  const status = getDisplayStatus(draft);
  return <span className={`status-pill status-${status.tone}`}>{status.label}</span>;
}

function ChoiceGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="choice-field">
      <legend>{label}</legend>
      <div className="choice-list">
        {options.map((option) => (
          <button
            type="button"
            className={value === option ? "selected" : ""}
            onClick={() => onChange(option)}
            key={option}
          >
            {value === option && <Check size={14} />}
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function MiniPreview({ draft }: { draft: GreetingDraft }) {
  const photo = draft.primaryPhoto || fallbackMemories[0];
  return (
    <div className={`mini-preview theme-${draft.templateId}`}>
      <PaperDecor />
      <div className="mini-preview-title">
        <small>happy</small>
        <strong>birthday</strong>
      </div>
      <div className="mini-camera">
        <span className="camera-dot" />
        <img src={photo} alt="" />
        <Camera size={19} />
      </div>
      <Giraffe variant="cake" className="mini-giraffe" />
      <p>{draft.recipientName || "Таны дотны хүнд"}</p>
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
  const [codeInput, setCodeInput] = useState(draft.accessCode || "");
  const [codeFeedback, setCodeFeedback] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [qrData, setQrData] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const step = Math.min(draft.currentStep, 3);
  const ready = isDraftReady(draft);
  const shareUrl =
    typeof window !== "undefined" && draft.slug
      ? `${window.location.origin}/?role=recipient&slug=${draft.slug}`
      : "";

  useEffect(() => {
    if (!shareUrl) return;
    QRCode.toDataURL(shareUrl, {
      width: 200,
      margin: 1,
      color: { dark: "#493c62", light: "#ffffff" },
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
    update({ currentStep: Math.max(0, Math.min(3, next)) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function transition(
    action: "start-payment" | "confirm-demo-payment" | "redeem-code" | "publish",
  ) {
    const generatedCode =
      draft.accessCode ||
      `MEND-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`;
    const patch: Partial<GreetingDraft> =
      action === "start-payment"
        ? { greetingStatus: "READY_TO_PAY", paymentStatus: "PENDING" }
        : action === "confirm-demo-payment"
          ? {
              greetingStatus: "DRAFT",
              paymentStatus: "SUCCESS",
              accessCode: generatedCode,
              accessCodeApplied: false,
            }
          : action === "redeem-code"
            ? {
                greetingStatus: ready ? "READY_TO_PUBLISH" : "DRAFT",
                accessCodeApplied: true,
              }
            : {
                greetingStatus: "PUBLISHED",
                engagementStatus: "NOT_OPENED",
                slug:
                  draft.slug ||
                  `${(draft.recipientName || "mend").toLowerCase().replace(/\s+/g, "-")}-${draft.id.slice(-5)}`,
              };
    if (action === "confirm-demo-payment") setCodeInput(generatedCode);
    update(patch);

    try {
      const response = await fetch("/api/greetings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: draft.id, action, accessCode: codeInput }),
      });
      if (response.ok) {
        const result = (await response.json()) as { greeting: GreetingDraft };
        setDraft((current) => ({
          ...current,
          ...result.greeting,
          memoryPhotos: result.greeting.memoryPhotos ?? current.memoryPhotos,
        }));
        if (result.greeting.accessCode) setCodeInput(result.greeting.accessCode);
      }
    } catch {
      // The local draft remains usable if server sync is unavailable.
    }
  }

  async function redeemCode() {
    const normalized = codeInput.trim().toUpperCase();
    const isDemo = normalized === demoAccessCode;
    if (
      !isDemo &&
      (draft.paymentStatus !== "SUCCESS" ||
        !draft.accessCode ||
        normalized !== draft.accessCode)
    ) {
      setCodeFeedback("Код тохирохгүй байна.");
      return;
    }
    if (isDemo) {
      update({ paymentStatus: "SUCCESS", accessCode: demoAccessCode });
    }
    setCodeFeedback("Бүтээх эрх нээгдлээ.");
    await transition("redeem-code");
  }

  async function handleImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, 6);
    if (!files.length) return;
    setUploadError("");
    const invalid = files.find(
      (file) =>
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 6 * 1024 * 1024,
    );
    if (invalid) {
      setUploadError("JPG, PNG, WEBP зураг тус бүр 6MB-аас бага байна.");
      return;
    }

    const localPhotos = await Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.readAsDataURL(file);
          }),
      ),
    );

    setDraft((current) => {
      const photos = [...(current.memoryPhotos ?? []), ...localPhotos].slice(0, 6);
      return {
        ...current,
        memoryPhotos: photos,
        primaryPhoto: current.primaryPhoto || photos[0] || "",
        updatedAt: new Date().toISOString(),
      };
    });

    files.forEach(async (file, index) => {
      try {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/media", { method: "POST", body: form });
        if (!response.ok) return;
        const result = (await response.json()) as { url: string };
        const localUrl = localPhotos[index];
        setDraft((current) => ({
          ...current,
          memoryPhotos: (current.memoryPhotos ?? []).map((photo) =>
            photo === localUrl ? result.url : photo,
          ),
          primaryPhoto: current.primaryPhoto === localUrl ? result.url : current.primaryPhoto,
        }));
      } catch {
        // Local previews remain available.
      }
    });
  }

  function removePhoto(index: number) {
    setDraft((current) => {
      const photos = (current.memoryPhotos ?? []).filter((_, photoIndex) => photoIndex !== index);
      return {
        ...current,
        memoryPhotos: photos,
        primaryPhoto: current.primaryPhoto === current.memoryPhotos?.[index]
          ? photos[0] || ""
          : current.primaryPhoto,
      };
    });
  }

  function copyLink() {
    if (shareUrl) navigator.clipboard?.writeText(shareUrl);
  }

  const stepReady = [
    Boolean(
      draft.accessCodeApplied &&
        draft.recipientName.trim() &&
        draft.senderName.trim() &&
        draft.ageGroup &&
        draft.relationship &&
        draft.mood,
    ),
    Boolean(draft.primaryPhoto && draft.greetingText.trim()),
    Boolean(draft.templateId && draft.musicId),
    ready,
  ][step];

  return (
    <div className="creator-studio">
      <aside className="studio-rail">
        <div className="rail-mascot">
          <Giraffe variant={creatorMascotVariants[step] ?? "intro"} />
          <div>
            <strong>{draft.recipientName || "Шинэ мэндчилгээ"}</strong>
            <span>{step + 1} / 4 алхам</span>
          </div>
        </div>
        <nav aria-label="Мэндчилгээ бүтээх алхам">
          {creatorSteps.map(([name, note], index) => (
            <button
              type="button"
              key={name}
              className={`${step === index ? "active" : ""} ${step > index ? "done" : ""}`}
              onClick={() => goToStep(index)}
            >
              <span>{step > index ? <Check size={15} /> : index + 1}</span>
              <div>
                <strong>{name}</strong>
                <small>{note}</small>
              </div>
            </button>
          ))}
        </nav>
        <div className="rail-save">
          <StatusPill draft={draft} />
          <small>
            {saveState === "saving"
              ? "Хадгалж байна..."
              : saveState === "saved"
                ? "Өөрчлөлт хадгалагдсан"
                : "Төхөөрөмж дээр хадгалсан"}
          </small>
        </div>
      </aside>

      <main className="studio-canvas">
        <PaperDecor />
        <section className="creator-sheet">
          <header className="sheet-heading">
            <span>mend scrapbook · {String(step + 1).padStart(2, "0")}</span>
            <h1>
              {[
                "Хэнд зориулж байна?",
                "Дурсамжаа цуглуулъя",
                "Бэлгүүдээ чимэглэе",
                "Бэлэн боллоо",
              ][step]}
            </h1>
          </header>

          {step === 0 && (
            <div className="creator-form">
              <section className={`code-strip ${draft.accessCodeApplied ? "valid" : ""}`}>
                <span><KeyRound size={21} /></span>
                <div>
                  <strong>Бүтээх эрхийн код</strong>
                  <small>Test code: {demoAccessCode}</small>
                </div>
                <input
                  value={codeInput}
                  onChange={(event) => {
                    setCodeInput(event.target.value.toUpperCase());
                    setCodeFeedback("");
                  }}
                  placeholder="MEND-XXXXXX"
                />
                <Button
                  variant="secondary"
                  icon={<BadgeCheck size={17} />}
                  disabled={!codeInput.trim() || draft.accessCodeApplied}
                  onClick={redeemCode}
                >
                  {draft.accessCodeApplied ? "Идэвхтэй" : "Шалгах"}
                </Button>
                {codeFeedback && <p>{codeFeedback}</p>}
              </section>

              <div className="field-grid">
                <label>
                  <span>Хүлээн авагч</span>
                  <input
                    value={draft.recipientName}
                    maxLength={40}
                    onChange={(event) =>
                      update({ recipientName: sanitizePlainText(event.target.value, 40) })
                    }
                    placeholder="Жишээ нь: Ану"
                  />
                </label>
                <label>
                  <span>Илгээгч</span>
                  <input
                    value={draft.senderName}
                    maxLength={40}
                    onChange={(event) =>
                      update({ senderName: sanitizePlainText(event.target.value, 40) })
                    }
                    placeholder="Таны нэр"
                  />
                </label>
              </div>
              <ChoiceGroup label="Насны ангилал" value={draft.ageGroup} options={ageGroups} onChange={(value) => update({ ageGroup: value })} />
              <ChoiceGroup label="Та хоёрын харилцаа" value={draft.relationship} options={relationships} onChange={(value) => update({ relationship: value })} />
              <ChoiceGroup label="Мэндчилгээний мэдрэмж" value={draft.mood} options={moods} onChange={(value) => update({ mood: value })} />
            </div>
          )}

          {step === 1 && (
            <div className="creator-form">
              <section className="memory-uploader">
                <div className="field-title">
                  <div>
                    <strong>Дурсамжийн зургууд</strong>
                    <span>{(draft.memoryPhotos ?? []).length} / 6 зураг</span>
                  </div>
                  <Button
                    variant="secondary"
                    icon={<ImagePlus size={17} />}
                    onClick={() => fileRef.current?.click()}
                  >
                    Зураг нэмэх
                  </Button>
                </div>
                <input
                  ref={fileRef}
                  className="visually-hidden"
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleImages}
                />
                {(draft.memoryPhotos ?? []).length ? (
                  <div className="memory-editor-grid">
                    {draft.memoryPhotos.map((photo, index) => (
                      <div className={draft.primaryPhoto === photo ? "cover" : ""} key={`${photo.slice(0, 30)}-${index}`}>
                        <img src={photo} alt={`Дурсамж ${index + 1}`} />
                        <button type="button" onClick={() => update({ primaryPhoto: photo })}>
                          {draft.primaryPhoto === photo ? <Check size={14} /> : <Star size={14} />}
                        </button>
                        <button type="button" onClick={() => removePhoto(index)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button type="button" className="empty-upload" onClick={() => fileRef.current?.click()}>
                    <Camera size={28} />
                    <strong>Зургаа энд нэмээрэй</strong>
                    <span>Эхний зураг birthday cover болно</span>
                  </button>
                )}
                {uploadError && <p className="form-error">{uploadError}</p>}
              </section>

              <label className="text-field">
                <span>Cover гарчиг</span>
                <input
                  value={draft.headline}
                  maxLength={80}
                  onChange={(event) => update({ headline: sanitizePlainText(event.target.value, 80) })}
                  placeholder={`Төрсөн өдрийн мэнд, ${draft.recipientName || "Ану"}!`}
                />
              </label>
              <label className="text-field">
                <span>Сэтгэлийн захиа</span>
                <textarea
                  rows={7}
                  maxLength={1000}
                  value={draft.greetingText}
                  onChange={(event) => update({ greetingText: sanitizePlainText(event.target.value, 1000) })}
                  placeholder="Хамгийн сайхан дурсамж, хүсэл, ерөөлөө бичээрэй..."
                />
                <small>{draft.greetingText.length} / 1000</small>
              </label>
              <label className="text-field">
                <span>Төгсгөлийн богино үг</span>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={draft.secretMessage}
                  onChange={(event) => update({ secretMessage: sanitizePlainText(event.target.value, 500) })}
                  placeholder="Энэ жил чамд хамгийн гоё зүйлс ирээсэй."
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="creator-form">
              <section className="palette-section">
                <div className="field-title">
                  <div>
                    <strong>Scrapbook өнгө</strong>
                    <span>Нэг загвар, гурван мэдрэмж</span>
                  </div>
                </div>
                <div className="palette-list">
                  {templates.map((template) => (
                    <button
                      type="button"
                      className={draft.templateId === template.id ? "selected" : ""}
                      onClick={() => update({ templateId: template.id })}
                      key={template.id}
                    >
                      <span style={{ background: template.background }}>
                        <i style={{ background: template.accent }} />
                      </span>
                      <div>
                        <strong>{template.name}</strong>
                        <small>{template.eyebrow}</small>
                      </div>
                      {draft.templateId === template.id && <CheckCircle2 size={18} />}
                    </button>
                  ))}
                </div>
              </section>

              <section className="gift-builder">
                <div className="field-title">
                  <div>
                    <strong>Нээгдэх 3 бэлэг</strong>
                    <span>Дурсамж · Захиа · Дуу</span>
                  </div>
                </div>
                <div className="gift-row">
                  <div><Camera /><strong>Дурсамж</strong><span>{draft.memoryPhotos.length || 0} зураг</span></div>
                  <div><Mail /><strong>Захиа</strong><span>{draft.greetingText ? "Бэлэн" : "Хоосон"}</span></div>
                  <div><CassetteTape /><strong>Дуу</strong><span>{draft.musicId === "none" ? "Хаалттай" : "Бэлэн"}</span></div>
                </div>
              </section>

              <section className="music-section">
                <div className="field-title">
                  <div>
                    <strong>Аялгуу</strong>
                    <span>Recipient нээхдээ асаана</span>
                  </div>
                </div>
                <div className="music-list">
                  {musicOptions.map(([id, name, note]) => (
                    <button
                      type="button"
                      className={draft.musicId === id ? "selected" : ""}
                      onClick={() => update({ musicId: id })}
                      key={id}
                    >
                      <span>{id === "none" ? <VolumeX size={19} /> : <Music2 size={19} />}</span>
                      <div><strong>{name}</strong><small>{note}</small></div>
                      {draft.musicId === id && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </section>

              <div className="simple-toggles">
                <label>
                  <span><strong>Хариу авах</strong><small>Recipient богино хариу илгээнэ</small></span>
                  <input type="checkbox" checked={draft.allowReply} onChange={(event) => update({ allowReply: event.target.checked })} />
                  <i />
                </label>
                <label>
                  <span><strong>Хуваалцах</strong><small>Link-ийг бусдад дамжуулж болно</small></span>
                  <input type="checkbox" checked={draft.allowShare} onChange={(event) => update({ allowShare: event.target.checked })} />
                  <i />
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="creator-form">
              {draft.greetingStatus === "PUBLISHED" ? (
                <section className="publish-success">
                  <span><Check size={28} /></span>
                  <small>Бэлэн боллоо</small>
                  <h2>{draft.recipientName}-д зориулсан scrapbook</h2>
                  <p>Link-ийг илгээхэд анааш бэлгүүдийг нь нэг нэгээр нээнэ.</p>
                  <div className="share-box">
                    <span>{shareUrl}</span>
                    <IconButton label="Линк хуулах" onClick={copyLink}><Copy size={18} /></IconButton>
                  </div>
                  <div className="share-buttons">
                    <Button icon={<Share2 size={18} />} onClick={copyLink}>Link хуулах</Button>
                    <Button variant="secondary" icon={<Eye size={18} />} onClick={() => onRoleChange("recipient")}>Нээж үзэх</Button>
                  </div>
                  {qrData && <img className="share-qr" src={qrData} alt="Мэндчилгээний QR код" />}
                </section>
              ) : (
                <>
                  <section className="ready-list">
                    {[
                      ["Эрхийн код", draft.accessCodeApplied, 0],
                      ["Нэр ба харилцаа", Boolean(draft.recipientName && draft.senderName && draft.relationship), 0],
                      ["Дурсамжийн зураг", Boolean(draft.primaryPhoto), 1],
                      ["Сэтгэлийн захиа", Boolean(draft.greetingText), 1],
                      ["Scrapbook өнгө", Boolean(draft.templateId), 2],
                    ].map(([label, done, target]) => (
                      <button type="button" onClick={() => !done && goToStep(Number(target))} key={String(label)}>
                        <span className={done ? "done" : ""}>{done ? <Check size={15} /> : <span />}</span>
                        <strong>{label}</strong>
                        <small>{done ? "Бэлэн" : "Нэмэх"}</small>
                      </button>
                    ))}
                  </section>
                  <section className="publish-panel">
                    <div>
                      <small>Нэг удаагийн эрх</small>
                      <strong>6,900₮</strong>
                    </div>
                    <p><LockKeyhole size={17} />30 хоногийн нууц link</p>
                    {draft.paymentStatus === "UNPAID" && (
                      <Button
                        icon={<QrCode size={18} />}
                        onClick={() => {
                          setShowPayment(true);
                          transition("start-payment");
                        }}
                      >
                        QPay идэвхжүүлэх
                      </Button>
                    )}
                    {draft.paymentStatus === "PENDING" && (
                      <Button icon={<RefreshCw size={18} />} onClick={() => setShowPayment(true)}>
                        Төлбөр шалгах
                      </Button>
                    )}
                    {draft.paymentStatus === "SUCCESS" && (
                      <Button icon={<Send size={18} />} disabled={!ready || !draft.accessCodeApplied} onClick={() => transition("publish")}>
                        Нийтлэх
                      </Button>
                    )}
                  </section>
                </>
              )}
            </div>
          )}

          <footer className="sheet-actions">
            <Button variant="ghost" icon={<ArrowLeft size={18} />} disabled={step === 0} onClick={() => goToStep(step - 1)}>
              Буцах
            </Button>
            {step < 3 && (
              <Button icon={<ArrowRight size={18} />} disabled={!stepReady} onClick={() => goToStep(step + 1)}>
                Үргэлжлүүлэх
              </Button>
            )}
          </footer>
        </section>

        <aside className="creator-preview">
          <span>recipient preview</span>
          <MiniPreview draft={draft} />
          <button type="button" onClick={() => onRoleChange("recipient")}>
            <Eye size={17} /> Бүтнээр нээх
          </button>
        </aside>
      </main>

      {showPayment && (
        <div className="modal-backdrop" onMouseDown={() => setShowPayment(false)}>
          <section className="payment-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <IconButton label="Хаах" onClick={() => setShowPayment(false)}><X size={19} /></IconButton>
            <span className="qpay-logo">Q</span>
            <small>Туршилтын төлбөр</small>
            <h2>Scrapbook эрх</h2>
            <div className="fake-qr"><QrCode size={130} strokeWidth={1.2} /></div>
            <strong>6,900₮</strong>
            <Button
              icon={<CheckCircle2 size={18} />}
              onClick={async () => {
                await transition("confirm-demo-payment");
                setShowPayment(false);
              }}
            >
              Demo төлбөр батлах
            </Button>
          </section>
        </div>
      )}
    </div>
  );
}

function RecipientApp({
  draft,
  setDraft,
  preview,
  onRoleChange,
}: {
  draft: GreetingDraft;
  setDraft: React.Dispatch<React.SetStateAction<GreetingDraft>>;
  preview: boolean;
  onRoleChange: (role: Role) => void;
}) {
  const [screen, setScreen] = useState<RecipientScreen>("intro");
  const [openedGifts, setOpenedGifts] = useState<string[]>([]);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [reaction, setReaction] = useState(draft.reaction);
  const [reply, setReply] = useState("");
  const photos = draft.memoryPhotos?.length
    ? draft.memoryPhotos
    : draft.primaryPhoto
      ? [draft.primaryPhoto, ...fallbackMemories.slice(0, 5)]
      : fallbackMemories;
  const theme = templates.find((item) => item.id === draft.templateId) ?? templates[0];

  async function recipientTransition(action: "open" | "react" | "reply", extra: Record<string, string> = {}) {
    setDraft((current) => ({
      ...current,
      engagementStatus:
        action === "reply" ? "REPLIED" : action === "react" ? "REACTED" : "OPENED",
      reaction: extra.emoji || current.reaction,
      reply: extra.message || current.reply,
    }));
    try {
      await fetch("/api/greetings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: draft.id, action, sessionId: "recipient", ...extra }),
      });
    } catch {
      // Keep the recipient experience responsive offline.
    }
  }

  function openGift(name: "memories" | "letter" | "music") {
    setOpenedGifts((current) => (current.includes(name) ? current : [...current, name]));
    setScreen(name);
  }

  function restart() {
    setScreen("intro");
    setOpenedGifts([]);
    setPlaying(false);
  }

  if (
    !preview &&
    (draft.moderationStatus === "BLOCKED" || draft.greetingStatus === "BLOCKED")
  ) {
    return (
      <div className="recipient-blocked">
        <ShieldCheck size={38} />
        <h1>Энэ мэндчилгээг түр үзэх боломжгүй байна.</h1>
      </div>
    );
  }

  const progressIndex = {
    intro: 0,
    tease: 0,
    ready: 1,
    cover: 2,
    gifts: 3,
    memories: 4,
    letter: 4,
    music: 4,
    finale: 5,
  }[screen];

  return (
    <main
      className={`recipient-experience theme-${draft.templateId}`}
      style={
        {
          "--theme-accent": theme.accent,
          "--theme-bg": theme.background,
          "--theme-text": theme.text,
        } as React.CSSProperties
      }
    >
      <PaperDecor />
      <header className="recipient-toolbar">
        <button type="button" className="recipient-brand" onClick={restart}>mend.</button>
        <div className="story-progress" aria-label={`Дэлгэц ${progressIndex + 1} / 6`}>
          {Array.from({ length: 6 }).map((_, index) => (
            <span className={index <= progressIndex ? "active" : ""} key={index} />
          ))}
        </div>
        <div>
          <IconButton label={muted ? "Дуу асаах" : "Дуу хаах"} onClick={() => setMuted(!muted)}>
            {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </IconButton>
          <IconButton label="Дахин эхлэх" onClick={restart}><RotateCcw size={18} /></IconButton>
          {preview && (
            <IconButton label="Creator руу буцах" onClick={() => onRoleChange("creator")}>
              <WandSparkles size={18} />
            </IconButton>
          )}
        </div>
      </header>

      <section className={`recipient-screen screen-${screen}`}>
        {screen === "intro" && (
          <div className="intro-scene">
            <p>Хөөе! Би чамд нэг зүйл бэлдсэн.</p>
            <h1>Үзмээр байна уу?</h1>
            <Giraffe variant="intro" />
            <div className="yes-no-row">
              <Button
                onClick={() => {
                  setScreen("ready");
                  recipientTransition("open");
                }}
              >
                Тийм
              </Button>
              <Button variant="secondary" onClick={() => setScreen("tease")}>Үгүй</Button>
            </div>
          </div>
        )}

        {screen === "tease" && (
          <div className="tease-scene">
            <Giraffe variant="pout" />
            <small>Өө, үнэхээр үү?</small>
            <h1>Жаахан бодоод дахин оролдоорой.</h1>
            <Button icon={<ArrowLeft size={18} />} onClick={() => setScreen("intro")}>Буцах</Button>
          </div>
        )}

        {screen === "ready" && (
          <div className="ready-scene">
            <Giraffe variant="celebrate" />
            <h1>Сайн сонголт!</h1>
            <p>Бяцхан бэлгүүд чамайг хүлээж байна.</p>
            <Button icon={<Sparkles size={18} />} onClick={() => setScreen("cover")}>Нээх</Button>
          </div>
        )}

        {screen === "cover" && (
          <div className="birthday-cover">
            <div className="cutout-title">
              <span>H</span><span>a</span><span>p</span><span>p</span><span>y</span>
            </div>
            <div className="camera-frame">
              <div className="camera-top"><span /><Camera size={19} /></div>
              <img src={draft.primaryPhoto || photos[0]} alt={draft.recipientName || "Төрсөн өдрийн зураг"} />
              <div className="camera-bottom"><span>memory 01</span><i /></div>
            </div>
            <h1>{draft.headline || `Төрсөн өдрийн мэнд, ${draft.recipientName || "миний дотны хүн"}!`}</h1>
            <Giraffe variant="cake" />
            <Button icon={<ArrowRight size={18} />} onClick={() => setScreen("gifts")}>Дараах</Button>
          </div>
        )}

        {screen === "gifts" && (
          <div className="gift-hub">
            <small>Нэг нэгээр нь нээгээрэй</small>
            <h1>Чамд зориулсан 3 бэлэг</h1>
            <div className="recipient-gifts">
              <button type="button" onClick={() => openGift("memories")}>
                <span><Giraffe variant="camera" /></span>
                <strong>Дурсамж</strong>
                {openedGifts.includes("memories") && <CheckCircle2 />}
              </button>
              <button type="button" onClick={() => openGift("letter")}>
                <span><Giraffe variant="letter" /></span>
                <strong>Захиа</strong>
                {openedGifts.includes("letter") && <CheckCircle2 />}
              </button>
              <button type="button" onClick={() => openGift("music")}>
                <span><Giraffe variant="music" /></span>
                <strong>Аялгуу</strong>
                {openedGifts.includes("music") && <CheckCircle2 />}
              </button>
            </div>
            <Button
              variant="secondary"
              icon={<PartyPopper size={18} />}
              disabled={openedGifts.length < 3}
              onClick={() => setScreen("finale")}
            >
              Төгсгөлийг нээх
            </Button>
          </div>
        )}

        {screen === "memories" && (
          <div className="memories-scene">
            <div className="memory-heading">
              <Giraffe variant="camera" />
              <div>
                <div className="search-title"><Camera size={28} /><h1>Бидний дурсамж</h1></div>
                <div className="memory-search"><span>Бидний мөчүүд</span><Heart size={18} fill="currentColor" /></div>
              </div>
            </div>
            <div className="memory-gallery">
              {photos.slice(0, 6).map((photo, index) => (
                <img src={photo} alt={`Дурсамж ${index + 1}`} key={`${photo}-${index}`} />
              ))}
            </div>
            <Button icon={<ArrowLeft size={18} />} onClick={() => setScreen("gifts")}>Бэлгүүд рүү</Button>
          </div>
        )}

        {screen === "letter" && (
          <div className="letter-scene">
            <div className="letter-heading">
              <Giraffe variant="letter" />
              <div>
                <span className="letter-seal"><Mail size={25} /></span>
                <small>{draft.senderName || "Таны дотны хүн"}-ээс</small>
                <h1>{draft.recipientName || "Чамдаа"}</h1>
              </div>
            </div>
            <div className="letter-paper">
              <p>
                {draft.greetingText ||
                  "Чиний инээмсэглэл, дэргэд байдаг дулаахан зан амьдралыг илүү гоё болгодог. Энэ шинэ насанд аз жаргал, амжилт, хайр дүүрэн байгаарай."}
              </p>
              <strong>— {draft.senderVisibility === "ANONYMOUS" ? "Нууц илгээгч" : draft.senderName || "Чиний хүн"}</strong>
            </div>
            <Button icon={<ArrowLeft size={18} />} onClick={() => setScreen("gifts")}>Бэлгүүд рүү</Button>
          </div>
        )}

        {screen === "music" && (
          <div className="music-scene">
            <Giraffe variant="music" />
            <small>Чамд зориулсан аялгуу</small>
            <h1>{draft.musicId === "warm-memory" ? "Warm memory" : "Sunny day"}</h1>
            <div className="music-player">
              <button type="button" onClick={() => setPlaying(!playing)}>
                {playing ? <Pause size={25} /> : <Play size={25} fill="currentColor" />}
              </button>
              <div><span style={{ width: playing ? "64%" : "18%" }} /></div>
              <small>{playing ? "01:24" : "00:00"}</small>
            </div>
            <p>{playing ? "Аялгуу тоглож байна" : "Play дарж эхлүүлээрэй"}</p>
            <Button icon={<ArrowLeft size={18} />} onClick={() => setScreen("gifts")}>Бэлгүүд рүү</Button>
          </div>
        )}

        {screen === "finale" && (
          <div className="finale-scene">
            <Giraffe variant="celebrate" />
            <small>Төрсөн өдрийн мэнд</small>
            <h1>
              {draft.secretMessage ||
                "Хүлээж байсан бүх сайхан зүйл чинь энэ жил чамайг олоосой."}
            </h1>
            <div className="reaction-picker">
              {["❤️", "🥹", "🎉", "✨"].map((emoji) => (
                <button
                  type="button"
                  className={reaction === emoji ? "selected" : ""}
                  onClick={() => {
                    setReaction(emoji);
                    recipientTransition("react", { emoji });
                  }}
                  key={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {draft.allowReply && (
              <div className="reply-box">
                <input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Богино хариу..." maxLength={160} />
                <IconButton
                  label="Хариу илгээх"
                  disabled={!reply.trim()}
                  onClick={() => {
                    recipientTransition("reply", { message: reply });
                    setReply("");
                  }}
                >
                  <Send size={18} />
                </IconButton>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function AdminApp({ draft }: { draft: GreetingDraft }) {
  const rows = useMemo(
    () => [
      draft,
      {
        ...createDefaultDraft(),
        id: "g_10429",
        recipientName: "Номин",
        senderName: "Саруул",
        greetingStatus: "PUBLISHED" as const,
        paymentStatus: "SUCCESS" as const,
        engagementStatus: "REPLIED" as const,
        accessCodeApplied: true,
        primaryPhoto: fallbackMemories[1],
        memoryPhotos: fallbackMemories.slice(0, 4),
      },
      {
        ...createDefaultDraft(),
        id: "g_10418",
        recipientName: "Тэмүүлэн",
        senderName: "Мөнхөө",
        greetingStatus: "PUBLISHED" as const,
        paymentStatus: "SUCCESS" as const,
        engagementStatus: "OPENED" as const,
        accessCodeApplied: true,
        primaryPhoto: fallbackMemories[2],
        memoryPhotos: fallbackMemories.slice(2, 6),
      },
    ],
    [draft],
  );

  return (
    <main className="admin-page">
      <PaperDecor />
      <header className="admin-title">
        <div><small>mend control room</small><h1>Scrapbook мэндчилгээнүүд</h1></div>
        <StatusPill draft={draft} />
      </header>
      <section className="admin-stats">
        <div><Gift /><span><strong>48</strong><small>Үүсгэсэн</small></span></div>
        <div><Eye /><span><strong>139</strong><small>Нээсэн</small></span></div>
        <div><MessageCircle /><span><strong>18</strong><small>Хариу</small></span></div>
      </section>
      <section className="admin-list">
        <header><h2>Сүүлийн мэндчилгээ</h2><span>{rows.length} нийт</span></header>
        {rows.map((row) => (
          <article key={row.id}>
            <img src={row.primaryPhoto || fallbackMemories[0]} alt="" />
            <div><strong>{row.recipientName || "Нэргүй draft"}</strong><small>{row.senderName || "Guest"} · {row.id}</small></div>
            <span>{row.memoryPhotos?.length || 0} зураг</span>
            <StatusPill draft={row} />
            <IconButton label="Дэлгэрэнгүй"><ArrowRight size={18} /></IconButton>
          </article>
        ))}
      </section>
      <aside className="admin-note">
        <ShieldCheck size={21} />
        <div><strong>Хувийн агуулга хамгаалагдсан</strong><span>Зөвхөн report шалгах үед media нээгдэнэ.</span></div>
      </aside>
    </main>
  );
}

function AppHeader({
  role,
  draft,
  mobileOpen,
  setMobileOpen,
  onRoleChange,
}: {
  role: Role;
  draft: GreetingDraft;
  mobileOpen: boolean;
  setMobileOpen: (value: boolean) => void;
  onRoleChange: (role: Role) => void;
}) {
  return (
    <header className="app-header">
      <button className="brand" onClick={() => onRoleChange("creator")}>
        <span>mend.</span>
        <small>birthday scrapbook</small>
      </button>
      <nav className={mobileOpen ? "open" : ""} aria-label="Дүрээр харах">
        <button className={role === "creator" ? "active" : ""} onClick={() => onRoleChange("creator")}><WandSparkles size={16} />Бүтээгч</button>
        <button className={role === "recipient" ? "active" : ""} onClick={() => onRoleChange("recipient")}><Gift size={16} />Хүлээн авагч</button>
        <button className={role === "admin" ? "active" : ""} onClick={() => onRoleChange("admin")}><ShieldCheck size={16} />Админ</button>
      </nav>
      <div className="header-end">
        <StatusPill draft={draft} />
        <IconButton label="Цэс" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={19} /> : <Menu size={19} />}
        </IconButton>
      </div>
    </header>
  );
}

function normalizeDraft(value: Partial<GreetingDraft>): GreetingDraft {
  const fallback = createDefaultDraft();
  return {
    ...fallback,
    ...value,
    currentStep: Math.min(Number(value.currentStep ?? 0), 3),
    templateId: value.templateId?.includes("scrapbook")
      ? value.templateId
      : "sunny-scrapbook",
    memoryPhotos:
      value.memoryPhotos?.length
        ? value.memoryPhotos
        : value.primaryPhoto
          ? [value.primaryPhoto]
          : [],
  };
}

export default function BirthdayApp() {
  const [role, setRole] = useState<Role>("creator");
  const [draft, setDraft] = useState<GreetingDraft>(() => createDefaultDraft());
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sharedRecipient, setSharedRecipient] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const requestedRole = params.get("role");
      const slug = params.get("slug");
      if (requestedRole === "recipient" || requestedRole === "admin") {
        setRole(requestedRole);
      }
      setSharedRecipient(Boolean(slug && requestedRole === "recipient"));

      const saved = window.localStorage.getItem("mend-greeting-draft");
      if (saved) {
        try {
          setDraft(normalizeDraft(JSON.parse(saved) as Partial<GreetingDraft>));
        } catch {
          window.localStorage.removeItem("mend-greeting-draft");
        }
      }

      if (slug) {
        fetch(`/api/greetings?slug=${encodeURIComponent(slug)}`)
          .then(async (response) => {
            if (!response.ok) return;
            const result = (await response.json()) as { greeting: GreetingDraft };
            setDraft(normalizeDraft(result.greeting));
          })
          .catch(() => undefined);
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("mend-greeting-draft", JSON.stringify(draft));
    const saving = window.setTimeout(() => setSaveState("saving"), 0);
    const sync = window.setTimeout(async () => {
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
      window.clearTimeout(saving);
      window.clearTimeout(sync);
    };
  }, [draft, hydrated]);

  function changeRole(nextRole: Role) {
    setRole(nextRole);
    setMobileOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set("role", nextRole);
    if (nextRole !== "recipient") url.searchParams.delete("slug");
    window.history.replaceState({}, "", url);
  }

  return (
    <div className={`app-root role-${role}`}>
      {role !== "recipient" && (
        <AppHeader
          role={role}
          draft={draft}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          onRoleChange={changeRole}
        />
      )}
      {role === "creator" && (
        <CreatorApp
          draft={draft}
          setDraft={setDraft}
          saveState={saveState}
          onRoleChange={changeRole}
        />
      )}
      {role === "recipient" && (
        <RecipientApp
          draft={draft}
          setDraft={setDraft}
          preview={!sharedRecipient}
          onRoleChange={changeRole}
        />
      )}
      {role === "admin" && <AdminApp draft={draft} />}
    </div>
  );
}
