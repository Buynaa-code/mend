"use client";

/* eslint-disable @next/next/no-img-element */

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Gift,
  LoaderCircle,
  QrCode,
  RefreshCw,
  ShieldCheck,
  TicketCheck,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "./BirthdayApp";
import { StoryShareButton } from "./StoryShareButton";

type Deeplink = {
  name: string;
  description: string;
  logo: string;
  link: string;
};

type Publication = {
  id: string;
  publicSlug: string;
  recipientName: string;
  recipientGender: "female" | "male";
  ownerToken: string;
};

type PaymentView = {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status:
    | "requires_action"
    | "processing"
    | "succeeded"
    | "failed"
    | "canceled"
    | "expired";
  qrText: string;
  qrImage: string;
  shortUrl: string;
  deeplinks: Deeplink[];
  failureReason: string;
  expiresAt: string;
  accessCode: string;
  codeStatus: string;
  publication: Publication | null;
};

type OwnerEntry = {
  id: string;
  token: string;
  slug: string;
  recipientName: string;
};

const ownerKey = "mend-owner-tokens-v2";

function saveOwner(publication: Publication) {
  try {
    const current = JSON.parse(
      window.localStorage.getItem(ownerKey) || "[]",
    ) as OwnerEntry[];
    const filtered = Array.isArray(current)
      ? current.filter((item) => item.id !== publication.id)
      : [];
    filtered.unshift({
      id: publication.id,
      token: publication.ownerToken,
      slug: publication.publicSlug,
      recipientName: publication.recipientName,
    });
    window.localStorage.setItem(ownerKey, JSON.stringify(filtered.slice(0, 30)));
    window.localStorage.removeItem("mend-create-draft-v2");
  } catch {
    // The published link remains available even if local storage is blocked.
  }
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("mn-MN").format(amount);
}

/**
 * Social in-app browsers sandbox custom URL schemes, so a bank deeplink tapped
 * inside Messenger or Instagram often opens nothing. Detect them so the page can
 * offer a hand-off to the real browser before the buyer gets stuck.
 */
