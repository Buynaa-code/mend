"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";

/** Урилгын тогтмол мэдээлэл. */
const EVENT = {
  host: "Т. Ганхуяг",
  date: "2026.09.12",
  startsAt: "2026-09-12T09:00:00+08:00",
  place: "Увс, Улаангом, Түргэн сум, Хар усан",
  lat: 50.0576575,
  lng: 91.9674345,
} as const;

type IconName =
  | "calendar"
  | "clock"
  | "pin"
  | "user"
  | "phone"
  | "invite"
  | "program"
  | "check";

const iconPaths: Record<IconName, ReactNode> = {
  calendar: (
    <>
      <path d="M6 2v3M14 2v3M3 8h14" />
      <rect x="3" y="4" width="14" height="14" rx="2" />
      <path d="M7 12h2M11 12h2M7 15h2M11 15h2" />
    </>
  ),
  clock: (
    <>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6v4l3 2" />
    </>
  ),
  pin: (
    <>
      <path d="M10 18s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
      <circle cx="10" cy="8" r="2" />
    </>
  ),
  user: (
    <>
      <circle cx="10" cy="7" r="3" />
      <path d="M4 18c.4-4 2.4-6 6-6s5.6 2 6 6" />
    </>
  ),
  phone: (
    <path d="M6.1 2.8 8.5 6.5 6.8 8c1 2.4 2.8 4.2 5.2 5.2l1.5-1.7 3.7 2.4-.7 3c-.2.8-.9 1.3-1.7 1.2C8.1 17.3 2.7 11.9 1.9 5.2c-.1-.8.4-1.5 1.2-1.7l3-.7Z" />
  ),
  invite: (
    <>
      <path d="M3 7.5 10 3l7 4.5V17H3V7.5Z" />
      <path d="m3 8 7 5 7-5" />
    </>
  ),
  program: (
    <>
      <path d="M5 3v14M15 3v14M5 6h10M5 10h10M5 14h10" />
      <path d="M2.5 3h15" />
    </>
  ),
  check: <path d="m4 10 4 4 8-9" />,
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconPaths[name]}
    </svg>
  );
}

const navItems: { id: string; label: string; icon: IconName }[] = [
  { id: "invitation", label: "Урилга", icon: "invite" },
  { id: "program", label: "Хөтөлбөр", icon: "program" },
  { id: "location", label: "Хаяг", icon: "pin" },
  { id: "rsvp", label: "RSVP", icon: "check" },
  { id: "contact", label: "Холбоо", icon: "phone" },
];

