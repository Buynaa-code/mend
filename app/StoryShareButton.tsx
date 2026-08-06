"use client";

/* eslint-disable @next/next/no-img-element */

import {
  Check,
  Copy,
  Download,
  LoaderCircle,
  Share2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getTemplate,
  type GreetingContent,
  type PublicGreeting,
} from "./lib/greeting";

type StoryGreeting = Pick<
  GreetingContent,
  | "recipientName"
  | "recipientGender"
  | "senderName"
  | "template"
  | "headline"
  | "message"
  | "photos"
>;

type StoryShareButtonProps = {
  slug: string;
  greeting?: StoryGreeting;
  recipientName?: string;
  className?: string;
  label?: string;
};

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.roundRect(x, y, width, height, safeRadius);
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  );
}

async function loadCanvasImage(source: string) {
  const response = await fetch(source);
  if (!response.ok) throw new Error("Зураг уншиж чадсангүй.");
  const objectUrl = URL.createObjectURL(await response.blob());
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Зураг уншиж чадсангүй."));
      image.src = objectUrl;
    });
  } finally {
    // The decoded image stays usable by canvas after its object URL is revoked.
    URL.revokeObjectURL(objectUrl);
  }
}

function fitHeadline(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
) {
  let size = 112;
  while (size > 64) {
    context.font = `900 ${size}px Nunito, system-ui, sans-serif`;
    if (context.measureText(value).width <= maxWidth) break;
    size -= 4;
  }
  return size;
}

function wrapText(
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width <= maxWidth || !line) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);

  const consumedWords = lines.join(" ").split(/\s+/).filter(Boolean).length;
  if (consumedWords < words.length && lines.length) {
    let last = lines.at(-1) ?? "";
    while (last && context.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[lines.length - 1] = `${last.trim()}…`;
  }

  lines.forEach((item, index) => context.fillText(item, x, startY + index * lineHeight));
  return startY + lines.length * lineHeight;
}

