import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const greetings = sqliteTable("greetings", {
  id: text("id").primaryKey(),
  ownerTokenHash: text("owner_token_hash").notNull().unique(),
  accessCodeId: text("access_code_id").unique(),
  publicSlug: text("public_slug").notNull().unique(),
  recipientName: text("recipient_name").notNull(),
  recipientGender: text("recipient_gender").notNull().default("female"),
  senderName: text("sender_name").notNull(),
  template: text("template").notNull(),
  headline: text("headline").notNull(),
  message: text("message").notNull(),
  surpriseMessage: text("surprise_message").notNull(),
  musicUrl: text("music_url").notNull(),
  musicName: text("music_name").notNull(),
  photosJson: text("photos_json").notNull(),
  birthdayDate: text("birthday_date").notNull(),
  openedAt: text("opened_at"),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const drafts = sqliteTable("drafts", {
  id: text("id").primaryKey(),
  contentJson: text("content_json").notNull(),
  ownerEmail: text("owner_email").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
});

export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull(),
    draftId: text("draft_id")
      .notNull()
      .references(() => drafts.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    providerInvoiceId: text("provider_invoice_id"),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull(),
    clientSecretHash: text("client_secret_hash").notNull(),
    qrText: text("qr_text").notNull(),
    qrImage: text("qr_image").notNull(),
    shortUrl: text("short_url").notNull(),
    deeplinksJson: text("deeplinks_json").notNull(),
    failureReason: text("failure_reason").notNull(),
    expiresAt: text("expires_at").notNull(),
    succeededAt: text("succeeded_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("payments_order_id_unique").on(table.orderId),
    uniqueIndex("payments_provider_invoice_id_unique").on(
      table.providerInvoiceId,
    ),
    index("payments_draft_id_idx").on(table.draftId),
    index("payments_status_idx").on(table.status),
  ],
);

export const accessCodes = sqliteTable(
  "access_codes",
  {
    id: text("id").primaryKey(),
    paymentId: text("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    status: text("status").notNull(),
    issuedAt: text("issued_at").notNull(),
    expiresAt: text("expires_at"),
    usedAt: text("used_at"),
    greetingId: text("greeting_id"),
  },
  (table) => [
    uniqueIndex("access_codes_payment_id_unique").on(table.paymentId),
    uniqueIndex("access_codes_code_unique").on(table.code),
    index("access_codes_status_idx").on(table.status),
  ],
);

export const greetingPrivate = sqliteTable(
  "greeting_private",
  {
    greetingId: text("greeting_id")
      .primaryKey()
      .references(() => greetings.id, { onDelete: "cascade" }),
    ownerEmail: text("owner_email").notNull(),
    ownerTokenHash: text("owner_token_hash").notNull(),
    paymentId: text("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "restrict" }),
    internalNotes: text("internal_notes").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("greeting_private_owner_token_unique").on(
      table.ownerTokenHash,
    ),
    uniqueIndex("greeting_private_payment_unique").on(table.paymentId),
  ],
);

export const webhookEvents = sqliteTable(
  "webhook_events",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    eventId: text("event_id").notNull(),
    payloadHash: text("payload_hash").notNull(),
    status: text("status").notNull(),
    createdAt: text("created_at").notNull(),
    signatureVerifiedAt: text("signature_verified_at"),
    processedAt: text("processed_at"),
  },
  (table) => [
    uniqueIndex("webhook_events_provider_event_unique").on(
      table.provider,
      table.eventId,
    ),
  ],
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    email: text("email").notNull(),
    payloadJson: text("payload_json").notNull(),
    status: text("status").notNull(),
    createdAt: text("created_at").notNull(),
    sentAt: text("sent_at"),
  },
  (table) => [index("notifications_status_idx").on(table.status)],
);

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: integer("window_start").notNull(),
  count: integer("count").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export const responses = sqliteTable(
  "responses",
  {
    id: text("id").primaryKey(),
    greetingId: text("greeting_id")
      .notNull()
      .references(() => greetings.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    type: text("type").notNull(),
    name: text("name").notNull(),
    message: text("message").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("responses_greeting_id_idx").on(table.greetingId),
  ],
);
