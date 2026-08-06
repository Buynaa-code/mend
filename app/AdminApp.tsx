"use client";

import { Copy, LoaderCircle, LogIn, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const adminSessionKey = "mend-admin-session-v1";

type CodeRow = {
  id: string;
  code: string;
  source: "paid" | "manual";
  status: string;
  issuedAt: string;
  expiresAt: string | null;
  usedAt: string | null;
  greetingId: string | null;
  label: string | null;
  createdBy: string | null;
};

type AdminSession = {
  email: string;
  token: string;
};

function saveSession(session: AdminSession | null) {
  try {
    if (session) {
      window.localStorage.setItem(adminSessionKey, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(adminSessionKey);
    }
  } catch {
    /* ignore */
  }
}

function loadSession(): AdminSession | null {
  try {
    const raw = window.localStorage.getItem(adminSessionKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AdminSession>;
    if (parsed?.email && parsed?.token) {
      return { email: parsed.email, token: parsed.token };
    }
    return null;
  } catch {
    return null;
  }
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("mn-MN");
}

export function AdminApp() {
  const [email, setEmail] = useState("");
  const [session, setSession] = useState<AdminSession | null>(null);
  const [count, setCount] = useState(1);
  const [label, setLabel] = useState("");
  const [ttlDays, setTtlDays] = useState(30);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<CodeRow[]>([]);
  const [filter, setFilter] = useState<"all" | "manual" | "paid">("all");
  const [copied, setCopied] = useState<string>("");

  useEffect(() => {
    const stored = loadSession();
    if (stored) {
      setSession(stored);
      setEmail(stored.email);
    }
  }, []);

  const fetchRows = useCallback(
    async (tokenOverride?: string) => {
      const token = tokenOverride ?? session?.token;
      if (!token) return;
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/admin/access-codes?source=${filter}&limit=200`,
          { headers: { authorization: `Bearer ${token}` } },
        );
        const result = (await response.json()) as {
          codes?: CodeRow[];
          error?: string;
        };
        if (!response.ok) {
          if (response.status === 401) {
            saveSession(null);
            setSession(null);
          }
          throw new Error(result.error || "Уншиж чадсангүй.");
        }
        setRows(result.codes ?? []);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Алдаа гарлаа.");
      } finally {
        setLoading(false);
      }
    },
    [filter, session?.token],
  );

  useEffect(() => {
    if (session) void fetchRows();
  }, [session, fetchRows]);

  async function handleAuthorize(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const result = (await response.json()) as {
        email?: string;
        token?: string;
        error?: string;
      };
      if (!response.ok || !result.token || !result.email) {
        throw new Error(result.error || "Нэвтэрч чадсангүй.");
      }
      const next: AdminSession = { email: result.email, token: result.token };
      saveSession(next);
      setSession(next);
      await fetchRows(next.token);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Нэвтэрч чадсангүй.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!session) return;
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/admin/access-codes", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          count,
          label: label.trim() || undefined,
          ttlDays,
          createdBy: session.email,
        }),
      });
      const result = (await response.json()) as {
        created?: unknown;
        error?: string;
      };
      if (!response.ok) {
        if (response.status === 401) {
          saveSession(null);
          setSession(null);
        }
        throw new Error(result.error || "Код үүсгэж чадсангүй.");
      }
      setLabel("");
      await fetchRows();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Алдаа гарлаа.");
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied((current) => (current === code ? "" : current)), 1500);
    } catch {
      /* ignore */
    }
  }

  if (!session) {
    return (
      <div className="admin-shell">
        <form className="admin-login" onSubmit={handleAuthorize}>
          <h1>
            <LogIn size={20} /> Админ нэвтрэлт
          </h1>
          <label>
            <span>Email</span>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              inputMode="email"
              autoComplete="email"
            />
          </label>
          <button type="submit" disabled={!email.trim() || loading}>
            {loading ? <LoaderCircle size={16} className="spin" /> : "Нэвтрэх"}
          </button>
          {error && <p className="admin-error">{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <h1>Нэг удаагийн кодууд</h1>
          <small>{session.email} · Төлбөр + гараар үүсгэсэн эрхүүд</small>
        </div>
        <button
          type="button"
          className="admin-logout"
          onClick={() => {
            saveSession(null);
            setSession(null);
            setEmail("");
            setRows([]);
          }}
        >
          Гарах
        </button>
      </header>

      <section className="admin-create">
        <h2>Шинэ код үүсгэх</h2>
        <form onSubmit={handleCreate}>
          <label>
            <span>Тоо</span>
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(event) => setCount(Number(event.target.value) || 1)}
            />
          </label>
          <label>
            <span>Тайлбар (жишээ: "найз Bat-т")</span>
            <input
              type="text"
              maxLength={120}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Optional"
            />
          </label>
          <label>
            <span>Хугацаа (өдрөөр)</span>
            <input
              type="number"
              min={1}
              max={365}
              value={ttlDays}
              onChange={(event) => setTtlDays(Number(event.target.value) || 30)}
            />
          </label>
          <button type="submit" disabled={creating}>
            {creating ? <LoaderCircle size={16} className="spin" /> : "Үүсгэх"}
          </button>
        </form>
      </section>

      <section className="admin-list">
        <div className="admin-list-head">
          <div className="admin-filter">
            {(["all", "manual", "paid"] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={filter === option ? "active" : ""}
                onClick={() => setFilter(option)}
              >
                {option === "all"
                  ? "Бүгд"
                  : option === "manual"
                  ? "Гараар"
                  : "Төлбөрөөр"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void fetchRows()}
            disabled={loading}
            className="admin-refresh"
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>

        {error && <p className="admin-error">{error}</p>}

        <table>
          <thead>
            <tr>
              <th>Код</th>
              <th>Статус</th>
              <th>Эх сурвалж</th>
              <th>Тайлбар</th>
              <th>Үүссэн</th>
              <th>Дуусах</th>
              <th>Ашигласан</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="admin-empty">
                  Хараахан код алга.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <button
                    type="button"
                    className="admin-code"
                    onClick={() => void handleCopy(row.code)}
                    title="Хуулах"
                  >
                    <code>{row.code}</code>
                    <Copy size={12} />
                    {copied === row.code && <span className="admin-copied">Хуулагдлаа</span>}
                  </button>
                </td>
                <td>{row.status}</td>
                <td>{row.source === "manual" ? "Гараар" : "Төлбөр"}</td>
                <td>{row.label ?? "—"}</td>
                <td>{formatDate(row.issuedAt)}</td>
                <td>{formatDate(row.expiresAt)}</td>
                <td>{formatDate(row.usedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
