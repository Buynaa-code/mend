"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type TemplateId =
  | "cute"
  | "elegant"
  | "party"
  | "collage"
  | "dreamy"
  | "retro"
  | "minimal"
  | "boho";

interface LandingTemplate {
  id: TemplateId;
  name: string;
  moodLabel: string;
  desc: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  mascot: string;
}

const templates: LandingTemplate[] = [
  {
    id: "cute",
    name: "Cute",
    moodLabel: "Playful",
    desc: "Шар судал, lavender чимэглэлтэй хөөрхөн",
    accent: "#8069bd",
    background: "#fff4ad",
    surface: "#fffdf4",
    text: "#493c62",
    mascot: "/assets/mend-fawn-cake.png",
  },
  {
    id: "elegant",
    name: "Elegant",
    moodLabel: "Romantic",
    desc: "Зөөлөн ягаан, цэвэрхэн захианы мэдрэмж",
    accent: "#b95376",
    background: "#ffe6ee",
    surface: "#fffafc",
    text: "#603449",
    mascot: "/assets/mend-fawn-letter.png",
  },
  {
    id: "party",
    name: "Party",
    moodLabel: "Festive",
    desc: "Mint, coral өнгөтэй баярын эрч хүчтэй",
    accent: "#e45f57",
    background: "#dff6e9",
    surface: "#fbfffd",
    text: "#315b52",
    mascot: "/assets/mend-fawn-celebrate.png",
  },
  {
    id: "collage",
    name: "Photo collage",
    moodLabel: "Editorial",
    desc: "Зургуудыг гол болгосон scrapbook collage",
    accent: "#4f78b8",
    background: "#e7f3ff",
    surface: "#fbfdff",
    text: "#334766",
    mascot: "/assets/mend-fawn-camera.png",
  },
  {
    id: "dreamy",
    name: "Dreamy",
    moodLabel: "Romantic",
    desc: "Пастель өнгөт gradient, мөрөөдөл шиг",
    accent: "#7a5cc6",
    background: "#f0e6ff",
    surface: "#fbf7ff",
    text: "#3b2a6a",
    mascot: "/assets/mend-fawn-music.png",
  },
  {
    id: "retro",
    name: "Retro",
    moodLabel: "Cozy",
    desc: "70-аад оны cream, хүрэн, warm тон",
    accent: "#c5623a",
    background: "#f6e7cf",
    surface: "#fffaf1",
    text: "#5c3a20",
    mascot: "/assets/mend-fawn.png",
  },
  {
    id: "minimal",
    name: "Minimal",
    moodLabel: "Editorial",
    desc: "Цагаан, монохром, editorial загвар",
    accent: "#1a1a1a",
    background: "#f5f4f0",
    surface: "#ffffff",
    text: "#1a1a1a",
    mascot: "/assets/mend-fawn-pout.png",
  },
  {
    id: "boho",
    name: "Boho",
    moodLabel: "Cozy",
    desc: "Terracotta, sage, arch хэлбэрт бэлэг",
    accent: "#a2593a",
    background: "#f2e4d3",
    surface: "#fdf7ef",
    text: "#4a2f22",
    mascot: "/assets/mend-fawn-music.png",
  },
];

const sceneMeta = [
  { id: "cover", label: "Нүүр" },
  { id: "countdown", label: "Countdown" },
  { id: "letter", label: "Захидал" },
  { id: "music", label: "Аялгуу" },
  { id: "finale", label: "Төгсгөл" },
] as const;

const faqs = [
  {
    q: "Яагаад 5,500₮ гэсэн ганц үнэтэй вэ?",
    a: "Энгийн үнэ нь 8,500₮ ч эхний 50 хэрэглэгчид нээлтийн урамшуулалаар 5,500₮-өөр авах боломжтой. Нэг төлбөр = нэг мэндчилгээний линк. Сар бүрийн эсвэл нуугдсан төлбөр байхгүй. Загварлах, preview хийх нь бүрэн үнэгүй — зөвхөн нийтлэхэд л төлнө.",
  },
  {
    q: "Төлбөр найдвартай юу?",
    a: "Төлбөрийг QPay-ээр баталгаажуулна. Хаан, ХХБ, Голомт зэрэг банкны аппаар QR уншуулж эсвэл deeplink-ээр төлнө. Frontend биш, зөвхөн сервер төлбөрийг баталгаажуулж access code үүсгэнэ.",
  },
  {
    q: "Линк хэр удаан ажиллах вэ?",
    a: "Нийтлэгдсэн линк үүрд идэвхтэй. Хүлээн авагч хэдэн ч удаа нээж, дахин үзэж болно.",
  },
  {
    q: "Хэдэн зураг, ямар дуу нэмж болох вэ?",
    a: "30 хүртэл зураг нэмнэ. Эхний зураг cover дээр гарна. Дууг YouTube-ээс хайж эсвэл MP3/M4A файл (15MB хүртэл) оруулж болно.",
  },
  {
    q: "Хүлээн авагч юу хийж чадах вэ?",
    a: "Дугтуйгаа нээж, countdown, дурсамж, захидал, аялгууг нэг нэгээр нь нээнэ. Эцэст нь reaction илгээж, guestbook-т мэндчилгээ үлдээж болно.",
  },
  {
    q: "Хэн нээснийг би харах уу?",
    a: "Тийм. Dashboard дээр линк нээгдсэн эсэх, хэдэн удаа үзсэн, ямар reaction болон guestbook мэндчилгээ ирснийг бүгдийг харна.",
  },
];

const HERO_PHOTO =
  "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=900&q=80";
const LETTER_TEXT =
  "Одоо ч мартагдашгүй инээмсэглэлээ хайрлаж явдаг чамдаа шинэ настайн мэнд хүргэе. Хамгийн онцгой мөчүүд чинь бидний хамгийн үнэ цэнэтэй эрдэнэс байлаа. Энэ жил чамд аз жаргал дүүрэн байх болтугай.";