function isColorLight(hex: string) {
  const normalized = hex.trim().replace(/^#/, "");
  if (normalized.length !== 3 && normalized.length !== 6) return false;
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  // Perceptual luminance — templates with near-white text (e.g. "party") return
  // a value above 0.6, so we swap to a dark colour to stay readable on the
  // pale surface panel.
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

async function createStoryFile(greeting: StoryGreeting) {
  const canvas = document.createElement("canvas");
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Story зураг үүсгэж чадсангүй.");

  const template = getTemplate(greeting.template);
  const textOnSurface = isColorLight(template.text)
    ? isColorLight(template.background)
      ? "#1f1533"
      : template.background
    : template.text;
  context.fillStyle = template.background;
  context.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  context.globalAlpha = 0.14;
  context.fillStyle = template.accent;
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      context.beginPath();
      context.arc(90 + column * 235, 100 + row * 250, 12, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.globalAlpha = 1;

  context.fillStyle = template.surface;
  roundedRect(context, 54, 54, 972, 1812, 54);
  context.fill();

  context.fillStyle = template.accent;
  context.font = "1000 44px Nunito, system-ui, sans-serif";
  context.letterSpacing = "3px";
  context.fillText("MEND.  ·  ЧАМД ЗОРИУЛАВ", 102, 142);
  context.letterSpacing = "0px";

  const photoX = 102;
  const photoY = 200;
  const photoWidth = 876;
  const photoHeight = 850;
  let photo: HTMLImageElement | null = null;
  if (greeting.photos[0]) {
    try {
      photo = await loadCanvasImage(greeting.photos[0]);
    } catch {
      photo = null;
    }
  }

  context.save();
  roundedRect(context, photoX, photoY, photoWidth, photoHeight, 42);
  context.clip();
  if (photo) {
    drawCoverImage(context, photo, photoX, photoY, photoWidth, photoHeight);
  } else {
    const fallback = context.createLinearGradient(photoX, photoY, photoX, photoY + photoHeight);
    fallback.addColorStop(0, template.background);
    fallback.addColorStop(1, template.accent);
    context.fillStyle = fallback;
    context.fillRect(photoX, photoY, photoWidth, photoHeight);
    context.fillStyle = "rgba(255,255,255,0.9)";
    context.font = "900 180px Nunito, system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText("🎂", STORY_WIDTH / 2, 690);
    context.textAlign = "left";
  }
  const photoShade = context.createLinearGradient(0, 770, 0, 1050);
  photoShade.addColorStop(0, "rgba(0,0,0,0)");
  photoShade.addColorStop(1, "rgba(0,0,0,0.44)");
  context.fillStyle = photoShade;
  context.fillRect(photoX, photoY, photoWidth, photoHeight);
  context.restore();

  context.strokeStyle = template.accent;
  context.lineWidth = 8;
  roundedRect(context, photoX, photoY, photoWidth, photoHeight, 42);
  context.stroke();

  const recipient = greeting.recipientName.trim() || "Чамдаа";
  context.fillStyle = textOnSurface;
  const headlineSize = fitHeadline(context, recipient, 876);
  context.font = `900 ${headlineSize}px Nunito, system-ui, sans-serif`;
  context.fillText(recipient, 102, 1194);

  context.fillStyle = template.accent;
  context.font = "900 42px Nunito, system-ui, sans-serif";
  context.fillText("Төрсөн өдрийн мэнд!", 104, 1262);

  context.fillStyle = textOnSurface;
  context.globalAlpha = 0.82;
  context.font = "600 36px Nunito, system-ui, sans-serif";
  const message =
    greeting.message.trim() ||
    greeting.headline.trim() ||
    "Хамгийн сайхан бүхнийг хүсье.";
  const messageBottom = wrapText(context, message, 104, 1350, 866, 54, 4);
  context.globalAlpha = 1;

  context.fillStyle = template.accent;
  context.font = "800 34px Nunito, system-ui, sans-serif";
  context.fillText(`— ${greeting.senderName.trim() || "mend."}`, 104, Math.min(messageBottom + 44, 1608));

  context.fillStyle = template.accent;
  roundedRect(context, 102, 1680, 876, 104, 52);
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = "900 34px Nunito, system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText("Линкээр орж бүтэн мэндчилгээг үзээрэй  →", STORY_WIDTH / 2, 1746);
  context.textAlign = "left";

  context.fillStyle = textOnSurface;
  context.globalAlpha = 0.52;
  context.font = "700 25px Nunito, system-ui, sans-serif";
  context.fillText("Story format  ·  1080 × 1920", 102, 1830);
  context.globalAlpha = 1;

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92),
  );
  if (!blob) throw new Error("Story зураг үүсгэж чадсангүй.");

  const safeName = recipient
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return new File([blob], `mend-${safeName || "birthday"}-story.jpg`, {
    type: "image/jpeg",
  });
}

export function StoryShareButton({
  slug,
  greeting,
  recipientName = "",
  className = "",
  label = "Story-д хуваалцах",
}: StoryShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [resolvedGreeting, setResolvedGreeting] = useState<StoryGreeting | null>(
    greeting ?? null,
  );
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return `/g/${slug}`;
    return `${window.location.origin}/g/${slug}`;
  }, [slug]);

  async function prepareStory() {
    if (file || preparing) return;
    setPreparing(true);
    setError("");
    setFeedback("");

    try {
      let target = greeting ?? resolvedGreeting;
      if (!target) {
        const response = await fetch(`/api/greetings?slug=${encodeURIComponent(slug)}`);
        const result = (await response.json()) as {
          greeting?: PublicGreeting;
          error?: string;
        };
        if (!response.ok || !result.greeting) {
          throw new Error(result.error || "Мэндчилгээ уншиж чадсангүй.");
        }
        target = result.greeting;
      }
      const nextFile = await createStoryFile(target);
      setResolvedGreeting(target);
      setFile(nextFile);
      setPreviewUrl(URL.createObjectURL(nextFile));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Story бэлдэж чадсангүй.",
      );
    } finally {
      setPreparing(false);
    }
  }

  function openDialog() {
    setOpen(true);
    void prepareStory();
  }

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const canShareFile = Boolean(
    file &&
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] }),
  );

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setFeedback("Линк хуулагдлаа. Story дээр Link sticker болгон нэмээрэй.");
    } catch {
      setFeedback(`Линк: ${shareUrl}`);
    }
  }

  function downloadStory() {
    if (!file || !previewUrl) return;
    const anchor = document.createElement("a");
    anchor.href = previewUrl;
    anchor.download = file.name;
    anchor.click();
    setFeedback("9:16 зураг татагдлаа. Одоо Story-доо сонгож оруулна уу.");
  }

  async function openShareSheet() {
    if (!file) return;
    setFeedback("");
    try {
      if (canShareFile) {
        await navigator.share({
          files: [file],
          title: `${resolvedGreeting?.recipientName || recipientName}-д зориулсан мэндчилгээ`,
          text: `Төрсөн өдрийн мэндчилгээ 🎂\n${shareUrl}`,
        });
        setFeedback("Хуваалцах цэс амжилттай нээгдлээ.");
        return;
      }
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: `${resolvedGreeting?.recipientName || recipientName}-д зориулсан мэндчилгээ`,
          text: "Төрсөн өдрийн мэндчилгээ 🎂",
          url: shareUrl,
        });
        setFeedback("Линк хуваалцах цэс нээгдлээ. Story зураг доороос татагдана.");
        return;
      }
      downloadStory();
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setFeedback("Share цэс нээгдсэнгүй. Зургийг татаж Story-доо оруулна уу.");
    }
  }

  return (
    <>
      <button
        type="button"
        className={`story-share-trigger ${className}`.trim()}
        onClick={openDialog}
      >
        <Share2 size={17} /> {label}
      </button>

      {open && (
        <div
          className="story-share-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setOpen(false);
          }}
        >
          <section
            className="story-share-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`story-share-title-${slug}`}
          >
            <header>
              <div>
                <small>INSTAGRAM · FACEBOOK</small>
                <h2 id={`story-share-title-${slug}`}>Story-д оруулах</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Хаах"
                title="Хаах"
                onClick={() => setOpen(false)}
              >
                <X size={19} />
              </button>
            </header>

            <div className="story-share-body">
              <div className="story-share-preview">
                {preparing ? (
                  <span>
                    <LoaderCircle size={28} className="spin" />
                    9:16 story бэлдэж байна...
                  </span>
                ) : previewUrl ? (
                  <img src={previewUrl} alt="Story preview" />
                ) : (
                  <span>Preview бэлэн болсонгүй.</span>
                )}
              </div>

              <div className="story-share-copy">
                <strong>1080 × 1920 бэлэн зураг</strong>
                <p>
                  Утаснаасаа share цэсийг нээгээд Instagram эсвэл Facebook
                  Story-г сонгоно. Дараа нь мэндчилгээний линкийг Link sticker
                  болгон нэмээрэй.
                </p>
                <ol>
                  <li>
                    <span>1</span> Линкээ хуулна
                  </li>
                  <li>
                    <span>2</span> Share цэсээс Story-гоо сонгоно
                  </li>
                </ol>

                {error && <p className="story-share-error">{error}</p>}
                {feedback && (
                  <p className="story-share-feedback">
                    <Check size={15} /> {feedback}
                  </p>
                )}

                <div className="story-share-actions">
                  <button type="button" onClick={() => void copyLink()}>
                    <Copy size={17} /> Линк хуулах
                  </button>
                  <button
                    type="button"
                    className="primary"
                    disabled={!file}
                    onClick={() => void openShareSheet()}
                  >
                    <Share2 size={17} />
                    {canShareFile ? "Share цэс нээх" : "Линк хуваалцах"}
                  </button>
                  <button
                    type="button"
                    disabled={!file}
                    onClick={downloadStory}
                  >
                    <Download size={17} /> Зураг татах
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