function detectInAppBrowser() {
  const userAgent = navigator.userAgent || "";
  if (!/FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger|Orca-Android/i.test(userAgent)) {
    return null;
  }
  const appName = /Instagram/i.test(userAgent)
    ? "Instagram"
    : /Messenger|Orca-Android|FBIOS|FBAN|FBAV|FB_IAB/i.test(userAgent)
      ? "Messenger"
      : "Facebook";
  const isIos = /iPhone|iPad|iPod/i.test(userAgent);
  const { host, pathname, search } = window.location;
  const target = `${host}${pathname}${search}`;
  // Android honours an intent:// hand-off reliably. iOS has no equivalent that
  // Meta has not closed off, so x-safari-https:// is worth attempting but the
  // ••• menu stays the instruction we actually tell people to follow.
  const externalUrl = isIos
    ? `x-safari-https://${target}`
    : `intent://${target}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
  return { appName, externalUrl, isIos };
}

function paymentCredential(paymentId: string): Record<string, string> {
  const recovery = window.sessionStorage.getItem(
    `mend-recovery-v1:${paymentId}`,
  );
  if (recovery) return { "x-recovery-token": recovery };
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(`mend-payment-v1:${paymentId}`) || "{}",
    ) as { clientSecret?: string };
    if (stored.clientSecret) {
      return { "x-payment-secret": stored.clientSecret };
    }
  } catch {
    return {};
  }
  return {};
}

export function PaymentApp() {
  const [paymentId, setPaymentId] = useState("");
  const [payment, setPayment] = useState<PaymentView | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [inAppBrowser, setInAppBrowser] = useState<{
    appName: string;
    externalUrl: string;
    isIos: boolean;
  } | null>(null);
  const [payLinkCopied, setPayLinkCopied] = useState(false);
  const [orderIdCopied, setOrderIdCopied] = useState(false);
  const [showAllBanks, setShowAllBanks] = useState(false);
  const publishLock = useRef(false);

  const publishGreeting = useCallback(async (id: string) => {
    if (publishLock.current) return;
    publishLock.current = true;
    setPublishing(true);
    setError("");
    try {
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...paymentCredential(id),
        },
        body: JSON.stringify({ paymentId: id }),
      });
      const result = (await response.json()) as Publication & {
        error?: string;
      };
      if (
        !response.ok ||
        !result.id ||
        !result.publicSlug ||
        !result.ownerToken
      ) {
        throw new Error(result.error || "Мэндчилгээ нийтэлж чадсангүй.");
      }
      saveOwner(result);
      setPayment((current) =>
        current ? { ...current, publication: result } : current,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Нийтлэхэд алдаа гарлаа.");
    } finally {
      setPublishing(false);
      publishLock.current = false;
    }
  }, []);

  const loadStatus = useCallback(
    async (id: string) => {
      const headers = paymentCredential(id);
      if (!Object.keys(headers).length) {
        setLoading(false);
        setError("Энэ төхөөрөмж дээр төлбөрийн эрх олдсонгүй.");
        return;
      }
      const response = await fetch(
        `/api/payment-status?id=${encodeURIComponent(id)}`,
        { headers },
      );
      const result = (await response.json()) as {
        payment?: PaymentView;
        error?: string;
      };
      if (!response.ok || !result.payment) {
        throw new Error(result.error || "Төлбөрийн төлөв уншиж чадсангүй.");
      }
      setPayment(result.payment);
      setLoading(false);
      if (result.payment.publication) {
        saveOwner(result.payment.publication);
      } else if (result.payment.status === "succeeded") {
        await publishGreeting(id);
      }
    },
    [publishGreeting],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setInAppBrowser(detectInAppBrowser());
      const params = new URLSearchParams(window.location.search);
      const id = params.get("payment") || "";
      const recovery = params.get("recovery") || "";
      if (id && recovery) {
        window.sessionStorage.setItem(`mend-recovery-v1:${id}`, recovery);
        window.history.replaceState(
          {},
          "",
          `/pay?payment=${encodeURIComponent(id)}`,
        );
      }
      setPaymentId(id);
      if (!id) {
        setLoading(false);
        setError("Захиалгын ID олдсонгүй.");
        return;
      }
      void loadStatus(id).catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Алдаа гарлаа.");
        setLoading(false);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadStatus]);

  useEffect(() => {
    if (
      !paymentId ||
      !payment ||
      !["requires_action", "processing"].includes(payment.status)
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      void loadStatus(paymentId).catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Алдаа гарлаа.");
      });
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [loadStatus, payment, paymentId]);

  async function copyPayLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setPayLinkCopied(true);
      window.setTimeout(() => setPayLinkCopied(false), 2200);
    } catch {
      window.prompt("Энэ линкийг хуулна уу", window.location.href);
    }
  }

  // Chrome for Android no longer launches bare custom-scheme hrefs from anchor
  // clicks, so wrap every Android tap in `intent://` — that reaches the OS
  // chooser and opens the bank app in regular Chrome and inside Meta apps
  // alike. iOS has no equivalent (Meta blocks scheme launches outright, Safari
  // handles the raw scheme itself), so leave the direct href alone there.
  function handleBankClick(
    event: React.MouseEvent<HTMLAnchorElement>,
    bankLink: string,
  ) {
    const isAndroid = /Android/i.test(navigator.userAgent || "");
    if (!isAndroid) return;
    const match = bankLink.match(/^([a-z][a-z0-9+.-]*):\/\/(.*)$/i);
    if (!match) return;
    const [, scheme, rest] = match;
    if (scheme === "http" || scheme === "https") return;
    event.preventDefault();
    window.location.href = `intent://${rest}#Intent;scheme=${scheme};end`;
  }

  async function copyOrderId() {
    if (!payment) return;
    try {
      await navigator.clipboard.writeText(payment.orderId);
      setOrderIdCopied(true);
      window.setTimeout(() => setOrderIdCopied(false), 2200);
    } catch {
      window.prompt("Гүйлгээний утгыг хуулна уу", payment.orderId);
    }
  }

  const qrSource = payment?.qrImage
    ? payment.qrImage.startsWith("data:") || payment.qrImage.startsWith("http")
      ? payment.qrImage
      : `data:image/png;base64,${payment.qrImage}`
    : "";
  const hasBankLinks = Boolean(payment?.deeplinks.length);
  // The QPay wallet itself is the odd one out — it is not a bank, and buyers
  // reach for it first, so it gets the wide row above the bank grid.
  const primaryBank =
    payment?.deeplinks.find((bank) => /qpay/i.test(bank.name)) ?? null;
  const gridBanks = (payment?.deeplinks ?? []).filter(
    (bank) => bank !== primaryBank,
  );
  const collapsedBankCount = 6;
  const visibleBanks = showAllBanks
    ? gridBanks
    : gridBanks.slice(0, collapsedBankCount);
  const hiddenBankCount = Math.max(0, gridBanks.length - collapsedBankCount);
  const isPending =
    payment &&
    ["requires_action", "processing"].includes(payment.status);
  const isFailed =
    payment &&
    ["failed", "canceled", "expired"].includes(payment.status);
  const shareUrl = payment?.publication
    ? `${window.location.origin}/g/${payment.publication.publicSlug}`
    : "";

  return (
    <AppShell current="create">
      <main className="payment-page">
        <header className="payment-heading">
          <a href="/create">
            <ArrowLeft size={17} /> Ноорог руу буцах
          </a>
          <span>SECURE CHECKOUT</span>
          <h1>Линкээ идэвхжүүлэх</h1>
          <p>1 төлбөр = 1 нийтлэгдсэн төрсөн өдрийн мэндчилгээний линк</p>
        </header>

        {loading ? (
          <section className="payment-loading">
            <LoaderCircle size={27} className="spin" />
            <strong>Захиалгыг шалгаж байна...</strong>
          </section>
        ) : payment?.publication ? (
          <section className="payment-success">
            <img
              src={
                payment.publication.recipientGender === "male"
                  ? "/assets/mend-tiger-celebrate.png"
                  : "/assets/mend-fawn-celebrate.png"
              }
              alt=""
            />
            <CheckCircle2 size={31} />
            <small>ТӨЛБӨР БАТАЛГААЖСАН</small>
            <h2>Мэндчилгээ нийтлэгдлээ!</h2>
            <p>{payment.publication.recipientName}-д зориулсан линк бэлэн.</p>
            <div className="share-field">
              <span>{shareUrl}</span>
              <button
                type="button"
                className="icon-button"
                title="Линк хуулах"
                aria-label="Линк хуулах"
                onClick={() => navigator.clipboard?.writeText(shareUrl)}
              >
                <Copy size={18} />
              </button>
            </div>
            <div className="payment-success-actions">
              <StoryShareButton
                slug={payment.publication.publicSlug}
                recipientName={payment.publication.recipientName}
                className="primary"
              />
              <a className="primary-link" href={shareUrl}>
                <Gift size={18} /> Линкээ нээх
              </a>
              <a className="secondary-link" href="/dashboard">
                Dashboard
              </a>
            </div>
          </section>
        ) : payment ? (
          <div className="payment-layout">
            <section className="payment-main">
              <header className="payment-total">
                <div>
                  <small>НИЙТ ТӨЛӨХ</small>
                  <strong>{formatAmount(payment.amount)}₮</strong>
                </div>
                <span>QPay</span>
              </header>

              {isFailed ? (
                <div className="payment-failed">
                  <XCircle size={34} />
                  <h2>
                    {payment.status === "expired"
                      ? "QR-ийн хугацаа дууссан"
                      : payment.status === "canceled"
                        ? "Төлбөр цуцлагдсан"
                        : "Нэхэмжлэх амжилтгүй"}
                  </h2>
                  <p>{payment.failureReason || "Шинэ нэхэмжлэх үүсгэнэ үү."}</p>
                  <a className="primary-link" href="/create">
                    Дахин оролдох
                  </a>
                </div>
              ) : (
                <>
                  {inAppBrowser && hasBankLinks && (
                    <div className="inapp-notice">
                      <strong>
                        {inAppBrowser.appName} доторх browser нь банкны аппыг
                        шууд нээж чадахгүй
                      </strong>
                      <p>
                        <b>Хамгийн хурдан:</b> доорх QR-ыг банкны аппаараа шууд
                        уншуулаад төлбөрөө хий.
                      </p>
                      <p>
                        Эсвэл доорх банкны товчийг дарвал энэ хуудсыг утасны
                        {inAppBrowser.isIos ? " Safari" : " Chrome"}-д нээгээд
                        танд банкны товчоо дарах боломж олгоно:
                      </p>
                      {inAppBrowser.isIos && (
                        <ol className="inapp-notice-steps">
                          <li>
                            <span>1</span> Хуудасны баруун доод буланд байрлах
                            ••• товчийг дарна
                          </li>
                          <li>
                            <span>2</span> “Open in Safari” / “Open in browser”-ыг
                            сонгоно
                          </li>
                        </ol>
                      )}
                      <div>
                        <a
                          className="inapp-notice-open"
                          href={inAppBrowser.externalUrl}
                        >
                          <ExternalLink size={16} />
                          {inAppBrowser.isIos ? "Safari-гаар нээх" : "Chrome-оор нээх"}
                        </a>
                        <button type="button" onClick={copyPayLink}>
                          {payLinkCopied ? <Check size={16} /> : <Copy size={16} />}
                          {payLinkCopied ? "Хуулагдлаа" : "Линк хуулах"}
                        </button>
                      </div>
                    </div>
                  )}
                  {qrSource ? (
                    <>
                      <div className="qpay-qr">
                        <img src={qrSource} alt="QPay төлбөрийн QR код" />
                      </div>
                      <p className="qpay-qr-hint">
                        Банк аппаараа QR-ыг уншуулж төлбөрөө хийнэ үү.
                      </p>
                    </>
                  ) : hasBankLinks ? null : payment.shortUrl ? (
                    <a
                      className="qpay-checkout-button"
                      href={payment.shortUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink size={19} /> Төлбөрийн хуудсыг нээх
                    </a>
                  ) : (
                    <div className="qpay-qr">
                      <QrCode size={94} />
                    </div>
                  )}

                  <p className="qpay-memo-lead">
                    Гүйлгээний утга нь ихэнх банкан дээр автоматаар бөглөгдөнө.
                    Хэрэв гараар оруулах шаардлагатай бол:
                  </p>
                  <div className="qpay-memo">
                    <div>
                      <small>ГҮЙЛГЭЭНИЙ УТГА</small>
                      <strong>{payment.orderId}</strong>
                    </div>
                    <button type="button" onClick={copyOrderId}>
                      {orderIdCopied ? <Check size={16} /> : <Copy size={16} />}
                      {orderIdCopied ? "Хуулагдлаа" : "Хуулах"}
                    </button>
                  </div>

                  {hasBankLinks && (
                    <div className="bank-links">
                      <span>эсвэл банкны аппаа шууд нээх:</span>
                      {primaryBank && (
                        <a
                          className="bank-links-primary"
                          href={primaryBank.link}
                          onClick={(event) =>
                            handleBankClick(event, primaryBank.link)
                          }
                        >
                          {primaryBank.logo ? (
                            <img src={primaryBank.logo} alt="" />
                          ) : (
                            <QrCode size={22} />
                          )}
                          <span>{primaryBank.description || primaryBank.name}</span>
                        </a>
                      )}
                      <div>
                        {visibleBanks.map((bank) => (
                          <a
                            href={bank.link}
                            key={`${bank.name}-${bank.link}`}
                            onClick={(event) => handleBankClick(event, bank.link)}
                          >
                            {bank.logo ? <img src={bank.logo} alt="" /> : <QrCode size={19} />}
                            <span>{bank.description || bank.name}</span>
                          </a>
                        ))}
                      </div>
                      {hiddenBankCount > 0 && (
                        <button
                          type="button"
                          className="bank-links-more"
                          onClick={() => setShowAllBanks((current) => !current)}
                        >
                          {showAllBanks ? (
                            <>Хураах <ChevronUp size={15} /></>
                          ) : (
                            <>Бүх банкыг харах (+{hiddenBankCount}) <ChevronDown size={15} /></>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="payment-state">
                    {payment.status === "processing" ? (
                      <LoaderCircle size={19} className="spin" />
                    ) : (
                      <QrCode size={19} />
                    )}
                    <div>
                      <strong>
                        {payment.status === "processing"
                          ? "Төлбөрийг баталгаажуулж байна"
                          : "Төлбөрөө хүлээж байна"}
                      </strong>
                      <small>
                        {payment.status === "processing"
                          ? "QPay-аас ирсэн төлбөрийг backend шалгаж байна."
                          : "Төлсний дараа энэ хуудас өөрөө шинэчлэгдэнэ."}
                      </small>
                    </div>
                  </div>

                  {payment.shortUrl && (qrSource || hasBankLinks) && (
                    <a
                      className="qpay-short-link"
                      href={payment.shortUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      QPay-ийн хуудсаар нээх <ExternalLink size={16} />
                    </a>
                  )}
                </>
              )}
            </section>

            <aside className="payment-summary">
              <img src="/assets/mend-fawn-cake.png" alt="" />
              <h2>Нэг удаагийн нийтлэх эрх</h2>
              <ul>
                <li>
                  <Check size={16} /> 1 unique мэндчилгээний линк
                </li>
                <li>
                  <Check size={16} /> Dashboard эрх
                </li>
                <li>
                  <Check size={16} /> Reaction + guestbook
                </li>
              </ul>
              <div className="payment-progress">
                <span className="done">
                  <Check size={15} /> Ноорог
                </span>
                <span className={payment.status === "processing" ? "active" : ""}>
                  <ShieldCheck size={15} /> Төлбөр
                </span>
                <span>
                  <TicketCheck size={15} /> Нийтлэх
                </span>
              </div>
              <small>Order ID</small>
              <code>{payment.orderId}</code>
              {payment.status === "succeeded" && !payment.publication && (
                <button
                  type="button"
                  className="primary-button"
                  disabled={publishing}
                  onClick={() => void publishGreeting(payment.id)}
                >
                  {publishing ? (
                    <LoaderCircle size={17} className="spin" />
                  ) : (
                    <RefreshCw size={17} />
                  )}
                  Нийтлэхийг дахин оролдох
                </button>
              )}
            </aside>
          </div>
        ) : null}
        {error && <p className="form-error payment-error">{error}</p>}
        {isPending && (
          <p className="payment-security-note">
            <ShieldCheck size={16} />
            Төлбөр амжилттай эсэхийг зөвхөн server баталгаажуулна.
          </p>
        )}
      </main>
    </AppShell>
  );
}