const PRICE = "5,500₮";
const ORIGINAL_PRICE = "8,500₮";
const PROMO_NOTE = "Эхний 50 хэрэглэгчид · нээлтийн урамшуулал";
const CAVEAT_STACK = "var(--font-caveat), 'Caveat', cursive";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function useIsMobile(breakpoint = 760) {
  const [state, setState] = useState<{ mounted: boolean; isMobile: boolean }>({
    mounted: false,
    isMobile: false,
  });
  useEffect(() => {
    const check = () =>
      setState({ mounted: true, isMobile: window.innerWidth < breakpoint });
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return state;
}

const INITIAL_COUNTDOWN_MS =
  18 * 86_400_000 + 6 * 3_600_000 + 32 * 60_000 + 18_000;

function useCountdown(initialDiffMs: number) {
  const [diff, setDiff] = useState(initialDiffMs);
  useEffect(() => {
    const target = Date.now() + initialDiffMs;
    const tick = () => setDiff(Math.max(0, target - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [initialDiffMs]);
  return {
    dd: pad(Math.floor(diff / 86_400_000)),
    hh: pad(Math.floor(diff / 3_600_000) % 24),
    mm: pad(Math.floor(diff / 60_000) % 60),
    ss: pad(Math.floor(diff / 1000) % 60),
  };
}

function useReveal(rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      els.forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            el.style.opacity = "1";
            el.style.transform = "none";
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
    );
    els.forEach((el) => io.observe(el));
    const safety = window.setTimeout(() => {
      els.forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
    }, 2600);
    return () => {
      io.disconnect();
      window.clearTimeout(safety);
    };
  }, [rootRef]);
}

const KEYFRAMES = `
@keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
@keyframes bob{0%,100%{transform:translateY(0) rotate(-2.5deg)}50%{transform:translateY(-11px) rotate(2.5deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
@keyframes pulseSoft{0%,100%{transform:scaleY(.55);opacity:.7}50%{transform:scaleY(1);opacity:1}}
@keyframes twinkle{0%,100%{opacity:.25;transform:scale(.7)}50%{opacity:1;transform:scale(1.1)}}
.landing-root{background:#f6f1ea;color:#493c62;font-family:var(--font-nunito),'Nunito',system-ui,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.landing-root a{color:#8069bd;text-decoration:none}
.landing-root a:hover{color:#6d57ac}
.landing-root ::selection{background:#e5dbf6;color:#493c62}
.landing-root h1,.landing-root h2,.landing-root h3,.landing-root p{text-wrap:pretty}
.landing-hoverable{transition:transform .2s ease,box-shadow .2s ease,background .2s ease}
.landing-hoverable:hover{transform:translateY(-2px)}
.landing-tmpl-card{transition:transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s}
.landing-tmpl-card:hover{transform:translateY(-6px);box-shadow:0 28px 52px rgba(73,60,98,.17)}
.landing-nav-link{transition:background .2s ease,color .2s ease}
.landing-nav-link:hover{background:#efeaf6;color:#493c62}
@media (prefers-reduced-motion: reduce){.landing-root *{animation:none!important}}
`;

const ArrowIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.4}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const PlayIcon = ({ size = 18, color = "#8069bd" }: { size?: number; color?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 5v14l11-7z" />
  </svg>
);

const SparkleIcon = ({ size = 15, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
  </svg>
);

const ShieldIcon = ({ size = 17, color = "#7c9b6f" }: { size?: number; color?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3l7 3v6c0 4.4-3 7.4-7 9-4-1.6-7-4.6-7-9V6z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const LinkIcon = ({ size = 17, color = "#8069bd" }: { size?: number; color?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 9V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9M4 9h16M12 4v16" />
  </svg>
);

const StarIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3 6.9 7.6.6-5.8 5 1.8 7.4L12 17.8 5.4 21.9l1.8-7.4-5.8-5 7.6-.6z" />
  </svg>
);

const QPayIcon = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <path d="M14 14h3v3M20 20v.01M20 14v.01M14 20v.01" />
  </svg>
);

const CheckIcon = ({ size = 21, color = "#5aa889" }: { size?: number; color?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flex: `0 0 ${size}px`, marginTop: 1 }}
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12l2.4 2.4 4.6-4.8" />
  </svg>
);

const Chip = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      padding: "6px 13px",
      borderRadius: 999,
      background: "#fff",
      border: "1px solid #ece5f4",
      color: "#8069bd",
      fontSize: 12.5,
      fontWeight: 900,
      ...style,
    }}
  >
    {children}
  </span>
);