function Ornament({ className = "" }: { className?: string }) {
  return (
    <div className={`ornament ${className}`} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

function Toono() {
  return (
    <div className="toono" aria-hidden="true">
      <div className="toono-ring">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="toono-crown">
        <b />
        <b />
        <b />
      </div>
    </div>
  );
}

export function UrilgaApp() {
  const [activeSection, setActiveSection] = useState("invitation");
  const [navVisible, setNavVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [left, setLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (top?.target.id) setActiveSection(top.target.id);
      },
      { rootMargin: "-28% 0px -56%", threshold: [0.05, 0.35] },
    );
    navItems.forEach(({ id }) => {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    });

    const onScroll = () =>
      setNavVisible(window.scrollY > window.innerHeight * 0.55);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const target = new Date(EVENT.startsAt).getTime();
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setLeft({
        days: Math.floor(diff / 86_400_000),
        hours: Math.floor((diff / 3_600_000) % 24),
        minutes: Math.floor((diff / 60_000) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  function goTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setActiveSection(id);
  }

  function saveToCalendar() {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "DTSTART:20260912T010000Z",
      "DTEND:20260912T040000Z",
      `SUMMARY:${EVENT.host}ийн Гэр бүрэх ёслол`,
      `LOCATION:${EVENT.place}`,
      "DESCRIPTION:Гэр бүрэх ёслолд хүрэлцэн ирэхийг урьж байна.",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ger-burekh-2026.ics";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="urilga-root">
      <main className="inv-shell">
        <div className="invitation-frame">
          <section className="cover" aria-labelledby="cover-title">
            <div className="reference-cover-label">
              <span>Т. ГАНХУЯГИЙН</span>
              <strong>Гэр бүрэх ёслол</strong>
            </div>
            <div className="light-rays" aria-hidden="true" />
            <div className="cover-grain" aria-hidden="true" />
            <div className="mountains mountain-back" aria-hidden="true" />
            <div className="mountains mountain-mid" aria-hidden="true" />
            <div className="mountains mountain-front" aria-hidden="true" />
            <div className="cover-topline">
              <span>МОНГОЛ ЁС · МӨНХ БЭЛГЭ</span>
              <span>2026</span>
            </div>
            <Toono />
            <div className="inv-cover-copy">
              <p className="eyebrow">ЭРХЭМ ХҮНДЭТ</p>
              <h1 id="cover-title" className="cover-title">
                <span>Гэр</span>
                <em>бүрэх</em>
              </h1>
              <p className="cover-person">{EVENT.host}</p>
            </div>
            <div className="cover-meta">
              <div>
                <Icon name="calendar" />
                <p>
                  <small>ЁСЛОЛЫН ӨДӨР</small>
                  <strong>{EVENT.date}</strong>
                </p>
              </div>
              <div>
                <Icon name="pin" />
                <p>
                  <small>ХААНА</small>
                  <strong>Увс · Улаангом · Түргэн сум · Хар усан</strong>
                </p>
              </div>
            </div>
            <Ornament className="cover-ornament" />
            <button
              className="scroll-cue"
              onClick={() => goTo("invitation")}
              aria-label="Урилгыг үргэлжлүүлэн үзэх"
            >
              <span>ДООШ ҮЗЭХ</span>
              <i />
            </button>
          </section>

          <section id="invitation" className="section invitation-section">
            <div className="corner-line top-left" aria-hidden="true" />
            <div className="section-heading">
              <span className="section-count">01</span>
              <h2>Урилга</h2>
              <div className="flourish">
                <i />
                <b>ᠮ</b>
                <i />
              </div>
            </div>
            <div className="invitation-letter">
              <p className="salutation">Эрхэм хүндэт</p>
              <div className="fine-divider">
                <span />
              </div>
              <p className="body-copy">
                Таныг гэр бүлийн хамт хүү <strong>Т. Ганхуягийн</strong>
                <br />
                Дээдсээс өвлөгдсөн цагаан өргөө
                <br />
                Дэвжин дээшлэх туурга гэрийн
                <br />
                <strong>“Гэр бүрэх”</strong> ёслолд ерөөл бэлгэдлээ
                <br />
                <span className="invitation-phrase">
                  өргөн хүрэлцэн ирэхийг
                </span>
                <br />
                <span>урьж байна.</span>
              </p>
              <div className="hosts">
                <p>Хүндэтгэсэн:</p>
                <strong className="host-row">
                  <span>Аав Д. Төгсбаяр</span>
                  <a className="host-phone" href="tel:+97689454968">
                    /89454968/
                  </a>
                </strong>
                <strong className="host-row">
                  <span>Ээж О. Энхжаргал</span>
                  <a className="host-phone" href="tel:+97699454968">
                    /99454968/
                  </a>
                </strong>
              </div>
            </div>
            <div className="invitation-meta">
              <span>
                <Icon name="calendar" />
                {EVENT.date} · Бямба
              </span>
              <span>
                <Icon name="pin" />
                {EVENT.place}
              </span>
            </div>
            <Ornament className="invitation-ornament" />
          </section>

          <section id="program" className="section event-section">
            <div className="section-heading compact">
              <span className="section-count">02</span>
              <p>ЁСЛОЛЫН ТОВ</p>
              <h2>Өдөр · Цаг · Газар</h2>
              <div className="flourish">
                <i />
                <b>ᠮ</b>
                <i />
              </div>
            </div>
            <div className="event-grid">
              <article className="event-card date-card">
                <span className="card-icon">
                  <Icon name="calendar" size={22} />
                </span>
                <p>ЕСДҮГЭЭР САР</p>
                <div className="big-date">12</div>
                <strong>2026 · БЯМБА</strong>
              </article>
              <article className="event-card time-card">
                <span className="card-icon">
                  <Icon name="clock" size={22} />
                </span>
                <p>ЭХЛЭХ ЦАГ</p>
                <div className="big-time">09:00</div>
                <strong>ӨГЛӨӨНИЙ ЦАГ</strong>
              </article>
              <article className="event-card location-card">
                <span className="card-icon">
                  <Icon name="pin" size={22} />
                </span>
                <div>
                  <p>ЁСЛОЛЫН ГАЗАР</p>
                  <strong>
                    Увс, Улаангом
                    <br />
                    Түргэн сум, Хар усан
                  </strong>
                </div>
                <button
                  onClick={() => goTo("location")}
                  aria-label="Хаягийн хэсэг рүү очих"
                >
                  →
                </button>
              </article>
            </div>
            <div className="countdown-card" aria-live="polite">
              <p>ЁСЛОЛ ЭХЛЭХЭД</p>
              <div className="inv-countdown-grid">
                <span>
                  <strong>{left.days}</strong>
                  <small>Өдөр</small>
                </span>
                <i>:</i>
                <span>
                  <strong>{String(left.hours).padStart(2, "0")}</strong>
                  <small>Цаг</small>
                </span>
                <i>:</i>
                <span>
                  <strong>{String(left.minutes).padStart(2, "0")}</strong>
                  <small>Минут</small>
                </span>
                <i>:</i>
                <span>
                  <strong>{String(left.seconds).padStart(2, "0")}</strong>
                  <small>Секунд</small>
                </span>
              </div>
            </div>
            <button className="inv-primary-button" onClick={saveToCalendar}>
              <Icon name="calendar" /> Календарьт хадгалах
            </button>
            <p className="button-note">
              Ёслолын товыг утасныхаа календарьт нэмээрэй
            </p>
          </section>

          <section id="location" className="section location-section">
            <div className="location-intro">
              <span className="section-count light">03</span>
              <p>ХҮРЭЛЦЭН ИРЭХ ГАЗАР</p>
              <h2>
                Увс, Улаангом
                <br />
                <em>Түргэн сум, Хар усан</em>
              </h2>
            </div>
            <div className="map-card">
              <div className="map-grid" aria-hidden="true">
                <i className="road road-a" />
                <i className="road road-b" />
                <i className="road road-c" />
                <span className="lake">УВС НУУР</span>
                <div className="map-pin">
                  <Icon name="pin" size={24} />
                  <b>Хар усан</b>
                </div>
              </div>
              <div className="map-footer">
                <div>
                  <span>ХАЯГ</span>
                  <strong>
                    Увс, Улаангом
                    <br />
                    Түргэн сум, Хар усан
                  </strong>
                  <small className="coordinates">
                    {EVENT.lat} · {EVENT.lng}
                  </small>
                </div>
                <a
                  className="map-button"
                  href={`https://www.google.com/maps?q=${EVENT.lat},${EVENT.lng}&entry=gps`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Газрын зураг харах <span>↗</span>
                </a>
              </div>
            </div>
            <p className="distance-note">
              <span>✦</span> Зам тань өлзийтэй, мөр тань дардан байх болтугай{" "}
              <span>✦</span>
            </p>
          </section>

          <section id="rsvp" className="section rsvp-section">
            <div className="rsvp-pattern" aria-hidden="true" />
            <div className="section-heading compact">
              <span className="section-count">04</span>
              <p>ХҮРЭЛЦЭН ИРЭХ ЭСЭХ</p>
              <h2>Хариу мэдэгдэх</h2>
              <div className="flourish">
                <i />
                <b>ᠮ</b>
                <i />
              </div>
            </div>
            <p className="rsvp-lead">
              Таны хариу бидний бэлтгэлийг илүү сайхан болгоно.
            </p>
            {submitted ? (
              <div className="success-card" role="status">
                <div className="success-mark">
                  <Icon name="check" size={30} />
                </div>
                <p>Хариу илгээгдлээ</p>
                <h3>Баярлалаа{guestName ? `, ${guestName}` : ""}.</h3>
                <span>Ерөөл бэлгэдлээ өргөн хүрэлцэн ирэхийг хүлээж байна.</span>
                <button onClick={() => setSubmitted(false)}>
                  Хариугаа өөрчлөх
                </button>
              </div>
            ) : (
              <form className="rsvp-form" onSubmit={handleSubmit}>
                <label className="input-label" htmlFor="guest-name">
                  Таны нэр
                </label>
                <div className="input-wrap">
                  <Icon name="user" />
                  <input
                    id="guest-name"
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                    placeholder="Нэрээ бичнэ үү"
                    required
                  />
                </div>
                <fieldset>
                  <legend>Та хүрэлцэн ирэх үү?</legend>
                  <label>
                    <input
                      type="radio"
                      name="attendance"
                      value="yes"
                      defaultChecked
                    />
                    <span>
                      <i />
                      <b>Тийм, очно</b>
                      <small>Ганцаараа хүрэлцэн ирнэ</small>
                    </span>
                  </label>
                  <label>
                    <input type="radio" name="attendance" value="family" />
                    <span>
                      <i />
                      <b>Гэр бүлээрээ очно</b>
                      <small>Гэр бүлийн хамт хүрэлцэн ирнэ</small>
                    </span>
                  </label>
                  <label>
                    <input type="radio" name="attendance" value="no" />
                    <span>
                      <i />
                      <b>Очиж чадахгүй</b>
                      <small>Сэтгэлээрээ хамт байх болно</small>
                    </span>
                  </label>
                </fieldset>
                <button
                  className="inv-primary-button submit-button"
                  type="submit"
                >
                  Хариу илгээх <span>→</span>
                </button>
              </form>
            )}
          </section>

          <section id="contact" className="section contact-section">
            <Ornament className="contact-ornament" />
            <div className="contact-symbol">
              <Toono />
            </div>
            <p className="contact-kicker">ХОЛБОО БАРИХ</p>
            <h2>Хүндэтгэсэн</h2>
            <div className="contacts">
              <a href="tel:+97689454968">
                <span className="avatar">ДТ</span>
                <span>
                  <small>ААВ</small>
                  <strong>Д. Төгсбаяр</strong>
                  <em className="host-phone">89454968</em>
                </span>
                <i>
                  <Icon name="phone" />
                </i>
              </a>
              <a href="tel:+97699454968">
                <span className="avatar">ОЭ</span>
                <span>
                  <small>ЭЭЖ</small>
                  <strong>О. Энхжаргал</strong>
                  <em className="host-phone">99454968</em>
                </span>
                <i>
                  <Icon name="phone" />
                </i>
              </a>
            </div>
            <div className="closing">
              <span>✦</span>
              <p>
                Таныг хүндэтгэсэн
                <br />
                <strong>{EVENT.host}</strong>
              </p>
              <span>✦</span>
            </div>
            <p className="footer-date">2026 · УВС · УЛААНГОМ · ТҮРГЭН СУМ</p>
          </section>

          <nav
            className={`bottom-nav ${navVisible ? "visible" : ""}`}
            aria-label="Үндсэн цэс"
          >
            {navItems.map((item) => (
              <button
                key={item.id}
                className={activeSection === item.id ? "active" : ""}
                onClick={() => goTo(item.id)}
                aria-current={activeSection === item.id ? "page" : undefined}
              >
                <span>
                  <Icon name={item.icon} size={19} />
                </span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </main>
    </div>
  );
}
