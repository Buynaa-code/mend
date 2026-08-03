"use client";

/* eslint-disable @next/next/no-img-element */

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Gift,
  LoaderCircle,
  Mail,
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
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryOrder, setRecoveryOrder] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);
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

  async function requestRecovery() {
    setError("");
    setRecoverySent(false);
    const response = await fetch("/api/recovery", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: recoveryEmail,
        orderId: recoveryOrder,
      }),
    });
    const result = (await response.json()) as {
      message?: string;
      error?: string;
    };
    if (!response.ok) {
      setError(result.error || "Сэргээх хүсэлт илгээж чадсангүй.");
      return;
    }
    setRecoverySent(true);
  }

  const qrSource = payment?.qrImage
    ? payment.qrImage.startsWith("data:")
      ? payment.qrImage
      : `data:image/png;base64,${payment.qrImage}`
    : "";
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
            {payment.accessCode && (
              <div className="access-code-line">
                <TicketCheck size={22} />
                <span>
                  Нэг удаагийн код
                  <strong>{payment.accessCode}</strong>
                </span>
                <button
                  type="button"
                  title="Код хуулах"
                  aria-label="Код хуулах"
                  onClick={() =>
                    navigator.clipboard?.writeText(payment.accessCode)
                  }
                >
                  <Copy size={16} />
                </button>
              </div>
            )}
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
                  <div className="qpay-qr">
                    {qrSource ? (
                      <img src={qrSource} alt="QPay төлбөрийн QR код" />
                    ) : (
                      <QrCode size={94} />
                    )}
                  </div>
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
                          : "QR кодоо уншуулна уу"}
                      </strong>
                      <small>
                        {payment.status === "processing"
                          ? "QPay-аас ирсэн төлбөрийг backend шалгаж байна."
                          : "Банкны апп эсвэл QPay ашиглана уу."}
                      </small>
                    </div>
                  </div>
                  {payment.shortUrl && (
                    <a
                      className="qpay-short-link"
                      href={payment.shortUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      QPay-аар нээх <ExternalLink size={16} />
                    </a>
                  )}
                  {payment.deeplinks.length > 0 && (
                    <div className="bank-links">
                      <span>Банкны апп</span>
                      <div>
                        {payment.deeplinks.map((bank) => (
                          <a href={bank.link} key={`${bank.name}-${bank.link}`}>
                            {bank.logo ? <img src={bank.logo} alt="" /> : <QrCode size={19} />}
                            <span>{bank.description || bank.name}</span>
                          </a>
                        ))}
                      </div>
                    </div>
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
        ) : (
          <section className="recovery-panel">
            <Mail size={28} />
            <h2>Захиалгаа сэргээх</h2>
            <p>Төлбөр хийсэн email болон Order ID-гаа оруулна уу.</p>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={recoveryEmail}
                onChange={(event) => setRecoveryEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label>
              <span>Order ID</span>
              <input
                value={recoveryOrder}
                onChange={(event) => setRecoveryOrder(event.target.value)}
                placeholder="BDY..."
              />
            </label>
            <button
              type="button"
              className="primary-button"
              onClick={() => void requestRecovery()}
            >
              <Mail size={17} /> Сэргээх холбоос авах
            </button>
            {recoverySent && (
              <small>Мэдээлэл таарсан бол сэргээх холбоос email-р очно.</small>
            )}
          </section>
        )}
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