function Header({ hideNav }: { hideNav: boolean }) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 60,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        background: "rgba(246,241,234,.82)",
        borderBottom: "1px solid rgba(73,60,98,.08)",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "13px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            color: "#493c62",
            fontWeight: 1000,
            fontSize: 24,
            letterSpacing: "-.02em",
          }}
        >
          mend.
          <span
            style={{
              fontFamily: CAVEAT_STACK,
              fontSize: 17,
              fontWeight: 700,
              color: "#8069bd",
            }}
          >
            birthday card
          </span>
        </Link>
        {!hideNav && (
          <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[
              { href: "#experience", label: "Туршлага" },
              { href: "#templates", label: "Загварууд" },
              { href: "#price", label: "Үнэ" },
              { href: "#faq", label: "Асуулт" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="landing-nav-link"
                style={{
                  padding: "9px 13px",
                  borderRadius: 9,
                  color: "#6f6879",
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}
        <a
          href="/create"
          className="landing-hoverable"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            height: 42,
            padding: "0 18px",
            borderRadius: 12,
            background: "linear-gradient(135deg,#8069bd,#6d57ac)",
            color: "#fff",
            fontWeight: 900,
            fontSize: 14,
            boxShadow: "0 8px 20px rgba(128,105,189,.34)",
          }}
        >
          Эхлэх
          <ArrowIcon />
        </a>
      </div>
    </header>
  );
}

function DeviceMockup({
  template,
  scene,
  countdown,
}: {
  template: LandingTemplate;
  scene: number;
  countdown: { dd: string; hh: string; mm: string; ss: string };
}) {
  const opacity = (i: number): number => (scene === i ? 1 : 0);
  return (
    <div
      style={{
        position: "relative",
        width: "min(322px, 80vw)",
        aspectRatio: "322 / 652",
        filter: "drop-shadow(0 42px 60px rgba(73,60,98,.28))",
        animation: "floaty 6.5s ease-in-out infinite",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#241d31",
          borderRadius: 46,
          padding: 11,
          boxShadow:
            "inset 0 0 0 2px rgba(255,255,255,.07), 0 4px 14px rgba(0,0,0,.3)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: 36,
            overflow: "hidden",
            background: template.background,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 11,
              left: "50%",
              transform: "translateX(-50%)",
              width: 98,
              height: 22,
              background: "#241d31",
              borderRadius: 99,
              zIndex: 30,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 46,
              left: 20,
              right: 20,
              zIndex: 25,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontWeight: 1000, color: template.text, fontSize: 15 }}>
              mend.
            </span>
            <span
              style={{
                fontFamily: CAVEAT_STACK,
                fontSize: 15,
                fontWeight: 700,
                color: template.accent,
              }}
            >
              {template.name}
            </span>
          </div>
          <div
            style={{
              position: "absolute",
              top: 74,
              left: 20,
              right: 20,
              zIndex: 25,
              height: 4,
              borderRadius: 99,
              background: "rgba(73,60,98,.14)",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 99,
                background: template.accent,
                width: `${((scene + 1) / 5) * 100}%`,
                transition: "width .5s cubic-bezier(.4,0,.2,1)",
              }}
            />
          </div>

          {/* Cover */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: opacity(0),
              transition: "opacity .8s cubic-bezier(.4,0,.2,1)",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                height: "100%",
                padding: "92px 22px 20px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  position: "relative",
                  borderRadius: 18,
                  overflow: "hidden",
                  height: "45%",
                  boxShadow: "0 14px 26px rgba(0,0,0,.14)",
                  transform: "rotate(-1.6deg)",
                  background:
                    "linear-gradient(135deg,#ffd98a,#f7a8c0 55%,#c9b3ef)",
                }}
              >
                <img
                  src={HERO_PHOTO}
                  alt=""
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div style={{ marginTop: 15 }}>
                <span
                  style={{
                    fontFamily: CAVEAT_STACK,
                    fontSize: 22,
                    fontWeight: 700,
                    color: template.accent,
                  }}
                >
                  made with mend.
                </span>
                <h2
                  style={{
                    margin: "2px 0 0",
                    fontSize: 22,
                    lineHeight: 1.15,
                    fontWeight: 1000,
                    color: template.text,
                  }}
                >
                  Төрсөн өдрийн мэнд, Ану!
                </h2>
                <p
                  style={{
                    margin: "7px 0 0",
                    fontSize: 13,
                    fontWeight: 800,
                    color: template.accent,
                  }}
                >
                  Батаа-ээс хайртайгаар
                </p>
              </div>
              <img
                src={template.mascot}
                alt=""
                style={{
                  position: "absolute",
                  bottom: -8,
                  right: 6,
                  width: 108,
                  height: 118,
                  objectFit: "contain",
                  animation: "bob 4.5s ease-in-out infinite",
                }}
              />
            </div>
          </div>

          {/* Countdown */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: opacity(1),
              transition: "opacity .8s cubic-bezier(.4,0,.2,1)",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                height: "100%",
                padding: "100px 22px 22px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: template.accent,
                }}
              >
                Төрсөн өдөр хүртэл
              </span>
              <h2
                style={{
                  margin: "6px 0 18px",
                  fontSize: 24,
                  fontWeight: 1000,
                  color: template.text,
                }}
              >
                Ануийн өдөр
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 8,
                  width: "100%",
                }}
              >
                {(
                  [
                    ["dd", "өдөр"],
                    ["hh", "цаг"],
                    ["mm", "мин"],
                    ["ss", "сек"],
                  ] as const
                ).map(([key, label]) => (
                  <div
                    key={key}
                    style={{
                      background: template.surface,
                      borderRadius: 14,
                      padding: "12px 4px",
                      boxShadow: "0 8px 16px rgba(0,0,0,.06)",
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        fontSize: 24,
                        fontWeight: 1000,
                        color: template.text,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {countdown[key]}
                    </strong>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        color: template.accent,
                      }}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
              <img
                src="/assets/mend-fawn-celebrate.png"
                alt=""
                style={{
                  marginTop: "auto",
                  width: 132,
                  height: 140,
                  objectFit: "contain",
                  animation: "bob 4.5s ease-in-out infinite",
                }}
              />
            </div>
          </div>

          {/* Letter */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: opacity(2),
              transition: "opacity .8s cubic-bezier(.4,0,.2,1)",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                height: "100%",
                padding: "96px 22px 22px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img
                  src="/assets/mend-fawn-letter.png"
                  alt=""
                  style={{ width: 52, height: 56, objectFit: "contain" }}
                />
                <div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: ".05em",
                      textTransform: "uppercase",
                      color: template.accent,
                    }}
                  >
                    Захидал
                  </span>
                  <h2
                    style={{
                      margin: "1px 0 0",
                      fontSize: 19,
                      fontWeight: 1000,
                      color: template.text,
                    }}
                  >
                    Батаа-с Ануд
                  </h2>
                </div>
              </div>
              <article
                style={{
                  marginTop: 14,
                  flex: 1,
                  background: template.surface,
                  borderRadius: 16,
                  padding: 16,
                  boxShadow: "0 10px 20px rgba(0,0,0,.06)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 13.5,
                    lineHeight: 1.65,
                    color: template.text,
                    display: "-webkit-box",
                    WebkitLineClamp: 6,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {LETTER_TEXT}
                </p>
                <strong
                  style={{
                    marginTop: "auto",
                    paddingTop: 10,
                    fontFamily: CAVEAT_STACK,
                    fontSize: 22,
                    color: template.accent,
                  }}
                >
                  — Батаа
                </strong>
              </article>
            </div>
          </div>

          {/* Music */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: opacity(3),
              transition: "opacity .8s cubic-bezier(.4,0,.2,1)",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                height: "100%",
                padding: "100px 22px 24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <img
                src="/assets/mend-fawn-music.png"
                alt=""
                style={{
                  width: 120,
                  height: 130,
                  objectFit: "contain",
                  animation: "bob 4.5s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: ".05em",
                  textTransform: "uppercase",
                  color: template.accent,
                }}
              >
                Чамд зориулсан аялгуу
              </span>
              <h2
                style={{
                  margin: "5px 0 16px",
                  fontSize: 20,
                  fontWeight: 1000,
                  color: template.text,
                }}
              >
                Happy birthday · lofi
              </h2>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 5,
                  height: 38,
                }}
              >
                {[0, 0.15, 0.3, 0.45, 0.6, 0.75].map((delay) => (
                  <span
                    key={delay}
                    style={{
                      width: 6,
                      height: "100%",
                      borderRadius: 99,
                      background: template.accent,
                      transformOrigin: "bottom",
                      animation: `pulseSoft 1s ease-in-out ${delay}s infinite`,
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  marginTop: 16,
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: template.accent,
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 10px 22px rgba(0,0,0,.16)",
                }}
              >
                <svg width={22} height={22} viewBox="0 0 24 24" fill="#fff">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Finale */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: opacity(4),
              transition: "opacity .8s cubic-bezier(.4,0,.2,1)",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                height: "100%",
                padding: "92px 22px 22px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <img
                src="/assets/mend-fawn-celebrate.png"
                alt=""
                style={{
                  width: 128,
                  height: 136,
                  objectFit: "contain",
                  animation: "bob 4.5s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: ".05em",
                  textTransform: "uppercase",
                  color: template.accent,
                }}
              >
                Төрсөн өдрийн мэнд
              </span>
              <h2
                style={{
                  margin: "8px 0 16px",
                  fontSize: 18,
                  lineHeight: 1.35,
                  fontWeight: 900,
                  color: template.text,
                }}
              >
                Хүлээж байсан бүх сайхан зүйл чинь энэ жил чамайг олоосой.
              </h2>
              <div
                style={{
                  display: "flex",
                  gap: 7,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {["💖 Хөөрхөн", "🎉 Surprise", "🥹 Сэтгэл"].map((label) => (
                  <span
                    key={label}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "7px 11px",
                      borderRadius: 99,
                      background: template.surface,
                      fontSize: 11,
                      fontWeight: 800,
                      color: template.text,
                      boxShadow: "0 6px 12px rgba(0,0,0,.05)",
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroSection({
  template,
  setTemplate,
  scene,
  setScene,
  countdown,
}: {
  template: LandingTemplate;
  setTemplate: (id: TemplateId) => void;
  scene: number;
  setScene: (i: number) => void;
  countdown: { dd: string; hh: string; mm: string; ss: string };
}) {
  return (
    <section
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "clamp(30px,5vw,66px) 22px clamp(36px,5vw,72px)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(332px, 1fr))",
          gap: "clamp(30px,4vw,58px)",
          alignItems: "center",
        }}
      >
        <div style={{ maxWidth: 610 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 14px",
              borderRadius: 999,
              background: "#fff",
              border: "1px solid #ece5f4",
              color: "#8069bd",
              fontSize: 13,
              fontWeight: 900,
              boxShadow: "0 8px 20px rgba(73,60,98,.06)",
              animation: "fadeUp .6s cubic-bezier(.16,1,.3,1) both",
            }}
          >
            <SparkleIcon /> Ганц линк · Мартагдашгүй мөч
          </span>
          <h1
            style={{
              margin: "16px 0 0",
              fontSize: "clamp(34px,5.1vw,60px)",
              lineHeight: 1.04,
              letterSpacing: "-.025em",
              fontWeight: 1000,
              color: "#3b3050",
              animation: "fadeUp .7s cubic-bezier(.16,1,.3,1) .07s both",
            }}
          >
            Хайртай хүндээ{" "}
            <em
              style={{
                fontStyle: "normal",
                background: "linear-gradient(105deg,#8069bd,#ed7569)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              сэтгэл хөдөлгөм
            </em>{" "}
            төрсөн өдрийн мэндчилгээ
          </h1>
          <p
            style={{
              margin: "20px 0 0",
              maxWidth: 520,
              fontSize: "clamp(16px,1.9vw,19px)",
              lineHeight: 1.6,
              color: "#6b6480",
              animation: "fadeUp .7s cubic-bezier(.16,1,.3,1) .15s both",
            }}
          >
            Загвараа сонго, зураг, дуу, захиагаа нэм.{" "}
            <strong style={{ color: "#493c62" }}>{PRICE}</strong> төлөөд дугтуй
            нээх мэт интерактив хуудсаа хормын дотор илгээ.
          </p>

          <div
            style={{
              margin: "26px 0 0",
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              animation: "fadeUp .7s cubic-bezier(.16,1,.3,1) .23s both",
            }}
          >
            <a
              href="/create"
              className="landing-hoverable"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                height: 56,
                padding: "0 26px",
                borderRadius: 16,
                background: "linear-gradient(135deg,#8069bd,#6d57ac)",
                color: "#fff",
                fontSize: 16,
                fontWeight: 900,
                boxShadow: "0 16px 34px rgba(128,105,189,.42)",
              }}
            >
              {PRICE}-өөр эхлэх
              <ArrowIcon size={19} />
            </a>
            <a
              href="#experience"
              className="landing-hoverable"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                height: 56,
                padding: "0 22px",
                borderRadius: 16,
                background: "#fff",
                color: "#493c62",
                fontSize: 16,
                fontWeight: 900,
                border: "1.5px solid #e6dff0",
                boxShadow: "0 8px 18px rgba(73,60,98,.06)",
              }}
            >
              <PlayIcon /> Яаж ажилладгийг үзэх
            </a>
          </div>
          <p
            style={{
              margin: "12px 0 0",
              fontSize: 12.5,
              color: "#948da0",
              fontWeight: 700,
              animation: "fadeUp .7s .3s both",
            }}
          >
            Загварлах, preview хийх үнэгүй · Зөвхөн нийтлэхэд төлнө
          </p>

          <div
            style={{
              margin: "26px 0 0",
              display: "flex",
              flexWrap: "wrap",
              gap: 18,
              animation: "fadeUp .7s .34s both",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "#5f5872",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              <ShieldIcon /> QPay найдвартай төлбөр
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "#5f5872",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              <SparkleIcon color="#c98a3a" /> Загварлах үнэгүй
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "#5f5872",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              <LinkIcon /> 1 төлбөр = 1 линк
            </span>
          </div>

          <div
            style={{
              margin: "28px 0 0",
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
              animation: "fadeUp .7s .4s both",
            }}
          >
            <div style={{ display: "flex" }}>
              {[
                "linear-gradient(135deg,#f1b4c6,#ed7569)",
                "linear-gradient(135deg,#b7a3e5,#8069bd)",
                "linear-gradient(135deg,#b9e7d0,#5aa889)",
                "linear-gradient(135deg,#ffe08a,#e6a935)",
              ].map((bg, i) => (
                <span
                  key={bg}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: bg,
                    border: "2.5px solid #f6f1ea",
                    marginLeft: i === 0 ? 0 : -12,
                  }}
                />
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span
                style={{ display: "inline-flex", gap: 2, color: "#f5b301" }}
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon key={i} />
                ))}
              </span>
              <span
                style={{
                  fontSize: 12.5,
                  color: "#7b7483",
                  fontWeight: 800,
                }}
              >
                4.9 · 1,000+ мэндчилгээ илгээгдсэн
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            animation: "fadeUp .8s cubic-bezier(.16,1,.3,1) .2s both",
          }}
        >
          <DeviceMockup template={template} scene={scene} countdown={countdown} />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                justifyContent: "center",
              }}
            >
              {sceneMeta.map((s, i) => {
                const active = i === scene;
                return (
                  <button
                    key={s.id}
                    type="button"
                    title={s.label}
                    aria-label={s.label}
                    onClick={() => setScene(i)}
                    style={{
                      height: 8,
                      width: active ? 24 : 8,
                      borderRadius: 99,
                      background: active ? "#8069bd" : "#d9cfe8",
                      border: "none",
                      cursor: "pointer",
                      transition: ".3s",
                      padding: 0,
                    }}
                  />
                );
              })}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                flexWrap: "wrap",
                justifyContent: "center",
                maxWidth: 300,
              }}
            >
              {templates.map((t) => {
                const on = t.id === template.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    title={t.name}
                    aria-label={t.name}
                    onClick={() => setTemplate(t.id)}
                    style={{
                      width: on ? 36 : 30,
                      height: on ? 36 : 30,
                      borderRadius: "50%",
                      background: t.background,
                      border: `2px solid ${t.accent}`,
                      boxShadow: on
                        ? "0 0 0 3px #fff, 0 8px 16px rgba(73,60,98,.28)"
                        : "0 4px 10px rgba(73,60,98,.16)",
                      cursor: "pointer",
                      transition: ".2s",
                      opacity: on ? 1 : 0.85,
                      transform: on ? "translateY(-1px)" : "none",
                      padding: 0,
                    }}
                  />
                );
              })}
            </div>
            <span
              style={{
                fontSize: 12,
                color: "#948da0",
                fontWeight: 700,
              }}
            >
              Загвар солиод preview-г шууд хараарай
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  return (
    <section
      data-reveal
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "8px 22px 12px",
        opacity: 0,
        transform: "translateY(28px)",
        transition:
          "opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
          flexWrap: "wrap",
          padding: "18px 24px",
          background: "rgba(255,255,255,.6)",
          border: "1px solid #ece5f4",
          borderRadius: 20,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 12.5,
            fontWeight: 900,
            color: "#948da0",
            textTransform: "uppercase",
            letterSpacing: ".05em",
          }}
        >
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8069bd"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          Найдвартай төлбөр
        </span>
        {["Хаан банк", "Худалдаа хөгжлийн банк", "Голомт", "Төрийн банк"].map(
          (bank) => (
            <span
              key={bank}
              style={{
                color: "#493c62",
                fontWeight: 900,
                fontSize: 15,
              }}
            >
              {bank}
            </span>
          ),
        )}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "#493c62",
            fontWeight: 900,
            fontSize: 15,
          }}
        >
          <QPayIcon size={16} />
          QPay
        </span>
      </div>
    </section>
  );
}

function ExperienceSection() {
  const items = [
    {
      icon: (
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 46,
            height: 46,
            borderRadius: 14,
            background: "#efe9fa",
            color: "#8069bd",
          }}
        >
          <svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <path d="M3 7l9 6 9-6" />
          </svg>
        </span>
      ),
      title: "Дугтуй нээх",
      desc: "Хайртай хүн чинь нэрлэсэн дугтуйгаа нээж түүхээ эхлүүлнэ.",
    },
    {
      icon: (
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 46,
            height: 46,
            borderRadius: 14,
            background: "#fdeede",
            color: "#c98a3a",
          }}
        >
          <svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </span>
      ),
      title: "Countdown",
      desc: "Төрсөн өдөр хүртэл тоолуур — хүлээлт, баярын мэдрэмжийг нэмнэ.",
    },
    {
      icon: (
        <img
          src="/assets/mend-fawn-camera.png"
          alt=""
          style={{
            width: 52,
            height: 56,
            objectFit: "contain",
            margin: "-4px 0 -2px",
          }}
        />
      ),
      title: "Дурсамжийн албом",
      desc: "30 хүртэл зурган scrapbook — хамгийн сайхан мөчүүд нэг дор.",
    },
    {
      icon: (
        <img
          src="/assets/mend-fawn-letter.png"
          alt=""
          style={{
            width: 52,
            height: 56,
            objectFit: "contain",
            margin: "-4px 0 -2px",
          }}
        />
      ),
      title: "Захидал",
      desc: "Сэтгэлийн үг, ерөөл — гараар бичсэн мэт дулаан захидал.",
    },
    {
      icon: (
        <img
          src="/assets/mend-fawn-music.png"
          alt=""
          style={{
            width: 52,
            height: 56,
            objectFit: "contain",
            margin: "-4px 0 -2px",
          }}
        />
      ),
      title: "Аялгуу",
      desc: "YouTube-ээс хайж эсвэл өөрийн дуугаа нэмээд түүхэнд аялгуу өг.",
    },
    {
      icon: (
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 46,
            height: 46,
            borderRadius: 14,
            background: "#fbe4ec",
            color: "#d16590",
          }}
        >
          <svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.65-7 10-7 10z" />
          </svg>
        </span>
      ),
      title: "Reaction + Guestbook",
      desc: "Хүлээн авагч reaction илгээж, guestbook-т мэндчилгээ үлдээнэ.",
    },
  ];
  return (
    <section
      id="experience"
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "clamp(48px,7vw,90px) 22px 20px",
      }}
    >
      <div
        data-reveal
        style={{
          textAlign: "center",
          maxWidth: 640,
          margin: "0 auto 44px",
          opacity: 0,
          transform: "translateY(28px)",
          transition:
            "opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1)",
        }}
      >
        <Chip>Хүлээн авагчийн туршлага</Chip>
        <h2
          style={{
            margin: "16px 0 0",
            fontSize: "clamp(28px,4vw,44px)",
            fontWeight: 1000,
            letterSpacing: "-.02em",
            lineHeight: 1.08,
            color: "#3b3050",
          }}
        >
          Дугтуй нээхээс сүүлчийн гэнэтийн бэлэг хүртэл
        </h2>
        <p
          style={{
            margin: "14px 0 0",
            fontSize: 17,
            lineHeight: 1.6,
            color: "#6b6480",
          }}
        >
          Энгийн зураг биш — нэг нэгээр нь нээгддэг, дуутай, хөдөлгөөнтэй богино
          түүх. Хайртай хүн чинь эхнээс нь дуустал нь мэдэрнэ.
        </p>
      </div>
      <div
        data-reveal
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          opacity: 0,
          transform: "translateY(28px)",
          transition:
            "opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1)",
        }}
      >
        {items.map((item) => (
          <div
            key={item.title}
            style={{
              background: "#fffef9",
              border: "1px solid #efeaf4",
              borderRadius: 20,
              padding: 22,
              boxShadow: "0 12px 30px rgba(73,60,98,.07)",
            }}
          >
            {item.icon}
            <strong
              style={{
                display: "block",
                margin: "14px 0 5px",
                fontSize: 17,
                color: "#493c62",
              }}
            >
              {item.title}
            </strong>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.55,
                color: "#7b7483",
              }}
            >
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowSection() {
  const steps = [
    {
      n: "01",
      title: "Загвар сонго",
      desc: "8 mood-оос хүндээ тохирохыг нь сонгож preview хий.",
      highlight: false,
    },
    {
      n: "02",
      title: "Мэдээллээ нэм",
      desc: "Нэр, огноо, зураг (30 хүртэл), дуу, зурвасаа бөглө.",
      highlight: false,
    },
    {
      n: "03",
      title: "QPay-ээр төл",
      desc: `${PRICE} — QR уншуулж эсвэл банкны аппаар хормын дотор.`,
      highlight: false,
    },
    {
      n: "04",
      title: "Линкээ илгээ",
      desc: "Нэг удаагийн BDY кодоор publish хийж линкээ хуваалц.",
      highlight: true,
    },
  ];
  return (
    <section
      id="how"
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "clamp(44px,6vw,80px) 22px 20px",
      }}
    >
      <div
        data-reveal
        style={{
          textAlign: "center",
          margin: "0 auto 40px",
          opacity: 0,
          transform: "translateY(28px)",
          transition:
            "opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1)",
        }}
      >
        <Chip>Хэрхэн ажилладаг вэ</Chip>
        <h2
          style={{
            margin: "16px 0 0",
            fontSize: "clamp(28px,4vw,44px)",
            fontWeight: 1000,
            letterSpacing: "-.02em",
            color: "#3b3050",
          }}
        >
          4 алхмаар бэлэн
        </h2>
      </div>
      <div
        data-reveal
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: 16,
          opacity: 0,
          transform: "translateY(28px)",
          transition:
            "opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1)",
        }}
      >
        {steps.map((s) => (
          <div
            key={s.n}
            style={{
              position: "relative",
              background: s.highlight
                ? "linear-gradient(160deg,#f3edfb,#efe7fa)"
                : "linear-gradient(160deg,#fffef9,#f7f2fb)",
              border: s.highlight ? "1px solid #e3d9f3" : "1px solid #efeaf4",
              borderRadius: 20,
              padding: "24px 20px",
            }}
          >
            <span
              style={{
                fontFamily: CAVEAT_STACK,
                fontSize: 44,
                fontWeight: 700,
                color: s.highlight ? "#a98fd8" : "#cbbde8",
                lineHeight: 1,
              }}
            >
              {s.n}
            </span>
            <strong
              style={{
                display: "block",
                margin: "6px 0 6px",
                fontSize: 18,
                color: "#493c62",
              }}
            >
              {s.title}
            </strong>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.55,
                color: "#7b7483",
              }}
            >
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TemplatesGallery() {
  return (
    <section
      id="templates"
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "clamp(44px,6vw,84px) 22px 20px",
      }}
    >
      <div
        data-reveal
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
          marginBottom: 32,
          opacity: 0,
          transform: "translateY(28px)",
          transition:
            "opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1)",
        }}
      >
        <div>
          <Chip>8 загвар</Chip>
          <h2
            style={{
              margin: "15px 0 0",
              fontSize: "clamp(28px,4vw,44px)",
              fontWeight: 1000,
              letterSpacing: "-.02em",
              color: "#3b3050",
            }}
          >
            8 mood, 8 өнгө
          </h2>
          <p
            style={{
              margin: "12px 0 0",
              maxWidth: 480,
              fontSize: 16,
              lineHeight: 1.55,
              color: "#6b6480",
            }}
          >
            Загвар бүр өөрийн өнгө, typography, mascot pose-той. Дарж шууд
            ашиглаж эхэл.
          </p>
        </div>
        <a
          href="/create"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "#8069bd",
            fontWeight: 900,
            fontSize: 15,
          }}
        >
          Бүх загвар
          <ArrowIcon size={17} />
        </a>
      </div>
      <div
        data-reveal
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(255px, 1fr))",
          gap: 18,
          opacity: 0,
          transform: "translateY(28px)",
          transition:
            "opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1)",
        }}
      >
        {templates.map((t) => (
          <a
            key={t.id}
            href={`/create?template=${t.id}`}
            className="landing-tmpl-card"
            style={{
              display: "flex",
              flexDirection: "column",
              background: "#fffef9",
              borderRadius: 22,
              overflow: "hidden",
              border: "1px solid #efeaf4",
              boxShadow: "0 14px 34px rgba(73,60,98,.08)",
            }}
          >
            <div
              style={{
                position: "relative",
                height: 158,
                overflow: "hidden",
                background: t.background,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 15,
                  left: 18,
                  fontFamily: CAVEAT_STACK,
                  fontSize: 21,
                  fontWeight: 700,
                  color: t.accent,
                }}
              >
                happy birthday
              </span>
              <span
                style={{
                  position: "absolute",
                  top: 47,
                  left: 18,
                  width: "58%",
                  height: 10,
                  borderRadius: 6,
                  background: t.accent,
                  opacity: 0.9,
                }}
              />
              <span
                style={{
                  position: "absolute",
                  top: 64,
                  left: 18,
                  width: "38%",
                  height: 8,
                  borderRadius: 6,
                  background: t.accent,
                  opacity: 0.4,
                }}
              />
              <img
                src={t.mascot}
                alt=""
                style={{
                  position: "absolute",
                  right: 6,
                  bottom: -10,
                  width: 104,
                  height: 114,
                  objectFit: "contain",
                }}
              />
            </div>
            <div style={{ padding: "15px 17px 17px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <strong style={{ color: "#493c62", fontSize: 17 }}>
                  {t.name}
                </strong>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: ".04em",
                    color: t.accent,
                    background: t.background,
                    padding: "3px 9px",
                    borderRadius: 99,
                  }}
                >
                  {t.moodLabel}
                </span>
              </div>
              <p
                style={{
                  margin: "7px 0 13px",
                  color: "#7b7483",
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                {t.desc}
              </p>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: "#8069bd",
                  fontWeight: 900,
                  fontSize: 13.5,
                }}
              >
                Ашиглах
                <ArrowIcon size={15} />
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function PriceSection() {
  const features = [
    "8 загварын аль нэгийг ашиглах",
    "30 хүртэл зураг + YouTube/MP3 дуу",
    "Countdown, дурсамж, захидал, аялгуу",
    "Reaction, guestbook, dashboard",
    "Public линк үүрд идэвхтэй",
  ];
  return (
    <section
      id="price"
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "clamp(44px,6vw,84px) 22px 20px",
      }}
    >
      <div
        data-reveal
        style={{
          position: "relative",
          background: "linear-gradient(155deg,#fffef9,#f6f0fc)",
          border: "1px solid #ece3f6",
          borderRadius: 30,
          padding: "clamp(28px,4vw,48px)",
          boxShadow: "0 30px 70px rgba(73,60,98,.13)",
          overflow: "hidden",
          opacity: 0,
          transform: "translateY(28px)",
          transition:
            "opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -30,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "radial-gradient(circle,#e7d9fb,transparent 68%)",
            opacity: 0.7,
          }}
        />
        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 34,
            alignItems: "center",
          }}
        >
          <div>
            <Chip
              style={{
                background: "linear-gradient(135deg,#ffe4a3,#ffc978)",
                border: "none",
                color: "#5a3d0f",
              }}
            >
              🎉 {PROMO_NOTE}
            </Chip>
            <div
              style={{
                margin: "18px 0 4px",
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: "clamp(20px,3vw,26px)",
                  fontWeight: 700,
                  color: "#a89fb8",
                  textDecoration: "line-through",
                  textDecorationThickness: 2,
                }}
              >
                {ORIGINAL_PRICE}
              </span>
              <strong
                style={{
                  fontSize: "clamp(48px,8vw,66px)",
                  fontWeight: 1000,
                  letterSpacing: "-.03em",
                  color: "#3b3050",
                  lineHeight: 1,
                }}
              >
                {PRICE}
              </strong>
              <span
                style={{ fontSize: 15, fontWeight: 800, color: "#948da0" }}
              >
                / 1 линк
              </span>
            </div>
            <p
              style={{
                margin: "6px 0 22px",
                fontSize: 15.5,
                lineHeight: 1.55,
                color: "#6b6480",
              }}
            >
              Нэг төлбөр = нэг мэндчилгээний линк. QPay callback ирэхэд нэг
              удаагийн{" "}
              <strong style={{ color: "#493c62" }}>BDY-XXXXXX</strong> код
              автоматаар үүснэ.
            </p>
            <a
              href="/create"
              className="landing-hoverable"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                width: "100%",
                height: 58,
                borderRadius: 16,
                background: "linear-gradient(135deg,#8069bd,#6d57ac)",
                color: "#fff",
                fontSize: 17,
                fontWeight: 900,
                boxShadow: "0 16px 34px rgba(128,105,189,.42)",
              }}
            >
              <QPayIcon size={20} />
              {PRICE}-өөр эхлэх
            </a>
            <div
              style={{
                marginTop: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#948da0",
                }}
              >
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#7c9b6f"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                SSL шифрлэлт
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#948da0",
                }}
              >
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8069bd"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Powered by QPay
              </span>
            </div>
          </div>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 13,
            }}
          >
            {features.map((f) => (
              <li
                key={f}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 11,
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#493c62",
                }}
              >
                <CheckIcon />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function StatsAndTestimonials() {
  const stats = [
    { value: "1,000+", label: "Илгээсэн мэндчилгээ", color: "#8069bd" },
    { value: "4.9★", label: "Дундаж үнэлгээ", color: "#ed7569" },
    { value: "8", label: "Бэлэн загвар", color: "#5aa889" },
    { value: "2 мин", label: "Дунджаар үүсгэдэг", color: "#c98a3a" },
  ];
  const testimonials = [
    {
      quote:
        "Эгчийнхээ төрсөн өдөрт хийж өгсөн. Дугтуйгаа нээгээд л уйлчихсан. Ердийн мессежээс тэс өөр мэдрэмж.",
      name: "Энхжин",
      city: "Улаанбаатар",
      avatar: "linear-gradient(135deg,#b7a3e5,#8069bd)",
      initial: "Э",
    },
    {
      quote:
        "Хоёр минутад бэлэн болсон. Зураг, дуугаа нэмээд QPay-ээр төлөөд л шууд линк гарч ирсэн. Маш амар.",
      name: "Тэмүүлэн",
      city: "Дархан",
      avatar: "linear-gradient(135deg,#f1b4c6,#ed7569)",
      initial: "Т",
    },
    {
      quote:
        "Найз маань хэдэн удаа дахин нээж үзсэн гэсэн. Dashboard дээр reaction, мэндчилгээ нь ирээд байхаар нь өөрөө ч баярласан.",
      name: "Сараа",
      city: "Эрдэнэт",
      avatar: "linear-gradient(135deg,#b9e7d0,#5aa889)",
      initial: "С",
    },
  ];
  return (
    <section
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "clamp(30px,4vw,50px) 22px 20px",
      }}
    >
      <div
        data-reveal
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 14,
          marginBottom: 30,
          opacity: 0,
          transform: "translateY(28px)",
          transition:
            "opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1)",
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              textAlign: "center",
              padding: 20,
              background: "#fffef9",
              border: "1px solid #efeaf4",
              borderRadius: 18,
            }}
          >
            <strong
              style={{
                display: "block",
                fontSize: 34,
                fontWeight: 1000,
                color: s.color,
                lineHeight: 1,
              }}
            >
              {s.value}
            </strong>
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#7b7483",
              }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
      <div
        data-reveal
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
          gap: 16,
          opacity: 0,
          transform: "translateY(28px)",
          transition:
            "opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1)",
        }}
      >
        {testimonials.map((t) => (
          <figure
            key={t.name}
            style={{
              margin: 0,
              background: "#fffef9",
              border: "1px solid #efeaf4",
              borderRadius: 20,
              padding: 24,
              boxShadow: "0 12px 30px rgba(73,60,98,.06)",
            }}
          >
            <span
              style={{ display: "inline-flex", gap: 2, color: "#f5b301" }}
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon key={i} />
              ))}
            </span>
            <blockquote
              style={{
                margin: "12px 0 16px",
                fontSize: 15,
                lineHeight: 1.6,
                color: "#493c62",
                fontWeight: 600,
              }}
            >
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <figcaption
              style={{ display: "flex", alignItems: "center", gap: 11 }}
            >
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: t.avatar,
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 900,
                }}
              >
                {t.initial}
              </span>
              <span style={{ display: "flex", flexDirection: "column" }}>
                <strong style={{ fontSize: 14, color: "#493c62" }}>
                  {t.name}
                </strong>
                <small style={{ fontSize: 12, color: "#948da0" }}>
                  {t.city}
                </small>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function FAQSection({
  openIndex,
  onToggle,
}: {
  openIndex: number;
  onToggle: (i: number) => void;
}) {
  return (
    <section
      id="faq"
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "clamp(44px,6vw,80px) 22px 20px",
      }}
    >
      <div
        data-reveal
        style={{
          textAlign: "center",
          margin: "0 auto 32px",
          opacity: 0,
          transform: "translateY(28px)",
          transition:
            "opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1)",
        }}
      >
        <Chip>Асуулт хариулт</Chip>
        <h2
          style={{
            margin: "15px 0 0",
            fontSize: "clamp(28px,4vw,42px)",
            fontWeight: 1000,
            letterSpacing: "-.02em",
            color: "#3b3050",
          }}
        >
          Түгээмэл асуултууд
        </h2>
      </div>
      <div
        data-reveal
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 11,
          opacity: 0,
          transform: "translateY(28px)",
          transition:
            "opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1)",
        }}
      >
        {faqs.map((f, i) => {
          const open = openIndex === i;
          return (
            <div
              key={f.q}
              style={{
                background: "#fffef9",
                border: "1px solid #efeaf4",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 6px 18px rgba(73,60,98,.05)",
              }}
            >
              <button
                type="button"
                onClick={() => onToggle(i)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                  padding: "18px 22px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "#493c62",
                  fontSize: 16,
                  fontWeight: 800,
                  fontFamily: "inherit",
                }}
              >
                <span>{f.q}</span>
                <svg
                  width={20}
                  height={20}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8069bd"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    flex: "0 0 20px",
                    transform: open ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform .3s",
                  }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <div
                style={{
                  overflow: "hidden",
                  maxHeight: open ? 320 : 0,
                  opacity: open ? 1 : 0,
                  transition: "max-height .35s ease, opacity .3s ease",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    padding: open ? "0 22px 20px" : "0 22px 0",
                    color: "#6f6879",
                    fontSize: 14.5,
                    lineHeight: 1.65,
                  }}
                >
                  {f.a}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ResumeSection() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setError("Email формат буруу байна.");
      return;
    }
    setError("");
    setNotice("");
    setSending(true);
    try {
      const response = await fetch("/api/draft/resume", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await response.json()) as {
        message?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Хүсэлт илгээж чадсангүй.");
      setNotice(
        data.message ||
          "Мэдээлэл таарсан бол ноорогийн холбоосыг email-р илгээнэ.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Алдаа гарлаа.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "clamp(30px,5vw,60px) 22px 10px",
      }}
    >
      <div
        style={{
          background: "#fffef9",
          border: "1px solid #efeaf4",
          borderRadius: 20,
          padding: "clamp(24px,4vw,36px)",
          textAlign: "center",
          boxShadow: "0 8px 24px rgba(73,60,98,.06)",
        }}
      >
        <h3
          style={{
            margin: "0 0 10px",
            fontSize: "clamp(20px,2.8vw,26px)",
            fontWeight: 900,
            color: "#3b3050",
            letterSpacing: "-.01em",
          }}
        >
          Ноорогоо буцаах
        </h3>
        <p
          style={{
            margin: "0 0 20px",
            fontSize: 15,
            color: "#6b6377",
            lineHeight: 1.5,
          }}
        >
          Өөр төхөөрөмжөөс эсвэл browser-оос эхэлж, дундаас нь болисон уу?
          Хадгалахдаа ашигласан email-ээ оруулбал үргэлжлүүлэх линкийг илгээнэ.
        </p>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: 420,
            margin: "0 auto",
          }}
        >
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            disabled={sending}
            style={{
              flex: "1 1 220px",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #d8d1e5",
              fontSize: 15,
              outline: "none",
              background: "#fff",
              color: "#3b3050",
            }}
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={sending || !email.trim()}
            style={{
              padding: "12px 20px",
              borderRadius: 12,
              border: "none",
              background: sending ? "#c9bde3" : "#8069bd",
              color: "#fff",
              fontWeight: 800,
              fontSize: 15,
              cursor: sending || !email.trim() ? "not-allowed" : "pointer",
              transition: "background .2s",
            }}
          >
            {sending ? "Илгээж байна..." : "Линк илгээх"}
          </button>
        </div>
        {notice && (
          <p
            style={{
              margin: "14px 0 0",
              fontSize: 14,
              color: "#3d8f6b",
              fontWeight: 700,
            }}
          >
            {notice}
          </p>
        )}
        {error && (
          <p
            style={{
              margin: "14px 0 0",
              fontSize: 14,
              color: "#c94a4a",
              fontWeight: 700,
            }}
          >
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

function CTABanner() {
  return (
    <section
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "clamp(30px,4vw,50px) 22px clamp(50px,7vw,90px)",
      }}
    >
      <div
        data-reveal
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 30,
          padding: "clamp(34px,5vw,60px)",
          background: "linear-gradient(130deg,#8069bd,#9d7ad0 45%,#ed7569)",
          boxShadow: "0 34px 70px rgba(128,105,189,.34)",
          opacity: 0,
          transform: "translateY(28px)",
          transition:
            "opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1)",
        }}
      >
        {[
          { top: 22, left: "8%", size: 22, delay: 0, dur: 3 },
          { bottom: 30, left: "18%", size: 16, delay: 0.5, dur: 3.6 },
          { top: "40%", right: "30%", size: 18, delay: 1, dur: 4 },
        ].map((s, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              top: s.top as number | string | undefined,
              bottom: s.bottom as number | string | undefined,
              left: s.left as number | string | undefined,
              right: s.right as number | string | undefined,
              color: "rgba(255,255,255,.55)",
              animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
            }}
          >
            <svg
              width={s.size}
              height={s.size}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6z" />
            </svg>
          </span>
        ))}
        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "clamp(28px,4.2vw,46px)",
                fontWeight: 1000,
                letterSpacing: "-.02em",
                lineHeight: 1.08,
                color: "#fff",
              }}
            >
              Өнөөдөр л хайртай хүнээ баярлуулаарай
            </h2>
            <p
              style={{
                margin: "14px 0 24px",
                fontSize: 17,
                lineHeight: 1.55,
                color: "rgba(255,255,255,.9)",
                maxWidth: 440,
              }}
            >
              Загварлах, preview хийх үнэгүй. Дуртай болсныхоо дараа л {PRICE}{" "}
              төлж линкээ идэвхжүүл.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <a
                href="/create"
                className="landing-hoverable"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  height: 56,
                  padding: "0 28px",
                  borderRadius: 16,
                  background: "#fff",
                  color: "#6d57ac",
                  fontSize: 16,
                  fontWeight: 900,
                  boxShadow: "0 16px 30px rgba(0,0,0,.18)",
                }}
              >
                Мэндчилгээ үүсгэх
                <ArrowIcon size={19} />
              </a>
              <a
                href="/dashboard"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  height: 56,
                  padding: "0 22px",
                  borderRadius: 16,
                  background: "rgba(255,255,255,.16)",
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 900,
                  border: "1px solid rgba(255,255,255,.35)",
                }}
              >
                Dashboard үзэх
              </a>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <img
              src="/assets/mend-fawn-cake.png"
              alt=""
              style={{
                width: "min(230px, 60vw)",
                filter: "drop-shadow(0 24px 30px rgba(0,0,0,.25))",
                animation: "bob 5s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "8px 22px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        borderTop: "1px solid rgba(73,60,98,.08)",
      }}
    >
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          color: "#493c62",
          fontWeight: 1000,
          fontSize: 21,
          letterSpacing: "-.02em",
          paddingTop: 28,
        }}
      >
        mend.
        <span
          style={{
            fontFamily: CAVEAT_STACK,
            fontSize: 15,
            fontWeight: 700,
            color: "#8069bd",
          }}
        >
          birthday card
        </span>
      </Link>
      <span
        style={{
          color: "#948da0",
          fontSize: 13,
          fontWeight: 700,
          paddingTop: 28,
        }}
      >
        © mend. · Ulaanbaatar ·{" "}
        <a href="mailto:hello@mend.gift" style={{ color: "#8069bd" }}>
          hello@mend.gift
        </a>
      </span>
    </footer>
  );
}

function MobileStickyBar() {
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 70,
        padding: "10px 16px calc(10px + env(safe-area-inset-bottom))",
        background: "rgba(255,254,249,.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid rgba(73,60,98,.1)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 -8px 24px rgba(73,60,98,.1)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        <strong style={{ fontSize: 19, fontWeight: 1000, color: "#493c62" }}>
          {PRICE}
        </strong>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#948da0" }}>
          1 төлбөр = 1 линк
        </span>
      </div>
      <a
        href="/create"
        style={{
          flex: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          height: 50,
          borderRadius: 14,
          background: "linear-gradient(135deg,#8069bd,#6d57ac)",
          color: "#fff",
          fontSize: 16,
          fontWeight: 900,
          boxShadow: "0 10px 22px rgba(128,105,189,.4)",
        }}
      >
        Эхлэх
        <ArrowIcon size={18} />
      </a>
    </div>
  );
}

export function LandingApp() {
  const [templateId, setTemplateId] = useState<TemplateId>("cute");
  const [scene, setSceneState] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);
  const { mounted, isMobile } = useIsMobile();
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const countdown = useCountdown(INITIAL_COUNTDOWN_MS);

  const template = useMemo(
    () => templates.find((t) => t.id === templateId) ?? templates[0],
    [templateId],
  );

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) return;
    const id = window.setInterval(() => {
      if (!pausedRef.current) {
        setSceneState((s) => (s + 1) % sceneMeta.length);
      }
    }, 4200);
    return () => window.clearInterval(id);
  }, []);

  useReveal(rootRef);

  const bumpPause = useCallback(() => {
    pausedRef.current = true;
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => {
      pausedRef.current = false;
    }, 9000);
  }, []);

  const setScene = useCallback(
    (i: number) => {
      setSceneState(i);
      bumpPause();
    },
    [bumpPause],
  );

  const setTemplate = useCallback((id: TemplateId) => {
    setTemplateId(id);
  }, []);

  const toggleFaq = useCallback((i: number) => {
    setOpenFaq((prev) => (prev === i ? -1 : i));
  }, []);

  return (
    <div className="landing-root">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <div
        ref={rootRef}
        style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -140,
              left: -110,
              width: 440,
              height: 440,
              borderRadius: "50%",
              background: "radial-gradient(circle,#cbb9f2,transparent 68%)",
              opacity: 0.5,
              animation: "floaty 9s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 300,
              right: -140,
              width: 400,
              height: 400,
              borderRadius: "50%",
              background: "radial-gradient(circle,#f7c3d3,transparent 68%)",
              opacity: 0.42,
              animation: "floaty 12s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -160,
              left: "32%",
              width: 480,
              height: 480,
              borderRadius: "50%",
              background: "radial-gradient(circle,#ffe6a0,transparent 70%)",
              opacity: 0.4,
              animation: "floaty 14s ease-in-out infinite",
            }}
          />
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <Header hideNav={mounted && isMobile} />
          <HeroSection
            template={template}
            setTemplate={setTemplate}
            scene={scene}
            setScene={setScene}
            countdown={countdown}
          />
          <TrustBar />
          <ExperienceSection />
          <HowSection />
          <TemplatesGallery />
          <PriceSection />
          <StatsAndTestimonials />
          <FAQSection openIndex={openFaq} onToggle={toggleFaq} />
          <ResumeSection />
          <CTABanner />
          <LandingFooter />
          {mounted && isMobile && <div style={{ height: 78 }} />}
        </div>
      </div>
      {mounted && isMobile && <MobileStickyBar />}
    </div>
  );
}
